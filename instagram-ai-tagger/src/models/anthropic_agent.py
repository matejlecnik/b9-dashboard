"""Anthropic Claude vision agent for Instagram creator tagging"""
from typing import Dict, List, Any
import anthropic
from .base_agent import BaseTaggingAgent
from ..utils.image_helper import ImageHelper


class ClaudeSonnet45Agent(BaseTaggingAgent):
    """
    Claude Sonnet 4.5 vision agent.

    Pricing:
    - Input: $3.00 per 1M tokens
    - Output: $15.00 per 1M tokens

    MMMU Benchmark: 74.4%
    Best reasoning capabilities among all agents.
    """

    # Pricing per 1M tokens
    INPUT_PRICE_PER_1M = 3.00
    OUTPUT_PRICE_PER_1M = 15.00

    def __init__(self, api_key: str):
        super().__init__(model_name="claude-sonnet-4-20250514", api_key=api_key)
        self.client = anthropic.Anthropic(api_key=api_key)
        self.image_helper = ImageHelper()

    def _call_api(self, images: List[str], prompt: str) -> Dict[str, Any]:
        """Call Claude Sonnet 4.5 Vision API"""

        # Build content with images
        content = []

        # Add images as base64
        for url in images:
            image_bytes = self.image_helper.download_image(url)
            base64_image = self.image_helper.encode_base64(image_bytes)

            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": base64_image,
                    },
                }
            )

        # Add text prompt after images
        content.append({"type": "text", "text": prompt})

        # Call API
        response = self.client.messages.create(
            model=self.model_name,
            max_tokens=500,
            temperature=0.3,
            messages=[{"role": "user", "content": content}],
        )

        return {
            "response": response.content[0].text,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "metadata": {"model": response.model, "stop_reason": response.stop_reason},
        }

    def _calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate Claude Sonnet 4.5 cost"""
        input_cost = (input_tokens / 1_000_000) * self.INPUT_PRICE_PER_1M
        output_cost = (output_tokens / 1_000_000) * self.OUTPUT_PRICE_PER_1M
        return input_cost + output_cost
