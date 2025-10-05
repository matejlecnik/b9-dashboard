#!/usr/bin/env python3
"""
Documentation Search Engine
Fast search across all .md files with intelligent ranking
"""

import json
import re
import math
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import argparse
from datetime import datetime

class DocumentSearchEngine:
    def __init__(self, root_path: str = "."):
        self.root = Path(root_path)
        self.index = {}
        self.documents = {}
        self.idf = {}  # Inverse document frequency
        self.index_file = self.root / "docs" / "data" / "search-index.json"

    def build_index(self, force: bool = False, incremental: bool = True):
        """Build search index from all .md files"""
        # Check if index exists and is recent
        if not force and self.index_file.exists():
            age = datetime.now().timestamp() - self.index_file.stat().st_mtime
            if age < 300:  # Less than 5 minutes old
                print("Index is recent, skipping rebuild")
                self.load_index()
                return
            elif incremental and age < 3600:  # Less than 1 hour old
                print("Performing incremental index update...")
                self.incremental_update()
                return

        print("Building full search index...")

        # Find all markdown files
        md_files = self.find_markdown_files()
        total_docs = len(md_files)

        # Build term frequency for each document
        term_doc_count = defaultdict(int)  # Count of documents containing each term

        for i, filepath in enumerate(md_files, 1):
            print(f"Indexing {i}/{total_docs}: {filepath.name}", end='\r')
            doc_id = str(filepath.relative_to(self.root))

            # Read and process document
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Store document metadata
                self.documents[doc_id] = {
                    "path": doc_id,
                    "title": self.extract_title(content),
                    "size": len(content),
                    "modified": filepath.stat().st_mtime,
                    "preview": content[:200].replace('\n', ' ')
                }

                # Extract and index terms
                terms = self.extract_terms(content)
                term_freq = defaultdict(int)

                for term in terms:
                    term_freq[term] += 1

                # Store term frequencies
                self.index[doc_id] = dict(term_freq)

                # Update document count for IDF
                for term in set(terms):
                    term_doc_count[term] += 1

            except Exception as e:
                print(f"\nError indexing {filepath}: {e}")

        # Calculate IDF for each term
        for term, doc_count in term_doc_count.items():
            self.idf[term] = math.log(total_docs / doc_count)

        print(f"\n✅ Indexed {total_docs} documents with {len(self.idf)} unique terms")

        # Save index to file
        self.save_index()

    def find_markdown_files(self) -> List[Path]:
        """Find all .md files excluding node_modules"""
        md_files = []
        for path in self.root.rglob("*.md"):
            if "node_modules" not in str(path) and "archive" not in str(path):
                md_files.append(path)
        return sorted(md_files)

    def extract_title(self, content: str) -> str:
        """Extract title from markdown content"""
        # Look for first # heading
        match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if match:
            return match.group(1).strip()

        # Fallback to first non-empty line
        for line in content.split('\n'):
            line = line.strip()
            if line and not line.startswith('```'):
                return line[:100]
        return "Untitled"

    def extract_terms(self, content: str) -> List[str]:
        """Extract searchable terms from content"""
        # Remove code blocks
        content = re.sub(r'```[\s\S]*?```', '', content)

        # Remove special markdown syntax
        content = re.sub(r'[#*`\[\](){}|]', ' ', content)

        # Extract words
        words = re.findall(r'\b[a-zA-Z0-9_]{2,}\b', content.lower())

        # Add special extraction for:
        # - File paths
        paths = re.findall(r'[\w/]+\.\w+', content)
        words.extend([p.lower() for p in paths])

        # - JSON keys
        json_keys = re.findall(r'"(\w+)":', content)
        words.extend([k.lower() for k in json_keys])

        # - Function/class names
        code_names = re.findall(r'(?:function|class|def|const|let|var)\s+(\w+)', content)
        words.extend([n.lower() for n in code_names])

        return words

    def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search documents using TF-IDF ranking"""
        if not self.index:
            self.load_index()

        # Process query
        query_terms = self.extract_terms(query.lower())
        if not query_terms:
            return []

        # Calculate scores for each document
        scores = {}

        for doc_id, term_freqs in self.index.items():
            score = 0.0
            doc_length = sum(term_freqs.values())

            for term in query_terms:
                if term in term_freqs:
                    # TF-IDF score
                    tf = term_freqs[term] / doc_length if doc_length > 0 else 0
                    idf = self.idf.get(term, 0)
                    score += tf * idf

            if score > 0:
                # Boost score based on document metadata
                doc_meta = self.documents.get(doc_id, {})

                # Boost if query terms in title
                if any(term in doc_meta.get("title", "").lower() for term in query_terms):
                    score *= 2.0

                # Boost if query terms in path
                if any(term in doc_id.lower() for term in query_terms):
                    score *= 1.5

                # Slight boost for recently modified files
                age_days = (datetime.now().timestamp() - doc_meta.get("modified", 0)) / 86400
                if age_days < 7:
                    score *= 1.2
                elif age_days < 30:
                    score *= 1.1

                scores[doc_id] = score

        # Sort by score and return top results
        sorted_results = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for doc_id, score in sorted_results[:limit]:
            doc_meta = self.documents.get(doc_id, {})

            # Highlight matching terms in preview
            preview = doc_meta.get("preview", "")
            for term in query_terms:
                preview = re.sub(
                    f'\\b({re.escape(term)})\\b',
                    r'**\1**',
                    preview,
                    flags=re.IGNORECASE
                )

            results.append({
                "path": doc_id,
                "title": doc_meta.get("title", "Untitled"),
                "score": round(score, 4),
                "preview": preview,
                "size": doc_meta.get("size", 0)
            })

        return results

    def suggest(self, partial: str, limit: int = 5) -> List[str]:
        """Suggest terms based on partial input"""
        if not self.idf:
            self.load_index()

        partial_lower = partial.lower()
        suggestions = []

        for term in self.idf.keys():
            if term.startswith(partial_lower):
                suggestions.append((term, self.idf[term]))

        # Sort by IDF (rarer terms first)
        suggestions.sort(key=lambda x: x[1])

        return [term for term, _ in suggestions[:limit]]

    def incremental_update(self):
        """Incrementally update index for changed files only"""
        self.load_index()

        # Find files modified since last index
        index_mtime = self.index_file.stat().st_mtime
        md_files = self.find_markdown_files()

        updated_count = 0
        for filepath in md_files:
            if filepath.stat().st_mtime > index_mtime:
                doc_id = str(filepath.relative_to(self.root))
                print(f"Updating: {filepath.name}")

                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # Update document metadata
                    self.documents[doc_id] = {
                        "path": doc_id,
                        "title": self.extract_title(content),
                        "size": len(content),
                        "modified": filepath.stat().st_mtime,
                        "preview": content[:200].replace('\n', ' ')
                    }

                    # Update term frequencies
                    terms = self.extract_terms(content)
                    term_freq = defaultdict(int)
                    for term in terms:
                        term_freq[term] += 1
                    self.index[doc_id] = dict(term_freq)

                    updated_count += 1
                except Exception as e:
                    print(f"Error updating {filepath}: {e}")

        if updated_count > 0:
            print(f"Updated {updated_count} files")
            # Recalculate IDF for affected terms
            self.recalculate_idf()
            self.save_index()
        else:
            print("No files need updating")

    def recalculate_idf(self):
        """Recalculate IDF values after incremental update"""
        total_docs = len(self.index)
        term_doc_count = defaultdict(int)

        for doc_terms in self.index.values():
            for term in doc_terms.keys():
                term_doc_count[term] += 1

        for term, doc_count in term_doc_count.items():
            self.idf[term] = math.log(total_docs / doc_count)

    def save_index(self):
        """Save index to JSON file"""
        self.index_file.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "version": "1.0",
            "created": datetime.now().isoformat(),
            "documents": self.documents,
            "index": self.index,
            "idf": self.idf
        }

        with open(self.index_file, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"Index saved to {self.index_file}")

    def load_index(self):
        """Load index from JSON file"""
        if not self.index_file.exists():
            print("No index file found, building new index...")
            self.build_index()
            return

        with open(self.index_file, 'r') as f:
            data = json.load(f)

        self.documents = data.get("documents", {})
        self.index = data.get("index", {})
        self.idf = data.get("idf", {})

    def search_code(self, pattern: str) -> List[Dict]:
        """Search for code patterns in documentation"""
        results = []
        md_files = self.find_markdown_files()

        for filepath in md_files:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Extract code blocks
                code_blocks = re.findall(r'```[\w]*\n([\s\S]*?)```', content)

                for i, block in enumerate(code_blocks):
                    if re.search(pattern, block, re.IGNORECASE):
                        results.append({
                            "file": str(filepath.relative_to(self.root)),
                            "block_number": i + 1,
                            "preview": block[:200],
                            "language": self.detect_language(block)
                        })
            except Exception as e:
                print(f"Error searching {filepath}: {e}")

        return results

    def detect_language(self, code: str) -> str:
        """Detect programming language from code snippet"""
        patterns = {
            "python": r'(?:def |class |import |from |print\()',
            "javascript": r'(?:function |const |let |var |=>)',
            "typescript": r'(?:interface |type |export |import)',
            "json": r'^\s*\{[\s\S]*\}\s*$',
            "bash": r'(?:#!/bin/bash|echo |cd |ls |git )',
            "sql": r'(?:SELECT|FROM|WHERE|CREATE TABLE)',
        }

        for lang, pattern in patterns.items():
            if re.search(pattern, code, re.IGNORECASE):
                return lang

        return "unknown"

def main():
    """Command-line interface"""
    parser = argparse.ArgumentParser(description="Search documentation")
    parser.add_argument('query', nargs='*', help='Search query')
    parser.add_argument('--rebuild', action='store_true', help='Rebuild search index')
    parser.add_argument('--code', help='Search for code pattern')
    parser.add_argument('--suggest', help='Get term suggestions')
    parser.add_argument('--limit', type=int, default=10, help='Maximum results')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()

    engine = DocumentSearchEngine()

    if args.rebuild:
        engine.build_index(force=True)
        return

    if args.suggest:
        suggestions = engine.suggest(args.suggest, args.limit)
        if args.json:
            print(json.dumps(suggestions))
        else:
            print("Suggestions:")
            for term in suggestions:
                print(f"  - {term}")
        return

    if args.code:
        results = engine.search_code(args.code)
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            print(f"Found {len(results)} code blocks:")
            for r in results:
                print(f"\n📄 {r['file']} (block {r['block_number']}, {r['language']})")
                print(f"   {r['preview'][:100]}...")
        return

    if args.query:
        query = ' '.join(args.query)
        results = engine.search(query, args.limit)

        if args.json:
            print(json.dumps(results, indent=2))
        else:
            if results:
                print(f"\nFound {len(results)} results for '{query}':\n")
                for i, r in enumerate(results, 1):
                    print(f"{i}. 📄 {r['title']}")
                    print(f"   Path: {r['path']}")
                    print(f"   Score: {r['score']}")
                    print(f"   Preview: {r['preview'][:150]}...")
                    print()
            else:
                print(f"No results found for '{query}'")
    else:
        # Interactive mode
        print("Documentation Search Engine")
        print("Commands: search <query>, code <pattern>, suggest <partial>, rebuild, quit")

        while True:
            try:
                cmd = input("\n> ").strip()
                if not cmd or cmd == 'quit':
                    break

                parts = cmd.split(None, 1)
                action = parts[0]

                if action == 'rebuild':
                    engine.build_index(force=True)
                elif action == 'search' and len(parts) > 1:
                    results = engine.search(parts[1])
                    for r in results[:5]:
                        print(f"📄 {r['title']} ({r['path']}) - Score: {r['score']}")
                elif action == 'code' and len(parts) > 1:
                    results = engine.search_code(parts[1])
                    for r in results[:5]:
                        print(f"📄 {r['file']} - Block {r['block_number']} ({r['language']})")
                elif action == 'suggest' and len(parts) > 1:
                    suggestions = engine.suggest(parts[1])
                    print("Suggestions:", ', '.join(suggestions))
                else:
                    print("Unknown command")
            except KeyboardInterrupt:
                break

        print("\nGoodbye!")

if __name__ == "__main__":
    main()