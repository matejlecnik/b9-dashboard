"""Configuration management for Instagram AI Tagger"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", "./data/models"))
CACHE_DIR = Path(os.getenv("CACHE_DIR", "./data/cache"))
LOG_DIR = Path(os.getenv("LOG_DIR", "./logs"))

# Create directories if they don't exist
MODEL_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
    "SUPABASE_SERVICE_KEY"
)

# Processing
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 32))
GPU_DEVICE = int(os.getenv("GPU_DEVICE", 0))
MAX_WORKERS = int(os.getenv("MAX_WORKERS", 4))
MAX_IMAGES_PER_CREATOR = int(os.getenv("MAX_IMAGES_PER_CREATOR", 10))

# Thresholds
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", 0.70))
ESCALATION_THRESHOLD = float(os.getenv("ESCALATION_THRESHOLD", 0.70))

# Model options
USE_FP16 = os.getenv("USE_FP16", "true").lower() == "true"
USE_TENSORRT = os.getenv("USE_TENSORRT", "false").lower() == "true"
SKIP_EXISTING = os.getenv("SKIP_EXISTING", "true").lower() == "true"

# Model names
YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n.pt")
SIGLIP_MODEL = os.getenv("SIGLIP_MODEL", "google/siglip-so400m-patch14-384")

# Model version (for tracking)
MODEL_VERSION = "1.0.0"


def validate_config():
    """Validate required configuration"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file.\n"
            "Copy .env.example to .env and fill in your credentials."
        )

    print("✅ Configuration validated")
    print(f"   Model Dir: {MODEL_DIR.absolute()}")
    print(f"   GPU Device: cuda:{GPU_DEVICE}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print(f"   Min Confidence: {MIN_CONFIDENCE}")
