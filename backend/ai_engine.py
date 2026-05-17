import json
import logging
from typing import Dict, Any, List, Tuple
import base64
import io
from pathlib import Path
from logger import get_logger
from config import settings
import numpy as np

logger = get_logger(__name__)

class VLMExtractor:
    def __init__(self, model_name: str = "qwen-vl"):
        self.model_name = model_name
        self.is_mock = True
        logger.info(f"Initializing VLM: {model_name}")
    
    def extract_text(self, image_path: str) -> str:
        try:
            if self.is_mock:
                return self._extract_text_mock(image_path)
        except Exception as e:
            logger.error(f"Error extracting text from {image_path}: {e}")
            return f"[Error extracting text: {str(e)}]"
    
    def _extract_text_mock(self, image_path: str) -> str:
        logger.info(f"Using mock VLM for {image_path}")
        return "Mock extracted text: The student provided a comprehensive answer demonstrating understanding of the core concepts."


class GradingAgent:
    def __init__(self):
        logger.info("Initializing Grading Agent")
        self.vlm = VLMExtractor(model_name=settings.vlm_model)
    
    def grade_answer(self, extracted_text: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        try:
            criteria = rubric.get("criteria", {})
            max_score = rubric.get("max_score", 5.0)
            
            justification = {}
            total_score = 0.0
            
            for i, (criterion_key, criterion) in enumerate(criteria.items(), 1):
                condition = criterion.get("condition", "")
                points = criterion.get("points", 0)
                
                met = self._evaluate_condition(condition, extracted_text)
                
                justification[f"criterion_{i}"] = {
                    "condition": condition,
                    "met": met,
                    "score_awarded": points if met else 0,
                    "explanation": f"Criterion: {condition} - {'Met' if met else 'Not met'}"
                }
                
                if met:
                    total_score += points
            
            total_score = min(total_score, max_score)
            
            justification["summary"] = {
                "total_score": total_score,
                "max_score": max_score,
                "percentage": round((total_score / max_score * 100) if max_score > 0 else 0, 1),
                "feedback": self._generate_feedback(justification, total_score, max_score)
            }
            
            return {
                "score": total_score,
                "max_score": max_score,
                "justification": justification,
                "success": True
            }
        except Exception as e:
            logger.error(f"Error grading answer: {e}")
            return {
                "score": 0,
                "max_score": rubric.get("max_score", 5.0),
                "justification": {"error": str(e)},
                "success": False
            }
    
    def _evaluate_condition(self, condition: str, text: str) -> bool:
        keywords = condition.lower().split()
        text_lower = text.lower()
        
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        return matches >= len(keywords) * 0.6
    
    def _generate_feedback(self, justification: Dict, score: float, max_score: float) -> str:
        met_criteria = sum(1 for k, v in justification.items() if k.startswith("criterion") and v.get("met"))
        total_criteria = sum(1 for k in justification.keys() if k.startswith("criterion"))
        
        percentage = score / max_score * 100 if max_score > 0 else 0
        
        if percentage >= 90:
            grade = "Excellent"
        elif percentage >= 80:
            grade = "Good"
        elif percentage >= 70:
            grade = "Satisfactory"
        elif percentage >= 60:
            grade = "Passing"
        else:
            grade = "Needs Improvement"
        
        return f"{grade}: Student met {met_criteria}/{total_criteria} criteria for {score:.1f}/{max_score} points ({percentage:.1f}%)"


class PlagiarismDetector:
    def __init__(self):
        logger.info("Initializing Plagiarism Detector")
        self.model = None
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        if not self.model:
            logger.warning("Plagiarism detector not initialized, returning 0")
            return 0.0
        
        try:
            embeddings = self.model.encode([text1, text2], convert_to_tensor=False)
            from scipy.spatial.distance import cosine
            similarity = 1 - cosine(embeddings[0], embeddings[1])
            return float(np.clip(similarity, 0.0, 1.0))
        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            return 0.0
    
    def detect_plagiarism(self, texts: List[str], threshold: float = 0.85) -> List[Tuple[int, int, float]]:
        if not self.model:
            return []
        
        suspicious_pairs = []
        
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                similarity = self.compute_similarity(texts[i], texts[j])
                if similarity >= threshold:
                    suspicious_pairs.append((i, j, similarity))
                    logger.warning(f"High similarity detected between answers {i} and {j}: {similarity:.3f}")
        
        return suspicious_pairs


grading_agent = GradingAgent()
plagiarism_detector = PlagiarismDetector()

def extract_text_from_image(image_path: str) -> str:
    return grading_agent.vlm.extract_text(image_path)

def agentic_grade_answer(extracted_text: str, rubric_criteria: Dict[str, Any]) -> Dict[str, Any]:
    return grading_agent.grade_answer(extracted_text, rubric_criteria)

def check_similarity(text1: str, text2: str, threshold: float = settings.similarity_threshold) -> float:
    return plagiarism_detector.compute_similarity(text1, text2)

def detect_plagiarism_batch(texts: List[str], threshold: float = settings.similarity_threshold) -> List[Dict]:
    suspicious_pairs = plagiarism_detector.detect_plagiarism(texts, threshold)
    return [
        {"answer_1": i, "answer_2": j, "similarity": sim}
        for i, j, sim in suspicious_pairs
    ]
