import { useId, type SVGProps } from "react";

export const LINK_ICON_KEYS = [
  "facebook",
  "facebook_color",
  "instagram",
  "instagram_color",
  "tiktok",
  "tiktok_color",
  "youtube",
  "youtube_color",
  "x",
  "whatsapp",
  "whatsapp_color",
  "linkedin",
  "linkedin_color",
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

function FacebookColor(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        d="M14 9h2.5V6H14c-1.93 0-3.5 1.57-3.5 3.5V11H8.5v3H10.5v7h3v-7h2.4l.6-3H13.5V9.6c0-.44.36-.6.5-.6Z"
        fill="#fff"
      />
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

function InstagramColor(props: IconProps) {
  const id = useId();
  const gradientId = `ig-gradient-${id}`;
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="15%" stopColor="#fdf497" />
          <stop offset="42%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill={`url(#${gradientId})`} />
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="#fff" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth={1.8} />
      <circle cx="16.7" cy="7.3" r="1" fill="#fff" />
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

function TikTokColor(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M16.3 3.6c.4 2.5 1.9 4.1 4.4 4.4v3.1c-1.6.1-3-.3-4.4-1.2v6.4c0 3.3-2.7 6-6 6s-6-2.7-6-6c0-3.2 2.6-5.9 5.8-6v3.1c-1.4.1-2.5 1.3-2.5 2.7 0 1.5 1.2 2.7 2.7 2.7 1.5 0 2.7-1.2 2.7-2.7V3.6h3.3Z"
        fill="#FE2C55"
      />
      <path
        d="M15 3.1c.4 2.5 1.9 4.1 4.4 4.4v3.1c-1.6.1-3-.3-4.4-1.2v6.4c0 3.3-2.7 6-6 6s-6-2.7-6-6c0-3.2 2.6-5.9 5.8-6v3.1c-1.4.1-2.5 1.3-2.5 2.7 0 1.5 1.2 2.7 2.7 2.7 1.5 0 2.7-1.2 2.7-2.7V3.1H15Z"
        fill="#25F4EE"
      />
      <path
        d="M15.5 3.4c.4 2.5 1.9 4.1 4.4 4.4v3.1c-1.6.1-3-.3-4.4-1.2v6.4c0 3.3-2.7 6-6 6s-6-2.7-6-6c0-3.2 2.6-5.9 5.8-6v3.1c-1.4.1-2.5 1.3-2.5 2.7 0 1.5 1.2 2.7 2.7 2.7 1.5 0 2.7-1.2 2.7-2.7V3.4h3.3Z"
        fill="#000"
      />
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

function YouTubeColor(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" fill="#FF0000" />
      <path d="M10.5 9.5v5l4.3-2.5-4.3-2.5Z" fill="#fff" />
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

function WhatsAppColor(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        d="M12 5.5a6.6 6.6 0 0 0-5.7 10l-.8 2.9 3-.8a6.6 6.6 0 1 0 3.5-12.1Zm-2.6 3.3c-.2 0-.4 0-.5.3-.2.3-.7.7-.7 1.6 0 .9.7 1.8.8 1.9.1.2 1.4 2.2 3.5 3 2 .8 2 .5 2.4.5.4 0 1.3-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.2-.4-.3l-1.4-.7c-.2-.1-.3-.1-.5.1l-.5.7c-.1.1-.2.2-.4.1-.2-.1-.8-.3-1.5-1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4v-.4l-.6-1.5c-.2-.4-.3-.4-.5-.4h-.4Z"
        fill="#fff"
      />
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

function LinkedInColor(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#0A66C2" />
      <circle cx="7.7" cy="8.2" r="1.2" fill="#fff" />
      <path d="M6.6 10.8h2.2v6.5H6.6v-6.5Zm4 0h2.1v.9c.4-.6 1.1-1.1 2.2-1.1 1.8 0 2.6 1.2 2.6 3v3.7h-2.2v-3.4c0-.9-.3-1.4-1.1-1.4-.8 0-1.3.6-1.3 1.5v3.3h-2.2v-6.5Z" fill="#fff" />
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
      <path d="M12 21s-6.7-4.2-9.4-8.1C.8 10.1 1.6 6.6 4.6 5.3c2.1-.9 4.4-.2 5.7 1.5.4.5.7 1 .8 1.4.1-.4.4-.9.8-1.4 1.3-1.7 3.6-2.4 5.7-1.5 3 1.3 3.8 4.8 2 7.6C18.7 16.8 12 21 12 21Z" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<LinkIconKey, (props: IconProps) => React.JSX.Element> = {
  facebook: Facebook,
  facebook_color: FacebookColor,
  instagram: Instagram,
  instagram_color: InstagramColor,
  tiktok: TikTok,
  tiktok_color: TikTokColor,
  youtube: YouTube,
  youtube_color: YouTubeColor,
  x: XIcon,
  whatsapp: WhatsApp,
  whatsapp_color: WhatsAppColor,
  linkedin: LinkedIn,
  linkedin_color: LinkedInColor,
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
