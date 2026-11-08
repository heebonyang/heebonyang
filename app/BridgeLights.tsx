// 광안대교 불빛 띠: 0집 페이지(heebonmd.web.app) 다리 그림의 물에 비친 불빛을 가는 세로 점선으로.
// 매번 같은 모양이 되도록 고정된 순서로 만든 값
const LIGHT_COLORS = ["#6FB6FF", "#EEF2FA", "#A98BFF", "#F06BC8"];
const LIGHTS = Array.from({ length: 64 }, (_, i) => {
  const r = (n: number) => ((((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1);
  const zone = Math.floor(i / 8) % LIGHT_COLORS.length;
  return {
    color: r(1) < 0.25 ? "#EEF2FA" : LIGHT_COLORS[zone],
    height: 30 + Math.round(r(2) * 70),
    opacity: 0.25 + r(3) * 0.35,
  };
});

export default function BridgeLights({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start justify-between h-12 border-t border-[#6FB6FF]/50 ${className}`} aria-hidden>
      {LIGHTS.map((l, i) => (
        <span
          key={i}
          className="w-[2px]"
          style={{
            height: `${l.height}%`,
            opacity: l.opacity,
            backgroundImage: `repeating-linear-gradient(to bottom, ${l.color} 0 5px, transparent 5px 8px)`,
          }}
        />
      ))}
    </div>
  );
}
