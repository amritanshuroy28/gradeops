import os
import fitz
import pdfplumber
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any
from pathlib import Path
from logger import get_logger
from config import settings
import tempfile
from PIL import Image

logger = get_logger(__name__)

os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.artifacts_dir, exist_ok=True)

UPLOAD_DIR = settings.upload_dir
ARTIFACTS_DIR = settings.artifacts_dir


def process_pdf(file_path: str, submission_id: int) -> List[str]:
    image_paths = []
    try:
        doc = fitz.open(file_path)
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            
            output_path = os.path.join(ARTIFACTS_DIR, f"sub_{submission_id}_page_{page_num}.png")
            pix.save(output_path)
            image_paths.append(output_path)
            
            logger.info(f"Processed page {page_num} for submission {submission_id}")
        
        doc.close()
    except Exception as e:
        logger.error(f"Error processing PDF {file_path}: {e}")
        raise
    
    return image_paths


def detect_text_regions(image_path: str) -> List[Tuple[int, int, int, int]]:
    try:
        image = cv2.imread(image_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        bounding_boxes = []
        min_area = 1000
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w * h > min_area:
                bounding_boxes.append((x, y, w, h))
        
        bounding_boxes.sort(key=lambda box: (box[1], box[0]))
        
        return bounding_boxes
    except Exception as e:
        logger.error(f"Error detecting text regions in {image_path}: {e}")
        return []


def crop_answer_regions(image_path: str, bounding_boxes: List[Tuple[int, int, int, int]]) -> List[str]:
    cropped_paths = []
    try:
        image = cv2.imread(image_path)
        base_name = Path(image_path).stem
        
        for idx, (x, y, w, h) in enumerate(bounding_boxes):
            cropped = image[y:y+h, x:x+w]
            
            output_path = os.path.join(ARTIFACTS_DIR, f"{base_name}_crop_{idx}.png")
            cv2.imwrite(output_path, cropped)
            cropped_paths.append(output_path)
            
            logger.debug(f"Cropped region {idx} from {image_path}")
        
    except Exception as e:
        logger.error(f"Error cropping answer regions from {image_path}: {e}")
    
    return cropped_paths


def extract_student_id_from_pdf(file_path: str) -> str:
    try:
        with pdfplumber.open(file_path) as pdf:
            first_page = pdf.pages[0]
            text = first_page.extract_text()
            
            lines = text.split('\n')
            for line in lines[:5]:
                if 'id' in line.lower() or 'student' in line.lower():
                    parts = line.split()
                    for part in parts:
                        if part.isdigit() or part.startswith('S'):
                            return part
        
        return None
    except Exception as e:
        logger.warning(f"Could not extract student ID from {file_path}: {e}")
        return None


def cleanup_submission_files(submission_id: int, keep_originals: bool = False) -> None:
    try:
        pattern = os.path.join(ARTIFACTS_DIR, f"sub_{submission_id}_*")
        import glob
        files = glob.glob(pattern)
        
        for file in files:
            if keep_originals and file.endswith('_page_0.png'):
                continue
            try:
                os.remove(file)
                logger.debug(f"Deleted {file}")
            except Exception as e:
                logger.warning(f"Could not delete {file}: {e}")
    except Exception as e:
        logger.error(f"Error cleaning up files for submission {submission_id}: {e}")


def validate_file_size(file_size: int, max_size: int = settings.max_upload_size) -> Tuple[bool, str]:
    if file_size > max_size:
        return False, f"File size {file_size} exceeds maximum {max_size}"
    return True, "OK"


def get_storage_stats() -> Dict[str, Any]:
    try:
        import shutil
        
        upload_size = sum(
            os.path.getsize(os.path.join(UPLOAD_DIR, f))
            for f in os.listdir(UPLOAD_DIR)
            if os.path.isfile(os.path.join(UPLOAD_DIR, f))
        ) if os.path.exists(UPLOAD_DIR) else 0
        
        artifacts_size = sum(
            os.path.getsize(os.path.join(ARTIFACTS_DIR, f))
            for f in os.listdir(ARTIFACTS_DIR)
            if os.path.isfile(os.path.join(ARTIFACTS_DIR, f))
        ) if os.path.exists(ARTIFACTS_DIR) else 0
        
        total_disk = shutil.disk_usage("/")
        
        return {
            "upload_dir_size": upload_size,
            "artifacts_dir_size": artifacts_size,
            "total_size": upload_size + artifacts_size,
            "disk_total": total_disk.total,
            "disk_used": total_disk.used,
            "disk_free": total_disk.free,
            "disk_percent": (total_disk.used / total_disk.total) * 100
        }
    except Exception as e:
        logger.error(f"Error getting storage stats: {e}")
        return {}
