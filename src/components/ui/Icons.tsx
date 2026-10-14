import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" />
  </Svg>
);
export const BagIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 8h15l-1 13h-13z" />
    <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
  </Svg>
);
export const UserIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 21c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
  </Svg>
);
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}>
    <path
      d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"
      fill={filled ? "currentColor" : "none"}
      strokeLinejoin="round"
    />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Svg>
);
export const MenuIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 8h18M3 16h18" />
  </Svg>
);
export const PlusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const MinusIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const ChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="M15 4 7 12l8 8" />
  </Svg>
);
export const ChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="m9 4 8 8-8 8" />
  </Svg>
);
export const ExpandIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </Svg>
);
export const FilterIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 7h12M19 7h2M3 17h4M11 17h10" />
    <circle cx="17" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);
export const LockIcon = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const GlobeIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5s1.1-5.9 3.6-8.5z" />
  </Svg>
);
export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const MailIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" />
    <path d="M3.5 6.5 12 13l8.5-6.5" />
  </Svg>
);
export const ReturnIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 6.5 5 10.5l4 4" />
    <path d="M5 10.5h9.5a4.5 4.5 0 0 1 0 9H11" />
  </Svg>
);
