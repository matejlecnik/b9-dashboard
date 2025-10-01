#!/usr/bin/env python3
"""
Fix header hierarchy in markdown files.
Ensures each file has exactly one H1 (#) and converts extra H1s to H2s (##).
"""

import sys
from pathlib import Path
import re


def fix_headers(file_path: Path) -> bool:
    """
    Fix header hierarchy in a markdown file.
    Returns True if changes were made.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find all H1 headers (lines starting with exactly one #)
    h1_indices = []
    for i, line in enumerate(lines):
        if re.match(r'^# [^#]', line):
            h1_indices.append(i)

    if len(h1_indices) <= 1:
        # Already compliant or no H1s
        return False

    print(f"  Found {len(h1_indices)} H1 headers, converting extras to H2...")

    # Keep first H1, convert rest to H2
    modified = False
    for idx in h1_indices[1:]:
        lines[idx] = '#' + lines[idx]  # Add extra # to make it H2
        modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)

    return modified


def main():
    if len(sys.argv) < 2:
        print("Usage: fix-headers.py <file1> <file2> ...")
        sys.exit(1)

    files = [Path(f) for f in sys.argv[1:]]
    fixed_count = 0

    for file_path in files:
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            continue

        print(f"Checking {file_path}...")
        if fix_headers(file_path):
            print(f"  ✅ Fixed")
            fixed_count += 1
        else:
            print(f"  ⏭️  Already compliant")

    print(f"\n✅ Fixed {fixed_count}/{len(files)} files")


if __name__ == "__main__":
    main()
