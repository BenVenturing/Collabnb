// Keyboard and screen-reader behavior shared by marketing dialogs.
export function createDialog(overlay, { initialFocus, returnFocus } = {}) {
  let opened = false;
  let previousFocus;
  let previousOverflow;
  let background = [];
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');
  overlay.tabIndex = -1;

  function focusable() {
    return [...overlay.querySelectorAll('a[href], button, input, select, textarea, video[controls], [tabindex]')]
      .filter((el) => !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden], [inert]')
        && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
  }

  function keydown(event) {
    if (event.key !== 'Tab') return;
    const items = focusable();
    const first = items[0] || overlay;
    const last = items.at(-1) || overlay;
    if (!items.length || !overlay.contains(document.activeElement)
      || (event.shiftKey && document.activeElement === first)
      || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  function containFocus(event) {
    if (!overlay.contains(event.target)) (focusable()[0] || overlay).focus();
  }

  return {
    open() {
      if (opened) return;
      opened = true;
      previousFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      overlay.removeAttribute('inert');
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      (initialFocus?.() || focusable()[0] || overlay).focus();
      // The Help panel is nested in a wrapper; inert siblings at every level.
      for (let node = overlay; node.parentElement; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling !== node && !sibling.hasAttribute('inert')) {
            background.push(sibling);
            sibling.setAttribute('inert', '');
          }
        }
        if (node.parentElement === document.body) break;
      }
      document.addEventListener('keydown', keydown);
      document.addEventListener('focusin', containFocus);
    },
    close() {
      if (!opened) return;
      opened = false;
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', containFocus);
      background.forEach((el) => el.removeAttribute('inert'));
      background = [];
      document.body.style.overflow = previousOverflow;
      overlay.classList.remove('open');
      const target = returnFocus?.() || previousFocus;
      if (target?.isConnected && !target.closest('[hidden], [inert]')) target.focus();
      overlay.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('inert', '');
    },
  };
}
