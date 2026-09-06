"""Heuristic voice metrics over a set of English copy strings.

Usage:
  python voice_metrics.py <name> <i18n.json|file.md> [--lang en] [--details]

Purpose: demonstrate which deterministic findings a voice linter can raise on
public copy, and how they aggregate into per-1000-word densities. This is a
diagnostic script for the dossier, not a product implementation.
"""
import re, json, sys, io, statistics
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

name, path = sys.argv[1], sys.argv[2]
lang = "en"
details = "--details" in sys.argv
if "--lang" in sys.argv:
    lang = sys.argv[sys.argv.index("--lang") + 1]

# ---- load ---------------------------------------------------------------
segments = []  # (key, text)
if path.endswith(".json"):
    d = json.load(open(path, encoding="utf-8"))[lang]
    for k, v in d.items():
        segments.append((k, v))
else:
    md = open(path, encoding="utf-8").read()
    md = re.sub(r"~~~.*?~~~|```.*?```", " ", md, flags=re.S)      # code blocks
    md = re.sub(r"`[^`]*`", " ", md)                                # inline code
    md = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", md)                # links
    md = re.sub(r"^\|.*$", " ", md, flags=re.M)                     # tables
    md = re.sub(r"^\s*[-*]\s+", "", md, flags=re.M)                 # bullets
    md = re.sub(r"^#+\s*", "", md, flags=re.M)
    md = re.sub(r"^>\s*\[!\w+\]\s*", "", md, flags=re.M)
    for i, para in enumerate(p for p in re.split(r"\n\s*\n", md) if p.strip()):
        segments.append((f"p{i}", " ".join(para.split())))

# ---- pattern catalogue (explainable, regex-detectable) --------------------
PATTERNS = {
    # rhetorical structure
    "antithesis_not_but":   r"\bnot\b[^.;:!?]{0,70}?\b(?:but|rather)\b|\binstead of\b|\brather than\b|,\s*not\s+(?:a|an|the|one)?\s*\w+[.;]",
    "em_dash":              r"\s[—–]\s|—",
    "colon_pivot":          r"[A-Za-z]:\s+[a-z]",
    "meta_commentary":      r"\b(?:this (?:page|section|site) (?:describes|shows|explains|is)|it'?s worth noting|note that|in other words)\b",
    "slogan_fragment":      None,  # computed: short sentence w/o finite verb
    "rule_of_three":        r"\b\w+, \w+(?: \w+)?,? and \w+\b",
    # inflation / evaluation
    "intensifier":          r"\b(?:very|truly|really|highly|deeply|incredibly|remarkably|extremely|genuinely|fundamentally|significantly|seamless(?:ly)?|robust|powerful|effortless(?:ly)?|elegant(?:ly)?|beautiful(?:ly)?|crucial|vital|essential|key|pivotal|comprehensive|holistic|cutting-edge|state-of-the-art|world-class|game-?changer|revolutionary|transformative|unlock|empower|supercharge|delight|honest(?:ly)?|simply|just|easy|easily|effortless)\b",
    "puffery_noun":         r"\b(?:universe|journey|vision|passion|excellence|magic|superpower|heart of|engine room|engineer room|room you step into|hat|the one that)\b",
    "absolute_claim":       r"\b(?:every|always|never|zero|all|nothing|no\s+\w+\s+(?:is|are)\s+(?:lost|hidden))\b",
    "future_promise":       r"\b(?:will (?:be|ship|become|grow|support)|coming soon|planned|roadmap|soon)\b",
    "vague_attribution":    r"\b(?:experts?|users|people|many|some|studies|it is (?:widely )?(?:known|believed|said))\b\s+(?:say|agree|believe|know|show|report)",
    # concreteness proxies (counted positively)
    "number_or_date":       r"\b\d[\d.,:%-]*\b",
    "code_or_path":         r"[\w.-]+\.(?:json|md|yml|yaml|cs|ts|html)\b|\.\w+/|`",
    # German-specific (used with --lang de)
    "de_formulaic":         r"\b(?:in der heutigen|schnelllebig|es ist wichtig zu beachten|spielt eine (?:entscheidende|zentrale|wichtige) rolle|nahtlos|ganzheitlich|bahnbrechend|revolutionär|nicht nur[^.]{0,60}sondern auch|ein Muss)\b",
}

