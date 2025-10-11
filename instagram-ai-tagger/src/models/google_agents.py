"""Google Gemini vision agents for Instagram creator tagging"""
from typing import Dict, List, Any
import google.generativeai as genai
from PIL import Image
import requests
from io import BytesIO
from .base_agent import BaseTaggingAgent


class GeminiFlashAgent(BaseTaggingAgent):
    """
    Gemini 2.5 Flash vision agent.

    Pricing:
    - Input: $0.30 per 1M tokens
    - Output: $2.50 per 1M tokens (not usually charged for vision)

    MMMU Benchmark: 79.7%
    """

    # Pricing per 1M tokens
    INPUT_PRICE_PER_1M = 0.30
    OUTPUT_PRICE_PER_1M = 2.50

    def __init__(self, api_key: str):
        super().__init__(model_name="gemini-2.5-flash", api_key=api_key)
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.model_name)

    def _call_api(self, images: List[str], prompt: str) -> Dict[str, Any]:
        """Call Gemini Flash API"""

        # Download and convert images to PIL Image objects
        pil_images = []
        for url in images:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            pil_images.append(Image.open(BytesIO(response.content)))

        # Build content list (prompt + images)
        content = [prompt] + pil_images

        # Call API
        response = self.model.generate_content(content)

        # Extract token usage from response
        try:
            input_tokens = response.usage_metadata.prompt_token_count
            output_tokens = response.usage_metadata.candidates_token_count
        except AttributeError:
            # Fallback if usage metadata not available
            input_tokens = 1290 * len(images)  # Estimated: ~1290 tokens per image
            output_tokens = 150  # Estimated

        return {
            "response": response.text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "metadata": {"model": self.model_name, "finish_reason": "stop"},
        }

    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate Gemini Flash cost"""
        input_cost = (input_tokens / 1_000_000) * self.INPUT_PRICE_PER_1M
        output_cost = (output_tokens / 1_000_000) * self.OUTPUT_PRICE_PER_1M
        return input_cost + output_cost


class GeminiFlashLiteAgent(BaseTaggingAgent):
    """
    Gemini 2.5 Flash-Lite vision agent.

    Pricing:
    - Input: $0.10 per 1M tokens
    - Output: $0.40 per 1M tokens

    MMMU Benchmark: Strong (no official score yet)
    """

    # Pricing per 1M tokens
    INPUT_PRICE_PER_1M = 0.10
    OUTPUT_PRICE_PER_1M = 0.40

    def __init__(self, api_key: str):
        super().__init__(model_name="gemini-2.5-flash-lite", api_key=api_key)
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.model_name)

    def _call_api(self, images: List[str], prompt: str) -> Dict[str, Any]:
        """Call Gemini Flash-Lite API"""

        # Download and convert images to PIL Image objects
        pil_images = []
        for url in images:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            pil_images.append(Image.open(BytesIO(response.content)))

        # Build content list
        content = [prompt] + pil_images

        # Call API
        response = self.model.generate_content(content)

        # Extract token usage
        try:
            input_tokens = response.usage_metadata.prompt_token_count
            output_tokens = response.usage_metadata.candidates_token_count
        except AttributeError:
            input_tokens = 1290 * len(images)
            output_tokens = 150

        return {
            "response": response.text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "metadata": {"model": self.model_name, "finish_reason": "stop"},
        }

    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate Gemini Flash-Lite cost"""
        input_cost = (input_tokens / 1_000_000) * self.INPUT_PRICE_PER_1M
        output_cost = (output_tokens / 1_000_000) * self.OUTPUT_PRICE_PER_1M
        return input_cost + output_cost
