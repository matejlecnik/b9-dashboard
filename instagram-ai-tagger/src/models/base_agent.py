"""Base agent class for Instagram creator tagging"""
from abc import ABC, abstractmethod
from typing import Dict, List, Any
import time
import json
import re


class BaseTaggingAgent(ABC):
    """
    Abstract base class for AI vision tagging agents.

    All agent implementations must inherit from this class and implement:
    - _call_api(): Send request to specific AI service
    - _calculate_cost(): Calculate cost based on token usage
    """

    def __init__(self, model_name: str, api_key: str):
        """
        Initialize agent.

        Args:
            model_name: Name of the model (e.g., "gpt-5", "gemini-2.5-flash")
            api_key: API key for authentication
        """
        self.model_name = model_name
        self.api_key = api_key
        self.agent_name = self.__class__.__name__

    @abstractmethod
    def _call_api(self, images: List[str], prompt: str) -> Dict[str, Any]:
        """
        Call the AI service API.

        Args:
            images: List of image URLs or base64 encoded strings
            prompt: Tagging prompt text

        Returns:
            Dict with:
                - response: Raw API response text
                - input_tokens: Number of input tokens
                - output_tokens: Number of output tokens
                - metadata: Additional API-specific data
        """
        pass

    @abstractmethod
    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """
        Calculate cost in USD.

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Cost in USD
        """
        pass

    def tag_creator(
        self, images: List[str], prompt: str, creator_username: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Tag a creator using AI vision analysis.

        Args:
            images: List of 5 image URLs (1 profile + 4 content)
            prompt: Full tagging prompt
            creator_username: Username for logging

        Returns:
            Dict with:
                - tags: List of tag strings ["category:value", ...]
                - confidence: Dict of category -> confidence score
                - reasoning: Brief explanation
                - response_time: Time taken in seconds
                - cost: Cost in USD
                - tokens: {input: int, output: int}
                - raw_response: Full API response
                - error: Error message if failed, None otherwise
        """
        start_time = time.time()

        result = {
            "agent": self.agent_name,
            "model": self.model_name,
            "username": creator_username,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "images_analyzed": len(images),
            "tags": [],
            "confidence": {},
            "reasoning": "",
            "response_time": 0.0,
            "cost": 0.0,
            "tokens": {"input": 0, "output": 0},
            "raw_response": None,
            "error": None,
        }

        try:
            # Call API
            api_response = self._call_api(images, prompt)

            # Calculate metrics
            response_time = time.time() - start_time
            cost = self._calculate_cost(
                api_response["input_tokens"], api_response["output_tokens"]
            )

            # Parse response
            parsed = self._parse_response(api_response["response"])

            # Update result
            result.update(
                {
                    "tags": parsed["tags"],
                    "confidence": parsed["confidence"],
                    "reasoning": parsed.get("reasoning", ""),
                    "response_time": response_time,
                    "cost": cost,
                    "tokens": {
                        "input": api_response["input_tokens"],
                        "output": api_response["output_tokens"],
                    },
                    "raw_response": api_response,
                }
            )

        except Exception as e:
            result["error"] = str(e)
            result["response_time"] = time.time() - start_time
            print(f"❌ {self.agent_name} failed for {creator_username}: {str(e)}")

        return result

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse AI response into structured format.

        Args:
            response_text: Raw text response from AI

        Returns:
            Dict with tags, confidence, and reasoning

        Raises:
            ValueError: If response cannot be parsed
        """
        # Try to extract JSON from response
        json_text = response_text.strip()

        # Handle markdown code blocks
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()

        # Try to find JSON object
        json_match = re.search(r"\{.*\}", json_text, re.DOTALL)
        if json_match:
            json_text = json_match.group(0)

        try:
            data = json.loads(json_text)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Failed to parse JSON: {str(e)}\nResponse: {response_text[:200]}"
            )

        # Validate structure
        if "tags" not in data or "confidence" not in data:
            raise ValueError(
                f"Missing required fields (tags, confidence)\nData: {data}"
            )

        return {
            "tags": data["tags"],
            "confidence": data["confidence"],
            "reasoning": data.get("reasoning", "No reasoning provided"),
        }

    def __repr__(self) -> str:
        return f"{self.agent_name}(model={self.model_name})"
