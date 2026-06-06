"use client";

import { HALL_PLACEHOLDER } from "@/lib/hall-photos";

type HallPhotoProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
};

export function HallPhoto({ src, alt = "", className = "" }: HallPhotoProps) {
  const url = src?.trim() || HALL_PLACEHOLDER;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src.includes("hall-placeholder.svg")) return;
        img.src = HALL_PLACEHOLDER;
      }}
    />
  );
}
