from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import database
from logger import get_logger
import utils
import models

logger = get_logger(__name__)
router = APIRouter(
    prefix="/monitor",
    tags=["monitor"]
)

@router.get("/stats")
def get_system_stats(db: Session = Depends(database.get_db)) -> Dict[str, Any]:
    try:
        storage_stats = utils.get_storage_stats()
        
        submission_count = db.query(models.Submission).count()
        answer_count = db.query(models.Answer).count()
        graded_count = db.query(models.Answer).filter(models.Answer.status == "graded").count()
        reviewed_count = db.query(models.Answer).filter(models.Answer.status == "reviewed").count()
        
        return {
            "storage": storage_stats,
            "submissions": submission_count,
            "answers": answer_count,
            "status_counts": {
                "graded": graded_count,
                "reviewed": reviewed_count,
                "pending": answer_count - graded_count - reviewed_count
            }
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {"error": str(e)}

@router.get("/submissions-by-status")
def get_submissions_by_status(db: Session = Depends(database.get_db)) -> Dict[str, Any]:
    try:
        statuses = {}
        for status in ["pending", "graded", "reviewed"]:
            count = db.query(models.Answer).filter(models.Answer.status == status).count()
            statuses[status] = count
        
        return statuses
    except Exception as e:
        logger.error(f"Error getting submissions by status: {e}")
        return {"error": str(e)}

@router.get("/exam-summary/{exam_id}")
def get_exam_summary(exam_id: int, db: Session = Depends(database.get_db)) -> Dict[str, Any]:
    try:
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
        if not exam:
            return {"error": "Exam not found"}
        
        submissions = db.query(models.Submission).filter(models.Submission.exam_id == exam_id).all()
        answers = db.query(models.Answer).join(models.Submission).filter(
            models.Submission.exam_id == exam_id
        ).all()
        
        total_score = sum(a.final_score or 0 for a in answers if a.status == "reviewed")
        avg_score = total_score / len([a for a in answers if a.status == "reviewed"]) if any(a.status == "reviewed" for a in answers) else 0
        
        return {
            "exam_id": exam_id,
            "exam_title": exam.title,
            "total_submissions": len(submissions),
            "total_answers": len(answers),
            "status_breakdown": {
                "pending": sum(1 for a in answers if a.status == "pending"),
                "graded": sum(1 for a in answers if a.status == "graded"),
                "reviewed": sum(1 for a in answers if a.status == "reviewed")
            },
            "average_score": round(avg_score, 2)
        }
    except Exception as e:
        logger.error(f"Error getting exam summary: {e}")
        return {"error": str(e)}
