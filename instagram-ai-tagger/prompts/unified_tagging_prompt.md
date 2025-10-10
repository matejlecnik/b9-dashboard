<!--
DOCUMENTATION EXEMPTION: This file is EXEMPT from DOCUMENTATION_STANDARDS.md
Reason: This is a prompt sent to AI vision models (GPT-4o, Claude, Gemini, Pixtral), not documentation for humans.
Status: Optimized for cost/performance (60% token reduction)
Reference: See TAG_SCHEMA.md and AI_AGENT_TESTING_PLAN.md for human documentation.
-->

# Instagram Creator Visual Attribute Tagging

**Version:** 2.0 (Optimized)
**Date:** 2025-10-10

---

## TASK

Analyze **5 images** (1 profile pic + 4 recent posts) to assign visual attribute tags. Review all images before tagging. Focus on consistent patterns across multiple images.

---

## TAG CATEGORIES

### 1. Body Type (1-2 tags max, min confidence: 0.75)
`petite` `slim` `athletic` `average` `curvy` `thick` `slim_thick` `bbw`

### 2. Breasts (1 tag, min confidence: 0.70)
`small` `medium` `large` `huge`

### 3. Butt (1 tag, min confidence: 0.70)
`small` `bubble` `big` `athletic`

### 4. Hair Color (1-2 tags max, min confidence: 0.85)
`blonde` `brunette` `redhead` `black` `colored` `highlights`

### 5. Hair Length (1 tag, min confidence: 0.85)
`short` `medium` `long` `very_long`

### 6. Style (1-3 tags max, min confidence: 0.70)
`athletic` `alt` `goth` `egirl` `glamorous` `natural` `bimbo` `tomboy` `sporty` `elegant`

### 7. Age Appearance (1 tag, min confidence: 0.60)
`college` (18-22) `young_adult` (23-29) `adult` (30-39) `mature` (40+)

### 8. Tattoos (1 tag, min confidence: 0.80)
`none` `minimal` (1-3 small) `moderate` (4-10 or 1-2 large) `heavy` (sleeves/extensive)

### 9. Piercings (1 tag, min confidence: 0.75)
`none` `minimal` (standard ears) `moderate` (3-6 or 1 facial) `heavy` (7+ or multiple facial)

### 10. Ethnicity ⚠️ TESTING ONLY (1-2 tags max, min confidence: 0.85)
`white` `black` `latina` `asian` `middle_eastern` `mixed` `uncertain`

**⚠️ WARNING:** Visual appearance ≠ actual ethnicity. Default to `uncertain` when not obvious. For testing inter-agent agreement only.

---

## OUTPUT FORMAT

Return **ONLY valid JSON** (no markdown, no code blocks):

```json
{
  "tags": [
    "body_type:athletic",
    "breasts:medium",
    "butt:bubble",
    "hair_color:brunette",
    "hair_length:long",
    "style:athletic",
    "style:natural",
    "age_appearance:young_adult",
    "tattoos:minimal",
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
    "tattoos": 0.90,
    "piercings": 0.85,
    "ethnicity": 0.82
  },
  "reasoning": "Brief 1-2 sentence explanation"
}
```

---

## CONFIDENCE SCALE

- **0.95-1.00:** Extremely confident (obvious)
- **0.85-0.94:** Very confident (clear evidence)
- **0.75-0.84:** Confident (good indicators)
- **0.65-0.74:** Moderately confident (some uncertainty)
- **0.50-0.64:** Low confidence (uncertain)
- **<0.50:** Do not assign

**Factors:** ✅ Multiple consistent images, clear photos, varied angles, minimal filters, athletic/swim wear → **higher confidence**. ❌ Limited samples, heavy filtering, poor lighting, baggy clothing, contradictions → **lower confidence**.

---

## RULES

1. **Format:** Use exact `category:value` format (e.g., `body_type:athletic`)
2. **Case:** Lowercase only (e.g., `slim_thick` not `Slim_Thick`)
3. **Multi-tags:** Body type (max 2), hair color (max 2), style (max 3), ethnicity (max 2). All others single value.
4. **Confidence:** Meet minimum thresholds per category
5. **Defaults when uncertain:**
   - Body type → `average`
   - Breasts → `medium`
   - Age → `young_adult`
   - Ethnicity → `uncertain`
6. **Objectivity:** Descriptive, not judgmental
7. **Patterns:** Focus on consistency across all 5 images, not single outliers

---

**Prompt Version:** 2.0 (Optimized for cost/performance)
**Token Reduction:** ~60% shorter than v1.0
