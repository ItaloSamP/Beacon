#!/usr/bin/env python3
"""
Auto-generate MkDocs documentation pages from source files.

Reads:
  - PROJECT_CONTEXT.md (sections ## 1. through ## 10.)
  - .opencode/work/docs/*.md (feature briefs — optional)
  - .opencode/work/tasks/task-sprint-*.md (sprint plans — optional)

Writes:
  - docs/architecture.md  (from PROJECT_CONTEXT.md §3)
  - docs/development.md   (from PROJECT_CONTEXT.md §2, §5)
  - docs/features.md      (from PROJECT_CONTEXT.md §1 + .opencode/work/docs/*.md)
  - docs/devops.md        (from sprint task files)
  - docs/releases.md      (from sprint task files)

Only overwrites files with the `auto_generated: true` YAML frontmatter marker.
Only modifies content between `<!-- BEGIN_AUTO_GENERATED -->` and `<!-- END_AUTO_GENERATED -->`.
Never touches manual pages (index.md, about.md, contributing.md).

Usage:
    python scripts/generate_docs.py
    python scripts/generate_docs.py --dry-run  # Show what would be written
"""

import argparse
import logging
import re
import sys
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Project root (where this script lives is scripts/, parent is project root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Source files
PROJECT_CONTEXT_PATH = PROJECT_ROOT / "PROJECT_CONTEXT.md"
WORK_DOCS_DIR = PROJECT_ROOT / ".opencode" / "work" / "docs"
TASKS_DIR = PROJECT_ROOT / ".opencode" / "work" / "tasks"

# Auto-generated markdown markers
BEGIN_MARKER = "<!-- BEGIN_AUTO_GENERATED -->"
END_MARKER = "<!-- END_AUTO_GENERATED -->"
AUTO_GEN_FRONTMATTER_MARKER = "auto_generated: true"

# Manual pages that generate_docs.py should NEVER touch
MANUAL_PAGES = {"index.md", "about.md", "contributing.md"}


def parse_sections(content: str) -> dict[str, str]:
    """
    Parse a markdown file by `## N.` headings and return a dict of
    section_number (str) → section_content (str).

    Matches headings like:
      ## 1. Project Overview
      ## 2. Technology Stack
      ## 3. Architecture
    """
    # Pattern: ## <number>. <title>
    section_pattern = re.compile(r"^## (\d+)\. (.+)$", re.MULTILINE)

    matches = list(section_pattern.finditer(content))
    sections: dict[str, str] = {}

    for i, match in enumerate(matches):
        section_num = match.group(1)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        sections[section_num] = content[start:end].strip()

    return sections


def extract_section(content: str, section_num: str) -> Optional[str]:
    """Extract a specific numbered section from PROJECT_CONTEXT.md content."""
    sections = parse_sections(content)
    return sections.get(section_num)


def read_file_safe(filepath: Path) -> Optional[str]:
    """Read a file, returning None if it doesn't exist or can't be read."""
    try:
        if not filepath.exists():
            logger.debug("File not found: %s", filepath)
            return None
        return filepath.read_text(encoding="utf-8")
    except Exception as e:
        logger.warning("Could not read %s: %s", filepath, e)
        return None


def list_sprint_files() -> list[Path]:
    """List sprint task files in tasks/ directory."""
    if not TASKS_DIR.exists():
        return []
    return sorted(TASKS_DIR.glob("task-sprint-*.md"))


def list_work_docs() -> list[Path]:
    """List feature brief files in .opencode/work/docs/."""
    if not WORK_DOCS_DIR.exists():
        return []
    return sorted(WORK_DOCS_DIR.glob("*.md"))


def has_auto_generated_marker(filepath: Path) -> bool:
    """Check if a file has the auto_generated frontmatter marker."""
    content = read_file_safe(filepath)
    if content is None:
        return False
    return AUTO_GEN_FRONTMATTER_MARKER in content.split("\n", 20)[:20]


def replace_between_markers(original: str, new_content: str) -> str:
    """
    Replace content between BEGIN_AUTO_GENERATED and END_AUTO_GENERATED markers.
    If markers don't exist, raise ValueError.
    """
    if BEGIN_MARKER not in original:
        raise ValueError(f"Missing {BEGIN_MARKER} marker")
    if END_MARKER not in original:
        raise ValueError(f"Missing {END_MARKER} marker")

    begin_idx = original.index(BEGIN_MARKER) + len(BEGIN_MARKER)
    end_idx = original.index(END_MARKER)

    return original[:begin_idx] + "\n\n" + new_content.strip() + "\n\n" + original[end_idx:]


def build_architecture_content(sections: dict[str, str]) -> str:
    """Build architecture page content from PROJECT_CONTEXT.md §3."""
    section_3 = sections.get("3")
    if not section_3:
        return "> :material-alert-circle: Section 3 (Architecture) not found in PROJECT_CONTEXT.md.\n\nPlease ensure `## 3. Architecture` exists in PROJECT_CONTEXT.md."

    # Remove the ### heading prefix if present (already extracted)
    content = section_3.strip()

    note = (
        "> This page is auto-generated from `PROJECT_CONTEXT.md §3`. "
        "Do not edit manually.\n>\n"
        "> Run `python scripts/generate_docs.py` to regenerate."
    )

    return note + "\n\n" + content


def build_development_content(sections: dict[str, str]) -> str:
    """Build development page content from PROJECT_CONTEXT.md §2 + §5."""
    parts = []

    note = (
        "> This page is auto-generated from `PROJECT_CONTEXT.md §2` and `§5`. "
        "Do not edit manually.\n>\n"
        "> Run `python scripts/generate_docs.py` to regenerate."
    )
    parts.append(note)

    section_2 = sections.get("2")
    if section_2:
        parts.append(section_2.strip())
    else:
        parts.append(
            "> :material-alert-circle: Section 2 (Technology Stack) not found in PROJECT_CONTEXT.md.\n"
        )

    section_5 = sections.get("5")
    if section_5:
        parts.append(section_5.strip())
    else:
        parts.append(
            "> :material-alert-circle: Section 5 (Coding Standards) not found in PROJECT_CONTEXT.md.\n"
        )

    return "\n\n".join(parts)


def build_features_content(sections: dict[str, str]) -> str:
    """Build features page content from PROJECT_CONTEXT.md §1 + work docs."""
    parts = []

    note = (
        "> This page is auto-generated from `PROJECT_CONTEXT.md §1` and "
        "`.opencode/work/docs/*.md`. Do not edit manually.\n>\n"
        "> Run `python scripts/generate_docs.py` to regenerate."
    )
    parts.append(note)

    section_1 = sections.get("1")
    if section_1:
        # Extract the feature lists from Overview
        # We want the "Key Features" subsections
        feature_text = _extract_features_from_overview(section_1)
        parts.append(feature_text)
    else:
        parts.append(
            "> :material-alert-circle: Section 1 (Project Overview) not found in PROJECT_CONTEXT.md.\n"
        )

    # Append content from work docs if they exist
    work_docs = list_work_docs()
    if work_docs:
        parts.append("\n## Feature Briefs\n")
        for doc_path in work_docs:
            doc_content = read_file_safe(doc_path)
            if doc_content:
                parts.append(f"### {doc_path.stem.replace('_', ' ').title()}\n")
                parts.append(doc_content.strip())
                parts.append("")
    else:
        parts.append(
            "\n> :material-information: No feature briefs found in `.opencode/work/docs/`. "
            "Feature briefs will appear here automatically when created.\n"
        )

    return "\n\n".join(parts)


def _extract_features_from_overview(section_text: str) -> str:
    """Extract the Key Features portions from the Overview section."""
    # Keep the full overview but it's very long. We'll extract relevant headings.
    # Look for "Key Features" subsections
    lines = section_text.split("\n")
    output_lines = []
    in_features = False

    for line in lines:
        if "Key Features" in line:
            in_features = True
            output_lines.append(line)
        elif line.startswith("##") or line.startswith("---"):
            in_features = False
        elif in_features:
            output_lines.append(line)

    if output_lines:
        return "\n".join(output_lines)
    return section_text  # Fallback: return full overview


def build_devops_content(sprint_files: list[Path]) -> str:
    """Build DevOps page content from sprint task files."""
    parts = []

    note = (
        "> This page is auto-generated from sprint task files "
        "(`.opencode/work/tasks/task-sprint-*.md`). Do not edit manually.\n>\n"
        "> Run `python scripts/generate_docs.py` to regenerate."
    )
    parts.append(note)

    if not sprint_files:
        parts.append(
            "\n> :material-information: No sprint task files found in "
            "`.opencode/work/tasks/`. Sprint summaries will appear here automatically "
            "when sprint plans are created.\n"
        )
        return "\n\n".join(parts)

    parts.append("## Sprint Summaries\n")

    for sf in sprint_files:
        content = read_file_safe(sf)
        if content is None:
            continue
        sprint_name = sf.stem.replace("task-", "").replace("_", " ").title()
        parts.append(f"### {sprint_name}\n")

        # Extract first paragraphs (up to first ## heading)
        first_section = content.split("\n## ")[0] if "\n## " in content else content
        # Limit to first 50 lines for brevity
        limited = "\n".join(first_section.split("\n")[:50])
        parts.append(limited.strip())
        parts.append("")

    return "\n\n".join(parts)


def build_releases_content(sprint_files: list[Path]) -> str:
    """Build Releases page content from sprint task files."""
    parts = []

    note = (
        "> This page is auto-generated from sprint task files "
        "(`.opencode/work/tasks/task-sprint-*.md`). Do not edit manually.\n>\n"
        "> Run `python scripts/generate_docs.py` to regenerate."
    )
    parts.append(note)

    if not sprint_files:
        parts.append(
            "\n> :material-information: No sprint task files found in "
            "`.opencode/work/tasks/`. Release notes will appear here automatically "
            "when sprints are completed.\n"
        )
        return "\n\n".join(parts)

    parts.append("## Release History\n")

    for sf in sprint_files:
        content = read_file_safe(sf)
        if content is None:
            continue
        # Extract version/title from the file content
        version_match = re.search(r"#\s+(.+)", content)
        title = version_match.group(1) if version_match else sf.stem

        parts.append(f"### {title}\n")

        # Extract description
        desc_match = re.search(r"## Description\s*\n+(.+?)(?:\n## |\n---|\Z)", content, re.DOTALL)
        if desc_match:
            parts.append(desc_match.group(1).strip())
        else:
            # Fallback: first 30 lines
            limited = "\n".join(content.split("\n")[:30])
            parts.append(limited.strip())
        parts.append("")

    return "\n\n".join(parts)


def generate_page(
    filepath: Path,
    content_func,
    dry_run: bool = False,
) -> bool:
    """
    Generate a single auto-generated page.
    Returns True if the page was updated, False otherwise.
    """
    if not has_auto_generated_marker(filepath):
        logger.warning("Skipping %s — missing auto_generated marker in frontmatter", filepath.name)
        return False

    original = read_file_safe(filepath)
    if original is None:
        logger.error("Cannot read %s for regeneration", filepath)
        return False

    try:
        new_content = content_func()
        updated = replace_between_markers(original, new_content)
    except ValueError as e:
        logger.error("Marker error in %s: %s", filepath.name, e)
        return False
    except Exception as e:
        logger.error("Error generating content for %s: %s", filepath.name, e)
        return False

    if updated == original:
        logger.info("No changes for %s", filepath.name)
        return False

    if dry_run:
        logger.info("DRY RUN: Would update %s", filepath.name)
        return False

    try:
        filepath.write_text(updated, encoding="utf-8")
        logger.info("Updated %s", filepath.name)
        return True
    except Exception as e:
        logger.error("Failed to write %s: %s", filepath.name, e)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate MkDocs documentation from source files.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be written without making changes",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    # Read PROJECT_CONTEXT.md
    pc_content = read_file_safe(PROJECT_CONTEXT_PATH)
    if pc_content is None:
        logger.error("PROJECT_CONTEXT.md not found at %s", PROJECT_CONTEXT_PATH)
        return 1

    sections = parse_sections(pc_content)
    logger.info("Parsed %d sections from PROJECT_CONTEXT.md", len(sections))

    sprint_files = list_sprint_files()
    logger.info("Found %d sprint task files", len(sprint_files))

    # Generate each page
    docs_dir = PROJECT_ROOT / "docs"
    pages_updated = 0

    # Architecture (from §3)
    def arch_content():
        return build_architecture_content(sections)

    if generate_page(docs_dir / "architecture.md", arch_content, dry_run=args.dry_run):
        pages_updated += 1

    # Development (from §2 + §5)
    def dev_content():
        return build_development_content(sections)

    if generate_page(docs_dir / "development.md", dev_content, dry_run=args.dry_run):
        pages_updated += 1

    # Features (from §1 + work docs)
    def feat_content():
        return build_features_content(sections)

    if generate_page(docs_dir / "features.md", feat_content, dry_run=args.dry_run):
        pages_updated += 1

    # DevOps (from sprint files)
    def devops_content():
        return build_devops_content(sprint_files)

    if generate_page(docs_dir / "devops.md", devops_content, dry_run=args.dry_run):
        pages_updated += 1

    # Releases (from sprint files)
    def rel_content():
        return build_releases_content(sprint_files)

    if generate_page(docs_dir / "releases.md", rel_content, dry_run=args.dry_run):
        pages_updated += 1

    if args.dry_run:
        logger.info("DRY RUN complete. %d page(s) would be updated.", pages_updated)
    else:
        logger.info("Generation complete. %d page(s) updated.", pages_updated)

    return 0


if __name__ == "__main__":
    sys.exit(main())
