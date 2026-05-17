from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, JSON, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(String)  # 'instructor' or 'ta'

    courses = relationship("Course", back_populates="instructor")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    instructor_id = Column(Integer, ForeignKey("users.id"))

    instructor = relationship("User", back_populates="courses")
    exams = relationship("Exam", back_populates="course")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    
    course = relationship("Course", back_populates="exams")
    rubrics = relationship("Rubric", back_populates="exam")
    submissions = relationship("Submission", back_populates="exam")

class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"))
    question_number = Column(String, index=True)
    max_score = Column(Float)
    criteria = Column(JSON)  # Stores strict conditions for partial credit

    exam = relationship("Exam", back_populates="rubrics")
    answers = relationship("Answer", back_populates="rubric")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"))
    student_id = Column(String, index=True)  # Extracted from PDF or metadata
    pdf_path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    exam = relationship("Exam", back_populates="submissions")
    answers = relationship("Answer", back_populates="submission")

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    rubric_id = Column(Integer, ForeignKey("rubrics.id"))
    image_path = Column(String)  # Cropped image of the answer
    extracted_text = Column(Text, nullable=True)  # VLM output
    ai_score = Column(Float, nullable=True)
    ai_justification = Column(JSON, nullable=True)  # Detailed justification steps
    final_score = Column(Float, nullable=True)
    status = Column(String, default="pending")  # pending, graded, reviewed

    submission = relationship("Submission", back_populates="answers")
    rubric = relationship("Rubric", back_populates="answers")
    review = relationship("Review", back_populates="answer", uselist=False)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("answers.id"), unique=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    is_overridden = Column(Boolean, default=False)
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    answer = relationship("Answer", back_populates="review")
    reviewer = relationship("User")
