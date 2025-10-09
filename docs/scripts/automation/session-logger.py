#!/usr/bin/env python3
"""
Automatic Session Logger
Analyzes git commits and updates SESSION_LOG.md automatically
"""

import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import argparse

class SessionLogger:
    def __init__(self):
        self.root = Path(__file__).parent.parent.parent.parent
        self.session_log = self.root / "docs" / "development" / "SESSION_LOG.md"
        self.session_data = {}

    def get_recent_commits(self, count: int = 5) -> List[Dict]:
        """Get recent git commits with details"""
        try:
            # Get commit info
            log_format = "%H|%an|%ae|%at|%s"
            result = subprocess.run(
                ["git", "log", f"-{count}", f"--format={log_format}"],
                capture_output=True, text=True, cwd=self.root
            )

            commits = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split('|')
                    commits.append({
                        "hash": parts[0][:7],
                        "author": parts[1],
                        "email": parts[2],
                        "timestamp": datetime.fromtimestamp(int(parts[3])),
                        "message": parts[4]
                    })
            return commits
        except Exception as e:
            print(f"Error getting commits: {e}")
            return []

    def analyze_commit(self, commit_hash: str) -> Dict:
        """Analyze a specific commit for changes"""
        try:
            # Get files changed
            result = subprocess.run(
                ["git", "diff-tree", "--no-commit-id", "--name-status", "-r", commit_hash],
                capture_output=True, text=True, cwd=self.root
            )

            files_changed = {
                "added": [],
                "modified": [],
                "deleted": []
            }

            for line in result.stdout.strip().split('\n'):
                if line:
                    status, filepath = line.split('\t')
                    if status == 'A':
                        files_changed["added"].append(filepath)
                    elif status == 'M':
                        files_changed["modified"].append(filepath)
                    elif status == 'D':
                        files_changed["deleted"].append(filepath)

            # Get stats
            stats_result = subprocess.run(
                ["git", "diff", "--shortstat", f"{commit_hash}~1", commit_hash],
                capture_output=True, text=True, cwd=self.root
            )

            stats = self.parse_stats(stats_result.stdout)

            return {
                "files_changed": files_changed,
                "stats": stats
            }
        except Exception as e:
            print(f"Error analyzing commit: {e}")
            return {"files_changed": {}, "stats": {}}

    def parse_stats(self, stat_line: str) -> Dict:
        """Parse git diff stats"""
        stats = {
            "files": 0,
            "insertions": 0,
            "deletions": 0
        }

        # Parse "X files changed, Y insertions(+), Z deletions(-)"
        patterns = {
            "files": r'(\d+) files? changed',
            "insertions": r'(\d+) insertions?',
            "deletions": r'(\d+) deletions?'
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, stat_line)
            if match:
                stats[key] = int(match.group(1))

        return stats

    def categorize_changes(self, files: Dict[str, List[str]]) -> Dict:
        """Categorize file changes by type"""
        categories = {
            "frontend": [],
            "backend": [],
            "database": [],
            "documentation": [],
            "config": [],
            "tests": []
        }

        all_files = files["added"] + files["modified"] + files["deleted"]

        for filepath in all_files:
            if "dashboard/" in filepath or ".tsx" in filepath or ".ts" in filepath:
                categories["frontend"].append(filepath)
            elif "backend/" in filepath or ".py" in filepath:
                categories["backend"].append(filepath)
            elif "database/" in filepath or ".sql" in filepath:
                categories["database"].append(filepath)
            elif ".md" in filepath:
                categories["documentation"].append(filepath)
            elif any(x in filepath for x in [".json", ".yaml", ".yml", ".env"]):
                categories["config"].append(filepath)
            elif "test" in filepath.lower() or "spec" in filepath.lower():
                categories["tests"].append(filepath)

        return {k: v for k, v in categories.items() if v}

    def generate_session_entry(self, commits: List[Dict]) -> str:
        """Generate a session log entry from commits"""
        if not commits:
            return ""

        # Session metadata
        session_date = datetime.now().strftime("%Y-%m-%d")
        session_id = f"{session_date}-auto-session"

        # Aggregate stats
        total_files = 0
        total_insertions = 0
        total_deletions = 0
        all_files_changed = {"added": [], "modified": [], "deleted": []}

        for commit in commits:
            analysis = self.analyze_commit(commit["hash"])
            stats = analysis["stats"]
            total_files += stats["files"]
            total_insertions += stats["insertions"]
            total_deletions += stats["deletions"]

            for key in ["added", "modified", "deleted"]:
                all_files_changed[key].extend(analysis["files_changed"].get(key, []))

        # Categorize changes
        categories = self.categorize_changes(all_files_changed)

        # Extract features/fixes from commit messages
        features = []
        fixes = []
        for commit in commits:
            msg = commit["message"].lower()
            if any(word in msg for word in ["add", "feat", "feature", "implement"]):
                features.append(commit["message"])
            elif any(word in msg for word in ["fix", "bug", "patch", "correct"]):
                fixes.append(commit["message"])

        # Build JSON entry
        entry = {
            session_id: {
                "duration": "auto-tracked",
                "commits": len(commits),
                "files_modified": total_files,
                "lines_added": total_insertions,
                "lines_deleted": total_deletions,
                "status": "LOGGED",
                "timestamp": datetime.now().isoformat(),
                "achievements": [],
                "categories_affected": list(categories.keys()),
                "commit_messages": [c["message"] for c in commits]
            }
        }

        # Add achievements based on changes
        if features:
            entry[session_id]["achievements"].append({
                "task": f"Added {len(features)} new features",
                "status": "COMPLETE"
            })
        if fixes:
            entry[session_id]["achievements"].append({
                "task": f"Fixed {len(fixes)} issues",
                "status": "COMPLETE"
            })
        if "documentation" in categories:
            entry[session_id]["achievements"].append({
                "task": f"Updated {len(categories['documentation'])} documentation files",
                "status": "COMPLETE"
            })

        # Format as JSON for SESSION_LOG.md
        json_str = json.dumps(entry, indent=2)

        # Add to recent sessions section
        return f"""
```json
{json_str}
```
"""

    def update_session_log(self, entry: str):
        """Update SESSION_LOG.md with new entry"""
        if not self.session_log.exists():
            print(f"SESSION_LOG.md not found at {self.session_log}")
            return

        with open(self.session_log, 'r') as f:
            content = f.read()

        # Find the "Recent Sessions" section
        pattern = r'(## Recent Sessions\s*\n\s*```json\s*\n)(\{.*?\n\})\s*(\n```)'
        match = re.search(pattern, content, re.DOTALL)

        if match:
            # Parse existing JSON
            try:
                existing_json = json.loads(match.group(2))
            except:
                existing_json = {}

            # Parse new entry
            new_entry_match = re.search(r'```json\s*\n(.*?)\n```', entry, re.DOTALL)
            if new_entry_match:
                try:
                    new_json = json.loads(new_entry_match.group(1))
                    # Merge with existing
                    existing_json.update(new_json)

                    # Keep only last 20 sessions
                    session_keys = sorted(existing_json.keys(), reverse=True)[:20]
                    existing_json = {k: existing_json[k] for k in session_keys}

                    # Format back
                    updated_json = json.dumps(existing_json, indent=2)

                    # Replace in content
                    updated_section = f"{match.group(1)}{updated_json}{match.group(3)}"
                    content = content[:match.start()] + updated_section + content[match.end():]

                    # Write back
                    with open(self.session_log, 'w') as f:
                        f.write(content)

                    print(f"✅ SESSION_LOG.md updated successfully")
                except Exception as e:
                    print(f"Error updating JSON: {e}")
        else:
            print("Could not find Recent Sessions section in SESSION_LOG.md")

    def archive_old_sessions(self):
        """Archive old sessions to separate files"""
        if not self.session_log.exists():
            return

        # Check file size
        size = self.session_log.stat().st_size / 1024  # KB
        if size > 100:  # If larger than 100KB
            # Create archive
            archive_name = f"SESSION_LOG_{datetime.now().strftime('%Y_%m')}.md"
            archive_path = self.session_log.parent / "archives" / archive_name
            archive_path.parent.mkdir(exist_ok=True)

            # Move old content to archive
            with open(self.session_log, 'r') as f:
                content = f.read()

            # Keep only header and last 10 sessions
            lines = content.split('\n')
            header_end = 0
            for i, line in enumerate(lines):
                if line.startswith('## Recent Sessions'):
                    header_end = i
                    break

            # TODO: Implement smart archiving logic
            print(f"Note: SESSION_LOG.md is {size:.1f}KB - consider archiving")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Automatic session logger")
    parser.add_argument('--commits', type=int, default=5, help='Number of recent commits to analyze')
    parser.add_argument('--dry-run', action='store_true', help='Print entry without updating file')
    parser.add_argument('--archive', action='store_true', help='Archive old sessions')
    args = parser.parse_args()

    logger = SessionLogger()

    if args.archive:
        logger.archive_old_sessions()
        return

    # Get recent commits
    commits = logger.get_recent_commits(args.commits)
    if not commits:
        print("No commits found")
        return

    print(f"Analyzing {len(commits)} recent commits...")

    # Generate session entry
    entry = logger.generate_session_entry(commits)

    if args.dry_run:
        print("\nGenerated session entry:")
        print(entry)
    else:
        logger.update_session_log(entry)

if __name__ == "__main__":
    main()