VERB_HINT = re.compile(r"\b(?:is|are|was|were|be|been|being|has|have|had|do|does|did|can|could|will|would|should|may|might|must|shall|runs?|writes?|reads?|ships?|keeps?|stays?|gets?|makes?|takes?|becomes?|shows?|means?|covers?|holds?|owns?|calls?|creates?|reports?|lands?|joins?|opens?|reviews?|grades?|leaves?|belongs?|persists?|records?|describes?|exists?|needs?|uses?|works?|lives?|marks?|reads|checks?|scans?|starts?|stops?|fails?|passes?|renders?|returns?|sits?|flows?|carries?|adds?|counts?|stands?|come|comes|go|goes|link|links|see|sees|turn|turns|watch|watches|look|looks|require|requires|let|lets|trigger|triggers|compares?|explains?|store|stores|build|builds|run|hand|hands|say|says|tell|tells|help|helps|meet|meets|change|changes|set|sets|fall|falls|die|dies|end|ends|move|moves|serve|serves|wear|wears|step|steps|answer|answers|point|points)\b", re.I)

def sentences(text):
    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"“(])|(?<=[.!?])$", text)
    return [p.strip() for p in parts if p and p.strip()]

def words(text):
    return re.findall(r"[A-Za-zÄÖÜäöüß][\w'’-]*", text)

total_words = 0
sent_lengths = []
hits = {k: 0 for k in PATTERNS}
per_segment = []
for key, text in segments:
    seg_hits = {}
    w = words(text)
    total_words += len(w)
    sents = sentences(text)
    for s in sents:
        sw = words(s)
        if sw:
            sent_lengths.append(len(sw))
        # slogan fragment: ends with terminal punctuation, <= 7 words, no finite verb hint
        if re.search(r"[.!]$", s) and len(sw) <= 7 and not VERB_HINT.search(s):
            hits["slogan_fragment"] += 1
            seg_hits.setdefault("slogan_fragment", []).append(s)
    for k, rx in PATTERNS.items():
        if rx is None:
            continue
        if k.startswith("de_") and lang != "de":
            continue
        for m in re.finditer(rx, text, flags=re.I):
            hits[k] += 1
            seg_hits.setdefault(k, []).append(m.group(0))
    if seg_hits:
        per_segment.append((key, text, seg_hits))

n_sent = len(sent_lengths)
kw = total_words / 1000.0 if total_words else 1
print(f"== {name} ({lang}) ==")
print(f"segments={len(segments)} sentences={n_sent} words={total_words}")
if sent_lengths:
    print(f"sentence length: mean={statistics.mean(sent_lengths):.1f} median={statistics.median(sent_lengths)} "
          f"sd={statistics.pstdev(sent_lengths):.1f} max={max(sent_lengths)} share<=7w={sum(1 for x in sent_lengths if x<=7)/n_sent:.0%}")
print("findings per 1000 words (raw count in brackets):")
neg = ["antithesis_not_but","em_dash","colon_pivot","meta_commentary","slogan_fragment","rule_of_three",
       "intensifier","puffery_noun","absolute_claim","future_promise","vague_attribution","de_formulaic"]
pos = ["number_or_date","code_or_path"]
for k in neg + pos:
    if k.startswith("de_") and lang != "de":
        continue
    print(f"  {k:22s} {hits[k]/kw:6.1f}  [{hits[k]}]")
neg_total = sum(hits[k] for k in neg if not (k.startswith('de_') and lang!='de'))
print(f"  {'NEGATIVE_TOTAL':22s} {neg_total/kw:6.1f}  [{neg_total}]")
print(f"  {'specificity_markers':22s} {sum(hits[k] for k in pos)/kw:6.1f}  [{sum(hits[k] for k in pos)}]")

if details:
    print("\n-- segments with findings --")
    for key, text, seg_hits in per_segment:
        print(f"\n[{key}] {text}")
        for k, ms in seg_hits.items():
            print(f"    {k}: {ms}")
