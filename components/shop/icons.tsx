type P = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const SearchIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const UserIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
);
export const BagIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const MenuIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
);
export const CloseIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
