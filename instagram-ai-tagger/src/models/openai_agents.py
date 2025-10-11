"""OpenAI GPT-5 vision agents for Instagram creator tagging"""
from typing import Dict, List, Any
from openai import OpenAI
from .base_agent import BaseTaggingAgent
from ..utils.image_helper import ImageHelper


class GPT5Agent(BaseTaggingAgent):
    """
    GPT-5 vision agent.

    Pricing (as of Aug 2025):
    - Input: $1.25 per 1M tokens
    - Output: $5.00 per 1M tokens

    MMMU Benchmark: 84.2%
    """

    # Pricing per 1M tokens
    INPUT_PRICE_PER_1M = 1.25
    OUTPUT_PRICE_PER_1M = 5.00

    def __init__(self, api_key: str):
        super().__init__(model_name="gpt-5-2025-08-07", api_key=api_key)
        self.client = OpenAI(api_key=api_key)
        self.image_helper = ImageHelper()

    def _call_api(self, images: List[str], prompt: str) -> Dict[str, Any]:
        """Call GPT-5 Vision API using Responses API"""

        # Convert images to base64 data URLs and build content array
        content_parts = [{"type": "input_text", "text": prompt}]

        for url in images:
            data_url = self.image_helper.create_data_url(url)
            content_parts.append({"type": "input_image", "image_url": data_url})

        # Build multimodal input for Responses API
        # Use "message" type wrapper with role="user"
        full_input = [{"type": "message", "role": "user", "content": content_parts}]

        # Call Responses API
        response = self.client.responses.create(
            model=self.model_name,
            input=full_input,
            max_output_tokens=1500,
            reasoning={"effort": "minimal"},  # Minimize reasoning for direct output
        )

        # Extract text from response using convenience property
        output_text = response.output_text if hasattr(response, "output_text") else ""

        # Extract tokens from usage
        input_tokens = (
            response.usage.input_tokens
            if hasattr(response.usage, "input_tokens")
            else 0
        )
        output_tokens = (
            response.usage.output_tokens
            if hasattr(response.usage, "output_tokens")
            else 0
        )

        return {
            "response": output_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "metadata": {"model": self.model_name, "finish_reason": "stop"},
        }

    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate GPT-5 cost"""
        input_cost = (input_tokens / 1_000_000) * self.INPUT_PRICE_PER_1M
        output_cost = (output_tokens / 1_000_000) * self.OUTPUT_PRICE_PER_1M
        return input_cost + output_cost


class GPT5MiniAgent(BaseTaggingAgent):
    """
    GPT-5-mini vision agent.

    Pricing (as of Aug 2025):
    - Input: $0.25 per 1M tokens
    - Output: $1.00 per 1M tokens

    MMMU Benchmark: 70%+ (estimated)
    """

    # Pricing per 1M tokens
    INPUT_PRICE_PER_1M = 0.25
    OUTPUT_PRICE_PER_1M = 1.00

    def __init__(self, api_key: str):
        super().__init__(model_name="gpt-5-mini-2025-08-07", api_key=api_key)
        self.client = OpenAI(api_key=api_key)
        self.image_helper = ImageHelper()

    def _call_api(self, images: List[str], prompt: str) -> Dict[str, Any]:
        """Call GPT-5-mini Vision API using Responses API"""

        # Convert images to base64 data URLs and build content array
        content_parts = [{"type": "input_text", "text": prompt}]

        for url in images:
            data_url = self.image_helper.create_data_url(url)
            content_parts.append({"type": "input_image", "image_url": data_url})

        # Build multimodal input for Responses API
        # Use "message" type wrapper with role="user"
        full_input = [{"type": "message", "role": "user", "content": content_parts}]

        # Call Responses API
        response = self.client.responses.create(
            model=self.model_name,
            input=full_input,
            max_output_tokens=1500,
            reasoning={"effort": "minimal"},
        )

        # Extract text from response using convenience property
        output_text = response.output_text if hasattr(response, "output_text") else ""

        # Extract tokens from usage
        input_tokens = (
            response.usage.input_tokens
            if hasattr(response.usage, "input_tokens")
            else 0
        )
        output_tokens = (
            response.usage.output_tokens
            if hasattr(response.usage, "output_tokens")
            else 0
        )

        return {
            "response": output_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "metadata": {"model": self.model_name, "finish_reason": "stop"},
        }

    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate GPT-5-mini cost"""
        input_cost = (input_tokens / 1_000_000) * self.INPUT_PRICE_PER_1M
        output_cost = (output_tokens / 1_000_000) * self.OUTPUT_PRICE_PER_1M
        return input_cost + output_cost
