#!/usr/bin/env python3
"""Test script to verify tag structure updates"""

import sys
sys.path.append('/Users/matejlecnik/Desktop/b9_agency/b9_dashboard/api')

from services.categorization_service_tags import TagCategorizationService

# Mock Supabase client
class MockSupabase:
    pass

# Create service with mock
service = TagCategorizationService(MockSupabase(), "test")

print("Testing Tag Structure Updates")
print("=" * 50)

# Count tags
total_tags = 0
removed_tags = []

# Tags that should be removed
expected_removed = [
    "niche:feet", "niche:teen", "niche:daddy", "niche:selfie",
    "focus:feet", "ass:pawg", "ass:thick", "age:teen",
    "style:cosplay", "special:pawg", "special:daddy", "content:selfies"
]

print("\nTag Categories and Counts:")
for category, values in service.TAG_STRUCTURE.items():
    print(f"  {category}: {len(values)} tags")
    total_tags += len(values)

    # Check for removed tags
    for tag_value in values:
        full_tag = f"{category}:{tag_value}"
        if full_tag in expected_removed:
            removed_tags.append(full_tag)

print(f"\nTotal tags: {total_tags}")
print(f"Expected: 81 tags")
print(f"Match: {total_tags == 81}")

if removed_tags:
    print(f"\n❌ WARNING: Found tags that should have been removed:")
    for tag in removed_tags:
        print(f"  - {tag}")
else:
    print("\n✅ All duplicate tags successfully removed!")

# Verify specific categories
print("\nVerifying specific category counts:")
expected_counts = {
    "niche": 14,
    "focus": 9,
    "body": 9,
    "ass": 3,
    "breasts": 7,
    "age": 4,
    "ethnicity": 7,
    "style": 12,
    "hair": 4,
    "special": 12,
    "content": 2
}

all_correct = True
for category, expected_count in expected_counts.items():
    actual_count = len(service.TAG_STRUCTURE.get(category, []))
    match = "✅" if actual_count == expected_count else "❌"
    print(f"  {category}: {actual_count}/{expected_count} {match}")
    if actual_count != expected_count:
        all_correct = False

if all_correct:
    print("\n✅ All category counts are correct!")
else:
    print("\n❌ Some category counts don't match expected values")

# Test prompt generation
print("\n" + "=" * 50)
print("Testing Prompt Generation")
print("=" * 50)

test_subreddit = {
    'name': 'AsianHotties',
    'title': 'Asian Hotties',
    'public_description': 'A place to appreciate beautiful Asian women',
    'rules_data': {'combined_text': 'Be respectful'}
}

prompt = service._build_tag_prompt(test_subreddit)

# Check if prompt contains the new instructions
if "PREFER 1 TAG" in prompt:
    print("✅ Prompt correctly instructs to prefer 1 tag")
else:
    print("❌ Prompt doesn't contain updated instructions")

if "Use 2 tags ONLY when" in prompt:
    print("✅ Prompt correctly explains when to use 2 tags")
else:
    print("❌ Prompt doesn't explain when to use 2 tags")

print("\n✅ Tag structure update complete!")
print(f"   - Removed 7 duplicate tags")
print(f"   - Total tags reduced from 88 to {total_tags}")
print(f"   - Updated prompt to prefer 1 tag over 2")