#!/usr/bin/env python3
"""
Print Statement to Logger Migration Script
Automated migration tool for converting print() calls to unified logger

Usage:
    python3 scripts/migrate_print_to_logger.py --file <path> [--dry-run]
    python3 scripts/migrate_print_to_logger.py --all [--dry-run]
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple


# ANSI colors for output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'


class PrintToLoggerMigrator:
    """Migrates print statements to unified logger calls"""

    # Migration patterns: (regex_pattern, replacement, description)
    PATTERNS: List[Tuple[str, str, str]] = [
        # Success messages (✅)
        (r'print\(f?"✅\s*([^"]+)"\)', r'logger.info("\1", action="success")', "success messages"),

        # Error messages (❌)
        (r'print\(f?"❌\s*([^"]+)"\)', r'logger.error("\1", action="error")', "error messages"),

        # Warning messages (⚠️)
        (r'print\(f?"⚠️\s*([^"]+)"\)', r'logger.warning("\1", action="warning")', "warning messages"),

        # Info messages (🔍, 📊, etc.)
        (r'print\(f?"[🔍📊📈📉💾🚀🔧⚙️]\s*([^"]+)"\)', r'logger.info("\1")', "info with emoji"),

        # Simple f-strings
        (r'print\(f"([^"]+)"\)', r'logger.info(f"\1")', "f-string messages"),

        # Simple strings
        (r'print\("([^"]+)"\)', r'logger.info("\1")', "simple string messages"),

        # Print with variables (no quotes)
        (r'print\(([^")]+)\)', r'logger.info(f"{\\1}")', "variable printing"),
    ]

    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.stats = {
            "files_processed": 0,
            "files_changed": 0,
            "total_migrations": 0,
            "by_pattern": {}
        }

    def migrate_file(self, file_path: Path) -> Dict:
        """Migrate a single file"""
        print(f"\n{BLUE}Processing:{RESET} {file_path}")

        try:
            with open(file_path, encoding='utf-8') as f:
                original = f.read()

            migrated = original
            file_changes = 0

            # Apply each pattern
            for pattern, replacement, description in self.PATTERNS:
                new_content, count = re.subn(pattern, replacement, migrated, flags=re.MULTILINE)

                if count > 0:
                    migrated = new_content
                    file_changes += count
                    self.stats["by_pattern"][description] = \
                        self.stats["by_pattern"].get(description, 0) + count

                    print(f"  {GREEN}✓{RESET} {count} {description}")

            # Check if file needs import statement
            needs_logger_import = file_changes > 0 and "from app.logging import get_logger" not in migrated

            if needs_logger_import:
                # Add logger import at the top (after other imports)
                import_statement = "\nfrom app.logging import get_logger\nfrom app.core.database.supabase_client import get_supabase_client\n\n# Initialize logger\nsupabase = get_supabase_client()\nlogger = get_logger(__name__, supabase_client=supabase)\n"

                # Find a good place to insert (after imports)
                lines = migrated.split('\n')
                insert_index = 0

                # Find last import line
                for i, line in enumerate(lines):
                    if line.startswith('import ') or line.startswith('from '):
                        insert_index = i + 1

                lines.insert(insert_index, import_statement)
                migrated = '\n'.join(lines)

                print(f"  {YELLOW}+{RESET} Added logger import and initialization")

            # Update stats
            self.stats["files_processed"] += 1
            if file_changes > 0:
                self.stats["files_changed"] += 1
                self.stats["total_migrations"] += file_changes

            # Write changes (if not dry run)
            if not self.dry_run and file_changes > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(migrated)
                print(f"  {GREEN}✓{RESET} File updated ({file_changes} changes)")
            elif file_changes > 0:
                print(f"  {YELLOW}[DRY RUN]{RESET} Would update file ({file_changes} changes)")
            else:
                print(f"  {BLUE}○{RESET} No changes needed")

            return {
                "file": str(file_path),
                "changes": file_changes,
                "success": True
            }

        except Exception as e:
            print(f"  {RED}✗{RESET} Error: {e!s}")
            return {
                "file": str(file_path),
                "changes": 0,
                "success": False,
                "error": str(e)
            }

    def migrate_directory(self, directory: Path) -> None:
        """Migrate all Python files in a directory"""
        print(f"\n{BLUE}Scanning directory:{RESET} {directory}")

        python_files = list(directory.rglob("*.py"))

        # Exclude test files and __pycache__
        python_files = [
            f for f in python_files
            if '__pycache__' not in str(f) and 'venv' not in str(f)
        ]

        print(f"Found {len(python_files)} Python files\n")

        for file_path in python_files:
            self.migrate_file(file_path)

    def print_summary(self) -> None:
        """Print migration summary"""
        print(f"\n{'='*60}")
        print(f"{BLUE}Migration Summary{RESET}")
        print(f"{'='*60}")

        print(f"\nFiles processed: {self.stats['files_processed']}")
        print(f"Files changed:   {self.stats['files_changed']}")
        print(f"Total migrations: {self.stats['total_migrations']}")

        if self.stats["by_pattern"]:
            print(f"\n{BLUE}Migrations by type:{RESET}")
            for pattern_desc, count in sorted(self.stats["by_pattern"].items()):
                print(f"  • {pattern_desc}: {count}")

        if self.dry_run:
            print(f"\n{YELLOW}⚠️  DRY RUN MODE{RESET} - No files were actually modified")
            print("Run without --dry-run to apply changes")
        else:
            print(f"\n{GREEN}✓{RESET} Migration complete!")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate print() statements to unified logger calls"
    )
    parser.add_argument(
        '--file',
        type=Path,
        help='Specific file to migrate'
    )
    parser.add_argument(
        '--directory',
        type=Path,
        help='Directory to recursively migrate'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Migrate all backend files'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying files'
    )

    args = parser.parse_args()

    # Validate arguments
    if not (args.file or args.directory or args.all):
        parser.error("Must specify --file, --directory, or --all")

    # Initialize migrator
    migrator = PrintToLoggerMigrator(dry_run=args.dry_run)

    # Run migration
    try:
        if args.file:
            if not args.file.exists():
                print(f"{RED}Error:{RESET} File not found: {args.file}")
                sys.exit(1)
            migrator.migrate_file(args.file)

        elif args.directory:
            if not args.directory.exists():
                print(f"{RED}Error:{RESET} Directory not found: {args.directory}")
                sys.exit(1)
            migrator.migrate_directory(args.directory)

        elif args.all:
            # Migrate entire backend directory
            backend_dir = Path(__file__).parent.parent / "app"
            if not backend_dir.exists():
                print(f"{RED}Error:{RESET} Backend directory not found: {backend_dir}")
                sys.exit(1)
            migrator.migrate_directory(backend_dir)

        # Print summary
        migrator.print_summary()

    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}Migration interrupted by user{RESET}")
        sys.exit(1)


if __name__ == "__main__":
    main()
