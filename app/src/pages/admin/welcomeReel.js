// Renders the welcome carousel as a vertical (1080x1920) Reel entirely in
// the browser: draws each scene to a <canvas> frame-by-frame and captures it
// with MediaRecorder. No server, no new API key.
//
// Palette/type follow the brand's actual Instagram Slide Design System
// (see design.md): warm cream HAZY paper (#EFECE9), umber-brown ink
// (#5A3A28, never pure black), Fraunces serif headlines, Inter sans body,
// muted earthy accents. design.md's "no logo" rule is about never asking
// an AI model to paint one — compositing the real logo PNG afterward is
// explicitly fine, which is what every scene here does.
//
// The canvas is temporarily attached to the DOM (off-screen) while
// recording — captureStream() on a canvas that's never been part of the
// document can serve stale/blank frames in some browsers, which is almost
// certainly why an earlier version of this recorded solid black video.

import collabnbLogo from '../../assets/collabnb-logo.png';

const WIDTH = 1080;
const HEIGHT = 1920;
const INTRO_MS = 2200;
const TALLY_MS = 2200;
const CREATOR_MS = 2600;
const OUTRO_MS = 1800;
// Every scene boundary (intro→tally, creator→creator, last creator→outro)
// cross-dissolves the previous frame over the new scene's own entrance
// animation instead of hard-cutting — this is what makes the intro→first
// slide handoff (and every slide after it) read as "smooth" instead of
// snapping.
const CROSSFADE_MS = 500;

const CREAM = '#EFECE9';
const UMBER = '#5A3A28';
const UMBER_SOFT = '#7A5C47';
const SAGE = '#8A9471';
const OCHRE = '#B08552';
const DUSTY_BLUE = '#7D96A3';
const ACCENT_COLORS = [SAGE, OCHRE, DUSTY_BLUE];

