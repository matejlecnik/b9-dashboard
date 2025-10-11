"""Prompt loading and formatting utilities"""
from pathlib import Path
import re


class PromptHelper:
    """Load and format tagging prompts for different AI services"""

    @staticmethod
    def load_prompt(prompt_path: Path) -> str:
        """
        Load prompt from markdown file.

        Args:
            prompt_path: Path to prompt file

        Returns:
            Prompt text with HTML comments removed
        """
        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

        content = prompt_path.read_text()

        # Remove HTML comments
        content = re.sub(r"<!--.*?-->", "", content, flags=re.DOTALL)

        return content.strip()

    @staticmethod
    def get_default_prompt() -> str:
        """
        Load the default unified tagging prompt.

        Returns:
            Unified prompt text from prompts/unified_tagging_prompt.md
        """
        # Get project root (instagram-ai-tagger/)
        current_file = Path(__file__)
        project_root = current_file.parent.parent.parent

        prompt_path = project_root / "prompts" / "unified_tagging_prompt.md"

        return PromptHelper.load_prompt(prompt_path)
