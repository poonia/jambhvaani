// "डाउनलोड" page: explains how to add the web app to the home screen /
// install it, per platform, as numbered steps. Each step carries an
// illustrated snapshot of the relevant browser screen, drawn in HTML/CSS
// (so it stays crisp, localised and available offline) with the control to
// tap ringed by a pulsing highlight.
import { icon } from '../icons.js';
import {
  canPromptInstall, promptInstall, onInstallAvailabilityChange, isInstalled, detectPlatform,
} from '../pwa-install.js';

const APP_NAME = 'शब्दवाणी';
const APP_URL = location.host || 'jambhvaani.app';
const APP_ICON = 'icons/icon-192.png';

// Material Symbols ligature, rendered inline inside the mock screens.
const sym = (name, cls = '') => `<span class="material-symbols-outlined ${cls}" aria-hidden="true">${name}</span>`;

// --- Snapshot building blocks -------------------------------------------

function phone(screen, { ios = false } = {}) {
  return `
    <div class="snap-phone ${ios ? 'is-ios' : ''}" aria-hidden="true">
      <div class="snap-notch"></div>
      <div class="snap-screen">${screen}</div>
    </div>`;
}

function statusBar() {
  return `<div class="snap-status"><span>9:41</span><span>${sym('signal_cellular_alt')}${sym('battery_full')}</span></div>`;
}

// A faded-out rendition of the app's home page, used as the page behind
// browser chrome and dialogs.
function pageBody() {
  return `
    <div class="snap-page">
      <div class="snap-page-hero">
        <img src="content/assets/images/om.png" alt="" />
        <span class="snap-page-title">जंभवाणी</span>
      </div>
      <div class="snap-page-cards"><i></i><i></i><i></i><i></i></div>
      <div class="snap-page-line"></div>
      <div class="snap-page-line short"></div>
    </div>`;
}

function chromeBar({ highlightMenu = false } = {}) {
  return `
    <div class="snap-chrome-bar">
      ${sym('home', 'snap-dim')}
      <div class="snap-url">${sym('tune', 'snap-lock')}<span>${APP_URL}</span></div>
      ${sym('add_box', 'snap-dim')}
      <span class="snap-tap ${highlightMenu ? 'hl' : ''}">${sym('more_vert')}</span>
    </div>`;
}

function homeScreen({ ios = false } = {}) {
  const apps = ['call', 'chat', 'photo_camera', 'mail', 'map', 'music_note', 'settings'];
  return `
    <div class="snap-home ${ios ? 'is-ios' : ''}">
      ${statusBar()}
      <div class="snap-home-grid">
        ${apps.map((a) => `<div class="snap-app"><span class="snap-app-ic">${sym(a)}</span><span class="snap-app-lbl"></span></div>`).join('')}
        <div class="snap-app"><span class="snap-app-ic mine hl"><img src="${APP_ICON}" alt="" /></span><span class="snap-app-name">${APP_NAME}</span></div>
      </div>
    </div>`;
}

// --- Android (Chrome) ----------------------------------------------------

