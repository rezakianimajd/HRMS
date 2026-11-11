"""Check source trees for double-encoded (mojibake) Persian text.

Usage: python scripts/check_encoding.py
Exits with code 1 when a file looks like UTF-8 Persian that was decoded as
cp1256 and encoded again (e.g. «طرف قرارداد» → «ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯»).
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = ('frontend/src', 'hrms_project', 'docs')
SKIP_PARTS = {'node_modules', 'venv', '.git', '__pycache__', 'build', 'migrations'}
SUFFIXES = {'.js', '.jsx', '.py', '.json', '.md', '.css', '.html'}


def has_persian(text: str) -> bool:
    return any('\u0600' <= char <= '\u06ff' for char in text)


def looks_double_encoded(line: str) -> bool:
    if not has_persian(line):
        return False
    try:
        recovered = line.encode('cp1256').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return False
    return recovered != line and has_persian(recovered)


def main() -> int:
    problems = []
    for target in TARGETS:
        base = ROOT / target
        if not base.exists():
            continue
        for path in base.rglob('*'):
            if not path.is_file() or path.suffix.lower() not in SUFFIXES:
                continue
            if any(part in SKIP_PARTS for part in path.parts):
                continue
            try:
                text = path.read_text(encoding='utf-8')
            except (UnicodeDecodeError, OSError):
                continue
            for index, line in enumerate(text.splitlines(), start=1):
                if looks_double_encoded(line):
                    problems.append(f'{path.relative_to(ROOT)}:{index}')
    if problems:
        print('Double-encoded Persian text found:')
        for item in problems:
            print(' -', item)
        return 1
    print('Encoding check passed (no mojibake found).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
