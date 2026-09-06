"""Diagnostic measurement for the dossier VL-W1 (2026-09-03).

Two steps in one file: (1) extract EN/DE copy strings from a self-contained website
index.html with a data-i18n dictionary; (2) count a small pattern catalogue per 1,000 words.
Heuristic and uncalibrated. Usage:
  python measure.py extract <index.html> <out.json>
  python measure.py metrics <name> <i18n.json|file.md> [--lang en|de] [--details]
"""
import sys
if len(sys.argv) > 1 and sys.argv[1] == "extract":
    sys.argv = [sys.argv[0]] + sys.argv[2:]
    exec(open(__file__.replace("measure.py", "_extract.py"), encoding="utf-8").read())
elif len(sys.argv) > 1 and sys.argv[1] == "metrics":
    sys.argv = [sys.argv[0]] + sys.argv[2:]
    exec(open(__file__.replace("measure.py", "_metrics.py"), encoding="utf-8").read())
else:
    print(__doc__)
