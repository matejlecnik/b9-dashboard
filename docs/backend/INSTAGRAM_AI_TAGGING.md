# Instagram AI Auto-Tagging System

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PLANNED   │ ░░░░░░░░░░░░░░░░░░░░ 0% COMPLETE        │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../INDEX.md",
  "current": "backend/INSTAGRAM_AI_TAGGING.md",
  "related": [
    {"path": "../database/SUPABASE_SCHEMA.md", "desc": "Database schema", "status": "ACTIVE"},
    {"path": "../../backend/app/services/tags/TAG_CATEGORIES.md", "desc": "Tag system", "status": "ACTIVE"},
    {"path": "../../ROADMAP.md", "desc": "Roadmap Phase 7", "status": "ACTIVE"}
  ]
}
```

## System Overview

```json
{
  "purpose": "Automated visual tagging of Instagram creator body attributes",
  "scale": "50,000+ creators (500,000+ images)",
  "approach": "Self-hosted AI pipeline",
  "priority": "Privacy + Cost + NSFW-tolerance",
  "phase": "Phase 7 (2026-Q2)",
  "status": "PLANNED"
}
```

## Problem Statement

**Current Situation:**
- 220 Instagram creators (growing to 50K+)
- ~10 images per creator = 500,000+ images to analyze
- Manual tagging is not scalable
- Need consistent, objective body attribute classification

**Required Tags:**
- **Body type**: petite, slim, athletic, average, curvy, thick, slim_thick, bbw
- **Breasts**: small, medium, large, huge, natural, enhanced, perky
- **Ass**: small, bubble, big, jiggly
- **Age appearance**: college, adult, milf, mature (coarse categories)
- **Hair color**: blonde, redhead, brunette, colored
- **Style**: alt, goth, egirl, tattooed, pierced, natural, bimbo, tomboy

**NOT Auto-Tagged (Ethical Reasons):**
- ❌ **Ethnicity** - Creators self-declare in profile
- ❌ **Height** - Cannot determine from single image without scale

## Technology Stack (Self-Hosted)

### Core Pipeline Components

```json
{
  "layer_1_detection": {
    "model": "YOLOv8-nano or YOLOv8-small",
    "purpose": "Person detection and cropping",
    "speed": "~0.1s per image",
    "library": "ultralytics",
    "export": "ONNX/TensorRT for optimization"
  },
  "layer_2_landmarks": {
    "models": [
      {"name": "MediaPipe Pose Landmarker", "keypoints": 33, "purpose": "Body proportions"},
      {"name": "MediaPipe Face Landmarker", "keypoints": 468, "purpose": "Lips, eyes, face geometry"},
      {"name": "PP-HumanSeg", "purpose": "Fast silhouette segmentation", "speed": "~0.2s per image"}
    ],
    "library": "mediapipe + PaddleSeg"
  },
  "layer_3_features": {
    "geometry": [
      "Waist-hip ratio (from pose keypoints)",
      "Shoulder width proportion",
      "Leg length ratio",
      "Silhouette circularity/aspect ratio"
    ],
    "face": [
      "Lip thickness ratio (upper+lower height vs mouth width)",
      "Eye color (crop iris region + color classification)"
    ],
    "speed": "~0.1s per image"
  },
  "layer_4_ai_tagging": {
    "models": [
      {"name": "SigLIP SO400M", "type": "CLIP-style", "preferred": true, "license": "Apache-2.0"},
      {"name": "OpenCLIP ViT-L/14", "type": "CLIP-style", "alternative": true}
    ],
    "purpose": "Zero-shot attribute classification via text prompts",
    "prompts": [
      "a photo of a person with a curvy body",
      "a photo of a person with an athletic build",
      "a photo of a person with big lips",
      "a photo of a person with blonde hair"
    ],
    "speed": "~0.1s per image (batched)"
  },
  "layer_5_escalation": {
    "trigger": "Low confidence (<70%) or conflicting tags",
    "percentage": "10-30% of images",
    "models": [
      {"name": "SCHP", "purpose": "Detailed part segmentation (CIHP/LIP dataset)", "speed": "~1s per image"},
      {"name": "Qwen2-VL-7B or LLaVA-OneVision", "purpose": "Local VLM for reasoning", "optional": true}
    ]
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│            PRODUCTION PIPELINE (50K SCALE)               │
└─────────────────────────────────────────────────────────┘

1. INGESTION
   ├─ Source: instagram_posts + instagram_reels tables
   ├─ Filter: Get creator's top 10 images by engagement
   ├─ Dedupe: pHash to skip duplicates
   └─ Queue: Redis job queue

2. GPU WORKER (RTX 4090)
   ├─ Batch size: 32-64 images
   ├─ Layer 1: YOLOv8 (person detection) → crop
   ├─ Layer 2: MediaPipe + PP-HumanSeg → keypoints + mask
   ├─ Layer 3: Feature extraction → ratios + colors
   ├─ Layer 4: SigLIP (batched) → tag scores
   └─ Low confidence? → Escalate to Layer 5

3. ESCALATION WORKER (10-30% of images)
   ├─ SCHP: Detailed part masks
   ├─ Local VLM: Reasoning for edge cases
   └─ Manual review queue for <50% confidence

4. TAG ASSIGNMENT
   ├─ Rules: Threshold-based (e.g., waist-hip >0.8 → "curvy")
   ├─ ML: SigLIP score >0.6 → assign tag
   ├─ Conflicts: Highest confidence wins
   └─ Output: tags + confidence scores

5. STORAGE (PostgreSQL)
   ├─ instagram_creators.body_tags (JSONB array)
   ├─ instagram_creators.tag_confidence (JSONB object)
   ├─ instagram_creators.tags_analyzed_at (timestamp)
   └─ Optional: Parquet/FAISS for embeddings

6. REVIEW UI (Streamlit/React)
   ├─ Display: Images + auto-tags + confidence
   ├─ Actions: Approve, Edit, Flag for re-analysis
   └─ Feedback: Log corrections → improve thresholds
```

## Performance Metrics

```json
{
  "processing_speed": {
    "target": "20-50 images/second",
    "realistic": "30 images/second average",
    "bottleneck": "I/O (JPEG decode) and batch loading"
  },
  "total_time": {
    "500k_images": "6-14 hours on single RTX 4090",
    "10k_monthly": "~6 minutes",
    "optimization": "Use NVMe storage, FP16 inference, TensorRT"
  },
  "accuracy": {
    "body_type": "85-90% (after calibration)",
    "butt_breast_size": "80-90% (clear bikini images)",
    "hair_color": "90%+",
    "age_appearance": "75-85% (coarse categories)"
  }
}
```

## Cost Analysis

### Self-Hosted (Recommended)

```json
{
  "initial_setup": {
    "software": "$0 (open-source models)",
    "infrastructure": "RTX 4090 (already owned)",
    "storage": "~1.5GB for 500K embeddings + tags",
    "time": "2-4 weeks full-time development"
  },
  "ongoing_costs": {
    "compute": "$0 (own GPU) or $1.50/hr on RunPod/Vast.ai",
    "storage": "Negligible (<2GB)",
    "electricity": "~$0.20/hr for 4090 at full load"
  },
  "processing_costs": {
    "initial_500k": "$0 (own GPU) or ~$28 (rented A100 for 18 hours)",
    "monthly_10k": "$0 or ~$0.56"
  }
}
```

### Cloud API Alternative (NOT Recommended at Scale)

```json
{
  "gemini_1.5_flash": {
    "pricing": "$0.075 per 1M input tokens, $0.30 per 1M output tokens",
    "cost_per_image": "Varies (500-5000 tokens/image)",
    "estimated_cost": {
      "low": "$17 (500 tokens/image)",
      "medium": "$55 (2000 tokens/image)",
      "high": "$130 (5000 tokens/image)"
    },
    "concerns": [
      "Privacy: Images uploaded to Google",
      "NSFW: May refuse bikini/swimwear content",
      "Cost: Scales linearly with volume",
      "Control: Cannot adjust safety filters fully"
    ]
  }
}
```

**Verdict:** Self-hosted wins at 50K+ scale

## Database Schema

```sql
-- Add to instagram_creators table
ALTER TABLE instagram_creators
ADD COLUMN body_tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN tag_confidence JSONB DEFAULT '{}'::jsonb,
ADD COLUMN tags_analyzed_at TIMESTAMP,
ADD COLUMN tags_analysis_version VARCHAR(10) DEFAULT '1.0';

-- Add GIN index for fast tag queries
CREATE INDEX idx_instagram_creators_body_tags
ON instagram_creators USING GIN (body_tags);

-- Tag analysis history (audit trail)
CREATE TABLE instagram_tag_analysis_history (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES instagram_creators(id),
  tags JSONB NOT NULL,
  confidence JSONB NOT NULL,
  model_used VARCHAR(50),
  images_analyzed TEXT[],
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example data structure
-- body_tags: ["body:curvy", "breasts:large", "hair:blonde", "style:natural"]
-- tag_confidence: {"body:curvy": 0.92, "breasts:large": 0.85, "hair:blonde": 0.95, "style:natural": 0.78}
```

## Implementation Timeline

### Week 1: Pipeline Skeleton (30-40 hours)

```json
{
  "goals": [
    "Set up infrastructure (Postgres, Redis, GPU worker)",
    "Implement YOLOv8 + PP-HumanSeg + MediaPipe",
    "Process 1,000 test images end-to-end",
    "Store features in database"
  ],
  "deliverables": [
    "Working pipeline (detection → landmarks → features → storage)",
    "Baseline processing speed measurement"
  ]
}
```

### Week 2: AI Tagging + Calibration (30-40 hours)

```json
{
  "goals": [
    "Add SigLIP/OpenCLIP embedding layer",
    "Define tag vocabulary and prompts",
    "Manually label 200 diverse images",
    "Tune thresholds (waist-hip, lip-thickness, etc.)",
    "Measure precision/recall on validation set (200 images)"
  ],
  "deliverables": [
    "Calibrated tag assignment system",
    "Accuracy report (85%+ target)",
    "Documented thresholds and prompts"
  ]
}
```

### Week 3: Escalation + Review UI (20-30 hours)

```json
{
  "goals": [
    "Wire SCHP for low-confidence images",
    "Optional: Add local VLM (Qwen2-VL or LLaVA)",
    "Build Streamlit dashboard for manual review",
    "Implement approval/correction workflow"
  ],
  "deliverables": [
    "Escalation path for uncertain cases",
    "Review UI for bulk tag validation",
    "Feedback loop to improve thresholds"
  ]
}
```

### Week 4: Production Run + Monitoring (20-30 hours)

```json
{
  "goals": [
    "Batch process all 500K images",
    "Monitor metrics (speed, accuracy, GPU utilization)",
    "Random sample validation (1,000 images)",
    "Build re-tagging cron for monthly updates",
    "Document model versions and thresholds"
  ],
  "deliverables": [
    "All creators tagged with confidence scores",
    "Monitoring dashboard (Grafana or custom)",
    "Re-tagging pipeline for new creators"
  ]
}
```

**Total Effort:** 100-140 hours (2.5-3.5 weeks full-time)

## Ethical Guidelines

### ❌ What NOT to Auto-Tag

```json
{
  "prohibited_tags": [
    {
      "category": "ethnicity",
      "reason": "Inferring race from photos is problematic and biased",
      "alternative": "Let creators self-declare in profile"
    },
    {
      "category": "exact_height",
      "reason": "Cannot determine from single image without scale",
      "alternative": "Use 'appears tall/short' as advisory only"
    },
    {
      "category": "explicit_content",
      "reason": "Not needed for body type classification",
      "alternative": "Use existing NSFW detection if needed"
    }
  ]
}
```

### ✅ Best Practices

```json
{
  "privacy": {
    "rule": "Process all images locally on your servers",
    "rationale": "Avoid uploading creator content to external APIs",
    "implementation": "Self-hosted models only"
  },
  "consent": {
    "rule": "Creators should be aware of auto-tagging",
    "rationale": "Transparency builds trust",
    "implementation": "Add to creator onboarding/TOS"
  },
  "review": {
    "rule": "Manual review for low-confidence tags (<70%)",
    "rationale": "Maintain accuracy and fairness",
    "implementation": "Review UI with approval workflow"
  },
  "feedback": {
    "rule": "Allow creators to correct their tags",
    "rationale": "Empower users, improve model",
    "implementation": "Self-service tag editing in dashboard"
  }
}
```

## Integration with Existing System

### Reddit Tag Matching (Already Built)

```python
# Current: Reddit subreddit matching
# reddit_subreddits.tags: ["ethnicity:asian", "body:petite"]
# models.assigned_tags: ["ethnicity:asian", "body:slim"]
# Match: ✅ (at least 1 shared tag)

# Future: Instagram creator matching
# instagram_creators.body_tags: ["body:curvy", "breasts:large", "hair:blonde"]
# models.assigned_tags: ["body:curvy", "style:natural"]
# Match: ✅ (at least 1 shared tag)

# Same matching algorithm, different table
```

### Database Query Example

```sql
-- Find Instagram creators matching a model's tags
SELECT ic.*
FROM instagram_creators ic
JOIN models m ON m.id = $model_id
WHERE ic.body_tags && m.assigned_tags  -- JSONB array overlap
  AND ic.review_status = 'approved'
ORDER BY ic.quality_score DESC
LIMIT 50;

-- Performance: GIN index makes this very fast
```

## Future Enhancements

```json
{
  "phase_1": {
    "status": "PLANNED",
    "features": [
      "Basic auto-tagging (body type, hair, style)",
      "Manual review workflow",
      "Calibration on 200-500 images"
    ]
  },
  "phase_2": {
    "status": "FUTURE",
    "features": [
      "Active learning: Prioritize uncertain images for review",
      "Multi-GPU scaling (process 10K creators/hour)",
      "Similarity search (find creators similar to a photo)"
    ]
  },
  "phase_3": {
    "status": "FUTURE",
    "features": [
      "Video analysis (extract keyframes from reels)",
      "Temporal consistency (track tag changes over time)",
      "Fine-tuned models on your specific dataset"
    ]
  }
}
```

## References & Resources

### Models & Libraries

```json
{
  "detection": {
    "yolov8": "https://docs.ultralytics.com/models/yolov8/",
    "export": "https://docs.ultralytics.com/modes/export/"
  },
  "landmarks": {
    "mediapipe_pose": "https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker",
    "mediapipe_face": "https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker",
    "pp_humanseg": "https://github.com/PaddlePaddle/PaddleSeg/tree/release/2.9/contrib/PP-HumanSeg"
  },
  "embeddings": {
    "siglip": "https://huggingface.co/google/siglip-so400m-patch14-384",
    "openclip": "https://huggingface.co/laion/CLIP-ViT-L-14-laion2B-s32B-b82K"
  },
  "segmentation": {
    "schp": "https://arxiv.org/abs/1910.09777",
    "lip_dataset": "http://sysu-hcp.net/lip/",
    "cihp_dataset": "http://sysu-hcp.net/lip/overview.php"
  },
  "vlm_optional": {
    "qwen2_vl": "https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct",
    "llava": "https://github.com/LLaVA-VL/LLaVA-NeXT"
  }
}
```

### Research Papers

```json
{
  "pose_estimation": "MediaPipe: A Framework for Building Perception Pipelines",
  "human_parsing": "Self-Correction for Human Parsing (SCHP)",
  "zero_shot_vision": "SigLIP: Sigmoid Loss for Language Image Pre-Training",
  "fast_segmentation": "BiSeNet V2: Bilateral Network with Guided Aggregation"
}
```

## Task Assignment

```json
{
  "task_id": "INST-410",
  "title": "Build AI auto-tagging system for Instagram creator body attributes",
  "phase": "Phase 7 (2026-Q2)",
  "priority": "MEDIUM",
  "effort": "100-140 hours (2.5-3.5 weeks full-time)",
  "dependencies": [
    "Phase 4 complete (Instagram dashboard)",
    "10K+ creators in database (current: 220)"
  ],
  "trigger": "When Instagram creator count reaches 5K-10K",
  "rationale": "Manual tagging becomes impractical at scale"
}
```

---

_Version: 1.0.0 | Created: 2025-10-05 | Status: PLANNED | Phase: 7_
_Navigate: [← INDEX.md](../INDEX.md) | [→ ROADMAP.md](../../ROADMAP.md)_
