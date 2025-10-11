<!--
DOCUMENTATION EXEMPTION: This file is EXEMPT from DOCUMENTATION_STANDARDS.md
Reason: This is a prompt sent to AI vision models (GPT-4o, Claude, Gemini, Pixtral), not documentation for humans.
Status: Optimized for cost/performance (60% token reduction)
Reference: See TAG_SCHEMA.md and AI_AGENT_TESTING_PLAN.md for human documentation.
-->

# Instagram Creator Visual Attribute Tagging

**Version:** 2.1 (High Confidence)
**Date:** 2025-10-11

---

## TASK

Analyze **5 images** (1 profile pic + 4 recent posts) to assign visual attribute tags. Review all images before tagging. Focus on consistent patterns across multiple images.

---

## TAG CATEGORIES

**⚠️ CRITICAL: ALL categories require minimum confidence of 0.75 or higher.**

### 1. Body Type (1-2 tags max, min confidence: 0.75)
`petite` `slim` `athletic` `average` `curvy` `thick` `slim_thick` `bbw`

### 2. Breasts (1 tag, min confidence: 0.75)
`small` `medium` `large` `huge`
💡 Look for: swimwear/form-fitting clothing, side profiles, consistency across multiple images.

### 3. Butt (1 tag, min confidence: 0.75)
`small` `bubble` `big` `athletic`
💡 Look for: rear-view angles, side profiles, athletic wear/tight clothing, body proportions. If no clear rear views, infer from body type and overall proportions.

### 4. Hair Color (1-2 tags max, min confidence: 0.75)
`blonde` `brunette` `redhead` `black` `colored` `highlights`

### 5. Hair Length (1 tag, min confidence: 0.75)
`short` `medium` `long` `very_long`

### 6. Style (1-3 tags max, min confidence: 0.75)
`athletic` `alt` `goth` `egirl` `glamorous` `natural` `bimbo` `tomboy` `sporty` `elegant`

### 7. Age Appearance (1 tag, min confidence: 0.75)
`college` (18-22) `young_adult` (23-29) `adult` (30-39) `mature` (40+)
💡 Look for: skin texture, facial features, styling maturity. Most Instagram creators are 18-29. Be conservative with age estimates.

### 8. Tattoos (1 tag, min confidence: 0.75)
`none` `minimal` (1-3 small) `moderate` (4-10 or 1-2 large) `heavy` (sleeves/extensive)

### 9. Piercings (1 tag, min confidence: 0.75)
`none` `minimal` (standard ears) `moderate` (3-6 or 1 facial) `heavy` (7+ or multiple facial)

### 10. Ethnicity ⚠️ TESTING ONLY (1-2 tags max, min confidence: 0.75)
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

- **0.95-1.00:** Extremely confident (obvious across all images)
- **0.85-0.94:** Very confident (clear evidence, multiple angles)
- **0.75-0.84:** Confident (good indicators, reasonable certainty)
- **0.65-0.74:** Below threshold - DO NOT USE
- **<0.65:** Below threshold - DO NOT USE

**⚠️ MINIMUM: 0.75 for ALL attributes. If confidence would be below 0.75, use the default value instead.**

**Factors for HIGH confidence:** ✅ Multiple consistent images, clear photos, varied angles, minimal filters, athletic/swim wear, full-body shots, rear-view angles, professional lighting.

**Factors for LOW confidence:** ❌ Single image only, heavy filtering, poor lighting, baggy clothing, contradictions between images, only face shots, heavy makeup obscuring features.

---

## RULES

1. **Format:** Use exact `category:value` format (e.g., `body_type:athletic`)
2. **Case:** Lowercase only (e.g., `slim_thick` not `Slim_Thick`)
3. **Multi-tags:** Body type (max 2), hair color (max 2), style (max 3), ethnicity (max 2). All others single value.
4. **Confidence:** **MINIMUM 0.75 for ALL categories.** If you cannot reach 0.75 confidence, use the default value.
5. **Defaults when confidence < 0.75:**
   - Body type → `average`
   - Breasts → `medium`
   - Butt → `bubble` (if curvy/thick body type) or `athletic` (if slim/athletic body type)
   - Age → `young_adult`
   - Ethnicity → `uncertain`
6. **Objectivity:** Descriptive, not judgmental
7. **Patterns:** Focus on consistency across ALL images, not single outliers
8. **Quality check:** Before finalizing, verify ALL confidence scores are ≥ 0.75. Adjust to defaults if needed.

---

**Prompt Version:** 2.1 (High Confidence)
**Changes:** All attributes require ≥0.75 confidence (up from 0.60-0.85 range). Added guidance for difficult attributes.
