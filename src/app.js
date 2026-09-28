import * as home from './views/home.js';
import * as book from './views/book.js';
import * as shabad from './views/shabad.js';
import * as bookmarks from './views/bookmarks.js';
import { getFontScale, setFontScale } from './state.js';
import { icon } from './icons.js';

const appMain = document.getElementById('app-main');
const appHeader = document.getElementById('app-header');
const tabBar = document.getElementById('tab-bar');
const appFooter = document.getElementById('app-footer');
const audioPlayerEl = document.getElementById('audio-player');

let currentCleanup = null;
// "Shabadवाणी" has no distinct screen of its own in v1 (it aliases Home's
// book list) — this tracks which of the two home-aliasing tabs was tapped
// last purely so the tab bar highlights something sensible.

function applyTextScale() {
  document.documentElement.style.setProperty('--text-scale', String(getFontScale()));
}

function renderFontControl() {
  return `
    <div class="fs-ctrl">
      <button class="font-dec" aria-label="घटाएं" title="अक्षर घटाएं">A-</button>
      <span class="fs-sep" aria-hidden="true">|</span>
      <button class="font-inc" aria-label="बढ़ाएं" title="अक्षर बढ़ाएं">A+</button>
    </div>`;
}

function wireFontControl(root) {
  root.querySelectorAll('.font-dec').forEach((btn) => btn.addEventListener('click', () => {
    setFontScale(getFontScale() - 0.05);
    applyTextScale();
  }));
  root.querySelectorAll('.font-inc').forEach((btn) => btn.addEventListener('click', () => {
    setFontScale(getFontScale() + 0.05);
    applyTextScale();
  }));
}

function bookmarkButtonHtml(bookmarked) {
  return `<button class="icon-btn bookmark-toggle-btn" aria-label="बुकमार्क">${icon(bookmarked ? 'bookmarkFilled' : 'bookmark')}</button>`;
}

function setHeader({ title, titleVariant = 'app', backHref, showBookmark, bookmarked, onBookmarkToggle }) {
  const titleClass = titleVariant === 'book' ? 'variant-book' : titleVariant === 'shabad' ? 'variant-shabad' : '';

  appHeader.innerHTML = `
    <div class="mobile-header">
      ${backHref ? `<button class="icon-btn back-btn" aria-label="वापस">${icon('back')}</button>` : ''}
      <div class="header-title-group">
        <span class="header-title dn ${titleClass}">${title || ''}</span>
      </div>
      <div class="header-actions">
        ${showBookmark ? bookmarkButtonHtml(bookmarked) : ''}
        ${renderFontControl()}
      </div>
    </div>
    <div class="desktop-nav">
      <a class="desktop-brand" href="#/home" aria-label="जंभवाणी — बिश्नोई शब्दवाणी"><img src="content/assets/images/logo1.png" alt="जंभवाणी" /></a>
      <div class="desktop-nav-right">
        <nav class="desktop-links dn">${desktopLinksHtml()}</nav>
        <div class="header-actions">
          ${showBookmark ? bookmarkButtonHtml(bookmarked) : ''}
          ${renderFontControl()}
        </div>
      </div>
    </div>
  `;

  if (backHref) {
    appHeader.querySelector('.back-btn').addEventListener('click', () => { location.hash = backHref; });
  }
  if (showBookmark) {
    appHeader.querySelectorAll('.bookmark-toggle-btn').forEach((btn) => btn.addEventListener('click', onBookmarkToggle));
  }
  wireFontControl(appHeader);
  wireDesktopLinks(appHeader);
}

function desktopLinksHtml() {
  const active = currentActiveTab();
  const link = (key, label, href) => `<a data-tab="${key}" data-href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
  return link('home', 'होम', '#/home')
    + link('shabadvani', 'शब्दवाणी', `#/book/${SHABADVANI_BOOK_ID}`)
    + link('bookmarks', 'बुकमार्क', '#/bookmarks');
}

function wireDesktopLinks(root) {
  root.querySelectorAll('.desktop-links a').forEach((a) => {
    a.addEventListener('click', () => { location.hash = a.dataset.href; });
  });
}

// Nav highlight follows the open view: the Shabadvani book and any of its
// shabads light up "शब्दवाणी", bookmarks lights "बुकमार्क", the home page
// lights "होम". Other books (आरती, शब्द संग्रह) have no nav item, so
// nothing is highlighted there rather than a misleading tab.
const SHABADVANI_BOOK_ID = 'shabadvani';

function currentActiveTab() {
  const { view, params } = parseHash();
  if (view === home) return 'home';
  if (view === bookmarks) return 'bookmarks';
  const bookId = view === book ? params.id : params.bookId;
  return bookId === SHABADVANI_BOOK_ID ? 'shabadvani' : null;
}

function renderTabBar() {
  const active = currentActiveTab();
  const item = (key, label, iconName, href) => `
    <button class="tab-item ${active === key ? 'active' : ''}" data-tab="${key}" data-href="${href}">
      ${icon(iconName)}<span class="tab-label dn">${label}</span>
    </button>`;
  tabBar.innerHTML = item('home', 'होम', 'home', '#/')
    + item('shabadvani', 'शब्दवाणी', 'book', `#/book/${SHABADVANI_BOOK_ID}`)
    + item('bookmarks', 'बुकमार्क', 'bookmark', '#/bookmarks');
  tabBar.querySelectorAll('.tab-item').forEach((btn) => {
    btn.addEventListener('click', () => { location.hash = btn.dataset.href; });
  });
}

