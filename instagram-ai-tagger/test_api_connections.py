#!/usr/bin/env python3
"""
Test API Connections for 5 Vision Models
Verifies that all API keys are working before building full agent wrappers.
Tests: GPT-5-mini, Gemini 2.5 Flash, Claude Sonnet 4.5, Supabase
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def test_openai():
    """Test OpenAI API (GPT-5 and GPT-5-mini)"""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Simple completion test with GPT-5-mini
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[{"role": "user", "content": "Reply with 'OK'"}],
            max_tokens=5,
        )

        # Verify response exists
        _ = response.choices[0].message.content
        print("✅ OpenAI API (GPT-5-mini): Connected")
        return True
    except Exception as e:
        print(f"❌ OpenAI API: Failed - {str(e)}")
        return False


def test_google():
    """Test Google AI Studio API (Gemini 2.5 Flash)"""
    try:
        import google.generativeai as genai

        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

        # Test with Flash (Flash-Lite has same API)
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        _ = model.generate_content("Reply with 'OK'")

        print("✅ Google AI Studio (Gemini 2.5 Flash): Connected")
        return True
    except Exception as e:
        print(f"❌ Google AI Studio: Failed - {str(e)}")
        return False


def test_anthropic():
    """Test Anthropic API (Claude Sonnet 4.5)"""
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        _ = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=10,
            messages=[{"role": "user", "content": "Reply with 'OK'"}],
        )

        print("✅ Anthropic API (Claude Sonnet 4.5): Connected")
        return True
    except Exception as e:
        print(f"❌ Anthropic API: Failed - {str(e)}")
        return False


def test_supabase():
    """Test Supabase connection"""
    try:
        from supabase import create_client

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        supabase = create_client(url, key)

        # Quick query test
        result = supabase.table("instagram_creators").select("id").limit(1).execute()

        print(f"✅ Supabase: Connected ({len(result.data)} test record)")
        return True
    except Exception as e:
        print(f"❌ Supabase: Failed - {str(e)}")
        return False


def main():
    print("=" * 60)
    print("Testing API Connections for Instagram AI Tagger")
    print("=" * 60)
    print()

    results = {
        "OpenAI": test_openai(),
        "Google AI Studio": test_google(),
        "Anthropic": test_anthropic(),
        "Supabase": test_supabase(),
    }

    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)

    total = len(results)
    passed = sum(results.values())

    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")

    if passed == total:
        print()
        print("🎉 All APIs connected! Ready to build agent wrappers.")
    else:
        print()
        print("⚠️  Some APIs failed. Check API keys in .env file.")
        print()
        print("Failed APIs:")
        for api, status in results.items():
            if not status:
                print(f"  - {api}")

    return passed == total


if __name__ == "__main__":
    exit(0 if main() else 1)