const androidSteps = [
  {
    title: 'Chrome में वेबसाइट खोलें',
    text: `अपने एंड्रॉइड फ़ोन पर <b>Google Chrome</b> में यह वेबसाइट खोलें। फिर ऊपर दाईं ओर <b>तीन बिंदु (⋮)</b> वाले मेनू पर टैप करें।`,
    shot: () => phone(`${statusBar()}${chromeBar({ highlightMenu: true })}${pageBody()}`),
  },
  {
    title: '“ऐप इंस्टॉल करें” चुनें',
    text: `मेनू में नीचे स्क्रॉल करें और <b>“ऐप इंस्टॉल करें” (Install app)</b> या <b>“होम स्क्रीन में जोड़ें” (Add to Home screen)</b> पर टैप करें।`,
    shot: () => phone(`
      ${statusBar()}${chromeBar()}${pageBody()}
      <div class="snap-menu">
        <div class="snap-menu-row">${sym('tab')}<span>नया टैब</span></div>
        <div class="snap-menu-row">${sym('history')}<span>इतिहास</span></div>
        <div class="snap-menu-row">${sym('download')}<span>डाउनलोड</span></div>
        <div class="snap-menu-row">${sym('share')}<span>शेयर करें…</span></div>
        <div class="snap-menu-row hl">${sym('install_mobile')}<span>ऐप इंस्टॉल करें</span></div>
        <div class="snap-menu-row">${sym('settings')}<span>सेटिंग</span></div>
      </div>`),
  },
  {
    title: '“इंस्टॉल करें” दबाएं',
    text: `एक छोटा संदेश खुलेगा। उसमें <b>“इंस्टॉल करें” (Install)</b> बटन पर टैप करें।`,
    shot: () => phone(`
      ${statusBar()}${chromeBar()}${pageBody()}
      <div class="snap-scrim"></div>
      <div class="snap-dialog">
        <p class="snap-dialog-title">ऐप इंस्टॉल करें?</p>
        <div class="snap-dialog-app"><img src="${APP_ICON}" alt="" /><div><b>${APP_NAME}</b><small>${APP_URL}</small></div></div>
        <div class="snap-dialog-actions"><span>रद्द करें</span><span class="snap-btn hl">इंस्टॉल करें</span></div>
      </div>`),
  },
  {
    title: 'होम स्क्रीन से खोलें',
    text: `अब <b>${APP_NAME}</b> का आइकन आपकी होम स्क्रीन पर आ जाएगा। इसे किसी भी ऐप की तरह खोलें — इंटरनेट के बिना भी।`,
    shot: () => phone(homeScreen()),
  },
];

// --- iPhone / iPad (Safari) ---------------------------------------------

function safariBar({ highlightShare = false } = {}) {
  return `
    <div class="snap-safari-bar">
      <div class="snap-url ios">${sym('lock', 'snap-lock')}<span>${APP_URL}</span></div>
      <div class="snap-safari-tools">
        ${sym('chevron_left', 'snap-dim')}${sym('chevron_right', 'snap-dim')}
        <span class="snap-tap ${highlightShare ? 'hl' : ''}">${sym('ios_share')}</span>
        ${sym('menu_book', 'snap-dim')}${sym('filter_none', 'snap-dim')}
      </div>
    </div>`;
}

const iosSteps = [
  {
    title: 'Safari में वेबसाइट खोलें',
    text: `अपने iPhone या iPad पर <b>Safari</b> में यह वेबसाइट खोलें। फिर नीचे <b>शेयर बटन</b> (ऊपर तीर वाला चौकोर ⬆︎) पर टैप करें।`,
    shot: () => phone(`${statusBar()}${pageBody()}${safariBar({ highlightShare: true })}`, { ios: true }),
  },
  {
    title: '“होम स्क्रीन में जोड़ें” चुनें',
    text: `शेयर मेनू को ऊपर की ओर स्क्रॉल करें और <b>“होम स्क्रीन में जोड़ें” (Add to Home Screen)</b> पर टैप करें।`,
    shot: () => phone(`
      ${statusBar()}${pageBody()}
      <div class="snap-scrim"></div>
      <div class="snap-sheet">
        <div class="snap-sheet-head"><img src="${APP_ICON}" alt="" /><div><b>${APP_NAME}</b><small>${APP_URL}</small></div></div>
        <div class="snap-sheet-group">
          <div class="snap-sheet-row"><span>कॉपी करें</span>${sym('content_copy')}</div>
          <div class="snap-sheet-row"><span>रीडिंग लिस्ट में जोड़ें</span>${sym('eyeglasses')}</div>
        </div>
        <div class="snap-sheet-group">
          <div class="snap-sheet-row"><span>बुकमार्क जोड़ें</span>${sym('menu_book')}</div>
          <div class="snap-sheet-row hl"><span>होम स्क्रीन में जोड़ें</span>${sym('add_box')}</div>
        </div>
      </div>`, { ios: true }),
  },
  {
    title: '“जोड़ें” दबाएं',
    text: `नाम <b>${APP_NAME}</b> पहले से भरा होगा। ऊपर दाईं ओर <b>“जोड़ें” (Add)</b> पर टैप करें।`,
    shot: () => phone(`
      ${statusBar()}
      <div class="snap-ios-add">
        <div class="snap-ios-add-nav"><span class="snap-link">रद्द करें</span><b>होम स्क्रीन में जोड़ें</b><span class="snap-link snap-tap hl">जोड़ें</span></div>
        <div class="snap-ios-add-card">
          <img src="${APP_ICON}" alt="" />
          <div><span class="snap-ios-input">${APP_NAME}</span><small>${APP_URL}</small></div>
        </div>
        <p class="snap-ios-note">आपकी होम स्क्रीन पर एक आइकन जोड़ा जाएगा ताकि आप इस वेबसाइट को जल्दी खोल सकें।</p>
      </div>`, { ios: true }),
  },
  {
    title: 'होम स्क्रीन से खोलें',
    text: `<b>${APP_NAME}</b> का आइकन अब होम स्क्रीन पर है। इसे टैप करके ऐप की तरह पूरी स्क्रीन पर खोलें।`,
    shot: () => phone(homeScreen({ ios: true }), { ios: true }),
  },
];

