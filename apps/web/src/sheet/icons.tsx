// Icons drawn in the world's grammar: single pencil-weight strokes, slightly
// unsteady lines, no filled shapes. One stroke width across the set.

type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function StrikeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M1.5 9.2 C 5 7.6, 10 9.8, 14.5 7.4" />
    </svg>
  );
}

export function UnstrikeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M1.5 9.2 C 5 7.6, 10 9.8, 14.5 7.4" />
      <path {...stroke} strokeWidth={1.25} d="M11.5 4.5 c 1.8 1.4, 2.4 3.6, 1.6 6" />
      <path {...stroke} strokeWidth={1.25} d="M13.4 8.6 l -0.3 2 -1.9 -0.5" />
    </svg>
  );
}

export function CrossIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M3.6 3.4 C 6.5 6.4, 9.5 9.6, 12.5 12.6" />
      <path {...stroke} d="M12.4 3.6 C 9.4 6.5, 6.4 9.5, 3.5 12.4" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M3 13 l 0.8 -3.2 7.4 -7.3 2.3 2.3 -7.3 7.4 z" />
      <path {...stroke} strokeWidth={1.1} d="M3.8 9.9 l 2.3 2.3" />
    </svg>
  );
}

export function TaskLineIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M2 8 h 12" />
      <path {...stroke} strokeWidth={1.1} d="M2 12 h 8" />
      <path {...stroke} strokeWidth={1.1} d="M2 4 h 10" />
    </svg>
  );
}

export function Heading1Icon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M2.5 3.5 v 9 M8.5 3.5 v 9 M2.5 8 h 6" />
      <path {...stroke} strokeWidth={1.25} d="M12 6.2 l 1.6 -1.2 v 7.5" />
    </svg>
  );
}

export function Heading2Icon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M2 3.5 v 9 M7.5 3.5 v 9 M2 8 h 5.5" />
      <path
        {...stroke}
        strokeWidth={1.25}
        d="M10.5 5.8 c 0.4 -1 2.6 -1.3 3 0.2 c 0.3 1.3 -2.6 3.6 -3 5.5 l 3.3 0"
      />
    </svg>
  );
}

export function ParagraphIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M12.5 3 H 6.8 a 3 3 0 0 0 0 6 H 9" />
      <path {...stroke} d="M9 3 v 10 M12 3 v 10" />
    </svg>
  );
}

export function DividerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path {...stroke} d="M2 8 C 6 7.5, 10 8.5, 14 8" />
      <path {...stroke} strokeWidth={1.1} d="M2 3.5 h 5 M9 3.5 h 5 M2 12.5 h 5 M9 12.5 h 5" opacity={0.45} />
    </svg>
  );
}

export function LampIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path {...stroke} d="M6 3.5 h 6 l 2.5 4 h -8 z" />
      <path {...stroke} d="M10.5 7.5 c 0 3 -3.5 3.5 -3.5 6" />
      <path {...stroke} d="M4 16.5 h 7" />
      <path {...stroke} strokeWidth={1.1} d="M9 11.5 l -1.2 2 M12 11 l 0.8 2.2" opacity={0.5} />
    </svg>
  );
}