const SERIF = '"Fraunces", serif';
const SANS = '"Inter", sans-serif';

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function accentFor(name) {
  const i = (name || '').charCodeAt(0) || 0;
  return ACCENT_COLORS[i % ACCENT_COLORS.length];
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtFollowers(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

// Module-scoped for the duration of one render — loaded once in
// buildWelcomeReel, read by every draw function below.
let logoImg = null;

function drawLogoMark(ctx, alpha = 1) {
  if (!logoImg) return;
  const size = 58;
  const x = 64, y = HEIGHT - 64 - size;
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  const s = Math.min(size / logoImg.width, size / logoImg.height);
  const w = logoImg.width * s, h = logoImg.height * s;
  ctx.drawImage(logoImg, x, y + (size - h) / 2, w, h);
  ctx.restore();
}

// The wash gradients are static (same geometry every frame) — building
// them once and reusing avoids re-triggering gradient math on every single
// frame of a ~10s recording, which was a plausible contributor to the
// reported stutter/glitchiness.
let bgGradients = null;
function getBackgroundGradients(ctx) {
  if (bgGradients) return bgGradients;
  const g1 = ctx.createRadialGradient(WIDTH * 0.2, HEIGHT * 0.1, 0, WIDTH * 0.2, HEIGHT * 0.1, WIDTH * 0.9);
  g1.addColorStop(0, 'rgba(176,133,82,0.05)');
  g1.addColorStop(1, 'rgba(176,133,82,0)');
  const g2 = ctx.createRadialGradient(WIDTH * 0.85, HEIGHT * 0.9, 0, WIDTH * 0.85, HEIGHT * 0.9, WIDTH);
  g2.addColorStop(0, 'rgba(138,148,113,0.06)');
  g2.addColorStop(1, 'rgba(138,148,113,0)');
  bgGradients = { g1, g2 };
  return bgGradients;
}

function drawBackground(ctx) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const { g1, g2 } = getBackgroundGradients(ctx);
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawIntro(ctx, t, { welcomeImg, weekLabel }) {
  drawBackground(ctx);
  const fade = Math.min(1, t / 0.4);
  const scale = 0.92 + 0.08 * easeOutCubic(Math.min(1, t / 0.5));
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(scale, scale);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);

  let textY = 860;
  if (welcomeImg) {
    const size = 760;
    const x = (WIDTH - size) / 2, y = 300;
    roundRectPath(ctx, x, y, size, size, 32);
    ctx.save();
    ctx.clip();
    const s = Math.max(size / welcomeImg.width, size / welcomeImg.height);
    const iw = welcomeImg.width * s, ih = welcomeImg.height * s;
    ctx.drawImage(welcomeImg, x + (size - iw) / 2, y + (size - ih) / 2, iw, ih);
    ctx.restore();
    textY = y + size + 110;
  }

  ctx.fillStyle = UMBER;
  ctx.textAlign = 'center';
  ctx.font = `700 90px ${SERIF}`;
  ctx.fillText('Welcome to Collabnb', WIDTH / 2, textY);
  ctx.font = `500 40px ${SANS}`;
  ctx.fillStyle = UMBER_SOFT;
  ctx.fillText(`Meet our newest creators — week of ${weekLabel}`, WIDTH / 2, textY + 66);
  ctx.restore();
  drawLogoMark(ctx, fade);
}

// "Tallying up the reach" — counts up to the combined follower total of
// every selected creator, framed as the pitch to a host: this is the
// audience a single collab post can reach.
function drawTally(ctx, t, { total }) {
  drawBackground(ctx);
  const fade = Math.min(1, t / 0.3);
  const countT = easeOutCubic(Math.min(1, t / 1.4));
  const shown = Math.round(total * countT);

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';
  ctx.fillStyle = UMBER_SOFT;
  ctx.font = `600 38px ${SANS}`;
  ctx.fillText('Combined reach this week', WIDTH / 2, 760);

  ctx.fillStyle = UMBER;
  ctx.font = `700 170px ${SERIF}`;
  ctx.fillText(shown.toLocaleString('en-US'), WIDTH / 2, 940);

  ctx.font = `500 36px ${SANS}`;
  ctx.fillStyle = UMBER_SOFT;
  ctx.fillText('followers across these creators', WIDTH / 2, 1000);
  ctx.restore();
  drawLogoMark(ctx, fade);
}

function drawCreator(ctx, t, { creator, img, index, total }) {
  drawBackground(ctx);
  const accent = accentFor(creator.full_name);

  const popT = Math.min(1, t / 0.45);
  const scale = 0.7 + 0.3 * easeOutBack(popT);
  const avatarAlpha = Math.min(1, t / 0.3);

  const size = 620;
  const cx = WIDTH / 2, cy = 560;

  ctx.save();
  ctx.globalAlpha = avatarAlpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const s = Math.max(size / img.width, size / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
    ctx.restore();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(239,236,233,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.font = `700 220px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((creator.full_name || '?')[0].toUpperCase(), cx, cy + 10);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  const textT = Math.max(0, Math.min(1, (t - 0.15) / 0.4));
  ctx.save();
  ctx.globalAlpha = textT;
  ctx.translate(0, (1 - easeOutCubic(textT)) * 40);

  ctx.textAlign = 'center';
  ctx.fillStyle = UMBER;
  ctx.font = `700 68px ${SERIF}`;
  ctx.fillText(creator.full_name, WIDTH / 2, 1020);

  const handle = creator.instagram_handle || creator.tiktok_handle;
  if (handle) {
    ctx.font = `500 44px ${SANS}`;
    ctx.fillStyle = UMBER_SOFT;
    ctx.fillText(`@${handle.replace(/^@/, '')}`, WIDTH / 2, 1086);
  }

  const followers = fmtFollowers(creator.followers);
  if (followers) {
    const label = `${followers} reach`;
    ctx.font = `700 40px ${SANS}`;
    const padX = 44, padY = 22;
    const w = ctx.measureText(label).width + padX * 2;
    const h = 40 + padY * 2;
    const px = WIDTH / 2 - w / 2, py = 1150;
    roundRectPath(ctx, px, py, w, h, h / 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, WIDTH / 2, py + h / 2 + 2);
    ctx.textBaseline = 'alphabetic';
  }

  if (creator.tier) {
    ctx.font = `600 34px ${SANS}`;
    ctx.fillStyle = UMBER_SOFT;
    ctx.fillText(creator.tier, WIDTH / 2, followers ? 1260 : 1180);
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(90,58,40,0.4)';
  ctx.font = `500 32px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${index + 1}/${total}`, WIDTH - 64, HEIGHT - 70);
  ctx.textAlign = 'left';
  drawLogoMark(ctx, avatarAlpha);
}

function drawOutro(ctx, t) {
  drawBackground(ctx);
  const fade = Math.min(1, t / 0.4);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';

  // Centered sign-off mark, larger than the corner watermark elsewhere.
  if (logoImg) {
    const size = 140;
    const s = Math.min(size / logoImg.width, size / logoImg.height);
    const w = logoImg.width * s, h = logoImg.height * s;
    ctx.drawImage(logoImg, WIDTH / 2 - w / 2, HEIGHT / 2 - 220 - h / 2, w, h);
  }

  ctx.fillStyle = UMBER;
  ctx.font = `700 82px ${SERIF}`;
  ctx.fillText('Follow along', WIDTH / 2, HEIGHT / 2 - 20);
  ctx.font = `500 44px ${SANS}`;
  ctx.fillStyle = UMBER_SOFT;
  ctx.fillText('collabnb.com', WIDTH / 2, HEIGHT / 2 + 50);
  ctx.restore();
}

// creators: [{ full_name, instagram_handle, tiktok_handle, tier, followers, avatar_url, screenshot_url }]
export async function buildWelcomeReel({ creators, welcomeImageUrl, weekLabel, onProgress }) {
  if (!creators || creators.length === 0) throw new Error('Pick at least one creator first.');
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    throw new Error('This browser can’t record video — try Chrome or Edge.');
  }
  bgGradients = null;

  // Force both faces to actually download/parse, not just "whatever's
  // already loaded" — document.fonts.ready alone only waits on fonts some
  // other element on the page has already triggered.
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load(`700 90px ${SERIF}`),
        document.fonts.load(`500 40px ${SANS}`),
      ]);
      await document.fonts.ready;
    } catch { /* non-fatal — falls back to a default serif/sans */ }
  }

  const totalFollowers = creators.reduce((sum, c) => sum + (c.followers || 0), 0);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  // Attach off-screen (not display:none, which some browsers also skip
  // compositing for) — this is what keeps captureStream() from handing
  // MediaRecorder stale/blank frames.
  canvas.style.position = 'fixed';
  canvas.style.left = '-99999px';
  canvas.style.top = '0';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  try {
    logoImg = await loadImage(collabnbLogo);
    const welcomeImg = await loadImage(welcomeImageUrl);
    const creatorImgs = await Promise.all(creators.map((c) => loadImage(c.screenshot_url || c.avatar_url)));

    const total = creators.length;
    const hasTally = totalFollowers > 0;
    const tallyMs = hasTally ? TALLY_MS : 0;
    const totalMs = INTRO_MS + tallyMs + total * CREATOR_MS + OUTRO_MS;

    // Resolves which scene is active at a given elapsed time, plus a stable
    // key so the main loop can tell when a scene boundary was just crossed
    // (that's the cue to snapshot the outgoing frame for the crossfade).
    function sceneAt(elapsed) {
      if (elapsed < INTRO_MS) {
        return { key: 'intro', localT: elapsed / 1000, draw: (c, t) => drawIntro(c, t, { welcomeImg, weekLabel }) };
      }
      if (hasTally && elapsed < INTRO_MS + tallyMs) {
        return { key: 'tally', localT: (elapsed - INTRO_MS) / 1000, draw: (c, t) => drawTally(c, t, { total: totalFollowers }) };
      }
      if (elapsed < INTRO_MS + tallyMs + total * CREATOR_MS) {
        const localMs = elapsed - INTRO_MS - tallyMs;
        const idx = Math.min(total - 1, Math.floor(localMs / CREATOR_MS));
        const localT = (localMs - idx * CREATOR_MS) / 1000;
        return { key: `creator-${idx}`, localT, draw: (c, t) => drawCreator(c, t, { creator: creators[idx], img: creatorImgs[idx], index: idx, total }) };
      }
      const localMs = elapsed - INTRO_MS - tallyMs - total * CREATOR_MS;
      return { key: 'outro', localT: localMs / 1000, draw: (c, t) => drawOutro(c, t) };
    }

    // Paint the first real frame before the recorder starts so frame 0
    // isn't blank.
    drawIntro(ctx, 0, { welcomeImg, weekLabel });

    const stream = canvas.captureStream(30);
    // webm first: Chrome's vp9/vp8 webm muxer is the long-established,
    // battle-tested path for MediaRecorder output. Its mp4/avc1 muxer is
    // newer and has shown real corruption on longer single-buffer
    // recordings (the ~2s freeze was one symptom of this); webm doesn't
    // have that failure mode.
    const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4'];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

    // No timeslice: Chrome's mp4 muxer only reliably plays back through
    // the first cleanly-closed fragment when you concatenate multiple
    // timesliced chunks — that's what produced a video that froze right
    // around the 10th 200ms chunk (~2s) instead of playing all the way
    // through. Buffering the whole recording and taking one blob at
    // stop() avoids that entirely.
    recorder.start();
    const startTime = performance.now();

    const snapshot = document.createElement('canvas');
    snapshot.width = WIDTH;
    snapshot.height = HEIGHT;
    const snapCtx = snapshot.getContext('2d');
    let activeKey = null;
    let sceneStartElapsed = 0;
    let hasSnapshot = false;

    await new Promise((resolve) => {
      function frame(now) {
        const elapsed = now - startTime;
        if (onProgress) onProgress(Math.min(1, elapsed / totalMs));
        if (elapsed >= totalMs) { resolve(); return; }

        const scene = sceneAt(elapsed);
        if (scene.key !== activeKey) {
          // Freeze whatever's currently on screen (the outgoing scene's
          // last-drawn frame) so it can be dissolved away over the new
          // scene instead of hard-cutting into it.
          hasSnapshot = activeKey !== null;
          if (hasSnapshot) {
            snapCtx.clearRect(0, 0, WIDTH, HEIGHT);
            snapCtx.drawImage(canvas, 0, 0);
          }
          activeKey = scene.key;
          sceneStartElapsed = elapsed;
        }
        scene.draw(ctx, scene.localT);

        const sinceSceneStart = elapsed - sceneStartElapsed;
        if (hasSnapshot && sinceSceneStart < CROSSFADE_MS) {
          ctx.save();
          ctx.globalAlpha = 1 - sinceSceneStart / CROSSFADE_MS;
          ctx.drawImage(snapshot, 0, 0);
          ctx.restore();
        }

        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });

    recorder.stop();
    await stopped;
    return { blob: new Blob(chunks, { type: mimeType }), mimeType };
  } finally {
    canvas.remove();
  }
}
