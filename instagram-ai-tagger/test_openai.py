"""Quick OpenAI GPT-4 Vision test with sophieraiin images"""
import os
from openai import OpenAI
import json
import requests
import base64

# Initialize OpenAI client
# Replace with your actual API key or set OPENAI_API_KEY environment variable
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY_HERE"))

# CAROUSEL PHOTO POSTS from sophieraiin (7.7M followers)
# These are static photos from photo galleries, NOT reels/videos
# Scraped Oct 6-7, 2025 - thumbnail_url = first photo of each carousel
TEST_IMAGES = [
    # "team messi or ronaldo? ⚽️" - 274K likes, 4 photos
    "https://instagram.fbcn13-1.fna.fbcdn.net/v/t51.2885-15/536651983_17970426905954124_2729905527388843726_n.jpg?stp=dst-jpg_e35_p1080x1080_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0uaW1hZ2VfdXJsZ2VuLjE0NDB4MTkxMC5zZHIuZjgyNzg3LmRlZmF1bHRfaW1hZ2UuZXhwZXJpbWVudGFsIn0&_nc_ht=instagram.fbcn13-1.fna.fbcdn.net&_nc_cat=100&_nc_oc=Q6cZ2QH0uUwhYWa6ovSWC2nL3pvUr1zv6AB2g-jnm-ec3pJk41FHo4Ate_oaXnuO0pbs1mI&_nc_ohc=xxCYCq-dT8cQ7kNvwGepad7&_nc_gid=7hLcTTbrI7hBXCFqON9A9A&edm=ABmJApABAAAA&ccb=7-5&ig_cache_key=MzcwNDY2ODMxNTM3NzY2NTY4OA%3D%3D.3-ccb7-5&oh=00_Afev3NId8dwJIVzOVhUiz36TLdfCG2KIQL3nCsX44zoJNA&oe=68EA7540&_nc_sid=b41fef",

    # "unforgettable ⛱️" - 204K likes, 5 photos
    "https://scontent.cdninstagram.com/v/t51.82787-15/542611366_17972075009954124_6963500725531153316_n.jpg?stp=dst-jpg_e35_p1080x1080_tt6&_nc_cat=111&ig_cache_key=MzcxNDc2NzQ1MDg5OTYzMjUyNw%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTkxMC5zZHIuQzMifQ%3D%3D&_nc_ohc=6-uN8DR8iiQQ7kNvwGP4XkP&_nc_oc=AdkTbm29pPKpclMgSajCIXAfdSoMQIyMy7KBi2hpq6hz-jYvy1zEtNT6MNyf1b4Y6UQ&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=7hLcTTbrI7hBXCFqON9A9A&oh=00_AfcK61ureAtqN8fs-o8uCn69aDg2lReYKjDUPLKAl8vsUQ&oe=68EA5464",

    # "missin u" - 160K likes, 4 photos
    "https://scontent.cdninstagram.com/v/t51.82787-15/528861013_17968980614954124_6209965349532182145_n.jpg?stp=dst-jpg_e35_p1080x1080_tt6&_nc_cat=107&ig_cache_key=MzY5NTg3NTM1NTc0MzY0NTQ4MA%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTkxMS5zZHIuQzMifQ%3D%3D&_nc_ohc=aCx12SZGHasQ7kNvwFZRdet&_nc_oc=AdmheJTeFqCIBO9Su1Qcfo4qdmm_NVhPy-H0dzOtSNEY-yBc_8Oi2tr981tdTdZ5gD8&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=7hLcTTbrI7hBXCFqON9A9A&oh=00_AfcjRZQZJzIUjLfngV9aOu_gtwyOMvBQ_y3YIi6cMU8S1w&oe=68EA5866",

    # "parks > beaches" - 150K likes, 4 photos
    "https://scontent.cdninstagram.com/v/t51.82787-15/523511500_17967057044954124_3361016621652352961_n.jpg?stp=dst-jpg_e35_p1080x1080_tt6&_nc_cat=108&ig_cache_key=MzY4NDI0Njk2ODg5Mzc0NjQ2MA%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTgwNS5zZHIuQzMifQ%3D%3D&_nc_ohc=alK_Gvq3kIMQ7kNvwEkemWA&_nc_oc=AdnMenTZP-tESX0hveT4TFm01aSuv7ydv81vgbqhUp2aIuO8XqceEqulCw1PQlc3Zzs&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=7hLcTTbrI7hBXCFqON9A9A&oh=00_AfdOLKePiYI2-nCi5r4WrGkNdcDy4luaJJDxDg6k27tbCw&oe=68EA714A",
]

TAGGING_PROMPT = """Analyze this image and classify the person's visual attributes.

Return ONLY a valid JSON object with this exact structure:
{
  "body_type": ["petite" OR "slim" OR "athletic" OR "curvy" OR "thick" OR "slim_thick" OR "bbw"],
  "breasts": "small" OR "medium" OR "large" OR "huge",
  "butt": "small" OR "bubble" OR "big",
  "hair_color": "blonde" OR "brunette" OR "redhead" OR "black" OR "colored",
  "hair_length": "short" OR "medium" OR "long" OR "very_long",
  "style": ["athletic" OR "alt" OR "glamorous" OR "natural" OR "sporty"],
  "pose": "standing" OR "sitting" OR "lying" OR "action",
  "confidence_scores": {
    "body_type": 0.0-1.0,
    "breasts": 0.0-1.0,
    "butt": 0.0-1.0,
    "hair": 0.0-1.0
  }
}

Rules:
- Be objective and descriptive
- body_type can have 1-2 values (pick most prominent)
- style can have 1-2 values
- All other fields: single value only
- confidence_scores: 0.0 (unsure) to 1.0 (very confident)
"""


