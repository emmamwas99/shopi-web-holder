import type { LucideIcon } from "lucide-react";
import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Car,
  Carrot,
  Dumbbell,
  Hammer,
  PawPrint,
  Shapes,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  Ticket,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";

/**
 * One icon per category, shared by every list of categories — the shortcuts on
 * Explore and the desktop nav's category menu — so a category looks the same
 * wherever it appears. Icons rather than the category's cover photo: covers are
 * picked from listings (the API's backfill-category-image-covers script), which
 * makes a shortcut only as clear as whatever was posted — a blurred video frame
 * for Electronics, a course poster for Services.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "electronics-technology": Smartphone,
  "fashion-apparel": Shirt,
  "health-beauty": Sparkles,
  "home-living": Sofa,
  "agriculture-fresh-produce": Carrot,
  "food-beverages": UtensilsCrossed,
  automotive: Car,
  "property-rentals": Building2,
  services: Wrench,
  "events-tickets": Ticket,
  "jobs-gigs": BriefcaseBusiness,
  "sports-outdoors": Dumbbell,
  "baby-kids": Baby,
  "pets-animals": PawPrint,
  "industrial-tools": Hammer,
  "books-media-hobbies": BookOpen,
  other: Shapes,
};

/** A category's icon; a plain tag for a category added after this list. */
export function CategoryGlyph({
  slug,
  className,
  strokeWidth = 1.75,
}: {
  slug: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Tag;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
