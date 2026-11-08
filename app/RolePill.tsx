// 명함과 같은 직업 표시: 탭 색으로 채운 알약 모양 (음악 = 붉은 빛, 치과 = 푸른 빛)
export default function RolePill({ children, color }: { children: React.ReactNode; color: "amber" | "sky" }) {
  const bg = color === "amber" ? "bg-brand-red" : "bg-brand-blue";
  return <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium text-stone-50 ${bg}`}>{children}</span>;
}
