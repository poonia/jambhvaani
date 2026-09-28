// Local device state: read progress, bookmarks, font scale.
// Persisted synchronously to localStorage so it survives refresh with no network.
const STORAGE_KEY = 'shabadvaani:state:v1';

const DEFAULT_STATE = {
  readShabads: {},   // { [bookId]: string[] shabadId }
  bookmarks: {},      // { [bookId]: shabadId }
  fontScale: 1.0,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      readShabads: parsed.readShabads || {},
      bookmarks: parsed.bookmarks || {},
      fontScale: typeof parsed.fontScale === 'number' ? parsed.fontScale : 1.0,
    };
  } catch (err) {
    console.warn('[state] failed to load, resetting', err);
    return structuredClone(DEFAULT_STATE);
  }
}

let state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[state] failed to persist', err);
  }
  listeners.forEach((fn) => fn(state));
}

export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isRead(bookId, shabadId) {
  return !!state.readShabads[bookId]?.includes(shabadId);
}

export function markRead(bookId, shabadId) {
  if (isRead(bookId, shabadId)) return;
  const list = state.readShabads[bookId] ? [...state.readShabads[bookId]] : [];
  list.push(shabadId);
  state.readShabads = { ...state.readShabads, [bookId]: list };
  persist();
}

export function getReadCount(bookId) {
  return state.readShabads[bookId]?.length || 0;
}

export function getBookmark(bookId) {
  return state.bookmarks[bookId] || null;
}

export function getAllBookmarks() {
  return { ...state.bookmarks };
}

export function setBookmark(bookId, shabadId) {
  state.bookmarks = { ...state.bookmarks, [bookId]: shabadId };
  persist();
}

export function isBookmarked(bookId, shabadId) {
  return state.bookmarks[bookId] === shabadId;
}

export function toggleBookmark(bookId, shabadId) {
  if (isBookmarked(bookId, shabadId)) {
    const next = { ...state.bookmarks };
    delete next[bookId];
    state.bookmarks = next;
  } else {
    state.bookmarks = { ...state.bookmarks, [bookId]: shabadId };
  }
  persist();
}

export function getFontScale() {
  return state.fontScale;
}

export function setFontScale(value) {
  const clamped = Math.min(1.5, Math.max(0.85, Math.round(value * 20) / 20));
  state.fontScale = clamped;
  persist();
  return clamped;
}
