# Getting Started with Instagram AI Tagger

## ✅ What We've Built So Far

**PHASE 1 ✅ - Project Setup**
- Complete directory structure
- Configuration files (requirements.txt, .env.example, .gitignore)
- Project documentation (README.md)
- Settings management (config/settings.py)

**PHASE 2 ✅ - Database Connection**
- Supabase client (src/database/client.py)
- Database queries (src/database/queries.py)
- Test script (scripts/test_connection.py)

## 🚀 Next Steps - Setup Your Environment

### Step 1: Navigate to Project

```bash
cd /Users/matejlecnik/Desktop/b9_agency/b9dashboard/instagram-ai-tagger
```

### Step 2: Create Virtual Environment

```bash
# Create venv
python3 -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate  # Windows
```

### Step 3: Install Dependencies

```bash
# Install all requirements
pip install -r requirements.txt

# This will take 5-10 minutes (downloads PyTorch, MediaPipe, etc.)
```

**Note:** If you get CUDA errors, you may need to install CPU-only versions first:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Step 4: Configure Database Connection

```bash
# Copy example config
cp .env.example .env

# Edit with your credentials
nano .env  # or open with any editor
```

**Required values:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

Get these from:
1. Go to your Supabase project
2. Settings → API
3. Copy "Project URL" and "service_role" key

### Step 5: Test Database Connection

```bash
python scripts/test_connection.py
```

**Expected output:**
```
✅ Connected to Supabase: https://...
✅ Configuration validated
✅ Found 5 creators
✅ Found 10 images for creator...
✅ Statistics retrieved
   Total creators: 414
   Tagged: 0
   Untagged: 414
```

If you see this, **PHASE 1 & 2 are working! 🎉**

---

## 🔜 What's Next - PHASE 3 & 4

### PHASE 3: Model Setup (Next Session)
We'll implement:
- [ ] YOLOv8 person detector
- [ ] MediaPipe pose & face keypoints
- [ ] PP-HumanSeg segmentation
- [ ] SigLIP embeddings
- [ ] Model download script

### PHASE 4: Main CLI (After PHASE 3)
We'll implement:
- [ ] Image processing pipeline
- [ ] Feature extraction
- [ ] Tag assignment logic
- [ ] Batch processor
- [ ] Main CLI with click

---

## 📁 Current Project Structure

```
instagram-ai-tagger/
├── README.md                    ✅ Created
├── GETTING_STARTED.md           ✅ Created
├── requirements.txt             ✅ Created
├── .env.example                 ✅ Created
├── .gitignore                   ✅ Created
│
├── config/
│   ├── __init__.py             ✅ Created
│   └── settings.py             ✅ Created (config loader)
│
├── src/
│   ├── __init__.py             ✅ Created
│   ├── database/
│   │   ├── __init__.py         ✅ Created
│   │   ├── client.py           ✅ Created (Supabase connection)
│   │   └── queries.py          ✅ Created (DB operations)
│   │
│   ├── models/                 ⏳ Next phase
│   ├── features/               ⏳ Next phase
│   ├── tagging/                ⏳ Next phase
│   ├── pipeline/               ⏳ Next phase
│   └── utils/                  ⏳ Next phase
│
├── scripts/
│   └── test_connection.py      ✅ Created (test script)
│
└── data/                        📁 Empty (will store models)
```

---

## 🛠️ Troubleshooting

### Issue: "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"
**Solution:** Make sure you created `.env` file and filled in credentials

### Issue: "No module named 'supabase'"
**Solution:** Make sure virtual environment is activated and run `pip install -r requirements.txt`

### Issue: CUDA errors
**Solution:** For now, use CPU-only PyTorch (we'll optimize for GPU in PHASE 3):
```bash
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Issue: "table instagram_creators does not exist"
**Solution:** Make sure your Supabase project has the Instagram tables. Check main api-render database schema.

---

## 📞 Ready for PHASE 3?

Once you've:
1. ✅ Installed dependencies
2. ✅ Configured .env file
3. ✅ Tested database connection successfully

We can move to **PHASE 3: Model Setup** where we'll implement the AI detection and tagging models!

---

**Current Status:** PHASE 1 & 2 Complete (Database Ready) ✅
**Next:** PHASE 3 - AI Models Implementation
**ETA:** 6-8 hours of development