function showPlayer(visible) {
  audioPlayerEl.classList.toggle('visible', visible);
  document.body.classList.toggle('has-player', visible);
}

const ctx = { setHeader, showPlayer };

function parseHash() {
  const hash = (location.hash || '#/').replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { view: home, params: {} };
  if (parts[0] === 'book' && parts[1]) return { view: book, params: { id: parts[1] } };
  if (parts[0] === 'shabad' && parts[1] && parts[2]) return { view: shabad, params: { bookId: parts[1], shabadId: parts[2] } };
  if (parts[0] === 'bookmarks') return { view: bookmarks, params: {} };
  return { view: home, params: {} };
}

async function route() {
  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }
  const { view, params } = parseHash();
  appMain.innerHTML = '';
  appMain.scrollTop = 0;
  window.scrollTo(0, 0);
  const result = await view.render(appMain, params, ctx);
  if (typeof result === 'function') currentCleanup = result;
  renderTabBar();
}

function initDownloadBanner() {
  const banner = document.getElementById('download-banner');
  const fill = banner.querySelector('.fill');
  const label = banner.querySelector('.label');
  const dismissBtn = banner.querySelector('#download-dismiss');

  dismissBtn.addEventListener('click', () => banner.classList.remove('visible'));

  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.type === 'DOWNLOAD_STATUS') {
      if (msg.cached < msg.total) {
        banner.classList.remove('error');
        banner.classList.add('visible');
        label.textContent = `ऑफ़लाइन उपयोग हेतु डाउनलोड हो रहा है… ${msg.cached}/${msg.total}`;
        fill.style.width = `${msg.total ? (msg.cached / msg.total) * 100 : 0}%`;
      }
    } else if (msg.type === 'DOWNLOAD_PROGRESS') {
      banner.classList.remove('error');
      banner.classList.add('visible');
      label.textContent = `ऑफ़लाइन उपयोग हेतु डाउनलोड हो रहा है… ${msg.done}/${msg.total}`;
      fill.style.width = `${msg.total ? (msg.done / msg.total) * 100 : 0}%`;
    } else if (msg.type === 'DOWNLOAD_COMPLETE') {
      label.textContent = 'सभी सामग्री ऑफ़लाइन उपयोग हेतु तैयार है';
      fill.style.width = '100%';
      setTimeout(() => banner.classList.remove('visible'), 2500);
    } else if (msg.type === 'DOWNLOAD_ERROR') {
      banner.classList.add('visible', 'error');
      label.textContent = msg.message;
    }
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // __DEV_NO_SW__ is only ever defined (by webpack.DefinePlugin) when
  // running under `webpack serve` — undeclared everywhere else (the raw
  // unbundled dev flow, `build:dev`, `build`), where this typeof guard
  // just falls through to normal registration.
  if (typeof __DEV_NO_SW__ !== 'undefined' && __DEV_NO_SW__) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    const kickOff = () => {
      const target = reg.active || navigator.serviceWorker.controller;
      target?.postMessage({ type: 'START_CONTENT_DOWNLOAD' });
    };
    if (navigator.serviceWorker.controller) {
      kickOff();
    } else {
      navigator.serviceWorker.addEventListener('controllerchange', kickOff, { once: true });
    }
  } catch (err) {
    console.warn('[sw] registration failed', err);
  }
}

// Site footer (Stitch design) — shown on tablet/desktop only via CSS. Links
// point only at pages that exist; the design's 29 नियम / खेजड़ली links are
// left out until those pages are built.
function renderFooter() {
  const year = new Date().getFullYear();
  const links = [
    ['120 शब्दवाणी', '#/book/shabadvani'],
    ['आरती व नित्य स्तुति', '#/book/arti'],
    ['शब्द संग्रह', '#/book/shabad-sangrah'],
    ['बुकमार्क', '#/bookmarks'],
  ].map(([label, href]) => `<a href="${href}">${label}</a>`).join('<span class="footer-sep" aria-hidden="true">•</span>');

  appFooter.innerHTML = `
    <div class="footer-inner dn">
      <div class="footer-invocation">${icon('lotus')}<span>॥ श्री गुरु जम्भेश्वराय नमः ॥</span>${icon('lotus')}</div>
      <p class="footer-couplet">"सिर साठे रूंख रहे तो भी सस्तो जाण"</p>
      <div class="footer-rule" aria-hidden="true"></div>
      <nav class="footer-links">${links}</nav>
      <p class="footer-copy">© ${year} जम्भवाणी डिजिटल संग्रह। समराथल धोरा एवं जाम्भा पावन परंपरा को समर्पित। सर्वाधिकार सुरक्षित।</p>
    </div>`;
}

function init() {
  applyTextScale();
  renderFooter();
  initDownloadBanner();
  window.addEventListener('hashchange', route);
  route();
  registerServiceWorker();
}

init();
