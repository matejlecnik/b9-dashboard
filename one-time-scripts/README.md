# One-Time Scripts

This directory contains utility scripts that are run occasionally for maintenance or analysis tasks.

## Directory Structure

- `/reddit-analysis/` - Scripts for analyzing Reddit data
- `/results/` - Output files from script runs

## Available Scripts

### Reddit Analysis

#### `reddit-analysis/recheck_non_related.py`
**Purpose**: Re-analyzes subreddits marked as "Non Related" to identify potential self-posting communities that were miscategorized.

**When to use**:
- Periodically to improve categorization accuracy
- After updating categorization criteria
- To find missed self-posting communities

**How to run**:
```bash
cd one-time-scripts/reddit-analysis
python3 recheck_non_related.py
```

**Features**:
- Uses GPT-4 to analyze subreddit descriptions
- Identifies self-posting communities (non-porn/nude)
- Can resume from a specific subreddit if interrupted
- Saves results in both TXT and JSON formats

**To resume from interruption**:
1. Edit the script and update `RESUME_FROM` variable with the last processed subreddit name
2. Update `RESUME_INDEX` with the index number
3. Run the script again

**Output**:
- Text file with detailed results
- JSON file with structured data
- List of subreddit IDs that should be recategorized

## Results

Check the `/results/` directory for output files from previous runs:
- `self_posting_subreddits_*.txt` - Human-readable results
- `recheck_results_*.json` - Machine-readable data