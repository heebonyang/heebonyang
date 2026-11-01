// 명함과 같은 직업 표시: 탭 색으로 채운 알약 모양 (음악 = 호박색, 치과 = 하늘색)
export default function RolePill({ children, color }: { children: React.ReactNode; color: "amber" | "sky" }) {
  const bg = color === "amber" ? "bg-amber-700" : "bg-sky-700";
  return <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium text-white ${bg}`}>{children}</span>;
}
