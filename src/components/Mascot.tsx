/**
 * 마스코트 "생각이". 단순한 SVG라 나중에 일러스트로 바꾸기 쉽다.
 * mood에 따라 표정과 전구만 바뀐다.
 */
export type Mood = "think" | "happy" | "curious" | "sleepy";

export function Mascot({ mood = "think", size = 56, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const bulbOn = mood === "happy" || mood === "curious";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="생각이"
      className={className}
    >
      {/* 전구 */}
      <line x1="32" y1="14" x2="32" y2="6" stroke="#2b2a28" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="5" r="4.5" fill={bulbOn ? "#ffd166" : "#fffdf7"} stroke="#2b2a28" strokeWidth="2" />
      {bulbOn && (
        <g stroke="#f28c28" strokeWidth="2" strokeLinecap="round">
          <line x1="24" y1="3" x2="21" y2="1" />
          <line x1="40" y1="3" x2="43" y2="1" />
          <line x1="32" y1="-1" x2="32" y2="-1" />
        </g>
      )}
      {/* 얼굴 */}
      <ellipse cx="32" cy="38" rx="24" ry="22" fill="#ffd166" stroke="#2b2a28" strokeWidth="2.5" />
      {/* 볼 */}
      <circle cx="18" cy="43" r="4" fill="#f9a8b4" opacity="0.8" />
      <circle cx="46" cy="43" r="4" fill="#f9a8b4" opacity="0.8" />
      {/* 눈 */}
      {mood === "sleepy" ? (
        <g stroke="#2b2a28" strokeWidth="2.5" strokeLinecap="round">
          <path d="M20 36 q4 3 8 0" fill="none" />
          <path d="M36 36 q4 3 8 0" fill="none" />
        </g>
      ) : mood === "happy" ? (
        <g stroke="#2b2a28" strokeWidth="2.5" strokeLinecap="round">
          <path d="M20 37 q4 -4 8 0" fill="none" />
          <path d="M36 37 q4 -4 8 0" fill="none" />
        </g>
      ) : (
        <g>
          <circle cx="24" cy="36" r="3.2" fill="#2b2a28" />
          <circle cx="40" cy="36" r="3.2" fill="#2b2a28" />
          <circle cx="25" cy="35" r="1" fill="#fff" />
          <circle cx="41" cy="35" r="1" fill="#fff" />
        </g>
      )}
      {/* 입 */}
      {mood === "think" ? (
        <path d="M28 47 q4 -2 8 1" fill="none" stroke="#2b2a28" strokeWidth="2.5" strokeLinecap="round" />
      ) : mood === "curious" ? (
        <ellipse cx="32" cy="48" rx="3" ry="3.5" fill="#2b2a28" />
      ) : (
        <path d="M26 46 q6 6 12 0" fill="none" stroke="#2b2a28" strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** 마스코트 + 말풍선 */
export function MascotSays({ mood = "think", children }: { mood?: Mood; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Mascot mood={mood} size={52} className="bob shrink-0" />
      <div className="bubble paper min-w-0 flex-1 px-4 py-3 text-[15px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}
