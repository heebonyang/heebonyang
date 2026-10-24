// ── SNS 주소 ─────────────────────────────────────────────────────
// 여기만 바꾸면 상단 아이콘과 음악 탭 문의 버튼이 함께 바뀝니다.
export const SOCIAL = {
  instagram: "https://www.instagram.com/",
  youtube: "https://www.youtube.com/",
};
// ────────────────────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
      <path d="M10 9l5 3-5 3z" fill="white" />
    </svg>
  );
}

const LINKS = [
  { href: SOCIAL.instagram, label: "Instagram", Icon: InstagramIcon, hover: "hover:text-[#d62976]" },
  { href: SOCIAL.youtube, label: "YouTube", Icon: YouTubeIcon, hover: "hover:text-[#ff0000]" },
];

export default function SocialLinks() {
  return (
    <div className="flex items-center gap-1">
      {LINKS.map(({ href, label, Icon, hover }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${label}에서 보기`}
          title={label}
          className={`grid place-items-center w-9 h-9 rounded-full text-stone-700 hover:bg-white transition-colors ${hover}`}
        >
          <Icon />
        </a>
      ))}
    </div>
  );
}
