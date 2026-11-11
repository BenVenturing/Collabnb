/* ============================================================
   Collabnb — About page product preview (MacBook mockup + modal)
   ============================================================ */

import { createDialog } from './dialog.js';

const VIEW_LABELS = { host: 'Host view', creator: 'Creator view' };

export function initProductPreview() {
  const mockup = document.querySelector('.mac-mockup');
  const overlay = document.querySelector('#preview-modal-overlay');
  if (!mockup || !overlay) return;

  const videos = {
    host: mockup.dataset.videoHost,
    creator: mockup.dataset.videoCreator,
  };
  // Small silent 720px encodes for the ambient mockup loop — the full walkthroughs
  // are ~150MB 2.7K files and stalled scrolling while they streamed and decoded.
  const loops = {
    host: mockup.dataset.loopHost || videos.host,
    creator: mockup.dataset.loopCreator || videos.creator,
  };
  const audioTracks = {
    host: mockup.dataset.audioHost,
    creator: mockup.dataset.audioCreator,
  };

  const closeBtn = document.querySelector('#preview-modal-close');
  const modalCard = overlay.querySelector('.preview-modal-card');
  const choiceEl = overlay.querySelector('[data-preview-choice]');
  const playerEl = overlay.querySelector('[data-preview-player]');
  const playerVideo = document.querySelector('#preview-player-video');
  const playerAudio = document.querySelector('#preview-player-audio');
  const tabs = overlay.querySelectorAll('.preview-tab');
  const dialog = createDialog(overlay);
  if (playerAudio) playerAudio.volume = 0.28;

  function openModal() {
    dialog.open();
    updateLoop();
  }

  function closeModal() {
    dialog.close();
    playerVideo.pause();
    playerVideo.removeAttribute('src');
    if (playerAudio) { playerAudio.pause(); playerAudio.currentTime = 0; }
    choiceEl.hidden = false;
    playerEl.hidden = true;
    if (modalCard) modalCard.classList.remove('is-player');
    tabs.forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-pressed', 'false');
    });
    updateLoop();
  }

  function selectView(view) {
    const src = videos[view];
    if (!src) return;
    playerVideo.src = src;
    playerVideo.play().catch(() => {});
    if (playerAudio && audioTracks[view]) {
      playerAudio.src = audioTracks[view];
      playerAudio.currentTime = 0;
      playerAudio.play().catch(() => {});
    }
    choiceEl.hidden = true;
    playerEl.hidden = false;
    if (modalCard) modalCard.classList.add('is-player');
    tabs.forEach((t) => {
      t.classList.toggle('active', t.dataset.previewSelect === view);
      t.setAttribute('aria-pressed', String(t.dataset.previewSelect === view));
    });
    overlay.querySelector(`.preview-tab[data-preview-select="${view}"]`)?.focus();
  }

  // Video unreachable (e.g. host outage) — bounce back to the choice screen
  // instead of leaving a blank player stuck open.
  playerVideo.addEventListener('error', () => {
    if (playerEl.hidden) return; // not mid-playback, ignore
    if (playerAudio) { playerAudio.pause(); playerAudio.currentTime = 0; }
    choiceEl.hidden = false;
    playerEl.hidden = true;
    if (modalCard) modalCard.classList.remove('is-player');
    tabs.forEach((t) => t.classList.remove('active'));
    tabs.forEach((t) => t.setAttribute('aria-pressed', 'false'));
    choiceEl.querySelector('button')?.focus();
  });

  document.querySelectorAll('[data-preview-open]').forEach((btn) => {
    btn.addEventListener('click', openModal);
  });

  overlay.querySelectorAll('[data-preview-select]').forEach((btn) => {
    btn.addEventListener('click', () => selectView(btn.dataset.previewSelect));
  });

  playerVideo.addEventListener('ended', () => {
    if (playerAudio) { playerAudio.pause(); playerAudio.currentTime = 0; }
  });
  playerVideo.addEventListener('pause', () => playerAudio?.pause());
  playerVideo.addEventListener('play', () => {
    if (playerAudio?.getAttribute('src')) playerAudio.play().catch(() => {});
  });
  playerVideo.addEventListener('volumechange', () => {
    if (playerAudio) {
      playerAudio.muted = playerVideo.muted;
      playerAudio.volume = playerVideo.volume * 0.28;
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  /* Ambient loop on the mockup screen: alternate host/creator clips,
     since <video loop> never fires 'ended' so it couldn't switch sources. */
  const loopVideo = mockup.querySelector('.mac-screen-video');
  const floating = document.querySelector('[data-floating-preview]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 768px)');
  const captionEl = mockup.querySelector('[data-mac-caption]');
  const order = ['host', 'creator'];
  let orderIndex = 0;
  let loopStarted = false;
  let loopBroken = false;
  let intersects = false;

  function canPlayLoop() {
    return intersects && !loopBroken && !reducedMotion.matches && !document.hidden
      && !overlay.classList.contains('open')
      && (!floating || (floating.classList.contains('visible') && !mobile.matches));
  }

  function playNextLoop() {
    if (!canPlayLoop()) return;
    const view = order[orderIndex % order.length];
    orderIndex += 1;
    const src = loops[view];
    if (!src) return;
    loopVideo.src = src;
    if (captionEl) captionEl.textContent = VIEW_LABELS[view];
    loopVideo.play().catch(() => {});
  }

  function updateLoop() {
    if (!loopVideo) return;
    if (!canPlayLoop()) {
      loopVideo.pause();
    } else if (!loopStarted) {
      loopStarted = true;
      playNextLoop();
    } else if (loopVideo.ended) {
      playNextLoop();
    } else if (loopVideo.paused) {
      loopVideo.play().catch(() => {});
    }
  }

  if (loopVideo) {
    loopVideo.autoplay = false;
    loopVideo.preload = 'none';
    loopVideo.addEventListener('ended', playNextLoop);

    // Video unreachable — stop retrying on every scroll intersection
    // (that retry-on-scroll loop is what made the mockup feel glitchy)
    // and just hide the screen instead of showing a stuck/blank video.
    loopVideo.addEventListener('error', () => {
      loopBroken = true;
      mockup.classList.add('mac-screen-unavailable');
    });

    // Gate streaming on actual visibility — this used to autoplay on every
    // page load (even while hidden at opacity:0 pre-scroll), which is what
    // was burning through the Blob data-transfer cap.
    const loopObserver = new IntersectionObserver((entries) => {
      intersects = entries[0].isIntersecting;
      updateLoop();
    }, { threshold: 0.25 });
    loopObserver.observe(mockup);
    reducedMotion.addEventListener('change', updateLoop);
    document.addEventListener('visibilitychange', updateLoop);
  }

  /* Floating preview bubble (home hero) — shows after the hero scrolls by,
     dismissible for the rest of the session so closing it sticks. */
  if (floating) {
    const dismissBtn = floating.querySelector('[data-floating-dismiss]');
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('collabnb_preview_dismissed') === '1'; } catch { /* Storage can be disabled. */ }

    function updateFloating() {
      const visible = !dismissed && !mobile.matches && window.scrollY > window.innerHeight * 0.6;
      if (!visible && floating.contains(document.activeElement)) {
        document.querySelector('#hero-cta-primary')?.focus({ preventScroll: true });
      }
      floating.classList.toggle('visible', visible);
      floating.setAttribute('aria-hidden', String(!visible));
      floating.toggleAttribute('inert', !visible);
      updateLoop();
    }
    updateFloating();
    window.addEventListener('scroll', updateFloating, { passive: true });
    window.addEventListener('resize', updateFloating);
    mobile.addEventListener('change', updateFloating);

    if (dismissBtn) {
      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissed = true;
        updateFloating();
        floating.classList.add('dismissed');
        try { sessionStorage.setItem('collabnb_preview_dismissed', '1'); } catch { /* Keep dismissed in memory. */ }
      });
    }
  }
}
