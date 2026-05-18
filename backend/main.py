from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
import os
import time

import models, schemas, database
from database import engine
from routers import upload, config, grade, review, monitor
from config import settings
from logger import get_logger
import utils

logger = get_logger(__name__)

if settings.hf_token:
    os.environ["HF_TOKEN"] = settings.hf_token
    os.environ["HUGGING_FACE_HUB_TOKEN"] = settings.hf_token

models.Base.metadata.create_all(bind=engine)

def init_default_user():
    db = database.SessionLocal()
    try:
        existing_user = db.query(models.User).filter(models.User.id == 1).first()
        if not existing_user:
            default_user = models.User(id=1, username="instructor", role="instructor")
            db.add(default_user)
            db.commit()
            logger.info("Created default instructor user")
    except Exception as e:
        logger.error(f"Error creating default user: {e}")
    finally:
        db.close()

init_default_user()

os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.artifacts_dir, exist_ok=True)

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    debug=settings.debug
)

app.mount("/artifacts", StaticFiles(directory=settings.artifacts_dir), name="artifacts")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc) if settings.debug else None}
    )

app.include_router(upload.router)
app.include_router(config.router)
app.include_router(grade.router)
app.include_router(review.router)
app.include_router(monitor.router)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {
        "message": "Welcome to GRADEOPS API",
        "version": settings.api_version,
        "status": "healthy"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        stats = utils.get_storage_stats()
        return {
            "status": "healthy",
            "database": "connected",
            "storage": stats
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"}
        )

@app.post("/auth/login")
def login(username: str, role: str):
    if role not in ["instructor", "ta"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    logger.info(f"Login attempt: {username} ({role})")
    return {"access_token": f"mock-token-{username}", "role": role}

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    new_user = models.User(username=user.username, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"Created user: {user.username}")
    return new_user

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
