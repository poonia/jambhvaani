import { getBook, getShabad, getShabadIndex, formatDuration, formatHms, shabadNumberLabel, assetUrl } from '../content.js';
import { markRead, isRead, isBookmarked, toggleBookmark } from '../state.js';
import { icon } from '../icons.js';
import { escapeHtml, showToast } from '../util.js';
import * as player from '../audio-player.js';

// Read-tracking choice: a shabad is marked read after the user has stayed on
// its detail view for DWELL_MS. Playback isn't required — many people read
// the text without pressing play — so a dwell timer covers both text-only
// and audio-only engagement, whereas "starts playing" alone would miss readers.
const DWELL_MS = 10000;
let isShadvaani = false;

export async function render(container, params, ctx) {
  isShadvaani = params.bookId === 'shabadvani';
  const book = await getBook(params.bookId);
  if (!book) {
    container.innerHTML = `<div class="empty-state"><p>पुस्तक नहीं मिली।</p></div>`;
    ctx.setHeader({ title: 'शब्द', titleVariant: 'shabad', backHref: '#/' });
    return null;
  }
  const shabad = getShabad(book, params.shabadId);
  if (!shabad) {
    container.innerHTML = `<div class="empty-state"><p>शब्द नहीं मिला।</p></div>`;
    ctx.setHeader({ title: book.title, titleVariant: 'shabad', backHref: `#/book/${book.id}` });
    return null;
  }

  const index = getShabadIndex(book, shabad.id);
  const prev = index > 0 ? book.shabads[index - 1] : null;
  const next = index < book.shabads.length - 1 ? book.shabads[index + 1] : null;

  container.innerHTML = `
    <div class="scripture shabad-content">
      <div class="shabad-banner dn">
        <span class="om-mark">ॐ</span>
        <span>${escapeHtml(book.title)}</span>
      </div>
      <h1 class="shabad-verse dn">${ isShadvaani ? `शब्द ${shabadNumberLabel(shabad.number)}` : escapeHtml(shabad.title)}</h1>
      <div class="shabad-text dn">${escapeHtml(shabad.text)}</div>
      <div class="shabad-dots" aria-hidden="true">• • •</div>
      <div class="shabad-nav">
        <button class="btn-pill dn" id="prev-btn" ${prev ? '' : 'disabled'}>← पिछला शब्द</button>
        <button class="btn-pill primary dn" id="next-btn" ${next ? '' : 'disabled'}>अगला शब्द →</button>
      </div>
      <p class="shabad-count dn">शब्द ${shabadNumberLabel(shabad.number)} / ${shabadNumberLabel(book.shabads.length)}</p>
    </div>
  `;

  container.querySelector('#prev-btn')?.addEventListener('click', () => {
    if (prev) location.hash = `#/shabad/${book.id}/${prev.id}`;
  });
  container.querySelector('#next-btn')?.addEventListener('click', () => {
    if (next) location.hash = `#/shabad/${book.id}/${next.id}`;
  });

  function applyHeader() {
    ctx.setHeader({
      title: book.title,
      titleVariant: 'shabad',
      backHref: `#/book/${book.id}`,
      showBookmark: true,
      bookmarked: isBookmarked(book.id, shabad.id),
      onBookmarkToggle: () => {
        toggleBookmark(book.id, shabad.id);
        applyHeader();
        showToast(isBookmarked(book.id, shabad.id) ? 'बुकमार्क सेव हुआ' : 'बुकमार्क हटाया गया');
      },
    });
  }
  applyHeader();

  const audioSrc = assetUrl(shabad.audioSource || book.audioSource);
  player.bind(audioSrc, shabad.startTime, shabad.endTime);
  ctx.showPlayer(true);

  let dwellTimer = null;
  let readAlready = isRead(book.id, shabad.id);
  if (!readAlready) {
    dwellTimer = setTimeout(() => markRead(book.id, shabad.id), DWELL_MS);
  }

  const playerBar = mountPlayerBar();
  const unsubscribe = player.subscribe((state) => {
    playerBar.update(state);
    if (state.playing && !readAlready) {
      readAlready = true;
      markRead(book.id, shabad.id);
    }
  });
  playerBar.update(player.currentState());

  return function cleanup() {
    clearTimeout(dwellTimer);
    unsubscribe();
    player.pause();
    ctx.showPlayer(false);
  };
}

