export interface FocusToolsPosition { x: number; y: number; }
export interface ReviewWidthBounds { minimum: number; maximum: number; websiteMinimum: number; }

export const reviewSplitterWidth = 12;
export const defaultReviewWidth = 398;
export const reviewWidthStorageKey = 'voice-studio:review-width';
export const focusToolsPositionStorageKey = 'voice-studio:focus-tools-position';

/** Keep both panes visible. Very narrow viewports reduce the minimums together. */
export function reviewWidthBounds(workspaceWidth: number): ReviewWidthBounds {
  const available = Math.max(0, Math.floor(workspaceWidth) - reviewSplitterWidth);
  const websiteMinimum = Math.min(available / 2, 360, Math.max(120, Math.floor(available * 0.35)));
  const maximum = Math.max(0, Math.min(720, available - websiteMinimum));
  const minimum = Math.min(maximum, 240, Math.max(180, Math.floor(available * 0.25)));
  return { minimum: Math.floor(minimum), maximum: Math.floor(maximum), websiteMinimum: Math.floor(websiteMinimum) };
}

export function clampReviewWidth(preferred: number, workspaceWidth: number): number {
  const { minimum, maximum } = reviewWidthBounds(workspaceWidth);
  return Math.round(Math.min(maximum, Math.max(minimum, Number.isFinite(preferred) ? preferred : defaultReviewWidth)));
}

export function clampFocusToolsPosition(position: FocusToolsPosition, viewportWidth: number, viewportHeight: number, toolsWidth: number, toolsHeight: number): FocusToolsPosition {
  const gap = 8;
  const minimumX = Math.min(gap, Math.max(0, viewportWidth - toolsWidth));
  const minimumY = Math.min(gap, Math.max(0, viewportHeight - toolsHeight));
  const maximumX = Math.max(minimumX, viewportWidth - toolsWidth - gap);
  const maximumY = Math.max(minimumY, viewportHeight - toolsHeight - gap);
  return {
    x: Math.round(Math.min(maximumX, Math.max(minimumX, Number.isFinite(position.x) ? position.x : gap))),
    y: Math.round(Math.min(maximumY, Math.max(minimumY, Number.isFinite(position.y) ? position.y : gap))),
  };
}

export function savedReviewWidth(): number {
  try {
    const raw = localStorage.getItem(reviewWidthStorageKey);
    const value = raw === null ? defaultReviewWidth : Number(raw);
    return Number.isFinite(value) && value >= 120 && value <= 720 ? value : defaultReviewWidth;
  } catch { return defaultReviewWidth; }
}

export function savedFocusToolsPosition(): FocusToolsPosition {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(focusToolsPositionStorageKey) ?? 'null');
    if (value && typeof value === 'object' && 'x' in value && 'y' in value && typeof value.x === 'number' && typeof value.y === 'number' && Number.isFinite(value.x) && Number.isFinite(value.y)) return { x: value.x, y: value.y };
  } catch { /* Position is an optional local preference. */ }
  return { x: 10, y: 10 };
}

export const sidebarWidthStorageKey = 'voice-studio:sidebar-width';
export const projectsCollapsedStorageKey = 'voice-studio:projects-collapsed';
export const filesCollapsedStorageKey = 'voice-studio:files-collapsed';

export function sidebarWidthBounds(viewportWidth: number, overlay: boolean): { minimum: number; maximum: number } {
  const available = Math.max(0, Math.floor(viewportWidth) - (overlay ? 32 : reviewSplitterWidth));
  const mainMinimum = overlay ? 0 : Math.min(360, available / 2);
  const maximum = Math.max(0, Math.min(480, available - mainMinimum));
  return { minimum: Math.floor(Math.min(180, maximum)), maximum: Math.floor(maximum) };
}

export function savedSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(sidebarWidthStorageKey);
    const value = raw === null ? 256 : Number(raw);
    return Number.isFinite(value) && value >= 120 && value <= 480 ? value : 256;
  } catch { return 256; }
}

export function savedCollapsedSection(key: string): boolean {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}
