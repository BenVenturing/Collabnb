// Renders the welcome carousel as a vertical (1080x1920) Reel entirely in
// the browser: draws each scene to a <canvas> frame-by-frame and captures it
// with MediaRecorder. No server, no new API key, no ffmpeg — Chrome/Edge can
// record canvas output directly to mp4 (falls back to webm on browsers that
// can't, e.g. Safari/Firefox, which only support webm/vp9 output here).

const WIDTH = 1080;
const HEIGHT = 1920;
const INTRO_MS = 2200;
const CREATOR_MS = 2600;
const OUTRO_MS = 1800;

const INK = '#192524';
const SLATE = '#3C5759';
const SAGE = '#646B62';

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  g.addColorStop(0, '#E6DCC8');
  g.addColorStop(0.55, '#F7F5F2');
  g.addColorStop(1, '#E8C9C3');
  ctx.fillStyle = g;
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
    roundRectPath(ctx, x, y, size, size, 48);
    ctx.save();
    ctx.clip();
    const s = Math.max(size / welcomeImg.width, size / welcomeImg.height);
    const iw = welcomeImg.width * s, ih = welcomeImg.height * s;
    ctx.drawImage(welcomeImg, x + (size - iw) / 2, y + (size - ih) / 2, iw, ih);
    ctx.restore();
    textY = y + size + 110;
  }

  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = '700 92px "Cabinet Grotesk", sans-serif';
  ctx.fillText('Welcome to Collabnb', WIDTH / 2, textY);
  ctx.font = '500 42px sans-serif';
  ctx.fillStyle = SLATE;
  ctx.fillText(`Meet our newest creators — week of ${weekLabel}`, WIDTH / 2, textY + 68);
  ctx.restore();
}

function drawCreator(ctx, t, { creator, img, index, total }) {
  drawBackground(ctx);

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
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#7B68C8';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 220px "Cabinet Grotesk", sans-serif';
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
  ctx.fillStyle = INK;
  ctx.font = '700 70px "Cabinet Grotesk", sans-serif';
  ctx.fillText(creator.full_name, WIDTH / 2, 1020);

  const handle = creator.instagram_handle || creator.tiktok_handle;
  if (handle) {
    ctx.font = '500 46px sans-serif';
    ctx.fillStyle = SLATE;
    ctx.fillText(`@${handle.replace(/^@/, '')}`, WIDTH / 2, 1088);
  }

  const followers = fmtFollowers(creator.followers);
  if (followers) {
    const label = `${followers} reach`;
    ctx.font = '700 42px sans-serif';
    const padX = 44, padY = 22;
    const w = ctx.measureText(label).width + padX * 2;
    const h = 42 + padY * 2;
    const px = WIDTH / 2 - w / 2, py = 1150;
    roundRectPath(ctx, px, py, w, h, h / 2);
    ctx.fillStyle = 'rgba(25,37,36,0.9)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, WIDTH / 2, py + h / 2 + 2);
    ctx.textBaseline = 'alphabetic';
  }

  if (creator.tier) {
    ctx.font = '600 36px sans-serif';
    ctx.fillStyle = SAGE;
    ctx.fillText(creator.tier, WIDTH / 2, followers ? 1260 : 1180);
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(25,37,36,0.45)';
  ctx.font = '600 34px "Cabinet Grotesk", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${index + 1}/${total}`, WIDTH - 60, HEIGHT - 70);
  ctx.textAlign = 'left';
  ctx.fillText('collabnb', 60, HEIGHT - 70);
}

function drawOutro(ctx, t) {
  drawBackground(ctx);
  const fade = Math.min(1, t / 0.4);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '700 84px "Cabinet Grotesk", sans-serif';
  ctx.fillText('Follow along', WIDTH / 2, HEIGHT / 2 - 20);
  ctx.font = '500 46px sans-serif';
  ctx.fillStyle = SLATE;
  ctx.fillText('collabnb.com', WIDTH / 2, HEIGHT / 2 + 50);
  ctx.restore();
}

// creators: [{ full_name, instagram_handle, tiktok_handle, tier, followers, avatar_url, screenshot_url }]
export async function buildWelcomeReel({ creators, welcomeImageUrl, weekLabel, onProgress }) {
  if (!creators || creators.length === 0) throw new Error('Pick at least one creator first.');
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    throw new Error('This browser can’t record video — try Chrome or Edge.');
  }

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* non-fatal */ }
  }

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  const welcomeImg = await loadImage(welcomeImageUrl);
  const creatorImgs = await Promise.all(creators.map((c) => loadImage(c.screenshot_url || c.avatar_url)));

  const total = creators.length;
  const totalMs = INTRO_MS + total * CREATOR_MS + OUTRO_MS;

  const stream = canvas.captureStream(30);
  const mimeCandidates = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

  recorder.start();
  const startTime = performance.now();

  await new Promise((resolve) => {
    function frame(now) {
      const elapsed = now - startTime;
      if (onProgress) onProgress(Math.min(1, elapsed / totalMs));
      if (elapsed >= totalMs) { resolve(); return; }

      if (elapsed < INTRO_MS) {
        drawIntro(ctx, elapsed / 1000, { welcomeImg, weekLabel });
      } else if (elapsed < INTRO_MS + total * CREATOR_MS) {
        const localMs = elapsed - INTRO_MS;
        const idx = Math.min(total - 1, Math.floor(localMs / CREATOR_MS));
        const localT = (localMs - idx * CREATOR_MS) / 1000;
        drawCreator(ctx, localT, { creator: creators[idx], img: creatorImgs[idx], index: idx, total });
      } else {
        const localMs = elapsed - INTRO_MS - total * CREATOR_MS;
        drawOutro(ctx, localMs / 1000);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  recorder.stop();
  await stopped;
  return { blob: new Blob(chunks, { type: mimeType }), mimeType };
}
