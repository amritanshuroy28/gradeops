from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any, Dict
from datetime import datetime
import models, schemas, database, ai_engine
from logger import get_logger
import glob

logger = get_logger(__name__)
router = APIRouter(
    prefix="/review",
    tags=["review"]
)

@router.get("/pending", response_model=List[Any])
def get_pending_answers(db: Session = Depends(database.get_db)):
    answers = db.query(models.Answer).filter(models.Answer.status == "graded").all()
    
    result = []
    for ans in answers:
        submission = db.query(models.Submission).filter(models.Submission.id == ans.submission_id).first()
        rubric = db.query(models.Rubric).filter(models.Rubric.id == ans.rubric_id).first()
        
        all_pages = []
        if submission:
            pattern = f"artifacts/sub_{submission.id}_page_*.png"
            def extract_page_num(filepath):
                return int(filepath.split("_page_")[-1].split(".")[0])
            
            paths = glob.glob(pattern)
            paths.sort(key=extract_page_num)
            all_pages = [f"http://localhost:8000/{p}" for p in paths]
        
        result.append({
            "id": ans.id,
            "student_id": submission.student_id if submission else "Unknown",
            "question": f"Q{rubric.question_number}" if rubric else "Unknown",
            "image_url": f"http://localhost:8000/{ans.image_path}",
            "all_pages": all_pages,
            "extracted_text": ans.extracted_text,
            "ai_score": ans.ai_score,
            "max_score": rubric.max_score if rubric else 0,
            "justification": ans.ai_justification,
        })
    
    logger.info(f"Retrieved {len(result)} pending answers for review")
    return result

@router.get("/pending-count")
def get_pending_count(db: Session = Depends(database.get_db)):
    count = db.query(models.Answer).filter(models.Answer.status == "graded").count()
    return {"pending_count": count}

@router.post("/{answer_id}/approve")
def approve_answer(answer_id: int, final_score: float, db: Session = Depends(database.get_db)):
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    try:
        rubric = db.query(models.Rubric).filter(models.Rubric.id == answer.rubric_id).first()
        if rubric and final_score > rubric.max_score:
            raise HTTPException(status_code=400, detail=f"Score cannot exceed max score {rubric.max_score}")
        
        answer.final_score = final_score
        answer.status = "reviewed"
        db.commit()
        
        logger.info(f"Answer {answer_id} approved with score {final_score}")
        return {"message": "Answer reviewed successfully", "answer_id": answer_id, "final_score": final_score}
    except Exception as e:
        logger.error(f"Error approving answer {answer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{answer_id}/override")
def override_answer(answer_id: int, final_score: float, comments: str = "", db: Session = Depends(database.get_db)):
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    try:
        rubric = db.query(models.Rubric).filter(models.Rubric.id == answer.rubric_id).first()
        if rubric and final_score > rubric.max_score:
            raise HTTPException(status_code=400, detail=f"Score cannot exceed max score {rubric.max_score}")
        
        review = db.query(models.Review).filter(models.Review.answer_id == answer_id).first()
        if not review:
            review = models.Review(answer_id=answer_id, reviewer_id=1)
            db.add(review)
        
        review.is_overridden = True
        review.comments = comments
        review.reviewed_at = datetime.utcnow()
        
        answer.final_score = final_score
        answer.status = "reviewed"
        
        db.commit()
        
        logger.info(f"Answer {answer_id} overridden with score {final_score}")
        return {"message": "Answer overridden successfully", "answer_id": answer_id, "final_score": final_score}
    except Exception as e:
        logger.error(f"Error overriding answer {answer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plagiarism-check/{exam_id}")
def check_plagiarism_for_exam(exam_id: int, threshold: float = 0.85, db: Session = Depends(database.get_db)):
    if ai_engine.plagiarism_detector.model is None:
        raise HTTPException(status_code=503, detail="Plagiarism detector model not initialized")
    try:
        submissions = db.query(models.Submission).filter(models.Submission.exam_id == exam_id).all()
        
        if not submissions:
            raise HTTPException(status_code=404, detail="No submissions found for exam")
        
        texts = []
        answer_map = {}
        
        for submission in submissions:
            answers = db.query(models.Answer).filter(models.Answer.submission_id == submission.id).all()
            for answer in answers:
                if answer.extracted_text:
                    texts.append(answer.extracted_text)
                    answer_map[len(texts) - 1] = answer.id
        
        suspicious_pairs = ai_engine.detect_plagiarism_batch(texts, threshold)
        
        result_pairs = []
        for pair in suspicious_pairs:
            answer_1_id = answer_map.get(pair["answer_1"])
            answer_2_id = answer_map.get(pair["answer_2"])
            if answer_1_id and answer_2_id:
                result_pairs.append({
                    "answer_1_id": answer_1_id,
                    "answer_2_id": answer_2_id,
                    "similarity": pair["similarity"]
                })
        
        logger.info(f"Found {len(result_pairs)} potentially plagiarized pairs in exam {exam_id}")
        return {
            "exam_id": exam_id,
            "threshold": threshold,
            "suspicious_pairs": result_pairs,
            "total_checked": len(texts)
        }
    except Exception as e:
        logger.error(f"Error checking plagiarism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{answer_id}/details")
def get_answer_details(answer_id: int, db: Session = Depends(database.get_db)):
    answer = db.query(models.Answer).filter(models.Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    submission = db.query(models.Submission).filter(models.Submission.id == answer.submission_id).first()
    rubric = db.query(models.Rubric).filter(models.Rubric.id == answer.rubric_id).first()
    review = db.query(models.Review).filter(models.Review.answer_id == answer_id).first()
    
    return {
        "id": answer.id,
        "student_id": submission.student_id if submission else None,
        "submission_id": answer.submission_id,
        "question_number": rubric.question_number if rubric else None,
        "max_score": rubric.max_score if rubric else None,
        "extracted_text": answer.extracted_text,
        "ai_score": answer.ai_score,
        "final_score": answer.final_score,
        "status": answer.status,
        "justification": answer.ai_justification,
        "review": {
            "is_overridden": review.is_overridden if review else False,
            "comments": review.comments if review else None,
            "reviewed_at": review.reviewed_at if review else None
        } if review else None
    }
