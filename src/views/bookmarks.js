import { loadBooks, getShabad, firstLine, shabadNumberLabel } from '../content.js';
import { getAllBookmarks } from '../state.js';
import { icon } from '../icons.js';
import { escapeHtml } from '../util.js';

export async function render(container, params, ctx) {
  const books = await loadBooks();
  const bookmarks = getAllBookmarks();

  const entries = Object.entries(bookmarks)
    .map(([bookId, shabadId]) => {
      const book = books.find((b) => b.id === bookId);
      if (!book) return null;
      const shabad = getShabad(book, shabadId);
      if (!shabad) return null;
      return { book, shabad };
    })
    .filter(Boolean);

  const rows = entries.map(({ book, shabad }) => `
    <a class="bmark" href="#/shabad/${book.id}/${shabad.id}" data-nav>
      <p class="bmark-src dn">बुकमार्कित · ${escapeHtml(book.title)}</p>
      <p class="bmark-title dn">${shabadNumberLabel(shabad.number)}. ${escapeHtml(shabad.title)}</p>
      <p class="bmark-excerpt dn">${escapeHtml(firstLine(shabad.text))}</p>
    </a>
  `).join('');

  container.innerHTML = `
    <p class="sec-label" style="margin-top:16px">बुकमार्क · 1 प्रति पुस्तक</p>
    <div class="bookmarks-list">
      ${rows || `<div class="empty-state">${icon('bookmark')}<p>अभी कोई बुकमार्क नहीं है। किसी शब्द को पढ़ते समय बुकमार्क करें।</p></div>`}
    </div>
  `;

  ctx.setHeader({ title: 'बुकमार्क' });
}
