#!/usr/bin/env python3
"""
Documentation Generation Orchestration Script
Prepares context and spawns Claude Code agent for automated doc generation
"""

import os
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

class DocGenerationOrchestrator:
    def __init__(self, root_path: str = "."):
        self.root = Path(root_path).resolve()
        self.output_dir = self.root / "docs" / "agent-output"
        self.context = {}

    def gather_context(self) -> Dict[str, Any]:
        """Gather all context needed for agent"""
        print("📊 Gathering context for agent...")

        context = {
            "timestamp": datetime.now().isoformat(),
            "root_path": str(self.root),
            "standards": self.load_standards(),
            "template": self.load_template(),
            "non_compliant_files": self.get_non_compliant_files(),
            "directory_structure": self.get_directory_tree(),
            "metrics": self.gather_metrics()
        }

        print(f"✓ Found {len(context['non_compliant_files'])} non-compliant files")
        print(f"✓ Loaded standards v{context['standards']['version']}")

        return context

    def load_standards(self) -> Dict[str, Any]:
        """Load DOCUMENTATION_STANDARDS.md"""
        standards_path = self.root / "docs" / "development" / "DOCUMENTATION_STANDARDS.md"

        if not standards_path.exists():
            raise FileNotFoundError(f"Standards not found: {standards_path}")

        with open(standards_path, 'r') as f:
            content = f.read()

        # Extract version from footer
        version = "2.0.0"  # Default
        if "_Standards Version:" in content:
            import re
            match = re.search(r'_Standards Version: ([\d.]+)', content)
            if match:
                version = match.group(1)

        return {
            "version": version,
            "content": content,
            "path": str(standards_path)
        }

    def load_template(self) -> str:
        """Load DOCUMENTATION_TEMPLATE.md if exists"""
        template_path = self.root / "docs" / "development" / "DOCUMENTATION_TEMPLATE.md"

        if template_path.exists():
            with open(template_path, 'r') as f:
                return f.read()

        return ""

    def get_non_compliant_files(self) -> List[Dict[str, Any]]:
        """Get list of non-compliant files from validator"""
        validator_path = self.root / "docs" / "scripts" / "validate-docs.py"

        if not validator_path.exists():
            print("⚠️  Validator not found, scanning for all .md files")
            return self.scan_all_md_files()

        try:
            # Run validator to get non-compliant files
            result = subprocess.run(
                ["python3", str(validator_path), "--json"],
                capture_output=True,
                text=True,
                cwd=str(self.root)
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                return [
                    {
                        "path": str(Path(f).relative_to(self.root)),
                        "absolute_path": f,
                        "issues": []  # Would come from validator
                    }
                    for f in data.get("files_needing_update", [])
                ]
        except Exception as e:
            print(f"⚠️  Validator error: {e}, falling back to scan")

        return self.scan_all_md_files()

    def scan_all_md_files(self) -> List[Dict[str, Any]]:
        """Fallback: scan for all .md files"""
        md_files = []

        for path in self.root.rglob("*.md"):
            # Skip node_modules and hidden dirs
            if "node_modules" in str(path) or "/.git/" in str(path):
                continue

            # Skip root docs that are already compliant
            if path.name in ["ROADMAP.md", "CLAUDE.md"]:
                continue

            md_files.append({
                "path": str(path.relative_to(self.root)),
                "absolute_path": str(path),
                "issues": []
            })

        return md_files

    def get_directory_tree(self) -> str:
        """Generate directory tree structure"""
        try:
            result = subprocess.run(
                ["tree", "-d", "-L", "3", "-I", "node_modules|.git"],
                capture_output=True,
                text=True,
                cwd=str(self.root)
            )
            if result.returncode == 0:
                return result.stdout
        except FileNotFoundError:
            pass

        # Fallback: simple directory listing
        dirs = []
        for path in self.root.rglob("*"):
            if path.is_dir() and "node_modules" not in str(path):
                dirs.append(str(path.relative_to(self.root)))

        return "\n".join(sorted(dirs)[:50])  # Limit to 50 dirs

    def gather_metrics(self) -> Dict[str, Any]:
        """Gather codebase metrics"""
        metrics = {
            "total_md_files": 0,
            "total_ts_files": 0,
            "total_py_files": 0,
            "components": 0,
            "hooks": 0
        }

        # Count files
        for ext, key in [(".md", "total_md_files"), (".ts", "total_ts_files"),
                        (".tsx", "total_ts_files"), (".py", "total_py_files")]:
            count = len(list(self.root.rglob(f"*{ext}")))
            metrics[key] += count

        # Count components and hooks
        components_dir = self.root / "dashboard" / "src" / "components"
        if components_dir.exists():
            metrics["components"] = len(list(components_dir.rglob("*.tsx")))

        hooks_dir = self.root / "dashboard" / "src" / "hooks"
        if hooks_dir.exists():
            metrics["hooks"] = len(list(hooks_dir.rglob("*.ts")))

        return metrics

    def save_context(self, context: Dict[str, Any]) -> Path:
        """Save context to JSON for agent"""
        context_file = self.output_dir / "agent-context.json"
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Remove large content fields for JSON
        slim_context = {
            **context,
            "standards": {
                "version": context["standards"]["version"],
                "path": context["standards"]["path"]
            },
            "template": "LOADED" if context["template"] else "NONE"
        }

        with open(context_file, 'w') as f:
            json.dump(slim_context, f, indent=2)

        print(f"✓ Context saved to {context_file}")
        return context_file

    def generate_agent_prompt(self, context: Dict[str, Any]) -> str:
        """Generate comprehensive agent prompt"""
        file_count = len(context["non_compliant_files"])

        prompt = f"""
# Documentation Generation Task

## Objective
Convert {file_count} non-compliant .md files to terminal/JSON style per DOCUMENTATION_STANDARDS.md v{context['standards']['version']}.

## Standards Reference
Read and strictly follow: {context['standards']['path']}

Key requirements:
- Status box with format: ┌─ [TYPE] ─┐ │ ● [STATUS] │ ████░░░ XX% │ └─────┘
- Navigation JSON with parent/children/siblings/related
- Metrics section with real data
- Professional tone, no emojis except ✅ ⚠️ ❌
- Token-efficient (300-500 tokens target)
- Semantic version in footer: _Version: X.Y.Z | Updated: YYYY-MM-DD_

## Input Files ({file_count} files)
{self._format_file_list(context['non_compliant_files'][:10])}
... and {max(0, file_count - 10)} more files

## Directory Structure
```
{context['directory_structure'][:500]}
```

## Codebase Metrics
- Total .md files: {context['metrics']['total_md_files']}
- Components: {context['metrics']['components']}
- Hooks: {context['metrics']['hooks']}

## Processing Instructions

For each file:
1. Read current content
2. Analyze file location and purpose
3. Generate compliant version with:
   - Status box with accurate progress
   - Navigation JSON (infer from directory structure)
   - Real metrics (count files in directory, calculate LOC if possible)
   - Professional tone
   - Semantic version (default to 1.0.0 for new docs)
4. Save to: docs/agent-output/[original-relative-path]
5. Track in manifest

## Output Structure
- Generate files in: docs/agent-output/
- Preserve directory structure
- Create manifest.json with:
  - Files processed
  - Files flagged for review
  - Validation results

## Validation
After processing, run:
```bash
python3 docs/scripts/validate-docs.py docs/agent-output/
```

Target: 95%+ compliance

## Edge Cases
If file is too complex or unusual:
- Flag in manifest.json for manual review
- Add comment explaining why
- Generate best-effort version

## Examples
Good examples to follow:
- ROADMAP.md
- CLAUDE.md (Mission Control style)
- docs/development/SYSTEM_IMPROVEMENT_PLAN.md

Start processing and report progress every 10 files.
"""
        return prompt.strip()

    def _format_file_list(self, files: List[Dict[str, Any]]) -> str:
        """Format file list for prompt"""
        return "\n".join([f"- {f['path']}" for f in files])

    def prepare_output_directory(self):
        """Prepare output directory for agent"""
        if self.output_dir.exists():
            import shutil
            backup = self.output_dir.parent / f"agent-output-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            shutil.move(self.output_dir, backup)
            print(f"✓ Backed up existing output to {backup}")

        self.output_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ Output directory ready: {self.output_dir}")

def main():
    """Main orchestration function"""
    import sys

    print("="*60)
    print("📚 Documentation Generation Orchestrator")
    print("="*60)
    print()

    # Initialize
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    orchestrator = DocGenerationOrchestrator(root)

    # Gather context
    context = orchestrator.gather_context()

    # Save context
    context_file = orchestrator.save_context(context)

    # Prepare output
    orchestrator.prepare_output_directory()

    # Generate agent prompt
    prompt = orchestrator.generate_agent_prompt(context)

    # Save prompt
    prompt_file = orchestrator.output_dir / "agent-prompt.txt"
    with open(prompt_file, 'w') as f:
        f.write(prompt)

    print()
    print("="*60)
    print("✅ Ready to spawn documentation agent")
    print("="*60)
    print()
    print(f"Files to process: {len(context['non_compliant_files'])}")
    print(f"Context saved: {context_file}")
    print(f"Prompt saved: {prompt_file}")
    print()
    print("Next steps:")
    print("1. Review the prompt: cat", prompt_file)
    print("2. Spawn agent with this prompt via Claude Code")
    print("3. Monitor agent progress")
    print("4. Review output in:", orchestrator.output_dir)
    print()

if __name__ == "__main__":
    main()
