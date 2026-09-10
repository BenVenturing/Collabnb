// Captures the browser's beforeinstallprompt event as early as possible (module load,
// before any component mounts) so the install button works no matter which page a user
// lands on first — the event only fires once and isn't replayable.
let deferredPrompt = null;
let isInstalled = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isInstalled = true;
    notify();
  });
}

export function getInstallState() {
  return { canInstall: !!deferredPrompt, isInstalled };
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferredPrompt) return null;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return choice;
}
