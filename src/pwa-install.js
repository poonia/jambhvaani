// Captures Chrome/Edge's `beforeinstallprompt` as early as possible (the
// event fires once, usually right after load) so the install guide page
// can offer a one-tap "install" button instead of only the manual steps.
// Safari never fires it — iOS users always follow the manual steps.
let deferredPrompt = null;
const listeners = new Set();

function notify() { listeners.forEach((fn) => fn()); }

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notify();
});

export function canPromptInstall() {
  return !!deferredPrompt;
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === 'accepted';
}

export function onInstallAvailabilityChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function detectPlatform() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS ? 'ios' : 'desktop';
}
