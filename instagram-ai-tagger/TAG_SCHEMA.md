# Instagram Creator Tag Schema

┌─ REFERENCE SCHEMA ──────────────────────────────────────┐
│ ● COMPLETE      │ ████████████████████ 100% COMPLETE   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "TAG_SCHEMA.md",
  "siblings": [
    {"path": "AI_AGENT_TESTING_PLAN.md", "desc": "Agent testing", "status": "READY"},
    {"path": "prompts/unified_tagging_prompt.md", "desc": "AI prompt v2.0", "status": "OPTIMIZED"}
  ],
  "related": [
    {"path": "../docs/database/INSTAGRAM_SCHEMA.md", "desc": "Database structure", "use": "REFERENCE"},
    {"path": "../docs/database/REDDIT_SCHEMA.md", "desc": "Reddit compatibility", "use": "INTEGRATION"}
  ]
}
```

## Overview

```json
{
  "purpose": "Complete taxonomy for Instagram creator visual attribute classification",
  "format": "Reddit-compatible JSONB array",
  "pattern": "[\"category:value\", \"category:value\"]",
  "categories": 10,
  "unique_values": 57,
  "confidence_thresholds": "category_specific",
  "multi_tag_support": true
}
```

## Category Definitions

### 1. Body Type

```json
{
  "format": "body_type:value",
  "values": ["petite", "slim", "athletic", "average", "curvy", "thick", "slim_thick", "bbw"],
  "multi_tag": {"allowed": true, "max": 2},
  "priority": "high",
  "confidence_min": 0.75,
  "definitions": {
    "petite": {"desc": "Smaller frame, delicate structure", "threshold": 0.80},
    "slim": {"desc": "Narrow build, minimal curves, low body fat", "threshold": 0.75},
    "athletic": {"desc": "Defined muscles, visible abs/tone", "threshold": 0.80},
    "average": {"desc": "Balanced proportions, moderate curves", "threshold": 0.60, "default": true},
    "curvy": {"desc": "Pronounced waist-to-hip ratio (>0.7), hourglass", "threshold": 0.75},
    "thick": {"desc": "Fuller figure without dramatic waist definition", "threshold": 0.75},
    "slim_thick": {"desc": "Slim upper + thick lower body, dramatic contrast", "threshold": 0.80},
    "bbw": {"desc": "Plus-size throughout", "threshold": 0.85}
  },
  "combinations_allowed": [
    ["slim", "athletic"],
    ["curvy", "athletic"],
    ["thick", "curvy"],
    ["petite", "slim"]
  ],
  "combinations_prohibited": [
    ["slim", "thick"],
    ["petite", "bbw"]
  ]
}
```

### 2. Breasts

```json
{
  "format": "breasts:value",
  "values": ["small", "medium", "large", "huge", "natural", "enhanced"],
  "multi_tag": {"allowed": false, "note": "Size only, modifiers optional"},
  "priority": "medium",
  "confidence_min": 0.70,
  "definitions": {
    "small": {"cup_range": "A-B", "threshold": 0.75},
    "medium": {"cup_range": "B-C", "threshold": 0.70, "default": true},
    "large": {"cup_range": "D+", "threshold": 0.80},
    "huge": {"cup_range": "DD/E+", "threshold": 0.90}
  },
  "modifiers": {
    "natural": {"threshold": 0.85, "indicators": "Natural slope, proportional"},
    "enhanced": {"threshold": 0.90, "indicators": "Round upper pole, high positioning", "caution": "Difficult to determine"}
  },
  "best_practices": [
    "Focus on size over natural/enhanced",
    "Omit modifier if uncertain",
    "Consider context: swimwear vs casual",
    "Default to medium if confidence <0.75"
  ]
}
```

### 3. Butt

```json
{
  "format": "butt:value",
  "values": ["small", "bubble", "big", "athletic"],
  "multi_tag": false,
  "priority": "medium",
  "confidence_min": 0.70,
  "definitions": {
    "small": {"desc": "Minimal projection, flat", "threshold": 0.75},
    "bubble": {"desc": "Round, lifted, perky", "threshold": 0.80, "context": "Fitness/athletic"},
    "big": {"desc": "Large, full glutes", "threshold": 0.80},
    "athletic": {"desc": "Muscular, toned, defined", "threshold": 0.85}
  },
  "assessment_notes": [
    "Side/back views most reliable",
    "Athletic wear provides clearest view",
    "Consider body type consistency"
  ]
}
```

### 4. Hair Color

```json
{
  "format": "hair_color:value",
  "values": ["blonde", "brunette", "redhead", "black", "colored", "highlights"],
  "multi_tag": {"allowed": true, "max": 2},
  "priority": "high",
  "confidence_min": 0.85,
  "definitions": {
    "blonde": {"range": "Platinum to honey", "threshold": 0.90},
    "brunette": {"range": "Light to dark brown", "threshold": 0.90, "most_common": true},
    "redhead": {"range": "Strawberry to auburn", "threshold": 0.95},
    "black": {"range": "Dark brown to jet black", "threshold": 0.90},
    "colored": {"range": "Unnatural (pink, blue, green, purple)", "threshold": 0.95},
    "highlights": {"desc": "Multi-tonal with lighter streaks, balayage, ombré", "threshold": 0.85}
  },
  "combinations_allowed": [
    ["brunette", "highlights"],
    ["blonde", "highlights"],
    ["blonde", "brunette"]
  ],
  "notes": [
    "Lighting affects perception - check multiple images",
    "Choose predominant color if multi-tonal"
  ]
}
```

### 5. Hair Length

```json
{
  "format": "hair_length:value",
  "values": ["short", "medium", "long", "very_long"],
  "multi_tag": false,
  "priority": "high",
  "confidence_min": 0.85,
  "definitions": {
    "short": {"range": "Above shoulders, pixie to bob", "threshold": 0.95},
    "medium": {"range": "Shoulder to mid-back", "threshold": 0.90},
    "long": {"range": "Mid-back to waist", "threshold": 0.90},
    "very_long": {"range": "Below waist, past hips", "threshold": 0.95}
  },
  "notes": [
    "Straightened hair easier to assess than curly",
    "Check multiple images (styling varies)",
    "Extensions count as actual length shown"
  ]
}
```

### 6. Style

```json
{
  "format": "style:value",
  "values": ["athletic", "alt", "goth", "egirl", "glamorous", "natural", "bimbo", "tomboy", "sporty", "elegant"],
  "multi_tag": {"allowed": true, "max": 3},
  "priority": "medium",
  "confidence_min": 0.70,
  "definitions": {
    "athletic": {"desc": "Fitness-focused, gym wear, muscle definition", "threshold": 0.75},
    "alt": {"desc": "Alternative fashion, edgy, unconventional", "threshold": 0.80},
    "goth": {"desc": "Dark fashion, black clothing, gothic aesthetic", "threshold": 0.85},
    "egirl": {"desc": "Internet-inspired feminine, anime makeup, colorful hair", "threshold": 0.85},
    "glamorous": {"desc": "High-fashion, polished, luxurious, designer items", "threshold": 0.75},
    "natural": {"desc": "Minimal makeup, casual, simple", "threshold": 0.70},
    "bimbo": {"desc": "Hyper-feminine, exaggerated glamour, dramatic makeup", "threshold": 0.90},
    "tomboy": {"desc": "Masculine-leaning, minimal femininity, casual", "threshold": 0.80},
    "sporty": {"desc": "Sports-focused, team sports, athletic lifestyle", "threshold": 0.75},
    "elegant": {"desc": "Sophisticated, refined, formal wear", "threshold": 0.80}
  },
  "combinations_common": [
    ["athletic", "natural"],
    ["glamorous", "elegant"],
    ["alt", "goth"],
    ["athletic", "sporty"]
  ],
  "combinations_avoid": [
    ["bimbo", "tomboy"],
    ["natural", "glamorous"]
  ]
}
```

### 7. Age Appearance

```json
{
  "format": "age_appearance:value",
  "values": ["college", "young_adult", "adult", "mature"],
  "multi_tag": false,
  "priority": "low",
  "confidence_min": 0.60,
  "definitions": {
    "college": {"range": "18-22 years", "threshold": 0.65},
    "young_adult": {"range": "23-29 years", "threshold": 0.60, "default": true, "most_common": true},
    "adult": {"range": "30-39 years", "threshold": 0.65},
    "mature": {"range": "40+ years", "threshold": 0.75}
  },
  "ethical_notes": [
    "Visual appearance ≠ actual age",
    "Lighting, makeup, filters affect perception",
    "Use most conservative estimate when uncertain",
    "Default to young_adult if very uncertain"
  ]
}
```

### 8. Tattoos

```json
{
  "format": "tattoos:value",
  "values": ["none", "minimal", "moderate", "heavy"],
  "multi_tag": false,
  "priority": "medium",
  "confidence_min": 0.80,
  "definitions": {
    "none": {"count": 0, "threshold": 0.90},
    "minimal": {"count": "1-3 small", "size": "Wrist/ankle/finger-sized", "threshold": 0.85},
    "moderate": {"count": "4-10 OR 1-2 medium/large", "visibility": "Noticeable but not dominant", "threshold": 0.80},
    "heavy": {"coverage": "Full sleeves, back pieces, extensive", "visibility": "Prominent feature", "threshold": 0.90}
  },
  "assessment": [
    "Count distinct tattoos across all images",
    "Size matters more than quantity",
    "Partial sleeves = moderate, full sleeves = heavy"
  ]
}
```

### 9. Piercings

```json
{
  "format": "piercings:value",
  "values": ["none", "minimal", "moderate", "heavy"],
  "multi_tag": false,
  "priority": "low",
  "confidence_min": 0.75,
  "definitions": {
    "none": {"count": 0, "threshold": 0.85},
    "minimal": {"count": "1-2 per ear (standard)", "threshold": 0.80, "most_common": true},
    "moderate": {"count": "3-6 total OR 1 facial", "examples": "Nose stud, multiple ear", "threshold": 0.85},
    "heavy": {"count": "7+ OR multiple facial", "examples": "Septum + nose + multiple ears, gauges", "threshold": 0.90}
  },
  "assessment": [
    "Count visible piercings across all images",
    "Jewelry may be removed in some photos",
    "Facial piercings weigh more heavily",
    "Default to minimal when unclear"
  ]
}
```

### 10. Ethnicity ⚠️ TESTING ONLY

```json
{
  "format": "ethnicity:value",
  "values": ["white", "black", "latina", "asian", "middle_eastern", "mixed", "uncertain"],
  "multi_tag": {"allowed": true, "max": 2, "for_mixed_heritage": true},
  "priority": "high_risk",
  "status": "EXPERIMENTAL_NOT_FOR_PRODUCTION",
  "confidence_min": 0.85,
  "critical_warnings": [
    "Visual appearance ≠ actual ethnicity",
    "AI ethnicity inference is problematic and potentially biased",
    "Many people are mixed race - cannot be determined from photos",
    "REQUIRES 100% MANUAL REVIEW before any use",
    "Purpose: Test AI agent agreement and accuracy ONLY"
  ],
  "testing_criteria": {
    "inter_agent_agreement": {"threshold": "≥80%", "action_if_below": "DO_NOT_USE"},
    "confidence_scores": {"requirement": "Consistently high (0.85+)", "action_if_low": "DO_NOT_USE"},
    "bias_detection": {"requirement": "No clear biases", "action_if_detected": "DO_NOT_USE"},
    "ethical_concerns": {"note": "Even if accurate, ethical concerns may prohibit use"}
  },
  "definitions": {
    "white": {"indicators": "Fair to olive skin, European features", "threshold": 0.85},
    "black": {"indicators": "Dark skin, African features", "threshold": 0.85},
    "latina": {"indicators": "Tan to brown skin, Latin American features", "threshold": 0.80},
    "asian": {"indicators": "East/Southeast/South Asian features", "threshold": 0.85},
    "middle_eastern": {"indicators": "Middle East/North African features", "threshold": 0.80},
    "mixed": {"indicators": "Features suggesting multiple backgrounds", "threshold": 0.75},
    "uncertain": {"use_when": "Cannot determine with confidence OR contradictory evidence", "default": true, "best_practice": "Use liberally - avoid guessing"}
  },
  "ethical_guidelines": {
    "do": [
      "Use very high confidence thresholds (0.85+)",
      "Default to uncertain when not obvious",
      "Flag ALL ethnicity tags for manual review",
      "Document test results thoroughly",
      "Test for AI bias across agents"
    ],
    "do_not": [
      "Use for discrimination or exclusion",
      "Assume ethnicity from visual appearance alone",
      "Make guesses with low confidence",
      "Deploy to production without extensive review",
      "Trust AI inference as definitive"
    ]
  },
  "why_problematic": {
    "scientific": ["Race is social construct not biological", "Facial features vary within ethnic groups", "Most have mixed heritage not visible", "Lighting/makeup/filters affect appearance"],
    "ethical": ["Perpetuates racial categorization", "Can reinforce biases", "Privacy concerns - inferring sensitive attributes", "Historical misuse of appearance-based classification"],
    "accuracy": ["AI models trained on biased datasets", "Features overlap across groups", "Cannot account for mixed heritage", "Cultural indicators ≠ ethnicity"]
  }
}
```

## Confidence Scoring

```json
{
  "scale": {
    "0.95_1.00": "Extremely confident (obvious)",
    "0.85_0.94": "Very confident (clear evidence)",
    "0.75_0.84": "Confident (good indicators)",
    "0.65_0.74": "Moderately confident (some uncertainty)",
    "0.50_0.64": "Low confidence (uncertain)",
    "below_0.50": "Do not assign tag"
  },
  "category_thresholds": {
    "hair_color": {"min": 0.85, "rationale": "Highly visible, lighting-dependent"},
    "hair_length": {"min": 0.85, "rationale": "Easy to determine"},
    "ethnicity": {"min": 0.85, "rationale": "TESTING ONLY - High risk"},
    "tattoos": {"min": 0.80, "rationale": "Binary visibility"},
    "piercings": {"min": 0.75, "rationale": "Small, can be hidden"},
    "body_type": {"min": 0.75, "rationale": "Visible but clothing-dependent"},
    "breasts": {"min": 0.70, "rationale": "Clothing and angle dependent"},
    "butt": {"min": 0.70, "rationale": "Position and clothing dependent"},
    "style": {"min": 0.70, "rationale": "Subjective interpretation"},
    "age_appearance": {"min": 0.60, "rationale": "Highly subjective, ethical concerns"}
  },
  "factors_increase_confidence": [
    "Multiple consistent images",
    "Clear, high-resolution photos",
    "Varied angles and contexts",
    "Minimal filters/editing",
    "Athletic wear, swimwear (for body tags)"
  ],
  "factors_decrease_confidence": [
    "Single image or few images",
    "Heavy filtering/editing",
    "Poor lighting",
    "Baggy clothing (for body tags)",
    "Contradictory evidence across images"
  ]
}
```

## Output Format

```json
{
  "structure": {
    "tags": ["array", "of", "category:value", "strings"],
    "confidence": {"category": "float_0.0_to_1.0"},
    "reasoning": "Brief 1-2 sentence explanation"
  },
  "example": {
    "tags": [
      "body_type:athletic",
      "breasts:medium",
      "butt:bubble",
      "hair_color:brunette",
      "hair_length:long",
      "style:athletic",
      "style:natural",
      "age_appearance:young_adult",
      "tattoos:none",
      "piercings:minimal",
      "ethnicity:white"
    ],
    "confidence": {
      "body_type": 0.92,
      "breasts": 0.85,
      "butt": 0.88,
      "hair_color": 0.95,
      "hair_length": 0.98,
      "style": 0.90,
      "age_appearance": 0.78,
      "tattoos": 0.99,
      "piercings": 0.92,
      "ethnicity": 0.82
    },
    "reasoning": "Athletic build clearly visible in gym wear across multiple images. Consistent brunette hair. Athletic and natural style evident from minimal makeup and fitness context."
  },
  "validation_rules": [
    "Format: exact category:value pattern",
    "Case: lowercase only",
    "Multi-tags: body_type max 2, hair_color max 2, style max 3, ethnicity max 2",
    "Confidence: must meet minimum thresholds per category",
    "Defaults when uncertain: body_type→average, breasts→medium, age→young_adult, ethnicity→uncertain"
  ]
}
```

## Reddit Integration

```json
{
  "compatibility": {
    "format": "Reddit JSONB: [\"category:value\"]",
    "instagram_format": "Identical structure",
    "seamless_integration": true
  },
  "tag_mapping": {
    "body_type": {"reddit": "body:*", "match": "direct"},
    "breasts": {"reddit": "N/A", "match": "instagram_only"},
    "butt": {"reddit": "N/A", "match": "instagram_only"},
    "hair_color": {"reddit": "N/A", "match": "instagram_only"},
    "style": {"reddit": "niche:*", "match": "partial_overlap"},
    "age_appearance": {"reddit": "age:*", "match": "different_format"}
  },
  "unified_query_example": "SELECT ic.* FROM instagram_creators ic JOIN reddit_subreddits rs ON rs.name = 'r/latinas' WHERE ic.body_tags && rs.tags AND ic.body_tags @> '[\"body_type:curvy\"]'::jsonb ORDER BY ic.followers DESC"
}
```

## Example Scenarios

```json
{
  "fitness_influencer": {
    "profile": "Gym content, athletic wear, workout videos",
    "tags": ["body_type:athletic", "breasts:medium", "butt:bubble", "hair_color:blonde", "hair_length:long", "style:athletic", "style:natural", "age_appearance:young_adult", "tattoos:minimal", "piercings:minimal"],
    "confidence_avg": 0.91,
    "reasoning": "Athletic body clearly visible in gym wear. Blonde hair consistent. Athletic + natural style with minimal makeup."
  },
  "glamour_model": {
    "profile": "Professional photoshoots, bikini content, sponsored posts",
    "tags": ["body_type:curvy", "breasts:large", "butt:big", "hair_color:brunette", "hair_color:highlights", "hair_length:very_long", "style:glamorous", "style:elegant", "age_appearance:young_adult", "tattoos:none", "piercings:minimal"],
    "confidence_avg": 0.90,
    "reasoning": "Curvy body with defined waist. Brunette base with balayage highlights. Very long hair past waist. Glamorous + elegant style."
  },
  "alternative_model": {
    "profile": "Alt fashion, colored hair, piercing/tattoo content",
    "tags": ["body_type:slim", "body_type:athletic", "breasts:small", "butt:small", "hair_color:colored", "hair_length:medium", "style:alt", "style:goth", "age_appearance:young_adult", "tattoos:heavy", "piercings:heavy"],
    "confidence_avg": 0.88,
    "reasoning": "Slim athletic build. Pink/purple unnatural hair. Alt + goth style. Full sleeve + chest piece. Multiple facial piercings."
  }
}
```

## Quality Assurance

```json
{
  "checklist": [
    {"item": "All tags use correct category:value format", "check": "required"},
    {"item": "No typos in tag values", "check": "required"},
    {"item": "Multi-tag rules followed", "check": "required"},
    {"item": "Confidence scores 0.0-1.0", "check": "required"},
    {"item": "Minimum confidence thresholds met", "check": "required"},
    {"item": "No contradictory tags (e.g., slim + thick)", "check": "required"},
    {"item": "Reasoning provided for unusual/low-confidence tags", "check": "required"},
    {"item": "All 10 categories addressed", "check": "required"}
  ],
  "manual_review_triggers": [
    "Any confidence score <0.65",
    "Contradictory tags across images",
    "Unusual combination (e.g., bbw + athletic)",
    "Heavy filtering/editing suspected",
    "Only 1-2 images available"
  ]
}
```

## Revision History

```json
{
  "versions": [
    {"version": "2.2.0", "date": "2025-10-10", "changes": "Standardized to DOCUMENTATION_STANDARDS v2.1.0. Condensed from 963 to 520 lines. Converted to JSON-heavy format. Added status box, navigation. Removed decorative emojis."},
    {"version": "2.1.0", "date": "2025-10-10", "changes": "Added ethnicity category (testing only). Updated version format."},
    {"version": "2.0.0", "date": "2025-10-10", "changes": "Complete rewrite with detailed definitions, examples, confidence guidelines"},
    {"version": "1.0.0", "date": "2025-10-09", "changes": "Initial tag schema (basic definitions)"}
  ]
}
```

---

_Version: 2.2.0 | Updated: 2025-10-10 | Status: Complete Reference Schema_
_Navigate: [← README.md](README.md) | [→ AI_AGENT_TESTING_PLAN.md](AI_AGENT_TESTING_PLAN.md) | [↑ ROADMAP.md](../ROADMAP.md)_