// Builds the audio bar's DOM once per shabad and returns an `update(state)`
// patcher. Rebuilding innerHTML on every state change (state updates fire on
// every animation frame during playback) destroyed and recreated the seek
// <input> mid-gesture, breaking drag, and could drop clicks on the play
// button if they landed between a teardown/rebuild pair.
function mountPlayerBar() {
  const bar = document.getElementById('audio-player');
  bar.innerHTML = `
    <button class="play-btn" aria-label="play/pause"></button>
    <span class="player-time" data-role="elapsed"></span>
    <input type="range" class="player-seek" min="0" max="1000" value="0" />
    <span class="player-time" data-role="total"></span>
    <button class="vol-ctrl" aria-label="mute"></button>
    <input type="range" class="volume-seek" min="0" max="100" value="100" aria-label="volume" />
    <div class="player-source-time" aria-label="ऑडियो फ़ाइल में समय">
      ऑडियो फ़ाइल में <span data-role="abs"></span>
      <span class="player-source-range" data-role="range"></span>
    </div>
  `;
  const playBtn = bar.querySelector('.play-btn');
  const elapsedEl = bar.querySelector('[data-role="elapsed"]');
  const totalEl = bar.querySelector('[data-role="total"]');
  const seekInput = bar.querySelector('.player-seek');
  const volBtn = bar.querySelector('.vol-ctrl');
  const volumeInput = bar.querySelector('.volume-seek');
  const absEl = bar.querySelector('[data-role="abs"]');
  const rangeEl = bar.querySelector('[data-role="range"]');

  let seeking = false;
  let adjustingVolume = false;
  // update() runs on every animation frame during playback. Only swap the
  // button icons when they actually change: replacing the icon <span> under
  // the cursor 60x/s means the mousedown and mouseup of a click land on
  // different (detached) nodes and the browser drops the click — which made
  // the pause button unresponsive while audio was playing.
  let playIcon = null;
  let volIcon = null;
  playBtn.addEventListener('click', () => player.toggle());
  volBtn.addEventListener('click', () => player.setMuted(!player.currentState().muted));
  seekInput.addEventListener('pointerdown', () => { seeking = true; });
  seekInput.addEventListener('input', (e) => player.seekTo(Number(e.target.value) / 1000));
  seekInput.addEventListener('pointerup', () => { seeking = false; });
  seekInput.addEventListener('change', () => { seeking = false; });
  volumeInput.addEventListener('pointerdown', () => { adjustingVolume = true; });
  volumeInput.addEventListener('input', (e) => player.setVolume(Number(e.target.value) / 100));
  volumeInput.addEventListener('pointerup', () => { adjustingVolume = false; });
  volumeInput.addEventListener('change', () => { adjustingVolume = false; });

  return {
    update(state) {
      const nextPlayIcon = state.playing ? 'pause' : 'play';
      if (nextPlayIcon !== playIcon) {
        playIcon = nextPlayIcon;
        playBtn.innerHTML = icon(playIcon);
      }
      elapsedEl.textContent = formatDuration(state.position);
      totalEl.textContent = formatDuration(state.duration);
      // Absolute position in the shared book audio file, so it can be checked
      // directly against startTime/endTime in books.json.
      absEl.textContent = formatHms(state.currentTime);
      rangeEl.textContent = `(${formatHms(state.start)} – ${formatHms(state.end)})`;
      if (!seeking) {
        const pct = state.duration > 0 ? (state.position / state.duration) * 100 : 0;
        seekInput.value = String(Math.round(pct * 10));
      }
      const nextVolIcon = state.muted || state.volume === 0 ? 'volumeMute' : 'volume';
      if (nextVolIcon !== volIcon) {
        volIcon = nextVolIcon;
        volBtn.innerHTML = icon(volIcon);
      }
      if (!adjustingVolume) {
        volumeInput.value = String(Math.round(state.volume * 100));
      }
    },
  };
}
