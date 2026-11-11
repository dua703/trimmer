export function MappingScene() {
  const landmarks: Array<[number, number]> = [
    [160, 86],
    [118, 118],
    [202, 118],
    [96, 168],
    [224, 168],
    [108, 214],
    [212, 214],
    [128, 258],
    [192, 258],
    [160, 292],
    [132, 176],
    [188, 176],
    [160, 208],
    [144, 232],
    [176, 232],
  ];

  return (
    <svg viewBox="0 0 320 400" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="mapSkin" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#FFD8C8" />
          <stop offset="70%" stopColor="#E8A894" />
          <stop offset="100%" stopColor="#C97868" />
        </radialGradient>
        <linearGradient id="mapHair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5A2748" />
          <stop offset="100%" stopColor="#2C1224" />
        </linearGradient>
      </defs>

      <ellipse
        cx="160"
        cy="208"
        rx="118"
        ry="132"
        className="origin-center animate-glow-breathe"
        fill="#FFB59A"
        fillOpacity="0.18"
      />

      <path
        d="M78 168 C82 92, 118 58, 160 56 C202 58, 238 92, 242 168 C246 214, 228 268, 198 304 C180 322, 140 322, 122 304 C92 268, 74 214, 78 168 Z"
        fill="url(#mapSkin)"
      />
      <path
        d="M86 150 C92 72, 124 42, 160 40 C198 42, 230 74, 236 148 C218 88, 186 70, 160 72 C132 70, 102 92, 86 150 Z"
        fill="url(#mapHair)"
      />
      <ellipse cx="124" cy="176" rx="11" ry="7" fill="#3A1F33" />
      <ellipse cx="196" cy="176" rx="11" ry="7" fill="#3A1F33" />
      <path
        d="M160 186 L154 214 L166 214 Z"
        fill="#C97868"
        fillOpacity="0.55"
      />
      <path
        d="M142 236 C152 246, 168 246, 178 236"
        fill="none"
        stroke="#B24D5A"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M118 118 L160 86 L202 118 L224 168 L212 214 L192 258 L160 292 L128 258 L108 214 L96 168 Z"
        fill="none"
        stroke="#FFF6EF"
        strokeWidth="1.1"
        strokeOpacity="0.85"
        strokeDasharray="6 7"
        className="animate-mesh-dash"
      />
      <path
        d="M118 118 L160 208 L202 118 M96 168 L160 208 L224 168 M128 258 L160 208 L192 258 M132 176 L188 176"
        fill="none"
        stroke="#F0D5A8"
        strokeWidth="0.9"
        strokeOpacity="0.75"
      />

      {landmarks.map(([x, y], index) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="3"
          fill="#FFF6EF"
          className="origin-center"
        >
          <animate
            attributeName="opacity"
            values="0.35;1;0.35"
            dur={`${1.8 + (index % 4) * 0.2}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      <rect x="70" y="70" width="180" height="14" fill="#FFE0D4" fillOpacity="0.9">
        <animate
          attributeName="y"
          values="70;278;70"
          dur="2.6s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
}

export function ScanningScene() {
  return (
    <svg viewBox="0 0 320 400" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="scanFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC9B5" />
          <stop offset="100%" stopColor="#D48978" />
        </linearGradient>
        <linearGradient id="hudBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F0D5A8" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFE8C8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#F0D5A8" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect
        x="46"
        y="48"
        width="228"
        height="304"
        rx="28"
        fill="none"
        stroke="#F0D5A8"
        strokeWidth="1.4"
        strokeDasharray="8 10"
        className="animate-grid-shift"
      />
      <rect
        x="58"
        y="60"
        width="204"
        height="280"
        rx="22"
        fill="#4A2040"
        fillOpacity="0.28"
      />

      <g>
        <circle
          cx="160"
          cy="200"
          r="108"
          fill="none"
          stroke="#E8A0A8"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        <circle cx="160" cy="92" r="4" fill="#F0D5A8">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 160 200"
            to="360 160 200"
            dur="12s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      <path
        d="M108 128 C112 96, 132 86, 160 86 C188 86, 208 96, 212 128 C218 168, 206 214, 184 246 C172 262, 148 262, 136 246 C114 214, 102 168, 108 128 Z"
        fill="url(#scanFace)"
        fillOpacity="0.55"
        stroke="#FFE0D4"
        strokeWidth="1.2"
      />
      <path
        d="M128 156 C134 150, 144 150, 148 158"
        fill="none"
        stroke="#FFF6EF"
        strokeWidth="2"
      />
      <path
        d="M172 158 C176 150, 186 150, 192 156"
        fill="none"
        stroke="#FFF6EF"
        strokeWidth="2"
      />
      <path
        d="M148 210 C156 218, 164 218, 172 210"
        fill="none"
        stroke="#E07A6A"
        strokeWidth="2"
      />

      {[
        [92, 120],
        [228, 120],
        [80, 200],
        [240, 200],
        [108, 280],
        [212, 280],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="5" fill="#F0D5A8">
            <animate
              attributeName="r"
              values="4;7;4"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx={x}
            cy={y}
            r="12"
            fill="none"
            stroke="#FFE0D4"
            strokeOpacity="0.6"
          />
        </g>
      ))}

      <path
        d="M64 70 H92 M64 70 V98 M256 70 H228 M256 70 V98 M64 330 H92 M64 330 V302 M256 330 H228 M256 330 V302"
        stroke="#F0D5A8"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <rect x="58" y="60" width="18" height="280" fill="url(#hudBeam)">
        <animate
          attributeName="x"
          values="58;244;58"
          dur="2.2s"
          repeatCount="indefinite"
        />
      </rect>

      <text x="72" y="84" fill="#F0D5A8" fontSize="9" letterSpacing="1.5">
        LIVE SCAN
      </text>
      <text x="196" y="328" fill="#FFE0D4" fontSize="8">
        98.4% lock
      </text>
    </svg>
  );
}

export function AnalysisScene() {
  return (
    <svg viewBox="0 0 320 400" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="profileFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD0BE" />
          <stop offset="100%" stopColor="#C86B70" />
        </linearGradient>
      </defs>

      <circle
        cx="168"
        cy="188"
        r="120"
        fill="#E07A6A"
        fillOpacity="0.12"
        className="origin-center animate-glow-breathe"
      />

      <path
        d="M150 72 C198 76, 236 118, 238 168 C240 214, 226 250, 206 278 C190 300, 176 322, 168 348 L150 348 C142 300, 158 268, 148 236 C132 198, 118 176, 122 140 C126 104, 132 78, 150 72 Z"
        fill="url(#profileFill)"
      />
      <path
        d="M152 78 C186 70, 222 92, 232 128 C210 96, 176 88, 152 96 Z"
        fill="#3A1F33"
      />
      <path
        d="M214 168 C222 166, 228 172, 226 180"
        fill="none"
        stroke="#3A1F33"
        strokeWidth="2.2"
      />
      <path
        d="M206 214 C214 220, 220 218, 224 212"
        fill="none"
        stroke="#8A3040"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <g className="origin-[188px_140px] animate-heat-pulse">
        <circle cx="188" cy="140" r="28" fill="#E8A0A8" fillOpacity="0.45" />
      </g>
      <g className="origin-[214px_196px] animate-heat-pulse" style={{ animationDelay: "0.4s" }}>
        <circle cx="214" cy="196" r="22" fill="#E07A6A" fillOpacity="0.42" />
      </g>
      <g className="origin-[176px_248px] animate-heat-pulse" style={{ animationDelay: "0.8s" }}>
        <circle cx="176" cy="248" r="26" fill="#F0D5A8" fillOpacity="0.4" />
      </g>

      <circle
        cx="188"
        cy="140"
        fill="none"
        stroke="#FFF6EF"
        strokeWidth="1.2"
      >
        <animate
          attributeName="r"
          values="16;42"
          dur="2.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.8;0"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="214"
        cy="196"
        fill="none"
        stroke="#FFE0D4"
        strokeWidth="1.2"
      >
        <animate
          attributeName="r"
          values="12;36"
          dur="2.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.8;0"
          dur="2.8s"
          repeatCount="indefinite"
        />
      </circle>

      <text x="46" y="136" fill="#FFF6EF" fontSize="11">
        T-zone
      </text>
      <text x="46" y="200" fill="#FFD4C2" fontSize="11">
        Tone
      </text>
      <text x="46" y="256" fill="#F0D5A8" fontSize="11">
        Hydration
      </text>
      <path
        d="M92 132 L158 138 M92 196 L190 196 M92 252 L158 244"
        stroke="#FFE0D4"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
    </svg>
  );
}
