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
