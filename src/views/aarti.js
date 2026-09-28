import { icon } from '../icons.js';
import { escapeHtml } from '../util.js';

// The आरती संग्रह book gets its own devotional listing (icon cards + photo
// banner) instead of the generic shabad-row list used by other books.
// Icon/tint pairs cycle across entries so any number of aartis in
// books.json still gets a varied look without per-entry config.
const CARD_STYLES = [
  { iconName: 'flare', tint: 'peach' },
  { iconName: 'temple', tint: 'gold' },
  { iconName: 'lotus', tint: 'sky' },
  { iconName: 'twilight', tint: 'peach' },
];

const BANNER_IMAGE = 'assets/images/aarti.jpg';
const BANNER_QUOTE = 'भक्ति ही मुक्ति का मार्ग है';

// An aarti can carry an explicit `subtitle` in books.json; otherwise its
// opening line (minus trailing danda/comma) stands in as the teaser.
function subtitleFor(aarti) {
  if (aarti.subtitle) return aarti.subtitle;
  const firstLine = (aarti.text || '').split('\n')[0] || '';
  return firstLine.split(',')[0].replace(/[।॥|]+$/, '').trim();
}

export function renderAartiList(book) {
  const cards = book.shabads.map((aarti, i) => {
    const { iconName, tint } = CARD_STYLES[i % CARD_STYLES.length];
    return `
      <a class="aarti-card" href="#/shabad/${book.id}/${aarti.id}" data-nav>
        <span class="aarti-card-icon aarti-card-icon--${tint}">${icon(iconName)}</span>
        <div class="aarti-card-body">
          <p class="aarti-card-title dn">${escapeHtml(aarti.title)}</p>
          <p class="aarti-card-subtitle dn">${escapeHtml(subtitleFor(aarti))}</p>
        </div>
        <span class="aarti-card-chevron">${icon('chevronRight')}</span>
      </a>`;
  }).join('');

  return `
    <div class="scripture aarti-page">
      <header class="aarti-hero">
        <h1 class="aarti-hero-title dn">${escapeHtml(book.title)}</h1>
        <p class="aarti-hero-sub dn">दिव्य भक्ति और आध्यात्मिक शांति हेतु आरतियों का चयन</p>
        <div class="aarti-divider" aria-hidden="true">
          <span class="aarti-divider-line"></span>
          ${icon('sparkle')}
          <span class="aarti-divider-line"></span>
        </div>
      </header>
      <div class="aarti-grid">${cards}</div>
      <figure class="aarti-banner">
        <img src="content/${BANNER_IMAGE}" alt="" loading="lazy" />
        <figcaption class="dn">${BANNER_QUOTE}</figcaption>
      </figure>
    </div>
  `;
}
