type IconProps = { size?: number };

export function ArrowUpRightIcon({ size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="M3 13 13 3M5 3h8v8" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M13 8H3m0 0 4-4M3 8l4 4"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function ArrowUpIcon({ size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M8 13V3m0 0 4 4M8 3 4 7"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function ArrowDownIcon({ size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M8 3v10m0 0 4-4M8 13 4 9"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
    >
      <path
        d="M4 2.75c0-.414.336-.75.75-.75h6.5c.414 0 .75.336.75.75v10.5l-4-2.25-4 2.25V2.75Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
    >
      <circle
        cx="7.25"
        cy="7.25"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="m10.5 10.5 3.25 3.25" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExpandIcon({ size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M2.5 6.5V2.5h4M13.5 6.5V2.5h-4M2.5 9.5v4h4M13.5 9.5v4h-4"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function ShareIcon({ size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M6 9.5 10 12M10 4 6 6.5M10.5 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10.5 14a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        stroke="currentColor"
        strokeWidth="1.15"
      />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M3 5.5 8 10.5 13 5.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
