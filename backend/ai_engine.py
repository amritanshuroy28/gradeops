import json
import logging
from typing import Dict, Any, List, Tuple
import base64
import io
from pathlib import Path
from logger import get_logger
from config import settings
import numpy as np
import requests

logger = get_logger(__name__)

class VLMExtractor:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.vlm_model
        self.api_key = settings.nvidia_nim_api_key
        self.base_url = settings.nvidia_nim_base_url
        logger.info(f"Initializing VLM: {self.model_name}")

        if not self.api_key:
            logger.warning("NVIDIA_NIM_API_KEY not set, VLM extraction will not work")

    def extract_text(self, image_path: str) -> str:
        try:
            if not self.api_key:
                return self._extract_text_mock()

            with open(image_path, "rb") as img_file:
                image_data = base64.standard_b64encode(img_file.read()).decode("utf-8")

            return self._extract_text_nvidia(image_data, image_path)
        except Exception as e:
            logger.error(f"Error extracting text from {image_path}: {e}")
            return self._extract_text_mock()

    def _extract_text_nvidia(self, image_data: str, image_path: str = None) -> str:
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": self.model_name,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_data}"
                                }
                            },
                            {
                                "type": "text",
                                "text": "Extract all text from this exam answer image. Be precise and complete."
                            }
                        ]
                    }
                ],
                "max_tokens": 2048
            }

            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                extracted_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                logger.info(f"Successfully extracted text using NVIDIA NIM VLM")
                return extracted_text
            else:
                logger.error(f"NVIDIA NIM API error: {response.status_code} - {response.text}")
                return self._extract_text_mock()
        except Exception as e:
            logger.error(f"Error calling NVIDIA NIM VLM: {e}")
            return self._extract_text_mock()

    def _extract_text_mock(self) -> str:
        logger.info("Using mock VLM")
        return "Mock extracted text: The student provided a comprehensive answer demonstrating understanding of the core concepts."


class GradingAgent:
    def __init__(self):
        logger.info("Initializing Grading Agent")
        self.vlm = VLMExtractor(model_name=settings.vlm_model)
        self.api_key = settings.nvidia_nim_api_key
        self.base_url = settings.nvidia_nim_base_url

        if not self.api_key:
            logger.warning("NVIDIA_NIM_API_KEY not set, grading will use basic evaluation")

    def grade_answer(self, extracted_text: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if self.api_key:
                return self._grade_with_nvidia(extracted_text, rubric)
            else:
                return self._grade_basic(extracted_text, rubric)
        except Exception as e:
            logger.error(f"Error grading answer: {e}")
            return {
                "score": 0,
                "max_score": rubric.get("max_score", 5.0),
                "justification": {"error": str(e)},
                "success": False
            }

    def _grade_with_nvidia(self, extracted_text: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        try:
            criteria = rubric.get("criteria", {})
            max_score = rubric.get("max_score", 5.0)
            question = rubric.get("question_number", "Unknown")

            prompt = f"""You are an expert exam grader. Grade the following student answer according to the rubric.

Question: {question}
Student Answer: {extracted_text}

Rubric Criteria:
"""
            for criterion_key, criterion in criteria.items():
                condition = criterion.get("condition", "")
                points = criterion.get("points", 0)
                prompt += f"\n- {condition} ({points} points)"

            prompt += f"\n\nRespond in JSON format with:"
            prompt += "\n{\"score\": <total_score>, \"justification\": {{\"criterion_1\": {{\"met\": true/false, \"explanation\": \"...\"}}, ...}}, \"feedback\": \"...\"}"

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": settings.llm_model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 1024
            }

            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")

                try:
                    # Strip markdown code fences if present (LLMs often wrap JSON in ```json ... ```)
                    response_text = response_text.strip()
                    if response_text.startswith("```"):
                        lines = response_text.split("\n")
                        # Remove first line (```json or ```) and last line (```)
                        response_text = "\n".join(lines[1:-1]).strip()
                    grade_data = json.loads(response_text)
                    score = min(grade_data.get("score", 0), max_score)

                    justification = {}
                    for i, (criterion_key, criterion) in enumerate(criteria.items(), 1):
                        criterion_data = grade_data.get("justification", {}).get(f"criterion_{i}", {})
                        justification[f"criterion_{i}"] = {
                            "condition": criterion.get("condition", ""),
                            "met": criterion_data.get("met", False),
                            "score_awarded": criterion.get("points", 0) if criterion_data.get("met") else 0,
                            "explanation": criterion_data.get("explanation", "")
                        }

                    return {
                        "score": score,
                        "max_score": max_score,
                        "justification": justification,
                        "feedback": grade_data.get("feedback", ""),
                        "success": True
                    }
                except json.JSONDecodeError:
                    logger.warning("Failed to parse NVIDIA NIM response as JSON, falling back to basic grading")
                    return self._grade_basic(extracted_text, rubric)
            else:
                logger.error(f"NVIDIA NIM API error: {response.status_code} - {response.text}")
                return self._grade_basic(extracted_text, rubric)
        except Exception as e:
            logger.error(f"Error grading with NVIDIA NIM: {e}")
            return self._grade_basic(extracted_text, rubric)

    def _grade_basic(self, extracted_text: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        try:
            criteria = rubric.get("criteria", {})
            if isinstance(criteria, str):
                try:
                    criteria = json.loads(criteria)
                except Exception:
                    criteria = {}
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

            percentage = round((total_score / max_score * 100) if max_score > 0 else 0, 1)
            feedback = self._generate_feedback(justification, total_score, max_score)

            return {
                "score": total_score,
                "max_score": max_score,
                "justification": justification,
                "feedback": feedback,
                "success": True
            }
        except Exception as e:
            logger.error(f"Error in basic grading: {e}")
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
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("SentenceTransformer model loaded successfully")
        except ImportError:
            logger.warning("sentence_transformers not installed, plagiarism detection disabled")
            self.model = None
        except Exception as e:
            logger.error(f"Error loading SentenceTransformer: {e}")
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
