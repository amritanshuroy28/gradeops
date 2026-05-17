from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from logger import get_logger
import models, schemas, database

logger = get_logger(__name__)
router = APIRouter(
    prefix="/config",
    tags=["config"]
)

@router.post("/course/", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(database.get_db)):
    try:
        new_course = models.Course(**course.model_dump())
        db.add(new_course)
        db.commit()
        db.refresh(new_course)
        logger.info(f"Created course: {new_course.id} - {new_course.title}")
        return new_course
    except Exception as e:
        logger.error(f"Error creating course: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/course/", response_model=List[schemas.Course])
def list_courses(db: Session = Depends(database.get_db)):
    courses = db.query(models.Course).all()
    logger.info(f"Listed {len(courses)} courses")
    return courses

@router.get("/course/{course_id}", response_model=schemas.Course)
def get_course(course_id: int, db: Session = Depends(database.get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.post("/exam/", response_model=schemas.Exam)
def create_exam(exam: schemas.ExamCreate, db: Session = Depends(database.get_db)):
    try:
        course = db.query(models.Course).filter(models.Course.id == exam.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        new_exam = models.Exam(**exam.model_dump())
        db.add(new_exam)
        db.commit()
        db.refresh(new_exam)
        logger.info(f"Created exam: {new_exam.id} - {new_exam.title}")
        return new_exam
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exam/", response_model=List[schemas.Exam])
def list_exams(course_id: int = None, db: Session = Depends(database.get_db)):
    query = db.query(models.Exam)
    if course_id:
        query = query.filter(models.Exam.course_id == course_id)
    exams = query.all()
    logger.info(f"Listed {len(exams)} exams")
    return exams

@router.get("/exam/{exam_id}", response_model=schemas.Exam)
def get_exam(exam_id: int, db: Session = Depends(database.get_db)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.post("/rubric/", response_model=schemas.Rubric)
def create_rubric(rubric: schemas.RubricCreate, db: Session = Depends(database.get_db)):
    try:
        exam = db.query(models.Exam).filter(models.Exam.id == rubric.exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        new_rubric = models.Rubric(**rubric.model_dump())
        db.add(new_rubric)
        db.commit()
        db.refresh(new_rubric)
        logger.info(f"Created rubric: {new_rubric.id} for exam {rubric.exam_id}")
        return new_rubric
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rubric/exam/{exam_id}", response_model=List[schemas.Rubric])
def get_exam_rubrics(exam_id: int, db: Session = Depends(database.get_db)):
    rubrics = db.query(models.Rubric).filter(models.Rubric.exam_id == exam_id).all()
    logger.info(f"Retrieved {len(rubrics)} rubrics for exam {exam_id}")
    return rubrics

@router.get("/rubric/{rubric_id}", response_model=schemas.Rubric)
def get_rubric(rubric_id: int, db: Session = Depends(database.get_db)):
    rubric = db.query(models.Rubric).filter(models.Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    return rubric

@router.put("/rubric/{rubric_id}", response_model=schemas.Rubric)
def update_rubric(rubric_id: int, rubric: schemas.RubricCreate, db: Session = Depends(database.get_db)):
    try:
        db_rubric = db.query(models.Rubric).filter(models.Rubric.id == rubric_id).first()
        if not db_rubric:
            raise HTTPException(status_code=404, detail="Rubric not found")
        
        for key, value in rubric.model_dump().items():
            setattr(db_rubric, key, value)
        
        db.commit()
        db.refresh(db_rubric)
        logger.info(f"Updated rubric: {rubric_id}")
        return db_rubric
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rubric/{rubric_id}")
def delete_rubric(rubric_id: int, db: Session = Depends(database.get_db)):
    try:
        db_rubric = db.query(models.Rubric).filter(models.Rubric.id == rubric_id).first()
        if not db_rubric:
            raise HTTPException(status_code=404, detail="Rubric not found")
        
        db.delete(db_rubric)
        db.commit()
        logger.info(f"Deleted rubric: {rubric_id}")
        return {"message": "Rubric deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))
