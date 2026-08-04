const CONFETTI_COLORS = [
  "#FF3B30","#FF9500","#FFCC00","#34C759","#30D158",
  "#00C7BE","#32ADE6","#007AFF","#5856D6","#AF52DE",
  "#FF2D55","#FF6B35","#FFD60A","#30DB5B","#40CBE0",
  "#BF5AF2","#FF375F","#FF8C00","#ACE608","#0A84FF",
];

const PARTICLES = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  size: 6 + Math.random() * 8,
  isRect: Math.random() > 0.4,
  duration: 2.8 + Math.random() * 1.6,
  delay: Math.random() * 0.9,
  spin: 360 + Math.floor(Math.random() * 4) * 180,
  drift: (Math.random() - 0.5) * 120,
}));

export default function Confetti({ show }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      {PARTICLES.map((p) => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.left}%`,
          top: "-16px",
          width: p.isRect ? p.size * 0.55 : p.size,
          height: p.size,
          borderRadius: p.isRect ? "2px" : "50%",
          background: p.color,
          animation: `confettiFall${p.id % 3} ${p.duration}s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}s forwards`,
          transformOrigin: "center center",
          opacity: 1,
          boxShadow: `0 0 2px ${p.color}66`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall0 { 0%{transform:translateY(0) rotate(0deg) translateX(0);opacity:1} 80%{opacity:1} 100%{transform:translateY(105vh) rotate(${PARTICLES[0]?.spin ?? 720}deg) translateX(40px);opacity:0} }
        @keyframes confettiFall1 { 0%{transform:translateY(0) rotate(20deg) translateX(0);opacity:1} 80%{opacity:1} 100%{transform:translateY(105vh) rotate(-${PARTICLES[1]?.spin ?? 540}deg) translateX(-60px);opacity:0} }
        @keyframes confettiFall2 { 0%{transform:translateY(0) rotate(-15deg) translateX(0);opacity:1} 80%{opacity:1} 100%{transform:translateY(105vh) rotate(${PARTICLES[2]?.spin ?? 900}deg) translateX(20px);opacity:0} }
      `}</style>
    </div>
  );
}
