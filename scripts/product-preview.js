/* ============================================================
   Collabnb — About page product preview (MacBook mockup + modal)
   ============================================================ */

const VIEW_LABELS = { host: 'Host view', creator: 'Creator view' };

export function initProductPreview() {
  const mockup = document.querySelector('.mac-mockup');
  const overlay = document.querySelector('#preview-modal-overlay');
  if (!mockup || !overlay) return;

  const videos = {
    host: mockup.dataset.videoHost,
    creator: mockup.dataset.videoCreator,
  };

  const closeBtn = document.querySelector('#preview-modal-close');
  const modalCard = overlay.querySelector('.preview-modal-card');
  const choiceEl = overlay.querySelector('[data-preview-choice]');
  const playerEl = overlay.querySelector('[data-preview-player]');
  const playerVideo = document.querySelector('#preview-player-video');
  const playerAudio = document.querySelector('#preview-player-audio');
  const tabs = overlay.querySelectorAll('.preview-tab');
  if (playerAudio) playerAudio.volume = 0.35;

  function openModal() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    playerVideo.pause();
    playerVideo.removeAttribute('src');
    if (playerAudio) { playerAudio.pause(); playerAudio.currentTime = 0; }
    choiceEl.hidden = false;
    playerEl.hidden = true;
    if (modalCard) modalCard.classList.remove('is-player');
    tabs.forEach((t) => t.classList.remove('active'));
  }

  function selectView(view) {
    const src = videos[view];
    if (!src) return;
    playerVideo.src = src;
    playerVideo.play().catch(() => {});
    if (playerAudio) {
      playerAudio.currentTime = 0;
      playerAudio.play().catch(() => {});
    }
    choiceEl.hidden = true;
    playerEl.hidden = false;
    if (modalCard) modalCard.classList.add('is-player');
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.previewSelect === view));
  }

  document.querySelectorAll('[data-preview-open]').forEach((btn) => {
    btn.addEventListener('click', openModal);
  });

  overlay.querySelectorAll('[data-preview-select]').forEach((btn) => {
    btn.addEventListener('click', () => selectView(btn.dataset.previewSelect));
  });

  playerVideo.addEventListener('ended', () => {
    if (playerAudio) { playerAudio.pause(); playerAudio.currentTime = 0; }
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
  const captionEl = mockup.querySelector('[data-mac-caption]');
  const order = ['host', 'creator'];
  let orderIndex = 0;

  function playNextLoop() {
    const view = order[orderIndex % order.length];
    orderIndex += 1;
    const src = videos[view];
    if (!src) return;
    loopVideo.src = src;
    if (captionEl) captionEl.textContent = VIEW_LABELS[view];
    loopVideo.play().catch(() => {});
  }

  if (loopVideo) {
    loopVideo.addEventListener('ended', playNextLoop);
    playNextLoop();
  }
}