// --- Desktop (Chrome / Edge) --------------------------------------------

function desktopWindow(inner, { highlightInstall = false } = {}) {
  return `
    <div class="snap-desktop" aria-hidden="true">
      <div class="snap-desktop-tabs"><i></i><i></i><i></i><span class="snap-desktop-tab">${APP_NAME}</span></div>
      <div class="snap-desktop-bar">
        ${sym('arrow_back', 'snap-dim')}${sym('refresh', 'snap-dim')}
        <div class="snap-url wide">${sym('tune', 'snap-lock')}<span>${APP_URL}</span>
          <span class="snap-tap snap-url-install ${highlightInstall ? 'hl' : ''}">${sym('install_desktop')}</span>
        </div>
        ${sym('more_vert', 'snap-dim')}
      </div>
      <div class="snap-desktop-body">${inner}</div>
    </div>`;
}

const desktopSteps = [
  {
    title: 'Chrome या Edge में वेबसाइट खोलें',
    text: `कंप्यूटर पर <b>Google Chrome</b> या <b>Microsoft Edge</b> में यह वेबसाइट खोलें। एड्रेस बार के दाईं ओर <b>इंस्टॉल आइकन</b> ${icon('installDesktop')} पर क्लिक करें।`,
    shot: () => desktopWindow(pageBody(), { highlightInstall: true }),
  },
  {
    title: '“इंस्टॉल करें” पर क्लिक करें',
    text: `खुलने वाले छोटे बॉक्स में <b>“इंस्टॉल करें” (Install)</b> पर क्लिक करें। (आइकन न दिखे तो ⋮ मेनू → <b>“कास्ट, सेव और शेयर”</b> → <b>“पेज को ऐप के रूप में इंस्टॉल करें”</b> चुनें।)`,
    shot: () => desktopWindow(`${pageBody()}
      <div class="snap-dialog desk">
        <p class="snap-dialog-title">ऐप इंस्टॉल करें?</p>
        <div class="snap-dialog-app"><img src="${APP_ICON}" alt="" /><div><b>${APP_NAME}</b><small>${APP_URL}</small></div></div>
        <div class="snap-dialog-actions"><span class="snap-btn hl">इंस्टॉल करें</span><span>रद्द करें</span></div>
      </div>`),
  },
  {
    title: 'अलग विंडो में ऐप खुलेगा',
    text: `ऐप अपनी अलग विंडो में खुल जाएगा और डेस्कटॉप / स्टार्ट मेनू / डॉक में <b>${APP_NAME}</b> का शॉर्टकट बन जाएगा।`,
    shot: () => `
      <div class="snap-desktop app-window" aria-hidden="true">
        <div class="snap-desktop-appbar"><img src="${APP_ICON}" alt="" /><span>${APP_NAME}</span><span class="snap-win-ctrls">${sym('remove')}${sym('crop_square')}${sym('close')}</span></div>
        <div class="snap-desktop-body">${pageBody()}</div>
        <div class="snap-dock"><i></i><i></i><span class="snap-app-ic mine hl"><img src="${APP_ICON}" alt="" /></span><i></i></div>
      </div>`,
  },
];

