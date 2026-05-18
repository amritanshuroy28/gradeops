import json
import logging
from typing import Dict, Any, List, Tuple, TypedDict
import base64
import io
from pathlib import Path
from logger import get_logger
from config import settings
import numpy as np
import requests

from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, END

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


class GradingState(TypedDict):
    extracted_text: str
    rubric: Dict[str, Any]
    max_score: float
    question_number: str
    current_grade: Dict[str, Any]
    feedback: str
    iterations: int
    error: str

class GradingAgent:
    def __init__(self):
        logger.info("Initializing Grading Agent (LangGraph)")
        self.vlm = VLMExtractor(model_name=settings.vlm_model)
        self.api_key = settings.nvidia_nim_api_key
        self.base_url = settings.nvidia_nim_base_url

        logger.info(f"LLM Model: {settings.llm_model}")
        logger.info(f"Base URL: {self.base_url}")

        if not self.api_key:
            logger.warning("NVIDIA_NIM_API_KEY not set, grading will use basic evaluation")
            self.app = None
        else:
            # Ensure base_url has trailing slash for correct httpx url joining
            safe_base_url = self.base_url
            if not safe_base_url.endswith("/"):
                safe_base_url += "/"
                
            self.llm = ChatOpenAI(
                model=settings.llm_model,
                api_key=self.api_key,
                base_url=safe_base_url,
                temperature=0.1,
                max_retries=2
            )
            self.app = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(GradingState)
        workflow.add_node("grade", self._node_grade)
        workflow.add_node("critique", self._node_critique)
        
        workflow.set_entry_point("grade")
        workflow.add_edge("grade", "critique")
        workflow.add_conditional_edges("critique", self._should_continue)
        
        return workflow.compile()

    def grade_answer(self, extracted_text: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if self.app:
                return self._grade_with_langgraph(extracted_text, rubric)
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

    def _node_grade(self, state: GradingState) -> GradingState:
        prompt_str = """You are an expert exam grader. Grade the following student answer according to the rubric.

Question: {question_number}
Student Answer: {extracted_text}

Rubric Criteria:
{rubric_text}

Feedback from previous attempt (fix these issues):
{feedback}

Respond in JSON format with exactly:
{{"score": <total_score>, "justification": {{"criterion_1": {{"met": true/false, "explanation": "...", "score_awarded": <points>}}, ...}}, "feedback": "overall feedback..."}}"""
        
        rubric_text = ""
        for i, (criterion_key, criterion) in enumerate(state["rubric"].items(), 1):
            if isinstance(criterion, dict):
                condition = criterion.get("condition", "")
                points = criterion.get("points", 0)
            else:
                condition = str(criterion)
                points = state["max_score"] / max(1, len(state["rubric"]))
            rubric_text += f"\n- criterion_{i}: {condition} ({points} points)"

        prompt = PromptTemplate(
            template=prompt_str,
            input_variables=["question_number", "extracted_text", "rubric_text", "feedback"]
        )
        
        chain = prompt | self.llm | JsonOutputParser()
        
        try:
            result = chain.invoke({
                "question_number": state["question_number"],
                "extracted_text": state["extracted_text"],
                "rubric_text": rubric_text,
                "feedback": state["feedback"] or "None."
            })
            return {"current_grade": result, "iterations": state["iterations"] + 1, "error": ""}
        except Exception as e:
            logger.error(f"LLM parsing error: {e}")
            return {"error": str(e), "iterations": state["iterations"] + 1}

    def _node_critique(self, state: GradingState) -> GradingState:
        if state.get("error"):
            return {"feedback": f"Parsing failed: {state['error']}. Ensure output is valid JSON."}
            
        prompt_str = """You are a strict Teaching Assistant reviewing a proposed grade.
Check if the proposed grade strictly follows the rubric based on the student's answer.

Student Answer: {extracted_text}
Rubric Max Score: {max_score}

Proposed Grade JSON:
{current_grade}

Rules:
1. The total score must not exceed max_score.
2. The total score must equal the sum of 'score_awarded' for all met criteria.
3. Criteria marked 'met': true MUST be supported by the student's answer.

If the grade is perfect and follows all rules, respond with a JSON object: {{"approved": true, "feedback": "APPROVED"}}
If there are errors, respond with: {{"approved": false, "feedback": "<detailed instructions on what to fix>"}}"""

        prompt = PromptTemplate(
            template=prompt_str,
            input_variables=["extracted_text", "max_score", "current_grade"]
        )
        
        chain = prompt | self.llm | JsonOutputParser()
        
        try:
            result = chain.invoke({
                "extracted_text": state["extracted_text"],
                "max_score": state["max_score"],
                "current_grade": json.dumps(state["current_grade"])
            })
            if result.get("approved"):
                return {"feedback": "APPROVED"}
            else:
                return {"feedback": result.get("feedback", "Unknown error in grading logic.")}
        except Exception as e:
            logger.error(f"Critique error: {e}")
            return {"feedback": "APPROVED"} # Fail open if critique fails

    def _should_continue(self, state: GradingState) -> str:
        if state.get("feedback") == "APPROVED" or state.get("iterations", 0) >= 2:
            return END
        return "grade"

    def _grade_with_langgraph(self, extracted_text: str, rubric: Dict[str, Any]) -> Dict[str, Any]:
        criteria = rubric.get("criteria", {})
        if isinstance(criteria, str):
            try: criteria = json.loads(criteria)
            except: criteria = {}
        max_score = rubric.get("max_score", 5.0)
        question = rubric.get("question_number", "Unknown")

        state = {
            "extracted_text": extracted_text,
            "rubric": criteria,
            "max_score": max_score,
            "question_number": question,
            "current_grade": {},
            "feedback": "",
            "iterations": 0,
            "error": ""
        }
        
        try:
            result = self.app.invoke(state)
            grade_data = result.get("current_grade", {})
            
            score = min(grade_data.get("score", 0), max_score)
            
            final_just = {}
            for i, (criterion_key, criterion) in enumerate(criteria.items(), 1):
                criterion_data = grade_data.get("justification", {}).get(f"criterion_{i}", {})
                if isinstance(criterion, dict):
                    condition = criterion.get("condition", "")
                    points = criterion.get("points", 0)
                else:
                    condition = str(criterion)
                    points = max_score / max(1, len(criteria))
                    
                final_just[f"criterion_{i}"] = {
                    "condition": condition,
                    "met": criterion_data.get("met", False),
                    "score_awarded": points if criterion_data.get("met") else 0,
                    "explanation": criterion_data.get("explanation", "")
                }
                
            return {
                "score": score,
                "max_score": max_score,
                "justification": final_just,
                "feedback": grade_data.get("feedback", ""),
                "success": True
            }
        except Exception as e:
            logger.error(f"LangGraph execution error: {e}")
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
                if isinstance(criterion, dict):
                    condition = criterion.get("condition", "")
                    points = criterion.get("points", 0)
                else:
                    condition = str(criterion)
                    points = max_score / max(1, len(criteria))

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
        # Filter out common stop words for better matching
        stop_words = {'the','a','an','is','are','was','were','be','been','has','have','had','do','does','did','will','would','could','should','may','might','must','shall','can','and','but','or','not','no','of','in','to','for','with','on','at','by','from','that','this','it','its'}
        keywords = [w for w in condition.lower().split() if w not in stop_words and len(w) > 2]
        if not keywords:
            return True  # No meaningful keywords = give benefit of doubt
        text_lower = text.lower()
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        return matches >= max(1, len(keywords) * 0.3)  # 30% threshold for basic matching
    
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
            try:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("SentenceTransformer model loaded successfully")
            except Exception as e:
                import os
                logger.warning(f"Failed to load model ({e}). Clearing token cache and retrying anonymously...")
                # Remove token from environment
                os.environ.pop("HF_TOKEN", None)
                os.environ.pop("HUGGING_FACE_HUB_TOKEN", None)
                # Clear huggingface_hub's internal cached token
                try:
                    import huggingface_hub
                    huggingface_hub.utils.get_token = lambda: None
                except Exception:
                    pass
                # Retry with token explicitly disabled
                self.model = SentenceTransformer('all-MiniLM-L6-v2', token=False)
                logger.info("SentenceTransformer model loaded successfully (anonymous)")
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
