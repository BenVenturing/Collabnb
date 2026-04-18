import { useEffect, useRef } from 'react';

const COLORS = [
  '#D1EBDB', '#959D90', '#192524', '#3C5759',
  '#D0D5CE', '#EFECE9', '#ffffff', '#a8c5b0',
];

export default function ConfettiCanvas({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const pieces = Array.from({ length: 200 }, () => ({
      x:        Math.random() * window.innerWidth,
      y:        (Math.random() * -window.innerHeight) - 20,
      size:     Math.random() * 9 + 4,
      speedY:   Math.random() * 3.5 + 1.5,
      speedX:   (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 7 - 3.5,
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      shape:    Math.random() > 0.4 ? 'rect' : 'circle',
      opacity:  Math.random() * 0.55 + 0.45,
      wobble:   Math.random() * 0.04,
      wobbleT:  Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach(p => {
        p.wobbleT += 0.04;
        p.x       += p.speedX + Math.sin(p.wobbleT) * p.wobble * 40;
        p.y       += p.speedY;
        p.rotation += p.rotSpeed;
        p.speedY = Math.max(0.4, p.speedY * 0.9985); // gravity decay

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle   = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ribbon-like rect
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.55);
        }
        ctx.restore();

        if (p.y > canvas.height + 30) {
          p.y      = -20;
          p.x      = Math.random() * canvas.width;
          p.speedY = Math.random() * 3.5 + 1.5;
        }
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  );
}
