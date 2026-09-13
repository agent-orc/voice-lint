"use strict";
var VoiceReview = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    CATEGORY_COLORS: () => CATEGORY_COLORS,
    ReviewApiError: () => ReviewApiError,
    codePointOffsetToUtf16: () => codePointOffsetToUtf16,
    connectVoiceStudio: () => connectVoiceStudio,
    createReviewClient: () => createReviewClient,
    createTextRange: () => createTextRange,
    createTextRanges: () => createTextRanges,
    findUnitElement: () => findUnitElement,
    getUnitText: () => getUnitText,
    mountVoiceReview: () => mountVoiceReview,
    selectionToTarget: () => selectionToTarget
  });

  // src/anchors.ts
  var excludedTags = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  function textSegments(root) {
    const segments = [];
    let offset = 0;
    const visit = (node) => {
      if (node.nodeType === 3) {
        const text = node;
        segments.push({ node: text, start: offset, end: offset + text.data.length });
        offset += text.data.length;
        return;
      }
      if (node.nodeType === 1) {
        const element = node;
        if (excludedTags.has(element.tagName) || element.hasAttribute("data-voice-overlay") || element.hasAttribute("data-voice-exclude") || element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true") return;
      }
      for (const child of Array.from(node.childNodes)) visit(child);
    };
    visit(root);
    return segments;
  }
  function getUnitText(element) {
    return textSegments(element).map((segment) => segment.node.data).join("");
  }
  function findUnitElement(root, unitId) {
    if (root.getAttribute("data-voice-unit") === unitId) return root;
    for (const element of root.querySelectorAll("[data-voice-unit]")) {
      if (element.getAttribute("data-voice-unit") === unitId) return element;
    }
    return null;
  }
  function createTextRange(element, start, end, expectedText) {
    const segments = textSegments(element);
    const text = segments.map((segment) => segment.node.data).join("");
    if (expectedText !== void 0 && text !== expectedText) return null;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > text.length) return null;
    const first = segments.find((segment) => segment.end > start);
    const last = segments.find((segment) => segment.start < end && segment.end >= end);
    if (!first || !last) return null;
    const range = element.ownerDocument.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return range;
  }
  function createTextRanges(element, start, end, expectedText) {
    const segments = textSegments(element);
    const text = segments.map((segment) => segment.node.data).join("");
    if (expectedText !== void 0 && text !== expectedText) return [];
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > text.length) return [];
    return segments.filter((segment) => segment.end > start && segment.start < end).map((segment) => {
      const range = element.ownerDocument.createRange();
      range.setStart(segment.node, Math.max(0, start - segment.start));
      range.setEnd(segment.node, Math.min(segment.node.length, end - segment.start));
      return range;
    });
  }
  function isExcludedBoundary(node, unit) {
    for (let element = node.nodeType === 1 ? node : node.parentElement; element && element !== unit; element = element.parentElement) {
      if (excludedTags.has(element.tagName) || element.hasAttribute("data-voice-exclude") || element.hasAttribute("data-voice-overlay") || element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true") return true;
    }
    return false;
  }
  function containingUnit(root, node) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    const unit = element?.closest("[data-voice-unit]") ?? null;
    return unit && (unit === root || root.contains(unit)) ? unit : null;
  }
  function selectionToTarget(root, units, selection) {
    if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const element = containingUnit(root, range.startContainer);
    if (!element || containingUnit(root, range.endContainer) !== element) return null;
    const unit = units.find((item) => item.id === element.getAttribute("data-voice-unit"));
    if (!unit || getUnitText(element) !== unit.text || isExcludedBoundary(range.startContainer, element) || isExcludedBoundary(range.endContainer, element)) return null;
    const before = element.ownerDocument.createRange();
    before.selectNodeContents(element);
    before.setEnd(range.startContainer, range.startOffset);
    const start = getUnitText(before.cloneContents()).length;
    const contents = range.cloneContents();
    const selected = getUnitText(contents);
    if (selected !== contents.textContent) return null;
    const end = start + selected.length;
    if (!selected.trim() || unit.text.slice(start, end) !== selected) return null;
    return { unitId: unit.id, start, end, quote: selected };
  }
  function codePointOffsetToUtf16(text, codePointOffset) {
    if (!Number.isInteger(codePointOffset) || codePointOffset < 0) throw new RangeError("Expected a non-negative code point offset");
    let count = 0;
    let offset = 0;
    for (const point of text) {
      if (count === codePointOffset) return offset;
      offset += point.length;
      count += 1;
    }
    if (count === codePointOffset) return offset;
    throw new RangeError("Code point offset exceeds text length");
  }

  // src/client.ts
  var ReviewApiError = class extends Error {
    constructor(status, message, details) {
      super(message);
      this.status = status;
      this.details = details;
      this.name = "ReviewApiError";
    }
  };
  function createReviewClient(options = {}) {
    const baseUrl = (options.baseUrl ?? "/api").replace(/\/$/, "");
    const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    const documentUrl = (projectId, documentId) => `${baseUrl}/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`;
    const request = async (url, init) => {
      const headers = new Headers(init?.headers);
      const token = typeof options.token === "function" ? options.token() : options.token;
      if (token) headers.set("Authorization", "Bearer " + token);
      const response = await fetcher(url, { ...init, headers });
      const raw = await response.text();
      let body;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = raw;
      }
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : `Voice Studio request failed (${response.status})`;
        throw new ReviewApiError(response.status, message, body);
      }
      return body;
    };
    return {
      getDocument: (projectId, documentId) => request(documentUrl(projectId, documentId)),
      saveFeedback: (projectId, documentId, input) => request(`${documentUrl(projectId, documentId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      })
    };
  }

  // src/review.ts
  var CATEGORY_COLORS = Object.freeze({
    structure: "#285eb6",
    claims: "#bd6216",
    wording: "#8553a6",
    meta: "#a18720"
  });
  var mounts = /* @__PURE__ */ new WeakMap();
  var interactiveSelector = 'a,button,input,textarea,select,option,summary,[role="button"],[role="link"],[contenteditable]:not([contenteditable="false"])';
  function mountVoiceReview(initial) {
    const root = initial.root;
    mounts.get(root)?.dispose();
    const document = root.ownerDocument;
    const window2 = document.defaultView;
    if (!window2 || !document.body) throw new Error("Mount Voice Review after the target document has loaded");
    let options = { ...initial };
    let disposed = false;
    let pendingFrame = null;
    let selectedId = null;
    let marks = [];
    let lastSelection = "";
    let diagnostics = emptyDiagnostics();
    const overlay = document.createElement("div");
    overlay.setAttribute("data-voice-overlay", "");
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2147483000",
      overflow: "hidden",
      contain: "strict",
      userSelect: "none"
    });
    document.body.appendChild(overlay);
    function emptyDiagnostics() {
      return { mappedUnits: 0, missingUnitIds: [], mismatchedUnitIds: [], unmappedFindingIds: [], unmappedFeedbackIds: [] };
    }
    function intersect(rect, clip) {
      const left = Math.max(rect.left, clip.left);
      const top = Math.max(rect.top, clip.top);
      const right = Math.min(rect.right, clip.right);
      const bottom = Math.min(rect.bottom, clip.bottom);
      if (right <= left || bottom <= top) return null;
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    }
    function visibleRects(range, element) {
      const viewport = { left: 0, top: 0, right: window2.innerWidth, bottom: window2.innerHeight };
      if (typeof range.getClientRects !== "function") return [];
      const clips = [viewport];
      for (let parent = element; parent && parent !== document.body; parent = parent.parentElement) {
        const style = window2.getComputedStyle(parent);
        if (/(hidden|clip|auto|scroll)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) {
          clips.push(parent.getBoundingClientRect());
        }
      }
      const rects = [];
      for (const clientRect of Array.from(range.getClientRects())) {
        let rect = {
          left: clientRect.left,
          top: clientRect.top,
          right: clientRect.right,
          bottom: clientRect.bottom,
          width: clientRect.width,
          height: clientRect.height
        };
        for (const clip of clips) {
          if (rect) rect = intersect(rect, clip);
        }
        if (rect && rect.width > 0 && rect.height > 0) rects.push(rect);
      }
      return rects;
    }
    function paint() {
      if (disposed) return;
      diagnostics = emptyDiagnostics();
      marks = [];
      const elements = /* @__PURE__ */ new Map();
      for (const unit of options.units) {
        const element = findUnitElement(root, unit.id);
        if (!element) {
          diagnostics.missingUnitIds.push(unit.id);
          continue;
        }
        if (getUnitText(element) !== unit.text) {
          diagnostics.mismatchedUnitIds.push(unit.id);
          continue;
        }
        elements.set(unit.id, { element, unit });
        diagnostics.mappedUnits++;
      }
      const candidates = [
        ...options.findings.map((item) => ({ kind: "finding", item })),
        ...options.feedback.filter((item) => item.status === "open" || item.status === "needs_recheck").map((item) => ({ kind: "feedback", item }))
      ];
      for (const candidate of candidates) {
        const { item, kind } = candidate;
        const mapped = elements.get(item.unitId);
        const ranges = mapped && mapped.unit.text.slice(item.start, item.end) === item.quote ? createTextRanges(mapped.element, item.start, item.end, mapped.unit.text) : [];
        if (!ranges.length || !mapped) {
          (kind === "finding" ? diagnostics.unmappedFindingIds : diagnostics.unmappedFeedbackIds).push(item.id);
          continue;
        }
        for (const range of ranges) {
          for (const rect of visibleRects(range, mapped.element)) marks.push({ ...candidate, rect });
        }
      }
      const fragment = document.createDocumentFragment();
      const placed = [];
      for (const mark of marks) {
        const occupied = new Set(placed.filter((other) => Math.abs(other.rect.bottom - mark.rect.bottom) < 3 && other.rect.left < mark.rect.right && other.rect.right > mark.rect.left).map((other) => other.lane));
        let lane = 0;
        while (occupied.has(lane)) lane++;
        placed.push({ rect: mark.rect, lane });
        const line = document.createElement("span");
        line.setAttribute("data-voice-mark", mark.item.id);
        line.setAttribute("data-voice-kind", mark.kind);
        const color = CATEGORY_COLORS[mark.item.category] ?? CATEGORY_COLORS.meta;
        Object.assign(line.style, {
          position: "absolute",
          left: `${mark.rect.left}px`,
          top: `${mark.rect.bottom - 1 + lane * 3}px`,
          width: `${mark.rect.width}px`,
          height: "0",
          boxSizing: "content-box",
          borderBottom: `2px ${mark.kind === "feedback" ? "dotted" : "solid"} ${color}`
        });
        fragment.appendChild(line);
        if (mark.kind === "finding" && mark.item.id === selectedId) {
          const highlight = document.createElement("span");
          Object.assign(highlight.style, {
            position: "absolute",
            left: `${mark.rect.left}px`,
            top: `${mark.rect.top}px`,
            width: `${mark.rect.width}px`,
            height: `${mark.rect.height}px`,
            backgroundColor: color,
            opacity: "0.13"
          });
          fragment.appendChild(highlight);
        }
      }
      overlay.replaceChildren(fragment);
    }
    function schedulePaint() {
      if (disposed || pendingFrame !== null) return;
      if (typeof window2.requestAnimationFrame === "function") {
        pendingFrame = window2.requestAnimationFrame(() => {
          pendingFrame = null;
          paint();
        });
      } else {
        pendingFrame = window2.setTimeout(() => {
          pendingFrame = null;
          paint();
        }, 0);
      }
    }
    function selectText() {
      if (disposed) return;
      const selection = selectionToTarget(root, options.units, document.getSelection());
      if (!selection) {
        lastSelection = "";
        return;
      }
      const key = `${selection.unitId}:${selection.start}:${selection.end}:${selection.quote}`;
      if (key === lastSelection) return;
      lastSelection = key;
      options.onSelect?.(selection);
    }
    function clickFinding(event) {
      if (!document.getSelection()?.isCollapsed) return;
      const target = event.target;
      if (target?.closest?.(interactiveSelector)) return;
      const hits = marks.filter((mark) => event.clientX >= mark.rect.left - 2 && event.clientX <= mark.rect.right + 2 && event.clientY >= mark.rect.top && event.clientY <= mark.rect.bottom + 8);
      hits.sort((a, b) => a.item.end - a.item.start - (b.item.end - b.item.start));
      const hit = hits[0];
      if (!hit) return;
      if (hit.kind === "finding") {
        selectedId = hit.item.id;
        options.onFindingSelect?.(hit.item);
        schedulePaint();
      } else options.onFeedbackSelect?.(hit.item);
    }
    root.addEventListener("mouseup", selectText);
    root.addEventListener("keyup", selectText);
    root.addEventListener("click", clickFinding);
    root.addEventListener("touchend", selectText, { passive: true });
    window2.addEventListener("resize", schedulePaint);
    document.addEventListener("scroll", schedulePaint, true);
    const observer = new window2.MutationObserver((records) => {
      if (records.some((record) => record.target !== overlay && !overlay.contains(record.target))) schedulePaint();
    });
    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "data-voice-unit"]
    });
    const resizeObserver = typeof window2.ResizeObserver === "function" ? new window2.ResizeObserver(schedulePaint) : null;
    resizeObserver?.observe(root);
    document.fonts?.ready.then(schedulePaint).catch(() => {
    });
    const controller = {
      update(next) {
        if (disposed) return;
        options = { ...options, ...next, root };
        lastSelection = "";
        paint();
      },
      selectFinding(id) {
        if (disposed) return;
        selectedId = id;
        const finding = options.findings.find((item) => item.id === id);
        if (finding) findUnitElement(root, finding.unitId)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        schedulePaint();
      },
      getDiagnostics() {
        return {
          ...diagnostics,
          missingUnitIds: [...diagnostics.missingUnitIds],
          mismatchedUnitIds: [...diagnostics.mismatchedUnitIds],
          unmappedFindingIds: [...diagnostics.unmappedFindingIds],
          unmappedFeedbackIds: [...diagnostics.unmappedFeedbackIds]
        };
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        if (pendingFrame !== null) {
          if (typeof window2.cancelAnimationFrame === "function") window2.cancelAnimationFrame(pendingFrame);
          else window2.clearTimeout(pendingFrame);
        }
        root.removeEventListener("mouseup", selectText);
        root.removeEventListener("keyup", selectText);
        root.removeEventListener("touchend", selectText);
        root.removeEventListener("click", clickFinding);
        window2.removeEventListener("resize", schedulePaint);
        document.removeEventListener("scroll", schedulePaint, true);
        observer.disconnect();
        resizeObserver?.disconnect();
        overlay.remove();
        marks = [];
        if (mounts.get(root) === controller) mounts.delete(root);
      }
    };
    mounts.set(root, controller);
    paint();
    return controller;
  }

  // src/studio-bridge.ts
  var bridges = /* @__PURE__ */ new WeakMap();
  var excludedSelector = 'script,style,noscript,template,iframe,object,embed,code,pre,textarea,input,select,option,svg,math,[hidden],[aria-hidden="true"],[data-voice-exclude],[data-voice-overlay],[contenteditable]:not([contenteditable="false"])';
  function connectVoiceStudio(options) {
    const view = options.window ?? window;
    const document = view.document;
    const configured = new URL(options.studioOrigin);
    if (!/^https?:$/.test(configured.protocol) || configured.username || configured.password || configured.pathname !== "/" || configured.search || configured.hash) {
      throw new Error("studioOrigin must be an explicit HTTP(S) origin without a path, credentials, query or fragment");
    }
    const studioOrigin = configured.origin;
    bridges.get(view)?.dispose();
    let disposed = false;
    let peer = null;
    let sessionId = null;
    let active = null;
    let review = null;
    let lastUrl = view.location.href;
    let lastTitle = document.title;
    let refreshTimer = null;
    const temporary = [];
    function send(message) {
      if (!disposed && peer) peer.postMessage(message, studioOrigin);
    }
    function locationMessage(type) {
      if (!sessionId) return;
      const location = { sessionId, url: view.location.href, title: document.title };
      send(type === "voice-studio:ready" ? { type, protocolVersion: 1, ...location } : { type, ...location });
    }
    function clearReview() {
      observer.disconnect();
      review?.dispose();
      review = null;
      for (const change of temporary.splice(0)) {
        if (change.element.getAttribute("data-voice-unit") !== change.id) continue;
        if (change.previous === null) change.element.removeAttribute("data-voice-unit");
        else change.element.setAttribute("data-voice-unit", change.previous);
      }
    }
    function observe() {
      if (!disposed && document.documentElement) observer.observe(document.documentElement, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden", "data-voice-unit", "data-voice-exclude"]
      });
    }
    function eligible(element) {
      if (element.closest(excludedSelector)) return false;
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = view.getComputedStyle(ancestor);
        if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0") return false;
      }
      return true;
    }
    function canonicalUrl(value) {
      try {
        return new URL(value).href;
      } catch {
        return null;
      }
    }
    function render() {
      if (disposed || !active || !sessionId || !document.body) return;
      if (canonicalUrl(active.pageUrl) !== view.location.href) return;
      const message = active;
      const currentSession = sessionId;
      clearReview();
      const diagnostics = {
        totalUnits: message.units.length,
        mappedUnits: 0,
        explicitUnits: 0,
        inferredUnits: 0,
        missingUnitIds: [],
        mismatchedUnitIds: [],
        ambiguousUnitIds: [],
        unmappedFindingIds: [],
        unmappedFeedbackIds: []
      };
      const all = Array.from(document.body.querySelectorAll("*")).filter(eligible);
      const explicit = all.filter((element) => element.hasAttribute("data-voice-unit"));
      if (document.body.hasAttribute("data-voice-unit") && eligible(document.body)) explicit.unshift(document.body);
      const mapped = [];
      const assigned = /* @__PURE__ */ new Set();
      const unresolved = [];
      for (const unit of message.units) {
        const matches = explicit.filter((element) => element.getAttribute("data-voice-unit") === unit.id);
        if (matches.length > 1) {
          diagnostics.ambiguousUnitIds.push(unit.id);
          continue;
        }
        if (matches.length === 1) {
          if (getUnitText(matches[0]) !== unit.text) {
            diagnostics.mismatchedUnitIds.push(unit.id);
            continue;
          }
          assigned.add(matches[0]);
          mapped.push(unit);
          diagnostics.explicitUnits++;
        } else unresolved.push(unit);
      }
      const remainingTextCounts = /* @__PURE__ */ new Map();
      for (const unit of unresolved) remainingTextCounts.set(unit.text, (remainingTextCounts.get(unit.text) ?? 0) + 1);
      const candidateText = /* @__PURE__ */ new Map();
      for (const element of all) {
        if (element.closest("[data-voice-unit]") || element.querySelector("[data-voice-unit]")) continue;
        const text = getUnitText(element);
        if (!remainingTextCounts.has(text)) continue;
        const candidates = candidateText.get(text) ?? [];
        candidates.push(element);
        candidateText.set(text, candidates);
      }
      for (const unit of unresolved) {
        const matches = (candidateText.get(unit.text) ?? []).filter((element2) => !assigned.has(element2));
        const deepest = matches.filter((element2) => !matches.some((other) => other !== element2 && element2.contains(other)));
        if (deepest.length > 1 || (remainingTextCounts.get(unit.text) ?? 0) > 1) {
          diagnostics.ambiguousUnitIds.push(unit.id);
          continue;
        }
        if (deepest.length === 0) {
          diagnostics.missingUnitIds.push(unit.id);
          continue;
        }
        const element = deepest[0];
        temporary.push({ element, id: unit.id, previous: element.getAttribute("data-voice-unit") });
        element.setAttribute("data-voice-unit", unit.id);
        assigned.add(element);
        mapped.push(unit);
        diagnostics.inferredUnits++;
      }
      const stillCurrent = () => !disposed && sessionId === currentSession && active === message && view.location.href === canonicalUrl(message.pageUrl);
      const ids = new Set(mapped.map((unit) => unit.id));
      review = mountVoiceReview({
        root: document.body,
        units: mapped,
        findings: message.findings.filter((item) => ids.has(item.unitId)),
        feedback: message.feedback.filter((item) => ids.has(item.unitId)),
        onSelect: (selection) => {
          if (stillCurrent()) send({ type: "voice-studio:selection", sessionId: currentSession, reviewId: message.reviewId, selection });
        },
        onFindingSelect: (finding) => {
          if (stillCurrent()) send({ type: "voice-studio:finding", sessionId: currentSession, reviewId: message.reviewId, findingId: finding.id });
        },
        onFeedbackSelect: (feedback) => {
          if (stillCurrent()) send({ type: "voice-studio:feedback", sessionId: currentSession, reviewId: message.reviewId, feedbackId: feedback.id });
        }
      });
      const mounted = review.getDiagnostics();
      diagnostics.mappedUnits = mounted.mappedUnits;
      diagnostics.unmappedFindingIds = [...message.findings.filter((item) => !ids.has(item.unitId)).map((item) => item.id), ...mounted.unmappedFindingIds];
      diagnostics.unmappedFeedbackIds = [...message.feedback.filter((item) => !ids.has(item.unitId)).map((item) => item.id), ...mounted.unmappedFeedbackIds];
      observe();
      send({ type: "voice-studio:mapping", sessionId: currentSession, reviewId: message.reviewId, diagnostics });
    }
    function checkLocation() {
      const url = view.location.href;
      const title = document.title;
      if (url === lastUrl && title === lastTitle) return false;
      const changedUrl = url !== lastUrl;
      lastUrl = url;
      lastTitle = title;
      if (changedUrl) {
        active = null;
        clearReview();
        observe();
      }
      locationMessage("voice-studio:location");
      return changedUrl;
    }
    function refresh() {
      if (disposed) return;
      if (!checkLocation()) render();
    }
    function scheduleRefresh() {
      if (disposed || refreshTimer !== null) return;
      refreshTimer = view.setTimeout(() => {
        refreshTimer = null;
        refresh();
      }, 50);
    }
    const observer = new view.MutationObserver((records) => {
      if (records.some((record) => {
        const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        return !element?.closest("[data-voice-overlay]");
      })) scheduleRefresh();
    });
    function isReview(data) {
      return typeof data.reviewId === "string" && data.reviewId.length > 0 && data.reviewId.length <= 160 && typeof data.pageUrl === "string" && Array.isArray(data.units) && data.units.length <= 5e3 && new Set(data.units.map((unit) => unit?.id)).size === data.units.length && data.units.every((unit) => unit && typeof unit.id === "string" && typeof unit.text === "string" && unit.sourceSpan?.encoding === "utf16") && Array.isArray(data.findings) && data.findings.every((item) => item && typeof item.id === "string" && typeof item.unitId === "string" && typeof item.quote === "string" && Number.isInteger(item.start) && Number.isInteger(item.end)) && Array.isArray(data.feedback) && data.feedback.every((item) => item && typeof item.id === "string" && typeof item.unitId === "string" && typeof item.quote === "string" && Number.isInteger(item.start) && Number.isInteger(item.end));
    }
    function receive(event) {
      if (disposed || event.origin !== studioOrigin || !event.source) return;
      const allowed = view.parent !== view && event.source === view.parent || !!view.opener && event.source === view.opener;
      if (!allowed || peer && event.source !== peer) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      const payload = data;
      if (payload.type === "voice-studio:connect") {
        if (typeof payload.sessionId !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(payload.sessionId)) return;
        active = null;
        clearReview();
        peer = event.source;
        sessionId = payload.sessionId;
        lastUrl = view.location.href;
        lastTitle = document.title;
        observe();
        locationMessage("voice-studio:ready");
        return;
      }
      if (!sessionId || payload.sessionId !== sessionId) return;
      if (payload.type === "voice-studio:navigate") {
        if (payload.action === "back") view.history.back();
        else if (payload.action === "forward") view.history.forward();
        else if (payload.action === "reload") view.location.reload();
        return;
      }
      if (payload.type === "voice-studio:disconnect") {
        active = null;
        clearReview();
        peer = null;
        sessionId = null;
        return;
      }
      if (payload.type === "voice-studio:select-finding") {
        if (payload.reviewId === active?.reviewId && (payload.findingId === null || typeof payload.findingId === "string")) review?.selectFinding(payload.findingId);
        return;
      }
      if (payload.type !== "voice-studio:review") return;
      if (!isReview(payload)) {
        send({ type: "voice-studio:error", sessionId, message: "Invalid Voice review payload" });
        return;
      }
      if (canonicalUrl(payload.pageUrl) !== view.location.href) {
        send({ type: "voice-studio:error", sessionId, reviewId: payload.reviewId, message: "The live page navigated; review its current URL before sending new anchors" });
        locationMessage("voice-studio:location");
        return;
      }
      active = payload;
      render();
    }
    const originalPush = view.history.pushState;
    const originalReplace = view.history.replaceState;
    const push = function(...args) {
      originalPush.apply(this, args);
      checkLocation();
    };
    const replace = function(...args) {
      originalReplace.apply(this, args);
      checkLocation();
    };
    view.history.pushState = push;
    view.history.replaceState = replace;
    view.addEventListener("message", receive);
    view.addEventListener("popstate", checkLocation);
    view.addEventListener("hashchange", checkLocation);
    view.addEventListener("pageshow", refresh);
    const connection = {
      refresh,
      dispose() {
        if (disposed) return;
        disposed = true;
        active = null;
        if (refreshTimer !== null) view.clearTimeout(refreshTimer);
        clearReview();
        peer = null;
        sessionId = null;
        view.removeEventListener("message", receive);
        view.removeEventListener("popstate", checkLocation);
        view.removeEventListener("hashchange", checkLocation);
        view.removeEventListener("pageshow", refresh);
        if (view.history.pushState === push) view.history.pushState = originalPush;
        if (view.history.replaceState === replace) view.history.replaceState = originalReplace;
        if (bridges.get(view) === connection) bridges.delete(view);
      }
    };
    bridges.set(view, connection);
    return connection;
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=voice-review.js.map
