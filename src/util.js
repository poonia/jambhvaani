export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Cycles through the system's own neutral/accent tint ramps, matching the
// design's flat numbered-swatch covers rather than a per-book hash/gradient.
const COVER_TINTS = ['var(--color-accent-100)', 'var(--color-neutral-200)', 'var(--color-accent-200)', 'var(--color-neutral-300)'];

export function coverPlaceholder(index) {
  return { background: COVER_TINTS[index % COVER_TINTS.length], number: String(index + 1) };
}

export function renderCover(book, index, className = 'cover') {
  if (book.cover) {
    return `<img src="content/${book.cover}" alt="" class="${className}" loading="lazy" />`;
  }
  const { background, number } = coverPlaceholder(index);
  return `<div class="${className} dn" style="background:${background}">${number}</div>`;
}

let toastTimer = null;
export function showToast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
}
