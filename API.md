# GRADEOPS API Documentation

## Base URL
- Local: `http://localhost:8000`
- Production: `https://api.gradeops.com` (example)

## Authentication
Currently uses mock authentication. In production, implement JWT tokens.

## Response Format
All responses are JSON with the following structure:
```json
{
  "data": {},
  "error": null,
  "status_code": 200
}
```

## Endpoints

### Authentication

#### Login
```
POST /auth/login
Query Parameters:
  - username (string): User's username
  - role (string): 'instructor' | 'ta' | 'admin'

Response:
{
  "access_token": "mock-token-username",
  "role": "instructor"
}
```

### Configuration Management

#### Create Course
```
POST /config/course/
Request Body:
{
  "title": "CS101: Calculus I",
  "instructor_id": 1
}

Response:
{
  "id": 1,
  "title": "CS101: Calculus I",
  "instructor_id": 1
}
```

#### List Courses
```
GET /config/course/

Response:
[
  {
    "id": 1,
    "title": "CS101: Calculus I",
    "instructor_id": 1
  }
]
```

#### Get Course
```
GET /config/course/{course_id}
```

#### Create Exam
```
POST /config/exam/
Request Body:
{
  "title": "Midterm Exam",
  "course_id": 1
}

Response:
{
  "id": 1,
  "title": "Midterm Exam",
  "course_id": 1
}
```

#### List Exams
```
GET /config/exam/?course_id=1 (optional)

Response:
[
  {
    "id": 1,
    "title": "Midterm Exam",
    "course_id": 1
  }
]
```

#### Create Rubric
```
POST /config/rubric/
Request Body:
{
  "exam_id": 1,
  "question_number": "1",
  "max_score": 5.0,
  "criteria": {
    "criterion_1": {
      "condition": "Correct derivative shown",
      "points": 3
    },
    "criterion_2": {
      "condition": "Critical point identified",
      "points": 2
    }
  }
}

Response:
{
  "id": 1,
  "exam_id": 1,
  "question_number": "1",
  "max_score": 5.0,
  "criteria": {...}
}
```

#### List Exam Rubrics
```
GET /config/rubric/exam/{exam_id}
```

#### Update Rubric
```
PUT /config/rubric/{rubric_id}
Request Body: (same as create)
```

#### Delete Rubric
```
DELETE /config/rubric/{rubric_id}

Response:
{
  "message": "Rubric deleted successfully"
}
```

### Upload & Processing

#### Upload Submission
```
POST /upload/submission/
Form Data:
  - exam_id (integer): ID of the exam
  - student_id (string): Student identifier
  - file (file): PDF file (max 100MB)

Response:
{
  "id": 1,
  "exam_id": 1,
  "student_id": "S12345",
  "pdf_path": "uploads/exam.pdf",
  "uploaded_at": "2026-05-17T10:30:00"
}
```

#### Get Submission
```
GET /upload/submission/{submission_id}
```

#### List Exam Submissions
```
GET /upload/exam/{exam_id}/submissions
```

### Grading

#### Trigger Manual Grading
```
POST /grade/{answer_id}/trigger

Response:
{
  "message": "Grading triggered",
  "answer_id": 1
}
```

#### Get Grading Status
```
GET /grade/status/{answer_id}

Response:
{
  "answer_id": 1,
  "status": "graded",
  "extracted_text": "...",
  "ai_score": 4.5,
  "justification": {...}
}
```

#### Trigger Batch Grading
```
POST /grade/batch/trigger
Request Body:
{
  "submission_ids": [1, 2, 3]
}

Response:
{
  "message": "Batch grading triggered for 3 answers",
  "count": 3
}
```

### Review & Approval

#### Get Pending Answers
```
GET /review/pending

Response:
[
  {
    "id": 1,
    "student_id": "S12345",
    "question": "Q1",
    "image_url": "http://localhost:8000/artifacts/...",
    "all_pages": ["http://..."],
    "extracted_text": "...",
    "ai_score": 4.5,
    "max_score": 5.0,
    "justification": {...}
  }
]
```

#### Get Pending Count
```
GET /review/pending-count

Response:
{
  "pending_count": 15
}
```

#### Approve Answer
```
POST /review/{answer_id}/approve?final_score=4.5

Response:
{
  "message": "Answer reviewed successfully",
  "answer_id": 1,
  "final_score": 4.5
}
```

#### Override Answer
```
POST /review/{answer_id}/override?final_score=5.0&comments=Excellent work

Response:
{
  "message": "Answer overridden successfully",
  "answer_id": 1,
  "final_score": 5.0
}
```

#### Check Plagiarism
```
GET /review/plagiarism-check/{exam_id}?threshold=0.85

Response:
{
  "exam_id": 1,
  "threshold": 0.85,
  "suspicious_pairs": [
    {
      "answer_1_id": 5,
      "answer_2_id": 12,
      "similarity": 0.92
    }
  ],
  "total_checked": 30
}
```

#### Get Answer Details
```
GET /review/{answer_id}/details

Response:
{
  "id": 1,
  "student_id": "S12345",
  "submission_id": 1,
  "question_number": "1",
  "max_score": 5.0,
  "extracted_text": "...",
  "ai_score": 4.5,
  "final_score": 4.5,
  "status": "reviewed",
  "justification": {...},
  "review": {
    "is_overridden": false,
    "comments": null,
    "reviewed_at": null
  }
}
```

### Monitoring & Analytics

#### Health Check
```
GET /health

Response:
{
  "status": "healthy",
  "database": "connected",
  "storage": {
    "upload_dir_size": 1024000,
    "artifacts_dir_size": 2048000,
    "total_size": 3072000,
    "disk_total": 1000000000000,
    "disk_used": 500000000000,
    "disk_free": 500000000000,
    "disk_percent": 50.0
  }
}
```

#### System Statistics
```
GET /monitor/stats

Response:
{
  "storage": {...},
  "submissions": 25,
  "answers": 100,
  "status_counts": {
    "pending": 10,
    "graded": 60,
    "reviewed": 30
  }
}
```

#### Submissions by Status
```
GET /monitor/submissions-by-status

Response:
{
  "pending": 10,
  "graded": 60,
  "reviewed": 30
}
```

#### Exam Summary
```
GET /monitor/exam-summary/{exam_id}

Response:
{
  "exam_id": 1,
  "exam_title": "Midterm Exam",
  "total_submissions": 25,
  "total_answers": 100,
  "status_breakdown": {
    "pending": 10,
    "graded": 60,
    "reviewed": 30
  },
  "average_score": 82.5
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

#### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Internal server error",
  "error": "Error message (debug mode only)"
}
```

## Rate Limiting
Currently unlimited. In production, implement rate limiting:
- 100 requests/minute for regular endpoints
- 10 file uploads/minute for upload endpoints
- 1000 grading operations/hour for batch operations

## Versioning
Current version: 1.0.0
API versions will be maintained with `/v1/`, `/v2/` prefixes for future versions.

## Webhooks (Future)
- Grade completion notifications
- Plagiarism detection alerts
- System health alerts

## Pagination (Future)
Add limit and offset parameters to list endpoints:
```
GET /config/course/?limit=10&offset=0
```

