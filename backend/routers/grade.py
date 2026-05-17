from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from logger import get_logger
import models, schemas, database, ai_engine
from typing import List, Dict, Any

logger = get_logger(__name__)
router = APIRouter(
    prefix="/grade",
    tags=["grade"]
)

def process_grading(answer_id: int, db: Session):
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if not answer:
        logger.error(f"Answer {answer_id} not found")
        return

    try:
        logger.info(f"Starting grading process for answer {answer_id}")
        
        extracted_text = ai_engine.extract_text_from_image(answer.image_path)
        answer.extracted_text = extracted_text
        logger.info(f"Extracted text for answer {answer_id}")
        
        rubric = db.query(models.Rubric).filter(models.Rubric.id == answer.rubric_id).first()
        if rubric:
            rubric_dict = {
                "criteria": rubric.criteria or {},
                "max_score": rubric.max_score
            }
            grading_result = ai_engine.agentic_grade_answer(extracted_text, rubric_dict)
            
            answer.ai_score = grading_result.get("score", 0)
            answer.ai_justification = grading_result.get("justification", {})
            answer.final_score = grading_result.get("score", 0)
            
            logger.info(f"Grading completed for answer {answer_id}: {answer.ai_score}/{grading_result.get('max_score')}")
        
        answer.status = "graded"
        db.commit()
        logger.info(f"Answer {answer_id} marked as graded")
        
    except Exception as e:
        logger.error(f"Error grading answer {answer_id}: {e}", exc_info=True)
        answer.status = "failed"
        db.commit()

@router.post("/{answer_id}/trigger")
def trigger_grading(answer_id: int, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    logger.info(f"Triggering manual grading for answer {answer_id}")
    background_tasks.add_task(process_grading, answer_id, database.SessionLocal())
    
    return {"message": "Grading triggered", "answer_id": answer_id}

@router.get("/status/{answer_id}")
def get_grading_status(answer_id: int, db: Session = Depends(database.get_db)):
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    return {
        "answer_id": answer_id,
        "status": answer.status,
        "extracted_text": answer.extracted_text,
        "ai_score": answer.ai_score,
        "justification": answer.ai_justification
    }

@router.post("/batch/trigger")
def trigger_batch_grading(submission_ids: List[int], background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    answers = db.query(models.Answer).join(models.Submission).filter(
        models.Submission.id.in_(submission_ids)
    ).all()
    
    if not answers:
        raise HTTPException(status_code=404, detail="No answers found for given submissions")
    
    logger.info(f"Triggering batch grading for {len(answers)} answers")
    
    for answer in answers:
        if answer.status == "pending":
            background_tasks.add_task(process_grading, answer.id, database.SessionLocal())
    
    return {
        "message": f"Batch grading triggered for {len(answers)} answers",
        "count": len(answers)
    }
