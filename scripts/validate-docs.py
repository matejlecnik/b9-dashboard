#!/usr/bin/env python3
"""
Documentation Validation Script
Checks all .md files for compliance with documentation standards
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

class DocValidator:
    def __init__(self, root_path: str = "."):
        self.root = Path(root_path)
        self.issues = []
        self.stats = {
            "total_files": 0,
            "compliant_files": 0,
            "files_with_terminal_format": 0,
            "files_with_navigation": 0,
            "files_with_status_box": 0,
            "files_needing_update": []
        }

    def validate_all(self) -> Dict:
        """Validate all markdown files"""
        md_files = self.find_markdown_files()

        for file_path in md_files:
            self.validate_file(file_path)

        self.stats["compliance_rate"] = (
            self.stats["compliant_files"] / self.stats["total_files"] * 100
            if self.stats["total_files"] > 0 else 0
        )

        return self.generate_report()

    def find_markdown_files(self) -> List[Path]:
        """Find all .md files excluding node_modules"""
        md_files = []
        for path in self.root.rglob("*.md"):
            if "node_modules" not in str(path):
                md_files.append(path)
        return sorted(md_files)

    def validate_file(self, file_path: Path) -> bool:
        """Validate a single markdown file"""
        self.stats["total_files"] += 1

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.issues.append({
                "file": str(file_path),
                "issue": f"Cannot read file: {e}",
                "severity": "ERROR"
            })
            return False

        is_compliant = True

        # Check for terminal format (status box)
        if self.has_terminal_format(content):
            self.stats["files_with_terminal_format"] += 1
        else:
            is_compliant = False
            self.issues.append({
                "file": str(file_path),
                "issue": "Missing terminal-style status box",
                "severity": "HIGH",
                "fix": "Add status box with progress bar"
            })

        # Check for navigation JSON
        if self.has_navigation_json(content):
            self.stats["files_with_navigation"] += 1
        else:
            is_compliant = False
            self.issues.append({
                "file": str(file_path),
                "issue": "Missing navigation JSON structure",
                "severity": "MEDIUM",
                "fix": "Add navigation section with parent/siblings/related"
            })

        # Check for proper header hierarchy
        if not self.has_proper_headers(content):
            is_compliant = False
            self.issues.append({
                "file": str(file_path),
                "issue": "Improper header hierarchy",
                "severity": "LOW",
                "fix": "Ensure headers follow # > ## > ### pattern"
            })

        if is_compliant:
            self.stats["compliant_files"] += 1
        else:
            self.stats["files_needing_update"].append(str(file_path))

        return is_compliant

    def has_terminal_format(self, content: str) -> bool:
        """Check if file has terminal-style status box"""
        patterns = [
            r'┌─.*─┐',  # Box top
            r'│.*│',    # Box content
            r'└─.*─┘',  # Box bottom
        ]
        return all(re.search(pattern, content) for pattern in patterns)

    def has_navigation_json(self, content: str) -> bool:
        """Check if file has navigation JSON structure"""
        nav_patterns = [
            r'"parent":\s*"',
            r'"current":\s*"',
        ]
        return any(re.search(pattern, content) for pattern in nav_patterns)

    def has_proper_headers(self, content: str) -> bool:
        """Check for proper header hierarchy"""
        lines = content.split('\n')
        h1_count = sum(1 for line in lines if line.startswith('# '))

        # Should have exactly one H1
        return h1_count == 1

    def generate_report(self) -> Dict:
        """Generate validation report"""
        return {
            "summary": {
                "total_files": self.stats["total_files"],
                "compliant_files": self.stats["compliant_files"],
                "compliance_rate": f"{self.stats['compliance_rate']:.1f}%",
                "files_needing_update": len(self.stats["files_needing_update"])
            },
            "metrics": {
                "terminal_format": f"{self.stats['files_with_terminal_format']}/{self.stats['total_files']}",
                "navigation_json": f"{self.stats['files_with_navigation']}/{self.stats['total_files']}",
            },
            "issues_by_severity": self.group_issues_by_severity(),
            "files_needing_update": self.stats["files_needing_update"][:10],  # Top 10
            "issues": self.issues[:20]  # Top 20 issues
        }

    def group_issues_by_severity(self) -> Dict:
        """Group issues by severity"""
        grouped = {"ERROR": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for issue in self.issues:
            severity = issue.get("severity", "LOW")
            grouped[severity] = grouped.get(severity, 0) + 1
        return grouped

    def print_report(self, report: Dict):
        """Print formatted report"""
        print("\n" + "="*60)
        print("📊 DOCUMENTATION VALIDATION REPORT")
        print("="*60)

        print("\n📈 SUMMARY:")
        for key, value in report["summary"].items():
            print(f"  {key}: {value}")

        print("\n⚠️ ISSUES BY SEVERITY:")
        for severity, count in report["issues_by_severity"].items():
            if count > 0:
                symbol = {"ERROR": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}[severity]
                print(f"  {symbol} {severity}: {count}")

        if report["files_needing_update"]:
            print("\n📝 FILES NEEDING UPDATE (top 10):")
            for file in report["files_needing_update"]:
                print(f"  - {file}")

        if report["issues"]:
            print("\n🔍 TOP ISSUES:")
            for issue in report["issues"][:10]:
                print(f"\n  File: {issue['file']}")
                print(f"  Issue: {issue['issue']}")
                if 'fix' in issue:
                    print(f"  Fix: {issue['fix']}")

def main():
    """Main entry point"""
    import sys

    # Get root path from argument or use current directory
    root_path = sys.argv[1] if len(sys.argv) > 1 else "."

    print(f"🔍 Validating documentation in: {root_path}")

    validator = DocValidator(root_path)
    report = validator.validate_all()

    # Print report
    validator.print_report(report)

    # Save report as JSON
    report_path = Path(root_path) / "docs" / "validation-report.json"
    report_path.parent.mkdir(exist_ok=True)

    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n✅ Report saved to: {report_path}")

    # Exit with error code if compliance is below threshold
    if report["summary"]["compliance_rate"].rstrip('%') < "80":
        sys.exit(1)

if __name__ == "__main__":
    main()