const PLATFORMS = [
  { id: 'android', label: 'एंड्रॉइड', iconName: 'android', steps: androidSteps },
  { id: 'ios', label: 'iPhone', iconName: 'iphone', steps: iosSteps },
  { id: 'desktop', label: 'कंप्यूटर', iconName: 'computer', steps: desktopSteps },
];

function stepsHtml(steps) {
  return `<ol class="install-steps">${steps.map((step, i) => `
    <li class="install-step">
      <div class="install-step-shot">${step.shot()}</div>
      <div class="install-step-copy">
        <span class="install-step-num">चरण ${i + 1}</span>
        <h3 class="install-step-title">${step.title}</h3>
        <p class="install-step-text">${step.text}</p>
      </div>
    </li>`).join('')}</ol>`;
}

export async function render(container, params, ctx) {
  let current = detectPlatform();
  const installed = isInstalled();

  container.innerHTML = `
    <section class="install-page">
      <div class="install-hero">
        <img class="install-hero-icon" src="${APP_ICON}" alt="" />
        <h2 class="install-hero-title dn">${APP_NAME} ऐप अपने फ़ोन में जोड़ें</h2>
        <p class="install-hero-sub">प्ले स्टोर की ज़रूरत नहीं — इसे सीधे ब्राउज़र से होम स्क्रीन पर जोड़ें। एक बार जुड़ने के बाद यह ऐप की तरह पूरी स्क्रीन पर खुलेगा और इंटरनेट के बिना भी चलेगा।</p>
        ${installed
          ? `<p class="install-done">${icon('check')} यह ऐप पहले से इंस्टॉल है और आप इसे ऐप के रूप में ही चला रहे हैं।</p>`
          : `<button class="install-now" hidden>${icon('download')}<span>अभी इंस्टॉल करें</span></button>`}
      </div>
      <div class="install-tabs" role="tablist">
        ${PLATFORMS.map((p) => `<button role="tab" class="install-tab" data-platform="${p.id}">${icon(p.iconName)}<span>${p.label}</span></button>`).join('')}
      </div>
      <div class="install-panel"></div>
      <p class="install-footnote">सुझाव: अगर “ऐप इंस्टॉल करें” विकल्प न दिखे, तो ब्राउज़र अपडेट करें या पेज एक बार रीफ़्रेश करें। iPhone पर यह विकल्प केवल <b>Safari</b> में मिलता है।</p>
    </section>`;

  const panel = container.querySelector('.install-panel');
  const tabs = container.querySelectorAll('.install-tab');
  const showPlatform = (id) => {
    current = id;
    tabs.forEach((t) => {
      const on = t.dataset.platform === id;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panel.innerHTML = stepsHtml(PLATFORMS.find((p) => p.id === id).steps);
  };
  tabs.forEach((t) => t.addEventListener('click', () => showPlatform(t.dataset.platform)));
  showPlatform(current);

  const installBtn = container.querySelector('.install-now');
  let unsubscribe = null;
  if (installBtn) {
    const sync = () => { installBtn.hidden = !canPromptInstall(); };
    installBtn.addEventListener('click', () => promptInstall());
    unsubscribe = onInstallAvailabilityChange(sync);
    sync();
  }

  ctx.setHeader({ title: 'ऐप डाउनलोड करें' });
  return () => unsubscribe?.();
}