def download_and_encode(url: str) -> str:
    """Download image and encode as base64 data URL"""
    response = requests.get(url, timeout=15)
    response.raise_for_status()

    image_data = base64.b64encode(response.content).decode('utf-8')
    content_type = response.headers.get('Content-Type', 'image/jpeg')

    return f"data:{content_type};base64,{image_data}"


def test_single_image(image_url: str, index: int):
    """Test GPT-4 Vision on a single image"""

    print(f"\n{'=' * 60}")
    print(f"IMAGE {index + 1}/{min(len(TEST_IMAGES), 3)}")
    print(f"{'=' * 60}")
    print(f"URL: {image_url[:80]}...\n")

    try:
        # Download and encode (Instagram CDN blocks OpenAI)
        print("⬇️  Downloading image...")
        encoded_image = download_and_encode(image_url)
        print(f"✅ Encoded ({len(encoded_image):,} bytes)\n")

        # Send to OpenAI Vision API
        response = client.chat.completions.create(
            model="gpt-4o",  # GPT-4 Omni (vision-capable, faster & cheaper than GPT-4 Vision)
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": TAGGING_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": encoded_image,  # Base64 data URL
                                "detail": "low"  # Low detail = cheaper, still accurate for body attributes
                            }
                        }
                    ]
                }
            ],
            max_tokens=500,
            temperature=0.3  # Lower = more consistent/deterministic
        )

        # Extract response
        result = response.choices[0].message.content

        # Parse JSON
        try:
            # Try to extract JSON if wrapped in markdown
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()

            tags = json.loads(result)
            print("✅ SUCCESS - Tags Generated:")
            print(json.dumps(tags, indent=2))

        except json.JSONDecodeError as e:
            print("⚠️  Response is not valid JSON:")
            print(result)
            print(f"\nJSON Error: {e}")
            tags = None

        # Cost calculation
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens

        # GPT-4o pricing (as of 2025)
        # Input: $2.50 per 1M tokens
        # Output: $10.00 per 1M tokens
        input_cost = (input_tokens / 1_000_000) * 2.50
        output_cost = (output_tokens / 1_000_000) * 10.00
        total_cost = input_cost + output_cost

        print(f"\n💰 Cost Breakdown:")
        print(f"   Input tokens: {input_tokens:,} (${input_cost:.6f})")
        print(f"   Output tokens: {output_tokens:,} (${output_cost:.6f})")
        print(f"   Total: ${total_cost:.6f} per image")

        return tags, total_cost

    except Exception as e:
        print(f"❌ Error: {str(e)}")

        # Check if it's a content policy error
        if "content_policy" in str(e).lower() or "safety" in str(e).lower():
            print("\n⚠️  CONTENT BLOCKED - This API blocks this type of content!")

        return None, 0


def main():
    print("=" * 60)
    print("OpenAI GPT-4o Vision - Instagram Tagging Test")
    print("=" * 60)
    print(f"Creator: sophieraiin (7.7M followers)")
    print(f"Content: CAROUSEL PHOTO POSTS (not reels/videos)")
    print(f"Testing first 3 of {len(TEST_IMAGES)} available photos")
    print("=" * 60)

    # Check API key
    if client.api_key == "YOUR_OPENAI_API_KEY_HERE":
        print("\n❌ ERROR: Please set your OpenAI API key!")
        print("\nOptions:")
        print("1. Set environment variable: export OPENAI_API_KEY='sk-...'")
        print("2. Edit this file and replace YOUR_OPENAI_API_KEY_HERE")
        return

    results = []
    total_cost = 0

    # Test first 3 images
    for i, url in enumerate(TEST_IMAGES[:3]):
        tags, cost = test_single_image(url, i)
        results.append({
            'tags': tags,
            'cost': cost,
            'success': tags is not None
        })
        total_cost += cost

    # Summary
    print(f"\n{'=' * 60}")
    print(f"📊 TEST SUMMARY")
    print(f"{'=' * 60}")

    successful = sum(1 for r in results if r['success'])
    print(f"✅ Successful: {successful}/3")
    print(f"❌ Failed: {3 - successful}/3")
    print(f"💰 Total cost: ${total_cost:.6f}")

    if successful > 0:
        avg_cost = total_cost / successful
        print(f"\n💡 Cost Estimates (at ${avg_cost:.6f}/image):")
        print(f"   414 creators (4,140 images): ${avg_cost * 4140:.2f}")
        print(f"   50K creators (500K images): ${avg_cost * 500000:.2f}")
        print(f"   Monthly (10K images): ${avg_cost * 10000:.2f}")

        print(f"\n🎯 Verdict:")
        if total_cost * 500000 / 3 < 300:
            print(f"   ✅ COST EFFECTIVE - Under $300 for full 500K images")
        elif total_cost * 500000 / 3 < 500:
            print(f"   ⚠️  ACCEPTABLE - ${total_cost * 500000 / 3:.0f} for 500K images")
        else:
            print(f"   ❌ TOO EXPENSIVE - Consider alternatives")

        if successful == 3:
            print(f"   ✅ NO CONTENT BLOCKING - Safe for swimwear/fitness images")
        else:
            print(f"   ⚠️  Some images failed - Check error messages above")

    print("\n" + "=" * 60)


if __name__ == '__main__':
    main()
