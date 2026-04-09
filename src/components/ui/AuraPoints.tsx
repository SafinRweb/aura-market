import Image from "next/image";
import auraCoinImg from "@/assets/aura-coin.png";

interface AuraPointsProps {
  size?: number;
  className?: string;
}

/**
 * Inline Aura Points icon — replaces the 🤫 emoji everywhere.
 * Usage: <AuraPoints /> or <AuraPoints size={24} />
 */
export default function AuraPoints({ size = 22, className = "" }: AuraPointsProps) {
  return (
    <Image
      src={auraCoinImg}
      alt="Aura"
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 -translate-y-[2px] ${className}`}
      style={{ imageRendering: "pixelated" }}
      unoptimized
    />
  );
}

interface AuraAmountProps {
  amount: number;
  size?: number;
  className?: string;
  prefix?: string;
}

/**
 * Displays an aura amount with the points icon inline.
 * Usage: <AuraAmount amount={100} /> → "100 🪙"
 */
export function AuraAmount({ amount, size = 22, className = "", prefix = "" }: AuraAmountProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{prefix}{amount.toLocaleString()}</span>
      <AuraPoints size={size} />
    </span>
  );
}
