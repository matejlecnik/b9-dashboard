#!/usr/bin/env python3
"""
Code Quality Validation Script
Runs TypeScript, ESLint, Ruff, and Mypy checks across the codebase
"""

import subprocess
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import re

class CodeQualityChecker:
    def __init__(self, quick: bool = False, files: Optional[List[str]] = None):
        self.root = Path(__file__).parent.parent.parent.parent
        self.dashboard_dir = self.root / "dashboard"
        self.api_dir = self.root / "api-render"
        self.quick = quick
        self.files = files  # Specific files to check (for git hooks)
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "checks": {},
            "summary": {
                "total_errors": 0,
                "total_warnings": 0,
                "passed": []
            }
        }

    def run_command(self, cmd: List[str], cwd: Optional[Path] = None, check: bool = False) -> Tuple[int, str, str]:
        """Run a command and return exit code, stdout, stderr"""
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd or self.root,
                capture_output=True,
                text=True,
                timeout=120
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return 1, "", "Command timeout"
        except Exception as e:
            return 1, "", str(e)

    def check_typescript(self) -> Dict[str, Any]:
        """Run TypeScript type checking"""
        print("🔍 Checking TypeScript...")

        code, stdout, stderr = self.run_command(
            ["npx", "tsc", "--noEmit"],
            cwd=self.dashboard_dir
        )

        # Parse TypeScript errors
        errors = []
        warnings = []

        output = stdout + stderr
        error_pattern = r"(.+?)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)"

        for match in re.finditer(error_pattern, output):
            file, line, col, level, code_num, message = match.groups()
            item = {
                "file": file,
                "line": int(line),
                "column": int(col),
                "code": f"TS{code_num}",
                "message": message
            }
            if level == "error":
                errors.append(item)
            else:
                warnings.append(item)

        result = {
            "tool": "TypeScript",
            "errors": errors,
            "warnings": warnings,
            "error_count": len(errors),
            "warning_count": len(warnings),
            "passed": code == 0 and len(errors) == 0
        }

        status = "✅" if result["passed"] else "❌"
        print(f"  {status} TypeScript: {len(errors)} errors, {len(warnings)} warnings")

        return result

    def check_eslint(self) -> Dict[str, Any]:
        """Run ESLint"""
        print("🔍 Checking ESLint...")

        # ESLint command
        cmd = ["npx", "eslint", "src/**/*.{ts,tsx}", "--format=json"]
        if self.files:
            # Filter to only staged TypeScript files
            ts_files = [f for f in self.files if f.endswith(('.ts', '.tsx'))]
            if not ts_files:
                print("  ⏭️  No TypeScript files to lint")
                return self._empty_result("ESLint")
            cmd = ["npx", "eslint"] + ts_files + ["--format=json"]

        code, stdout, stderr = self.run_command(cmd, cwd=self.dashboard_dir)

        errors = []
        warnings = []

        try:
            if stdout:
                eslint_results = json.loads(stdout)
                for file_result in eslint_results:
                    for message in file_result.get("messages", []):
                        item = {
                            "file": file_result["filePath"].replace(str(self.dashboard_dir) + "/", ""),
                            "line": message.get("line", 0),
                            "column": message.get("column", 0),
                            "code": message.get("ruleId", "unknown"),
                            "message": message.get("message", "")
                        }
                        if message.get("severity") == 2:
                            errors.append(item)
                        else:
                            warnings.append(item)
        except json.JSONDecodeError:
            pass

        result = {
            "tool": "ESLint",
            "errors": errors,
            "warnings": warnings,
            "error_count": len(errors),
            "warning_count": len(warnings),
            "passed": len(errors) == 0
        }

        status = "✅" if result["passed"] else "❌"
        print(f"  {status} ESLint: {len(errors)} errors, {len(warnings)} warnings")

        return result

    def check_ruff(self) -> Dict[str, Any]:
        """Run Ruff linter"""
        print("🔍 Checking Python (Ruff)...")

        # Check if ruff is installed
        ruff_check = subprocess.run(["which", "ruff"], capture_output=True)
        if ruff_check.returncode != 0:
            print("  ⚠️  Ruff not installed, skipping")
            return self._empty_result("Ruff")

        # Ruff command
        cmd = ["ruff", "check", ".", "--output-format=json"]
        if self.files:
            py_files = [f for f in self.files if f.endswith('.py')]
            if not py_files:
                print("  ⏭️  No Python files to lint")
                return self._empty_result("Ruff")
            # Strip api-render/ prefix if present (for git hooks with cwd=api_dir)
            py_files = [f.replace('api-render/', '', 1) if f.startswith('api-render/') else f for f in py_files]
            cmd = ["ruff", "check"] + py_files + ["--output-format=json"]

        code, stdout, stderr = self.run_command(cmd, cwd=self.api_dir)

        errors = []
        warnings = []

        try:
            if stdout:
                ruff_results = json.loads(stdout)
                for issue in ruff_results:
                    item = {
                        "file": issue.get("filename", "").replace(str(self.api_dir) + "/", ""),
                        "line": issue.get("location", {}).get("row", 0),
                        "column": issue.get("location", {}).get("column", 0),
                        "code": issue.get("code", "unknown"),
                        "message": issue.get("message", "")
                    }
                    # Ruff doesn't distinguish errors/warnings, treat all as errors for now
                    errors.append(item)
        except json.JSONDecodeError:
            pass

        result = {
            "tool": "Ruff",
            "errors": errors,
            "warnings": warnings,
            "error_count": len(errors),
            "warning_count": len(warnings),
            "passed": len(errors) == 0
        }

        status = "✅" if result["passed"] else "❌"
        print(f"  {status} Ruff: {len(errors)} issues")

        return result

    def check_mypy(self) -> Dict[str, Any]:
        """Run Mypy type checking"""
        print("🔍 Checking Python types (Mypy)...")

        # Check if mypy is installed
        mypy_check = subprocess.run(["which", "mypy"], capture_output=True)
        if mypy_check.returncode != 0:
            print("  ⚠️  Mypy not installed, skipping")
            return self._empty_result("Mypy")

        if self.quick:
            print("  ⏭️  Skipping Mypy in quick mode")
            return self._empty_result("Mypy")

        # Mypy command
        cmd = ["mypy", "app", "--no-error-summary"]
        if self.files:
            py_files = [f for f in self.files if f.endswith('.py') and 'api-render' in f]
            if not py_files:
                print("  ⏭️  No Python files to type check")
                return self._empty_result("Mypy")
            # Strip api-render/ prefix if present (for git hooks with cwd=api_dir)
            py_files = [f.replace('api-render/', '', 1) if f.startswith('api-render/') else f for f in py_files]
            cmd = ["mypy"] + py_files + ["--no-error-summary"]

        code, stdout, stderr = self.run_command(cmd, cwd=self.api_dir)

        errors = []
        warnings = []

        # Parse mypy output
        output = stdout + stderr
        error_pattern = r"(.+?):(\d+): (error|warning|note): (.+)"

        for match in re.finditer(error_pattern, output):
            file, line, level, message = match.groups()
            item = {
                "file": file,
                "line": int(line),
                "column": 0,
                "code": "mypy",
                "message": message
            }
            if level == "error":
                errors.append(item)
            elif level == "warning":
                warnings.append(item)

        result = {
            "tool": "Mypy",
            "errors": errors,
            "warnings": warnings,
            "error_count": len(errors),
            "warning_count": len(warnings),
            "passed": len(errors) == 0
        }

        status = "✅" if result["passed"] else "❌"
        print(f"  {status} Mypy: {len(errors)} errors, {len(warnings)} warnings")

        return result

    def _empty_result(self, tool: str) -> Dict[str, Any]:
        """Return empty result for skipped checks"""
        return {
            "tool": tool,
            "errors": [],
            "warnings": [],
            "error_count": 0,
            "warning_count": 0,
            "passed": True,
            "skipped": True
        }

    def check_design_system(self) -> Dict[str, Any]:
        """Run design system compliance check"""
        print("🎨 Checking Design System...")

        # Run the design system checker
        design_check_script = self.root / "docs" / "scripts" / "validation" / "design-system-check.py"

        if not design_check_script.exists():
            print("  ⚠️  Design system checker not found, skipping")
            return self._empty_result("Design System")

        code, stdout, stderr = self.run_command(
            ["python3", str(design_check_script), "--json"],
            cwd=self.root
        )

        errors = []

        # Parse design system check results
        try:
            if stdout:
                # Extract JSON from output (might have other text before it)
                json_start = stdout.rfind('{')
                if json_start >= 0:
                    json_str = stdout[json_start:]
                    design_results = json.loads(json_str)

                    # Convert violations to errors
                    for violation in design_results.get("violations", []):
                        errors.append({
                            "file": violation["file"],
                            "line": violation["line"],
                            "column": 0,
                            "code": violation["rule"],
                            "message": violation["message"]
                        })
        except (json.JSONDecodeError, ValueError):
            pass

        result = {
            "tool": "Design System",
            "errors": errors,
            "warnings": [],
            "error_count": len(errors),
            "warning_count": 0,
            "passed": len(errors) == 0
        }

        status = "✅" if result["passed"] else "❌"
        print(f"  {status} Design System: {len(errors)} violations")

        return result

    def run_all_checks(self) -> Dict[str, Any]:
        """Run all quality checks"""
        print("=" * 60)
        print("🔍 CODE QUALITY VALIDATION")
        print("=" * 60)

        # Run all checks
        self.results["checks"]["typescript"] = self.check_typescript()
        self.results["checks"]["eslint"] = self.check_eslint()
        self.results["checks"]["ruff"] = self.check_ruff()
        self.results["checks"]["mypy"] = self.check_mypy()
        self.results["checks"]["design_system"] = self.check_design_system()

        # Calculate summary
        for check_name, check_result in self.results["checks"].items():
            self.results["summary"]["total_errors"] += check_result["error_count"]
            self.results["summary"]["total_warnings"] += check_result["warning_count"]
            if check_result["passed"]:
                self.results["summary"]["passed"].append(check_name)

        # Print summary
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        total_errors = self.results["summary"]["total_errors"]
        total_warnings = self.results["summary"]["total_warnings"]

        print(f"Total Errors:   {total_errors}")
        print(f"Total Warnings: {total_warnings}")
        print(f"Checks Passed:  {len(self.results['summary']['passed'])}/5")

        # Overall status
        if total_errors == 0:
            print("\n✅ ALL CHECKS PASSED!")
            return_code = 0
        else:
            print(f"\n❌ {total_errors} ERRORS FOUND")
            return_code = 1

        # Save results
        self.save_results()

        return return_code

    def save_results(self):
        """Save results to JSON file"""
        output_file = self.root / "docs" / "data" / "code-quality.json"
        output_file.parent.mkdir(exist_ok=True)

        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        print(f"\n📄 Results saved to: {output_file}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Code quality validation")
    parser.add_argument('--quick', action='store_true', help='Quick mode (skip slow checks)')
    parser.add_argument('--files', nargs='+', help='Specific files to check')
    parser.add_argument('--json', action='store_true', help='Output JSON only')

    args = parser.parse_args()

    checker = CodeQualityChecker(quick=args.quick, files=args.files)
    exit_code = checker.run_all_checks()

    if args.json:
        print(json.dumps(checker.results, indent=2))

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
