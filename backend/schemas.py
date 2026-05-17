from typing import List, Optional, Any
from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str

class CourseCreate(CourseBase):
    instructor_id: int

class Course(CourseBase):
    id: int
    instructor_id: int
    class Config:
        from_attributes = True

class ExamBase(BaseModel):
    title: str

class ExamCreate(ExamBase):
    course_id: int

class Exam(ExamBase):
    id: int
    course_id: int
    class Config:
        from_attributes = True

class RubricBase(BaseModel):
    question_number: str
    max_score: float
    criteria: Any

class RubricCreate(RubricBase):
    exam_id: int

class Rubric(RubricBase):
    id: int
    exam_id: int
    class Config:
        from_attributes = True

class AnswerBase(BaseModel):
    submission_id: int
    rubric_id: int
    image_path: str

class AnswerCreate(AnswerBase):
    pass

class Answer(AnswerBase):
    id: int
    extracted_text: Optional[str] = None
    ai_score: Optional[float] = None
    ai_justification: Optional[Any] = None
    final_score: Optional[float] = None
    status: str
    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    exam_id: int
    student_id: str
    pdf_path: str

class SubmissionCreate(SubmissionBase):
    pass

class Submission(SubmissionBase):
    id: int
    uploaded_at: datetime
    answers: List[Answer] = []
    class Config:
        from_attributes = True

class ReviewBase(BaseModel):
    answer_id: int
    reviewer_id: int
    is_overridden: bool
    comments: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: int
    reviewed_at: datetime
    class Config:
        from_attributes = True
