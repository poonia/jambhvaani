import { getBook, getShabad, shabadDuration, formatDuration, formatTotalMinutes, shabadNumberLabel } from '../content.js';
import { isRead, getBookmark, toggleBookmark } from '../state.js';
import { icon } from '../icons.js';
import { escapeHtml } from '../util.js';
import { renderAartiList } from './aarti.js';

const AARTI_BOOK_ID = 'arti';

// Per-book hero copy for the listing banner; books without an entry fall
// back to their plain title and a generic subtitle.
const BOOK_HEROES = {
  shabadvani: {
    titleHtml: 'श्री गुरु जम्भेश्वर <span class="list-hero-accent">शब्दवाणी</span>',
    subtitle: (book) => `मानव कल्याण, प्रकृति संरक्षण एवं आध्यात्मिक चेतना का अमृतमय संकलन।`,
  },
};

function rowMetaHtml(book, shabad) {
  const read = isRead(book.id, shabad.id);
  return `
    <p class="shabad-row-meta">
      <span class="${read ? 'is-read' : ''}">${read ? 'पठित' : 'अपठित'}</span>
      <span class="shabad-row-dot">•</span>
      <span>${formatDuration(shabadDuration(shabad))} मिनट</span>
    </p>`;
}

// "सब देखें" / "अपठित" chips: hide read rows client-side and keep the
// count next to the label in sync.
function wireFilter(container, book) {
  const chips = container.querySelectorAll('.list-filter-chip');
  const rows = container.querySelectorAll('.shabad-row-list .shabad-row');
  const label = container.querySelector('[data-role="filter-label"]');
  const count = container.querySelector('[data-role="filter-count"]');
  const empty = container.querySelector('.list-empty');

  chips.forEach((chip) => chip.addEventListener('click', () => {
    const unreadOnly = chip.dataset.filter === 'unread';
    chips.forEach((c) => {
      const active = c === chip;
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-pressed', String(active));
    });
    let visible = 0;
    rows.forEach((row) => {
      const show = !unreadOnly || row.dataset.read === '0';
      row.hidden = !show;
      if (show) visible += 1;
    });
    label.textContent = unreadOnly ? 'अपठित शब्द' : 'सभी शब्द';
    count.textContent = String(visible);
    empty.hidden = visible > 0 || !unreadOnly;
  }));
}

