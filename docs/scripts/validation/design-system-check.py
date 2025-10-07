#!/usr/bin/env python3
"""
Design System Standardization Validator
Ensures all components use design system tokens instead of inline styles
"""

import re
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime
import json


class DesignSystemChecker:
    def __init__(self):
        self.root = Path(__file__).parent.parent.parent.parent
        self.dashboard_dir = self.root / "dashboard"
        self.violations = []
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "violations": [],
            "summary": {
                "total_violations": 0,
                "files_checked": 0,
                "files_with_violations": 0,
                "passed": False
            }
        }

    def find_tsx_files(self) -> List[Path]:
        """Find all .ts and .tsx files in src/components and src/app"""
        files = []
        search_paths = [
            self.dashboard_dir / "src" / "components",
            self.dashboard_dir / "src" / "app"
        ]

        for search_path in search_paths:
            if search_path.exists():
                files.extend(search_path.rglob("*.ts"))
                files.extend(search_path.rglob("*.tsx"))

        return sorted(files)

    def check_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Check a single file for design system violations"""
        violations = []

        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.split('\n')

            for line_num, line in enumerate(lines, start=1):
                # Rule 1: Check for inline fontFamily styles
                if self._has_inline_font_family(line):
                    violations.append({
                        "file": str(file_path.relative_to(self.dashboard_dir)),
                        "line": line_num,
                        "rule": "no-inline-font-family",
                        "message": "Inline fontFamily style detected. Use font-mac-text or font-mac-display instead",
                        "code_snippet": line.strip()[:80]
                    })

                # Rule 2: Check for inline textShadow styles
                if self._has_inline_text_shadow(line):
                    violations.append({
                        "file": str(file_path.relative_to(self.dashboard_dir)),
                        "line": line_num,
                        "rule": "no-inline-text-shadow",
                        "message": "Inline textShadow style detected. Use text-shadow-subtle class instead",
                        "code_snippet": line.strip()[:80]
                    })

                # Rule 3: Check for hardcoded hex colors (excluding CSS variable definitions)
                if self._has_hardcoded_hex_color(line):
                    violations.append({
                        "file": str(file_path.relative_to(self.dashboard_dir)),
                        "line": line_num,
                        "rule": "no-hardcoded-hex-colors",
                        "message": "Hardcoded hex color detected. Use CSS variables (var(--color-name)) instead",
                        "code_snippet": line.strip()[:80]
                    })

                # Rule 4: Check for hardcoded rgba values (excluding CSS variable definitions)
                if self._has_hardcoded_rgba(line):
                    violations.append({
                        "file": str(file_path.relative_to(self.dashboard_dir)),
                        "line": line_num,
                        "rule": "no-hardcoded-rgba",
                        "message": "Hardcoded rgba value detected. Use CSS variables (var(--color-alpha-XX)) instead",
                        "code_snippet": line.strip()[:80]
                    })

        except Exception as e:
            print(f"  ⚠️  Error reading {file_path.name}: {e}")

        return violations

    def _has_inline_font_family(self, line: str) -> bool:
        """Check if line contains inline fontFamily style"""
        # Match: font-[-apple-system,BlinkMacSystemFont,...]
        # But allow: font-mac-text, font-mac-display
        pattern = r'font-\[-apple-system'
        return bool(re.search(pattern, line))

    def _has_inline_text_shadow(self, line: str) -> bool:
        """Check if line contains inline textShadow style"""
        # Match: textShadow: '...' or textShadow: "..."
        # But exclude: text-shadow-subtle (Tailwind class)
        pattern = r'textShadow\s*:\s*["\']'
        return bool(re.search(pattern, line))

    def _has_hardcoded_hex_color(self, line: str) -> bool:
        """Check if line contains hardcoded hex color"""
        # Match: #RRGGBB or #RGB in style attributes
        # Exclude: Comments, imports, variable definitions
        if '//' in line or 'import' in line or 'const ' in line or 'let ' in line or 'var ' in line:
            return False

        # Match hex colors in style attributes: color: #..., background: #..., etc.
        pattern = r'(color|background|border|shadow|fill|stroke)\s*[:\=]\s*["\']?#[0-9A-Fa-f]{3,8}'
        return bool(re.search(pattern, line))

    def _has_hardcoded_rgba(self, line: str) -> bool:
        """Check if line contains hardcoded rgba value"""
        # Match: rgba(R, G, B, A) in style attributes
        # Exclude: var(--...) CSS variables, comments, imports
        if 'var(--' in line or '//' in line or 'import' in line:
            return False

        # Match rgba in style/className attributes
        # But NOT in CSS variable definitions like: --color: rgba(...)
        if '--' in line and ':' in line:
            return False

        pattern = r'rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)'
        return bool(re.search(pattern, line))

    def run_check(self) -> int:
        """Run design system compliance check"""
        print("=" * 60)
        print("🎨 DESIGN SYSTEM COMPLIANCE CHECK")
        print("=" * 60)
        print()

        files = self.find_tsx_files()
        self.results["summary"]["files_checked"] = len(files)

        print(f"📁 Checking {len(files)} TypeScript files...")
        print()

        files_with_violations = set()

        for file_path in files:
            file_violations = self.check_file(file_path)
            if file_violations:
                files_with_violations.add(str(file_path.relative_to(self.dashboard_dir)))
                self.violations.extend(file_violations)

        self.results["violations"] = self.violations
        self.results["summary"]["total_violations"] = len(self.violations)
        self.results["summary"]["files_with_violations"] = len(files_with_violations)
        self.results["summary"]["passed"] = len(self.violations) == 0

        # Print results
        print("=" * 60)
        print("📊 RESULTS")
        print("=" * 60)
        print()

        if self.violations:
            # Group violations by file
            violations_by_file = {}
            for violation in self.violations:
                file_name = violation["file"]
                if file_name not in violations_by_file:
                    violations_by_file[file_name] = []
                violations_by_file[file_name].append(violation)

            print(f"❌ Found {len(self.violations)} design system violations in {len(files_with_violations)} files:\n")

            for file_name, file_violations in violations_by_file.items():
                print(f"  📄 {file_name}")
                for violation in file_violations:
                    print(f"     Line {violation['line']}: {violation['message']}")
                    print(f"     → {violation['code_snippet']}")
                print()

            print("=" * 60)
            print("🔧 HOW TO FIX")
            print("=" * 60)
            print()
            print("Inline fontFamily:")
            print("  ❌ font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text',...]")
            print("  ✅ font-mac-text  or  font-mac-display")
            print()
            print("Inline textShadow:")
            print("  ❌ style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}")
            print("  ✅ className=\"text-shadow-subtle\"")
            print()
            print("Hardcoded hex colors:")
            print("  ❌ color: '#FF8395'")
            print("  ✅ className=\"text-primary\"  or  var(--pink-500)")
            print()
            print("Hardcoded rgba values:")
            print("  ❌ background: 'rgba(255, 131, 149, 0.25)'")
            print("  ✅ className=\"bg-primary/25\"  or  var(--pink-alpha-25)")
            print()

            return 1  # Violations found
        else:
            print("✅ All checks passed!")
            print(f"   {len(files)} files are 100% design system compliant")
            print()
            return 0  # All good

    def save_results(self):
        """Save results to JSON file"""
        output_file = self.root / "docs" / "data" / "design-system-check.json"
        output_file.parent.mkdir(exist_ok=True)

        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Design system compliance checker")
    parser.add_argument('--json', action='store_true', help='Output JSON only')

    args = parser.parse_args()

    checker = DesignSystemChecker()
    exit_code = checker.run_check()
    checker.save_results()

    if args.json:
        print(json.dumps(checker.results, indent=2))

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
