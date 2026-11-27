/**
 * Sitenin çizgi ikon seti — 24×24, 1.6 çizgi kalınlığı, renk currentColor.
 * Dekoratiftir (aria-hidden); anlamı her zaman yanındaki metin taşır.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconBuilding = (p: P) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M4.5 21V9.5L12 4l7.5 5.5V21" />
    <path d="M9 21v-6h6v6" />
    <path d="M8 11h.01M12 11h.01M16 11h.01" />
  </Svg>
);

export const IconReceipt = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="m9.5 13.5 5-5" />
    <circle cx="9.75" cy="8.75" r=".75" />
    <circle cx="14.25" cy="13.25" r=".75" />
  </Svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);

export const IconWarehouse = (p: P) => (
  <Svg {...p}>
    <path d="M3 9.5 12 4l9 5.5V21H3z" />
    <path d="M7 21v-8h10v8" />
    <path d="M7 16.5h10" />
  </Svg>
);

export const IconStore = (p: P) => (
  <Svg {...p}>
    <path d="M4 9h16l-1.2-4.2A1 1 0 0 0 17.8 4H6.2a1 1 0 0 0-1 .8z" />
    <path d="M4 9a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0A2.67 2.67 0 0 0 20 9" />
    <path d="M5.5 12v8.5h13V12" />
    <path d="M10 20.5v-4.5h4v4.5" />
  </Svg>
);

export const IconLanguage = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M7.5 9h5M10 9v.5c0 2.5-1.2 4.2-3 5" />
    <path d="M8.5 11.5c.8 1.4 2 2.4 3.5 3" />
    <path d="m13.5 16.5 2-5 2 5M14.2 15h2.6" />
  </Svg>
);

export const IconReturn = (p: P) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
);

export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);

export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);

export const IconScale = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v16M8 20h8" />
    <path d="M5 8h14" />
    <path d="m5 8-2.5 6a2.8 2.8 0 0 0 5 0z" />
    <path d="m19 8-2.5 6a2.8 2.8 0 0 0 5 0z" />
  </Svg>
);

export const IconSupport = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 13v-1a7.5 7.5 0 0 1 15 0v1" />
    <rect x="3.5" y="13" width="4" height="6" rx="1.5" />
    <rect x="16.5" y="13" width="4" height="6" rx="1.5" />
    <path d="M18.5 19c0 1.1-1.6 2-4 2H13" />
  </Svg>
);

export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);

export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);

/* ---- Panel ikonları ---- */
export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Svg>
);
export const IconFolder = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
  </Svg>
);
export const IconBox = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </Svg>
);
export const IconCart = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 4.5h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.6a1.5 1.5 0 0 0 1.5-1.1l1.4-6.3H6.6" />
    <circle cx="9.5" cy="19.5" r="1.2" />
    <circle cx="17" cy="19.5" r="1.2" />
  </Svg>
);
export const IconPlug = (p: P) => (
  <Svg {...p}>
    <path d="M9 3.5v4M15 3.5v4M6.5 7.5h11v3a5.5 5.5 0 0 1-11 0z" />
    <path d="M12 16v4.5" />
  </Svg>
);
export const IconChecklist = (p: P) => (
  <Svg {...p}>
    <path d="m4 7 1.5 1.5L8.5 5.5M4 13l1.5 1.5 3-3M4 19l1.5 1.5 3-3" />
    <path d="M12 7h8M12 13h8M12 19h8" />
  </Svg>
);
export const IconLifebuoy = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="m6 6 3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" />
  </Svg>
);
export const IconCard = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3 10h18M7 15h3" />
  </Svg>
);
export const IconSettings = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);
export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Svg>
);
export const IconUsers = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.5a6 6 0 0 1 3 5.5" />
  </Svg>
);
export const IconFile = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4M9 12h6M9 16h6" />
  </Svg>
);
export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16v-4M12 16V8M16 16v-6" />
  </Svg>
);
export const IconTruck = (p: P) => (
  <Svg {...p}>
    <path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17.5" cy="17.5" r="1.8" />
  </Svg>
);
export const IconInbox = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 13.5 6 5h12l2.5 8.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
    <path d="M3.5 13.5h5l1 2h5l1-2h5" />
  </Svg>
);
export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M14 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);
export const IconMessage = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z" />
  </Svg>
);
