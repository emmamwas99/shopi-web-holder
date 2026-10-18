import {
  Car,
  Headphones,
  Laptop,
  Refrigerator,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sparkles,
  Store,
  Tv,
  Watch,
  Wheat,
  type LucideIcon,
} from "lucide-react";

type Bubble = {
  icon: LucideIcon;
  /** Centre, as a percentage of the canvas width (x) and height (y). */
  x: number;
  y: number;
  /** Diameter, as a percentage of the canvas width. */
  size: number;
  tone: "primary" | "card" | "soft";
};

// Hand-placed on the 4:3 canvas so no two bubbles touch at any width.
const BUBBLES: Bubble[] = [
  { icon: Store, x: 50, y: 50, size: 20, tone: "primary" },
  { icon: Smartphone, x: 27, y: 30, size: 13, tone: "card" },
  { icon: Shirt, x: 73, y: 28, size: 12, tone: "card" },
  { icon: Sofa, x: 80, y: 60, size: 13, tone: "card" },
  { icon: Car, x: 62, y: 80, size: 11, tone: "card" },
  { icon: Sparkles, x: 34, y: 76, size: 12, tone: "card" },
  { icon: Laptop, x: 20, y: 56, size: 10, tone: "card" },
  { icon: Headphones, x: 10, y: 22, size: 7, tone: "soft" },
  { icon: Watch, x: 45, y: 16, size: 8, tone: "soft" },
  { icon: Tv, x: 90, y: 36, size: 7, tone: "soft" },
  { icon: Wheat, x: 93, y: 80, size: 8, tone: "soft" },
  { icon: Refrigerator, x: 12, y: 85, size: 7, tone: "soft" },
  { icon: ShoppingBag, x: 48, y: 92, size: 6, tone: "soft" },
];

const TONES: Record<Bubble["tone"], string> = {
  primary: "bg-primary text-white shadow-lg",
  card: "border border-landing-line bg-landing-card text-primary shadow-sm",
  soft: "bg-landing-card/70 text-landing-muted",
};

/**
 * The picture beside the seller count: one shop at the centre and the kinds
 * of things sellers list around it. Drawn rather than photographed, so it
 * never shows a real person or listing — the number beside it is the proof.
 * Everything scales with the canvas, so it holds from 360px up.
 */
export function SellersIllustration({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative aspect-4/3 overflow-hidden rounded-md bg-landing-tint ${className}`}
    >
      {[46, 82].map((diameter) => (
        <span
          key={diameter}
          className="absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-landing-line-strong/50"
          style={{ width: `${diameter}%` }}
        />
      ))}
      {BUBBLES.map(({ icon: Icon, x, y, size, tone }) => (
        <span
          key={`${x}-${y}`}
          className={`absolute flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${TONES[tone]}`}
          style={{ left: `${x}%`, top: `${y}%`, width: `${size}%` }}
        >
          <Icon className="size-[44%]" strokeWidth={1.8} />
        </span>
      ))}
    </div>
  );
}