export async function render(container, params, ctx) {
  const book = await getBook(params.id);
  if (!book) {
    container.innerHTML = `<div class="empty-state"><p>पुस्तक नहीं मिली।</p></div>`;
    ctx.setHeader({ title: 'पुस्तक', titleVariant: 'book', backHref: '#/' });
    return;
  }
  if (book.id === AARTI_BOOK_ID) {
    container.innerHTML = renderAartiList(book);
    ctx.setHeader({ title: book.title, titleVariant: 'book', backHref: '#/' });
    return;
  }

  const totalDuration = book.shabads.reduce((sum, s) => sum + shabadDuration(s), 0);
  const totalMinutes = formatTotalMinutes(totalDuration);
  const hero = BOOK_HEROES[book.id] || {};
  const heroTitle = hero.titleHtml || escapeHtml(book.title);
  const heroSubtitle = hero.subtitle ? hero.subtitle(book) : `${book.shabads.length} शब्दों का प्रामाणिक संकलन।`;

  const bookmarkedShabadId = getBookmark(book.id);
  const bookmarkedShabad = bookmarkedShabadId ? getShabad(book, bookmarkedShabadId) : null;
  const bookmarkCard = bookmarkedShabad ? `
    <section class="saved-shabad">
      <div class="saved-shabad-head">
        <div class="saved-shabad-label">
          <span class="saved-shabad-icon">${icon('bookmark')}</span>
          <h3>सहेजा गया शब्द</h3>
          <span class="saved-shabad-tag">अंतिम सुरक्षित शब्द</span>
        </div>
        <span class="saved-shabad-note">एक समय में 1 शब्द</span>
      </div>
      <a class="saved-shabad-row" href="#/shabad/${book.id}/${bookmarkedShabad.id}" data-nav>
        <span class="shabad-num shabad-num--saved">${shabadNumberLabel(bookmarkedShabad.number)}</span>
        <div class="shabad-row-info">
          <p class="shabad-row-title">${escapeHtml(bookmarkedShabad.title)}</p>
          ${rowMetaHtml(book, bookmarkedShabad)}
        </div>
        <div class="saved-shabad-actions">
          <button class="saved-shabad-btn saved-shabad-btn--mark" type="button" data-action="unbookmark" title="बुकमार्क हटाएं" aria-label="बुकमार्क हटाएं">${icon('bookmarkFilled')}</button>
          <span class="saved-shabad-btn" title="श्रवण करें" aria-hidden="true">${icon('playCircle')}</span>
        </div>
      </a>
    </section>` : '';

  const rows = book.shabads.map((s) => {
    const read = isRead(book.id, s.id);
    return `
      <a class="shabad-row${read ? ' is-read' : ''}" href="#/shabad/${book.id}/${s.id}" data-nav data-read="${read ? '1' : '0'}">
        <span class="shabad-num">${shabadNumberLabel(s.number)}</span>
        <div class="shabad-row-info">
          <p class="shabad-row-title">${escapeHtml(s.title)}</p>
          ${rowMetaHtml(book, s)}
        </div>
        <span class="shabad-row-mark">${icon(read ? 'check' : 'radioUnchecked')}</span>
      </a>`;
  }).join('');

  container.innerHTML = `
    <div class="scripture shabad-list-page">
      <section class="list-hero">
        <div class="list-hero-text">
          <div class="list-hero-chip">${icon('fire')}<span>॥ ॐ श्री गुरु जम्भेश्वराय नमः ॥</span></div>
          <h1 class="list-hero-title">${heroTitle}</h1>
          <p class="list-hero-subtitle">${heroSubtitle}</p>
          <div class="list-hero-pills">
            <span class="list-hero-pill">${book.shabads.length} पावन शब्द</span>
            <span class="list-hero-pill list-hero-pill--muted">${totalMinutes} मिनट कुल समय</span>
          </div>
        </div>
        <div class="list-hero-portrait"><img src="content/assets/images/guru-jhambheshwar.png" alt="श्री गुरु जम्भेश्वर भगवान" /></div>
      </section>

      <section class="list-head">
        <h2 class="list-head-title">${escapeHtml(book.title)}</h2>
        <p class="list-head-meta">${book.shabads.length} शब्द • कुल समय ${totalMinutes} मिनट</p>
        <div class="list-filter">
          <div class="list-filter-count"><span data-role="filter-label">सभी शब्द</span><span class="list-filter-dot">•</span><strong data-role="filter-count">${book.shabads.length}</strong></div>
          <div class="list-filter-chips" role="group" aria-label="शब्द फ़िल्टर">
            <button type="button" class="list-filter-chip is-active" data-filter="all" aria-pressed="true">सब देखें</button>
            <button type="button" class="list-filter-chip" data-filter="unread" aria-pressed="false">अपठित</button>
          </div>
        </div>
      </section>

      ${bookmarkCard}

      <div class="shabad-row-list">${rows}</div>
      <p class="list-empty" hidden>सभी शब्द पठित हैं।</p>
    </div>
  `;

  wireFilter(container, book);
  const unmark = container.querySelector('[data-action="unbookmark"]');
  if (unmark) {
    unmark.addEventListener('click', (event) => {
      // The button sits inside the row link — don't navigate, just un-save.
      event.preventDefault();
      event.stopPropagation();
      toggleBookmark(book.id, bookmarkedShabad.id);
      render(container, params, ctx);
    });
  }

  ctx.setHeader({ title: book.title, titleVariant: 'book', backHref: '#/' });
}
