#!/usr/bin/env python3
"""
Code Quality Dashboard
Visual overview of code quality metrics with trend tracking
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

class QualityDashboard:
    def __init__(self):
        self.root = Path(__file__).parent.parent.parent.parent
        self.data_dir = self.root / "docs" / "data"
        self.quality_file = self.data_dir / "code-quality.json"
        self.history_file = self.data_dir / "code-quality-history.json"

    def load_current_quality(self) -> Optional[Dict[str, Any]]:
        """Load latest quality check results"""
        if not self.quality_file.exists():
            return None

        with open(self.quality_file, 'r') as f:
            return json.load(f)

    def load_history(self) -> list:
        """Load historical quality data"""
        if not self.history_file.exists():
            return []

        with open(self.history_file, 'r') as f:
            return json.load(f)

    def save_to_history(self, data: Dict[str, Any]):
        """Append current results to history"""
        history = self.load_history()

        # Add current snapshot
        snapshot = {
            "timestamp": data["timestamp"],
            "total_errors": data["summary"]["total_errors"],
            "total_warnings": data["summary"]["total_warnings"],
            "checks_passed": len(data["summary"]["passed"])
        }

        history.append(snapshot)

        # Keep last 30 days of history
        if len(history) > 30:
            history = history[-30:]

        with open(self.history_file, 'w') as f:
            json.dump(history, f, indent=2)

    def render_dashboard(self):
        """Render visual dashboard in terminal"""
        data = self.load_current_quality()

        if not data:
            print("❌ No quality data found. Run: python3 docs/scripts/validation/code-quality-check.py")
            sys.exit(1)

        # Save to history
        self.save_to_history(data)
        history = self.load_history()

        # Header
        print("\n" + "=" * 80)
        print("📊 CODE QUALITY DASHBOARD".center(80))
        print("=" * 80)

        # Timestamp
        ts = datetime.fromisoformat(data["timestamp"])
        print(f"\n🕐 Last Check: {ts.strftime('%Y-%m-%d %H:%M:%S')}")

        # Overall summary
        print("\n┌─ OVERALL STATUS " + "─" * 62 + "┐")
        total_errors = data["summary"]["total_errors"]
        total_warnings = data["summary"]["total_warnings"]
        checks_passed = len(data["summary"]["passed"])

        if total_errors == 0:
            status = "✅ EXCELLENT"
            color = "\033[92m"  # Green
        elif total_errors < 5:
            status = "⚠️  NEEDS ATTENTION"
            color = "\033[93m"  # Yellow
        else:
            status = "❌ CRITICAL"
            color = "\033[91m"  # Red

        reset = "\033[0m"

        print(f"│ Status:          {color}{status}{reset}")
        print(f"│ Total Errors:    {total_errors}")
        print(f"│ Total Warnings:  {total_warnings}")
        print(f"│ Checks Passed:   {checks_passed}/4")
        print("└" + "─" * 78 + "┘")

        # Individual check results
        print("\n┌─ CHECK RESULTS " + "─" * 63 + "┐")

        for check_name, check_data in data["checks"].items():
            icon = "✅" if check_data["passed"] else "❌"
            skipped = check_data.get("skipped", False)

            if skipped:
                icon = "⏭️ "
                print(f"│ {icon} {check_data['tool']:<15} SKIPPED")
            else:
                errors = check_data["error_count"]
                warnings = check_data["warning_count"]
                print(f"│ {icon} {check_data['tool']:<15} Errors: {errors:<3} Warnings: {warnings:<3}")

        print("└" + "─" * 78 + "┘")

        # Top issues (if any)
        if total_errors > 0:
            print("\n┌─ TOP ISSUES " + "─" * 66 + "┐")

            issue_count = 0
            for check_name, check_data in data["checks"].items():
                for error in check_data.get("errors", [])[:3]:  # Top 3 per check
                    if issue_count >= 10:  # Max 10 total
                        break

                    file = error.get("file", "unknown")
                    line = error.get("line", 0)
                    msg = error.get("message", "")[:50]  # Truncate

                    print(f"│ {check_data['tool']}: {file}:{line}")
                    print(f"│   {msg}")
                    issue_count += 1

                if issue_count >= 10:
                    break

            if total_errors > 10:
                print(f"│ ... and {total_errors - 10} more errors")

            print("└" + "─" * 78 + "┘")

        # Trend analysis (if history exists)
        if len(history) > 1:
            print("\n┌─ TREND (Last 7 Days) " + "─" * 56 + "┐")

            recent = history[-7:]

            # Calculate trend
            if len(recent) >= 2:
                first_errors = recent[0]["total_errors"]
                last_errors = recent[-1]["total_errors"]

                if last_errors < first_errors:
                    trend = "📈 IMPROVING"
                    diff = first_errors - last_errors
                    print(f"│ {trend} ({diff} fewer errors)")
                elif last_errors > first_errors:
                    trend = "📉 DECLINING"
                    diff = last_errors - first_errors
                    print(f"│ {trend} ({diff} more errors)")
                else:
                    trend = "➡️  STABLE"
                    print(f"│ {trend}")

            # Mini chart
            print("│")
            print("│ Error Count:")
            max_errors = max(r["total_errors"] for r in recent) or 1

            for entry in recent[-7:]:
                ts = datetime.fromisoformat(entry["timestamp"])
                date = ts.strftime("%m/%d")
                count = entry["total_errors"]
                bar_length = int((count / max_errors) * 30) if max_errors > 0 else 0
                bar = "█" * bar_length
                print(f"│ {date}: {bar} {count}")

            print("└" + "─" * 78 + "┘")

        # Quick actions
        print("\n┌─ QUICK ACTIONS " + "─" * 62 + "┐")
        print("│ Fix issues:      python3 docs/scripts/validation/code-quality-check.py")
        print("│ TypeScript fix:  cd dashboard && npx tsc --noEmit")
        print("│ ESLint fix:      cd dashboard && npx eslint src --fix")
        print("│ Python fix:      cd backend && ruff check . --fix")
        print("└" + "─" * 78 + "┘\n")

        # Return exit code
        return 0 if total_errors == 0 else 1


def main():
    dashboard = QualityDashboard()
    exit_code = dashboard.render_dashboard()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
