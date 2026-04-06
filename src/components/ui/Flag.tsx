"use client";
import { useState } from "react";

// Subdivision flags that can't be auto-extracted from codepoints
const SUBDIVISION_FLAGS: Record<string, string> = {
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "gb-eng", // England
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "gb-sct", // Scotland
  "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "gb-wls", // Wales
};

/**
 * Converts a flag emoji (e.g. 🇲🇽) to an ISO 3166-1 alpha-2 code (e.g. "mx").
 * Regional indicator symbols sit at U+1F1E6 (🇦) → U+1F1FF (🇿).
 * Subtracting 0x1F1A5 maps them back to ASCII letters.
 */
function emojiToISO(emoji: string): string | null {
  // Check subdivision flags first (England, Scotland, Wales etc.)
  const sub = SUBDIVISION_FLAGS[emoji];
  if (sub) return sub;

  const codePoints = Array.from(emoji).map(c => c.codePointAt(0) ?? 0);
  if (
    codePoints.length >= 2 &&
    codePoints[0] >= 0x1f1e6 && codePoints[0] <= 0x1f1ff &&
    codePoints[1] >= 0x1f1e6 && codePoints[1] <= 0x1f1ff
  ) {
    const a = String.fromCharCode(codePoints[0] - 0x1f1a5);
    const b = String.fromCharCode(codePoints[1] - 0x1f1a5);
    return (a + b).toLowerCase();
  }
  return null;
}

interface FlagProps {
  /** Emoji string (🇲🇽), image URL, or empty */
  emoji: string | null | undefined;
  /** Width in px — height is auto-proportioned */
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Renders a country flag reliably on all platforms.
 * Prefers flagcdn.com images (works on Windows Chrome / mobile).
 * Falls back to the emoji span if the image fails to load.
 */
export default function Flag({ emoji, size = 32, className = "", alt = "" }: FlagProps) {
  const [imgError, setImgError] = useState(false);

  if (!emoji) return null;

  // Already a URL (e.g. from football API) — render directly
  if (emoji.startsWith("http")) {
    return (
      <img
        src={emoji}
        alt={alt}
        width={size}
        className={`object-cover inline-block ${className}`}
        style={{ height: Math.round(size * 0.67) }}
      />
    );
  }

  const iso = emojiToISO(emoji);

  // Use flagcdn.com CDN image
  if (iso && !imgError) {
    return (
      <img
        src={`https://flagcdn.com/w40/${iso}.png`}
        alt={alt}
        width={size}
        className={`inline-block ${className}`}
        style={{ height: Math.round(size * 0.67), objectFit: "cover" }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Ultimate fallback: emoji span with forced emoji font
  return (
    <span
      className={`emoji inline-block ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {emoji}
    </span>
  );
}
