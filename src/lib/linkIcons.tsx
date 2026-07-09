import type { SVGProps } from "react";

export const LINK_ICON_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "whatsapp",
  "linkedin",
  "star",
  "circle",
  "triangle",
  "heart",
] as const;

export type LinkIconKey = (typeof LINK_ICON_KEYS)[number];

export function isLinkIconKey(value: unknown): value is LinkIconKey {
  return typeof value === "string" && (LINK_ICON_KEYS as readonly string[]).includes(value);
}

type IconProps = SVGProps<SVGSVGElement>;

function Facebook(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14 9h2.5V6H14c-1.93 0-3.5 1.57-3.5 3.5V11H8.5v3H10.5v7h3v-7h2.4l.6-3H13.5V9.6c0-.44.36-.6.5-.6Z" />
    </svg>
  );
}

function Instagram(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="16.7" cy="7.3" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTok(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M15.5 3c.3 2.1 1.6 3.5 3.7 3.7v2.9c-1.4.1-2.6-.3-3.7-1.1v6.1c0 3-2.4 5.4-5.4 5.4S4.7 17.6 4.7 14.6c0-2.9 2.3-5.3 5.2-5.4v3c-1.3.1-2.3 1.1-2.3 2.4 0 1.3 1.1 2.4 2.4 2.4 1.3 0 2.4-1.1 2.4-2.4V3h3.1Z" />
    </svg>
  );
}

function YouTube(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" fill="none" stroke="currentColor" strokeWidth={1.8} />
      <path d="M10.5 9.5v5l4.3-2.5-4.3-2.5Z" />
    </svg>
  );
}

function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...props}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

function WhatsApp(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.5 20.5l4.4-1.2A8.4 8.4 0 1 0 12 3.5Zm0 1.8a6.6 6.6 0 0 1 5.7 10 6.6 6.6 0 0 1-9.7 2.6l-.3-.2-2.5.7.7-2.4-.2-.3A6.6 6.6 0 0 1 12 5.3Zm-2.6 3.3c-.2 0-.4 0-.5.3-.2.3-.7.7-.7 1.6 0 .9.7 1.8.8 1.9.1.2 1.4 2.2 3.5 3 2 .8 2 .5 2.4.5.4 0 1.3-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.2-.4-.3l-1.4-.7c-.2-.1-.3-.1-.5.1l-.5.7c-.1.1-.2.2-.4.1-.2-.1-.8-.3-1.5-1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4v-.4l-.6-1.5c-.2-.4-.3-.4-.5-.4h-.4Z" />
    </svg>
  );
}

function LinkedIn(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth={1.8} />
      <circle cx="7.7" cy="8.2" r="1.2" />
      <path d="M6.6 10.8h2.2v6.5H6.6v-6.5Zm4 0h2.1v.9c.4-.6 1.1-1.1 2.2-1.1 1.8 0 2.6 1.2 2.6 3v3.7h-2.2v-3.4c0-.9-.3-1.4-1.1-1.4-.8 0-1.3.6-1.3 1.5v3.3h-2.2v-6.5Z" />
    </svg>
  );
}

function Star(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3.5l2.7 5.6 6.1.7-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6-4.5-4.2 6.1-.7L12 3.5Z" />
    </svg>
  );
}

function Circle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}

function Triangle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 4 20.5 19.5h-17L12 4Z" />
    </svg>
  );
}

function Heart(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 20s-7.5-4.6-9.8-9.1C.9 7.9 2.4 4.8 5.5 4.2c1.9-.4 3.7.5 4.5 2.1.8-1.6 2.6-2.5 4.5-2.1 3.1.6 4.6 3.7 3.3 6.7C19.5 15.4 12 20 12 20Z" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<LinkIconKey, (props: IconProps) => React.JSX.Element> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: TikTok,
  youtube: YouTube,
  x: XIcon,
  whatsapp: WhatsApp,
  linkedin: LinkedIn,
  star: Star,
  circle: Circle,
  triangle: Triangle,
  heart: Heart,
};

export function LinkIconGlyph({
  icon,
  className,
}: {
  icon?: string | null;
  className?: string;
}) {
  if (!isLinkIconKey(icon)) return null;
  const Icon = ICON_COMPONENTS[icon];
  return <Icon className={className} />;
}
