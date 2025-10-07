# Instagram AI Tagger

Automated visual attribute classification system for Instagram creators using self-hosted AI models.

## 🎯 Overview

This standalone project processes Instagram creator images to automatically assign visual attribute tags (body type, hair color, style, etc.) using a multi-model AI pipeline.

**Key Features:**
- ✅ Self-hosted (privacy-first, NSFW-tolerant)
- ✅ Multi-model pipeline (YOLOv8 + MediaPipe + SigLIP)
- ✅ GPU-accelerated (RTX 4090 optimized)
- ✅ Batch processing (20-50 images/second)
- ✅ Confidence scoring & manual review UI
- ✅ Supabase integration

## 📊 Architecture

```
Image → Detection (YOLO) → Keypoints (MediaPipe) →
Segmentation (PP-HumanSeg) → Features →
Embeddings (SigLIP) → Tags + Confidence
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure

```bash
# Copy example config
cp .env.example .env

# Edit with your Supabase credentials
nano .env
```

### 3. Download Models

```bash
python scripts/download_models.py
```

### 4. Process Creators

```bash
# Process 50 creators
python main.py process --batch-size 50

# Process specific creators
python main.py process --creator-ids 123 456 789

# Launch review UI
python main.py ui
```

## 📁 Project Structure

```
instagram-ai-tagger/
├── src/
│   ├── database/      # Supabase connection
│   ├── models/        # AI models (YOLO, MediaPipe, SigLIP)
│   ├── features/      # Feature extraction (ratios, measurements)
│   ├── tagging/       # Tag assignment logic
│   ├── pipeline/      # Processing orchestration
│   └── utils/         # Helper functions
├── scripts/           # Utility scripts
├── ui/               # Streamlit review dashboard
├── data/             # Model weights & cache (gitignored)
└── main.py           # CLI entry point
```

## 🤖 Models Used

| Model | Purpose | Size | Speed |
|-------|---------|------|-------|
| YOLOv8-nano | Person detection | 6MB | ~100 FPS |
| MediaPipe Pose | Body keypoints (33) | Built-in | Real-time |
| MediaPipe Face | Face landmarks (468) | Built-in | Real-time |
| PP-HumanSeg | Silhouette segmentation | 5MB | ~200 FPS |
| SigLIP-SO400M | Zero-shot classification | 1.5GB | ~100 img/s |

## 📝 Tag Categories

- **Body Type**: petite, slim, athletic, curvy, thick, slim_thick, bbw
- **Breasts**: small, medium, large, huge, perky, natural, enhanced
- **Ass**: small, bubble, big
- **Hair**: blonde, brunette, redhead, colored
- **Style**: alt, goth, egirl, tattooed, natural, bimbo, tomboy
- **Age Appearance**: college, adult, milf, mature (coarse categories)

More tags will be added based on calibration results.

## 🎯 Performance Targets

- **Speed**: 20-50 images/second on RTX 4090
- **Accuracy**: 85-90% after calibration
- **Coverage**: All creators tagged
- **Cost**: ~$0 (self-hosted)

## 🔧 Development

### Run Tests
```bash
pytest tests/
```

### Run Benchmark
```bash
python main.py benchmark
```

### Calibrate Thresholds
```bash
python main.py calibrate
```

## 📚 Documentation

See `/docs` in main repository for detailed technical documentation.

## 🔐 Privacy & Ethics

- ❌ **No ethnicity inference** - self-reported only
- ✅ All processing happens locally
- ✅ No data sent to external APIs
- ✅ Confidence scores for transparency
- ✅ Manual review for low-confidence tags

## 📄 License

Part of B9 Dashboard project. Internal use only.
