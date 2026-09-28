// Loads content/books.json (cache-first via the service worker) and exposes
// small lookup/derived-data helpers used by the views.
import { getReadCount, isRead } from './state.js';

let booksPromise = null;

// All numbers in the UI render in Western Arabic digits (0-9). Book text in
// books.json uses Devanagari digits (e.g. "।। ३।।"), so normalise every
// string once at load rather than touching the source data.
const DEVANAGARI_DIGIT = /[\u0966-\u096F]/g;

function withArabicDigits(value) {
  if (typeof value === 'string') return value.replace(DEVANAGARI_DIGIT, (d) => String(d.charCodeAt(0) - 0x0966));
  if (Array.isArray(value)) return value.map(withArabicDigits);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withArabicDigits(v)]));
  }
  return value;
}

export function loadBooks() {
  if (!booksPromise) {
    booksPromise = fetch('content/books.json')
      .then((res) => {
        if (!res.ok) throw new Error(`books.json ${res.status}`);
        return res.json();
      })
      .then((data) => withArabicDigits(data.books || []));
  }
  return booksPromise;
}

export async function getBook(bookId) {
  const books = await loadBooks();
  return books.find((b) => b.id === bookId) || null;
}

export function getShabad(book, shabadId) {
  return book.shabads.find((s) => s.id === shabadId) || null;
}

export function getShabadIndex(book, shabadId) {
  return book.shabads.findIndex((s) => s.id === shabadId);
}

export function timeToSeconds(t) {
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(t) || 0;
}

export function formatSeconds(total) {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Absolute hh:mm:ss (zero-padded), matching startTime/endTime in books.json. */
export function formatHms(total) {
  const s = Math.max(0, Math.floor(total));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

export function shabadDuration(shabad) {
  return timeToSeconds(shabad.endTime) - timeToSeconds(shabad.startTime);
}

export function bookProgress(book) {
  const total = book.shabads.length;
  const read = getReadCount(book.id);
  if (total === 0) return { read: 0, total: 0, pct: 0, status: 'unread' };
  const pct = Math.round((read / total) * 100);
  let status = 'partial';
  if (read === 0) status = 'unread';
  else if (read >= total) status = 'complete';
  return { read, total, pct, status };
}

/** First unread shabad in book order, or null if all read. */
export function nextUnread(book) {
  return book.shabads.find((s) => !isRead(book.id, s.id)) || null;
}

export function firstLine(text) {
  return text.split('\n')[0].trim();
}

/** Zero-padded 2-digit shabad number, e.g. 5 -> "05". */
export function shabadNumberLabel(number) {
  return String(number).padStart(2, '0');
}

/** "MM:SS" duration, e.g. 270s -> "04:30". */
export function formatDuration(totalSeconds) {
  return formatSeconds(totalSeconds);
}

/** Whole-minutes total, for a book's aggregate duration. */
export function formatTotalMinutes(totalSeconds) {
  return String(Math.round(totalSeconds / 60));
}

/** Asset paths in books.json (cover, audioSource) are relative to content/. */
export function assetUrl(relativePath) {
  return `content/${relativePath}`;
}
