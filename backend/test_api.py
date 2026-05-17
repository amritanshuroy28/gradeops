import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, Base, engine
import models

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    yield db
    db.close()

class TestAuthentication:
    def test_login_instructor(self, client):
        response = client.post("/auth/login?username=test_inst&role=instructor")
        assert response.status_code == 200
        assert response.json()["role"] == "instructor"
    
    def test_login_ta(self, client):
        response = client.post("/auth/login?username=test_ta&role=ta")
        assert response.status_code == 200
        assert response.json()["role"] == "ta"

class TestHealth:
    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data
        assert "storage" in data

class TestCourseManagement:
    def test_create_course(self, client, setup_db):
        response = client.post("/config/course/", json={
            "title": "CS101: Calculus I",
            "instructor_id": 1
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "CS101: Calculus I"
    
    def test_list_courses(self, client):
        response = client.get("/config/course/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

class TestExamManagement:
    def test_create_exam(self, client, db):
        course = models.Course(title="Test Course", instructor_id=1)
        db.add(course)
        db.commit()
        db.refresh(course)
        
        response = client.post("/config/exam/", json={
            "title": "Midterm",
            "course_id": course.id
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Midterm"
    
    def test_exam_not_found(self, client):
        response = client.get("/config/exam/99999")
        assert response.status_code == 404

class TestRubricManagement:
    def test_create_rubric(self, client, db):
        course = models.Course(title="Test Course", instructor_id=1)
        db.add(course)
        db.commit()
        
        exam = models.Exam(title="Test Exam", course_id=course.id)
        db.add(exam)
        db.commit()
        db.refresh(exam)
        
        response = client.post("/config/rubric/", json={
            "exam_id": exam.id,
            "question_number": "1",
            "max_score": 5.0,
            "criteria": {"criterion_1": {"condition": "Test", "points": 5}}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["max_score"] == 5.0

class TestMonitoring:
    def test_monitor_stats(self, client):
        response = client.get("/monitor/stats")
        assert response.status_code == 200
        data = response.json()
        assert "storage" in data
        assert "submissions" in data
        assert "status_counts" in data
    
    def test_submissions_by_status(self, client):
        response = client.get("/monitor/submissions-by-status")
        assert response.status_code == 200
        data = response.json()
        assert all(key in data for key in ["pending", "graded", "reviewed"])

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
