import re, json, sys, html, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

src_path, out_path = sys.argv[1], sys.argv[2]
src = open(src_path, encoding="utf-8").read()

def grab(lang):
    m = re.search(r"\b%s\s*:\s*\{" % lang, src)
    if not m:
        return None
    i = m.end()
    depth = 1
    j = i
    in_str = None
    while j < len(src) and depth > 0:
        c = src[j]
        if in_str:
            if c == "\\":
                j += 2
                continue
            if c == in_str:
                in_str = None
        else:
            if c in "\"'`":
                in_str = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
        j += 1
    return src[i:j-1]

pair_re = re.compile(r"""^\s*([A-Za-z0-9_]+)\s*:\s*("((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)\s*,?\s*$""", re.M)

out = {}
for lang in ("en", "de"):
    body = grab(lang)
    if body is None:
        continue
    d = {}
    for m in pair_re.finditer(body):
        k = m.group(1)
        s = m.group(3) if m.group(3) is not None else (m.group(4) if m.group(4) is not None else m.group(5))
        s = re.sub(r"\\(.)", r"\1", s).replace("\\n", " ")
        d[k] = html.unescape(s)
    out[lang] = d

json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
en = out.get("en", {})
print("EN keys:", len(en), "| DE keys:", len(out.get("de", {})))
for k, v in en.items():
    print(f"[{k}] {v}")
