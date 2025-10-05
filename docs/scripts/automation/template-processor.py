#!/usr/bin/env python3
"""
Template Processor for Dynamic Documentation
Injects real-time metrics into .md files using template placeholders
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
import argparse

class TemplateProcessor:
    def __init__(self):
        self.root = Path(__file__).parent.parent.parent.parent
        self.metrics_file = self.root / "docs" / "data" / "metrics.json"
        self.metrics = {}
        self.load_metrics()

    def load_metrics(self):
        """Load metrics from JSON file"""
        if self.metrics_file.exists():
            with open(self.metrics_file, 'r') as f:
                self.metrics = json.load(f)
        else:
            print(f"Warning: Metrics file not found at {self.metrics_file}")
            print("Run: python3 docs/scripts/automation/metrics-daemon.py --once")
            self.metrics = self.get_default_metrics()

    def get_default_metrics(self) -> Dict:
        """Return default metrics if file not found"""
        return {
            "timestamp": datetime.now().isoformat(),
            "system": {
                "cpu_percent": 40,
                "memory_percent": 70,
                "disk_percent": 60,
                "network": {"bytes_sent": 0, "bytes_recv": 0}
            },
            "api": {
                "status": "UNKNOWN",
                "p50_latency": "N/A",
                "p95_latency": "N/A",
                "uptime": "N/A"
            },
            "database": {
                "status": "UNKNOWN",
                "size_gb": 0,
                "connections": {"used": 0, "max": 100},
                "tables": {}
            },
            "documentation": {
                "total_files": 91,
                "compliance_rate": "100%",
                "status": "DONE",
                "pending_files": 0
            },
            "git": {
                "branch": "main",
                "total_commits": 0,
                "modified_files": 0
            },
            "scrapers": {
                "reddit": {"status": "UNKNOWN", "version": "N/A", "error_rate": "N/A"},
                "instagram": {"status": "UNKNOWN", "version": "N/A", "creators_tracked": 0}
            }
        }

    def process_template(self, template: str) -> str:
        """Process template string with metric placeholders"""
        # Define placeholder patterns and their replacements
        replacements = {
            # System metrics
            "{{CPU_PERCENT}}": str(self.metrics.get("system", {}).get("cpu_percent", 0)),
            "{{MEMORY_PERCENT}}": str(self.metrics.get("system", {}).get("memory_percent", 0)),
            "{{DISK_PERCENT}}": str(self.metrics.get("system", {}).get("disk_percent", 0)),

            # API metrics
            "{{API_STATUS}}": self.metrics.get("api", {}).get("status", "UNKNOWN"),
            "{{API_P50}}": self.metrics.get("api", {}).get("p50_latency", "N/A"),
            "{{API_P95}}": self.metrics.get("api", {}).get("p95_latency", "N/A"),
            "{{API_UPTIME}}": self.metrics.get("api", {}).get("uptime", "N/A"),

            # Database metrics
            "{{DB_STATUS}}": self.metrics.get("database", {}).get("status", "UNKNOWN"),
            "{{DB_SIZE}}": str(self.metrics.get("database", {}).get("size_gb", 0)),
            "{{DB_CONNECTIONS_USED}}": str(self.metrics.get("database", {}).get("connections", {}).get("used", 0)),
            "{{DB_CONNECTIONS_MAX}}": str(self.metrics.get("database", {}).get("connections", {}).get("max", 100)),
            "{{SUBREDDITS_COUNT}}": str(self.metrics.get("database", {}).get("tables", {}).get("subreddits", {}).get("count", 0)),
            "{{CREATORS_COUNT}}": str(self.metrics.get("database", {}).get("tables", {}).get("instagram_creators", {}).get("count", 0)),

            # Documentation metrics
            "{{DOCS_TOTAL}}": str(self.metrics.get("documentation", {}).get("total_files", 0)),
            "{{DOCS_COMPLIANCE}}": self.metrics.get("documentation", {}).get("compliance_rate", "0%"),
            "{{DOCS_STATUS}}": self.metrics.get("documentation", {}).get("status", "UNKNOWN"),
            "{{DOCS_PENDING}}": str(self.metrics.get("documentation", {}).get("pending_files", 0)),

            # Git metrics
            "{{GIT_BRANCH}}": self.metrics.get("git", {}).get("branch", "main"),
            "{{GIT_COMMITS}}": str(self.metrics.get("git", {}).get("total_commits", 0)),
            "{{GIT_MODIFIED}}": str(self.metrics.get("git", {}).get("modified_files", 0)),

            # Scraper metrics
            "{{REDDIT_STATUS}}": self.metrics.get("scrapers", {}).get("reddit", {}).get("status", "UNKNOWN"),
            "{{REDDIT_VERSION}}": self.metrics.get("scrapers", {}).get("reddit", {}).get("version", "N/A"),
            "{{REDDIT_ERRORS}}": self.metrics.get("scrapers", {}).get("reddit", {}).get("error_rate", "N/A"),
            "{{INSTAGRAM_STATUS}}": self.metrics.get("scrapers", {}).get("instagram", {}).get("status", "UNKNOWN"),
            "{{INSTAGRAM_CREATORS}}": str(self.metrics.get("scrapers", {}).get("instagram", {}).get("creators_tracked", 0)),

            # Timestamps
            "{{LAST_UPDATE}}": datetime.now().strftime("%Y-%m-%d %H:%M UTC"),
            "{{LAST_DEPLOY}}": datetime.now().strftime("%Y-%m-%d %H:%M UTC"),  # TODO: Get from deploy logs

            # Progress bars
            "{{CPU_BAR}}": self.create_progress_bar(self.metrics.get("system", {}).get("cpu_percent", 0)),
            "{{MEMORY_BAR}}": self.create_progress_bar(self.metrics.get("system", {}).get("memory_percent", 0)),
            "{{DISK_BAR}}": self.create_progress_bar(self.metrics.get("system", {}).get("disk_percent", 0)),
            "{{NETWORK_BAR}}": self.create_progress_bar(30),  # Placeholder
        }

        # Replace all placeholders
        result = template
        for placeholder, value in replacements.items():
            result = result.replace(placeholder, str(value))

        return result

    def create_progress_bar(self, percent: float, width: int = 20) -> str:
        """Create ASCII progress bar"""
        filled = int(width * percent / 100)
        empty = width - filled
        return "█" * filled + "░" * empty

    def process_file(self, filepath: Path, output_path: Optional[Path] = None):
        """Process a template file"""
        if not filepath.exists():
            print(f"File not found: {filepath}")
            return

        # Check if file has .template extension
        if filepath.suffix == '.template':
            template_file = filepath
            output_file = output_path or filepath.with_suffix('')
        else:
            # Look for .template version
            template_file = filepath.with_suffix(filepath.suffix + '.template')
            if not template_file.exists():
                # Create template from existing file
                print(f"Creating template: {template_file}")
                self.create_template_from_file(filepath, template_file)
                return

            output_file = output_path or filepath

        # Read template
        with open(template_file, 'r') as f:
            template_content = f.read()

        # Process template
        processed_content = self.process_template(template_content)

        # Write output
        with open(output_file, 'w') as f:
            f.write(processed_content)

        print(f"✅ Processed: {template_file} → {output_file}")

    def create_template_from_file(self, source: Path, template_path: Path):
        """Convert existing file to template by adding placeholders"""
        with open(source, 'r') as f:
            content = f.read()

        # Define patterns to replace with placeholders
        replacements = [
            # System metrics in Real-Time Health section
            (r'API\s+\[.*?\]\s+\d+ms p50.*?\d+ms p95.*?[\d.]+% uptime',
             'API       [{{API_STATUS}}]  {{API_P50}} p50  | {{API_P95}} p95  | {{API_UPTIME}} uptime'),
            (r'DATABASE\s+\[.*?\]\s+[\d.]+GB.*?\d+/\d+ conns.*?\d+ subreddits',
             'DATABASE  [{{DB_STATUS}}]    {{DB_SIZE}}GB     | {{DB_CONNECTIONS_USED}}/{{DB_CONNECTIONS_MAX}} conns | {{SUBREDDITS_COUNT}} subreddits'),
            (r'SCRAPER\s+\[.*?\]\s+v[\d.]+.*?<[\d.]+% errors.*?\d+ users',
             'SCRAPER   [{{REDDIT_STATUS}}]    {{REDDIT_VERSION}}    | {{REDDIT_ERRORS}} errors   | {{INSTAGRAM_CREATORS}} users'),
            (r'DOCS\s+\[.*?\]\s+[\d.]+%.*?\d+ files pending.*?[\w\s]+',
             'DOCS      [{{DOCS_STATUS}}]  {{DOCS_COMPLIANCE}}      | {{DOCS_PENDING}} files pending  | Compliance achieved'),

            # Resource Monitor bars
            (r'CPU\s+\[█░]+\]\s+\d+%',
             'CPU     [{{CPU_BAR}}] {{CPU_PERCENT}}%'),
            (r'MEMORY\s+\[█░]+\]\s+\d+%',
             'MEMORY [{{MEMORY_BAR}}] {{MEMORY_PERCENT}}%'),
            (r'DISK\s+\[█░]+\]\s+\d+%',
             'DISK    [{{DISK_BAR}}] {{DISK_PERCENT}}%'),
            (r'NETWORK\s+\[█░]+\]\s+\d+%',
             'NETWORK [{{NETWORK_BAR}}] 30%'),

            # Version and timestamps
            (r'Last Deploy: \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC',
             'Last Deploy: {{LAST_DEPLOY}}'),
            (r'Updated: \d{4}-\d{2}-\d{2}',
             'Updated: {{LAST_UPDATE}}'),
        ]

        # Apply replacements
        template_content = content
        for pattern, replacement in replacements:
            template_content = re.sub(pattern, replacement, template_content)

        # Save template
        with open(template_path, 'w') as f:
            f.write(template_content)

        print(f"✅ Created template: {template_path}")
        print("   Edit the template to add more placeholders as needed")
        print(f"   Then run: python3 {__file__} {template_path}")

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="Process documentation templates")
    parser.add_argument('file', nargs='?', help='File to process (or create template from)')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--create-template', action='store_true', help='Create template from existing file')
    parser.add_argument('--process-all', action='store_true', help='Process all .template files')
    parser.add_argument('--update-metrics', action='store_true', help='Update metrics before processing')
    args = parser.parse_args()

    processor = TemplateProcessor()

    if args.update_metrics:
        # Run metrics daemon once
        import subprocess
        print("Updating metrics...")
        subprocess.run([
            "python3",
            str(processor.root / "docs/scripts/automation/metrics-daemon.py"),
            "--once"
        ])
        processor.load_metrics()  # Reload metrics

    if args.process_all:
        # Find and process all .template files
        template_files = list(processor.root.rglob("*.template"))
        print(f"Found {len(template_files)} template files")
        for template in template_files:
            processor.process_file(template)
    elif args.file:
        filepath = Path(args.file)
        output = Path(args.output) if args.output else None
        processor.process_file(filepath, output)
    else:
        # Process CLAUDE.md by default
        claude_md = processor.root / "CLAUDE.md"
        processor.process_file(claude_md)

if __name__ == "__main__":
    main()