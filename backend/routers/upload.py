import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from logger import get_logger
import models, schemas, database, utils
from routers.grade import process_grading

logger = get_logger(__name__)
router = APIRouter(
    prefix="/upload",
    tags=["upload"]
)

@router.post("/submission/", response_model=schemas.Submission)
async def upload_submission(
    background_tasks: BackgroundTasks,
    exam_id: int = Form(...),
    student_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    try:
        logger.info(f"Received submission upload: exam_id={exam_id}, student_id={student_id}, filename={file.filename}")
        
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            logger.error(f"Exam {exam_id} not found")
            raise HTTPException(status_code=404, detail="Exam not found")

        if file.size and file.size > 100 * 1024 * 1024:
            logger.warning(f"File size {file.size} exceeds maximum allowed size")
            raise HTTPException(status_code=413, detail="File too large (max 100MB)")

        file_path = os.path.join(utils.UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Saved uploaded file to {file_path}")

        new_submission = models.Submission(
            exam_id=exam_id,
            student_id=student_id,
            pdf_path=file_path
        )
        db.add(new_submission)
        db.commit()
        db.refresh(new_submission)
        
        logger.info(f"Created submission record: {new_submission.id}")

        image_paths = utils.process_pdf(file_path, new_submission.id)
        logger.info(f"Processed PDF into {len(image_paths)} images")
        
        rubrics = db.query(models.Rubric).filter(models.Rubric.exam_id == exam_id).all()
        
        new_answers = []
        for i, rubric in enumerate(rubrics):
            if i < len(image_paths):
                new_answer = models.Answer(
                    submission_id=new_submission.id,
                    rubric_id=rubric.id,
                    image_path=image_paths[i],
                    status="pending"
                )
                db.add(new_answer)
                new_answers.append(new_answer)
        
        db.commit()

        for ans in new_answers:
            db.refresh(ans)
            background_tasks.add_task(process_grading, ans.id, database.SessionLocal())
            logger.info(f"Queued grading for answer {ans.id}")

        logger.info(f"Successfully uploaded submission {new_submission.id}")
        return new_submission
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading submission: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/submission/{submission_id}", response_model=schemas.Submission)
def get_submission(submission_id: int, db: Session = Depends(database.get_db)):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.get("/exam/{exam_id}/submissions", response_model=list)
def get_exam_submissions(exam_id: int, db: Session = Depends(database.get_db)):
    submissions = db.query(models.Submission).filter(models.Submission.exam_id == exam_id).all()
    return submissions
