import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg" | "hero";
  showText?: boolean;
  className?: string;
  variant?: "light" | "dark";
  /** No shadow, ring, or rounded box around the image (e.g. home hero). */
  bare?: boolean;
};

const sizes = {
  sm: { box: 36, text: "text-sm" },
  md: { box: 44, text: "text-base" },
  lg: { box: 80, text: "text-xl" },
  hero: { box: 160, text: "text-3xl" },
};

export function BrandLogo({
  href,
  size = "md",
  showText = true,
  className = "",
  variant = "light",
  bare = false,
}: BrandLogoProps) {
  const { box, text } = sizes[size];
  const imgClass = bare
    ? "shrink-0"
    : "shrink-0 rounded-2xl shadow-lg ring-2 ring-white/10 dark:ring-slate-600/40";
  const textClass =
    variant === "dark"
      ? "font-bold tracking-tight text-white"
      : "font-bold tracking-tight text-brand-700 dark:text-sky-400";

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.svg"
        alt="Find Your Spot logo"
        width={box}
        height={box}
        className={imgClass}
      />
      {showText ? (
        <span className={`${textClass} ${text}`}>Find Your Spot</span>
      ) : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
