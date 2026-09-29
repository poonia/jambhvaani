// Material Symbols (Outlined) ligature names — font loaded via Google Fonts
// in index.html. `bookmarkFilled` reuses the `bookmark` glyph with the FILL
// axis turned on (see .icon.filled in styles.css) rather than a second glyph.
export const icons = {
  home: 'home',
  book: 'menu_book',
  bookmark: 'bookmark',
  bookmarkFilled: 'bookmark',
  back: 'arrow_back',
  check: 'check',
  play: 'play_arrow',
  pause: 'pause',
  volume: 'volume_up',
  volumeMute: 'volume_off',
  sparkle: 'auto_awesome',
  layers: 'layers',
  chevronRight: 'chevron_right',
  flare: 'flare',
  temple: 'temple_hindu',
  lotus: 'spa',
  twilight: 'wb_twilight',
  eco: 'eco',
  historyEdu: 'history_edu',
  east: 'east',
  stories: 'auto_stories',
  library: 'local_library',
  forest: 'forest',
  fire: 'local_fire_department',
  playCircle: 'play_circle',
  radioUnchecked: 'radio_button_unchecked',
  download: 'download',
  installDesktop: 'install_desktop',
  android: 'android',
  iphone: 'phone_iphone',
  computer: 'computer',
};

const FILLED = new Set(['bookmarkFilled']);

export function icon(name, extraClass = '') {
  const filledClass = FILLED.has(name) ? 'filled' : '';
  return `<span class="icon material-symbols-outlined ${filledClass} ${extraClass}" aria-hidden="true">${icons[name] || ''}</span>`;
}
