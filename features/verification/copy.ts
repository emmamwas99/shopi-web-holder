import { BadgeCheck, FileCheck2, Headset, MapPin, Store, Wrench, type LucideIcon } from "lucide-react";
import type { ShopVerificationRequirement } from "./api";

/**
 * Every line a seller reads about verification, in one place: what they get,
 * what they need, and what it doesn't promise. Kept honest on purpose —
 * verification is about trust, not reach, and it's free for now.
 */

export const BENEFITS: { icon: LucideIcon | "tick"; title: string; body: string }[] = [
  {
    icon: "tick",
    title: "Blue tick on your profile",
    body: "Buyers see it next to your shop’s name everywhere on Shopi.",
  },
  {
    icon: BadgeCheck,
    title: "Verified ID on every listing",
    body: "A small badge on each item tells buyers you’ve been checked.",
  },
  {
    icon: Headset,
    title: "Faster support",
    body: "Your messages to the Shopi team go to the front of the queue.",
  },
  {
    icon: Wrench,
    title: "Priority when something breaks",
    body: "If a technical issue hits your listings, we fix yours first.",
  },
];

export const REQUIREMENTS: { key: ShopVerificationRequirement; icon: LucideIcon; title: string; body: string }[] = [
  {
    key: "PERMIT",
    icon: FileCheck2,
    title: "Business permit",
    body: "Your county single business permit — a clear photo or PDF.",
  },
  {
    key: "SHOP_PHOTO",
    icon: Store,
    title: "A photo of your shop",
    body: "Your storefront, stall or premises, taken by you.",
  },
  {
    key: "LOCATION",
    icon: MapPin,
    title: "Shop location",
    body: "Your area, plus a map pin or the building and street.",
  },
];

export const FINE_PRINT = {
  trust: "Verification is about trust. It doesn’t boost your listings or guarantee more views.",
  free: "Free for now. If that ever changes, we’ll tell you well before it affects you.",
};

export const STEP_COPY: Record<ShopVerificationRequirement, { title: string; hint: string }> = {
  BUSINESS_NAME: {
    title: "Business name",
    hint: "Exactly as it’s printed on your permit.",
  },
  PERMIT: {
    title: "Business permit",
    hint: "Your county single business permit. Make sure the business name, the dates and the county are easy to read.",
  },
  SHOP_PHOTO: {
    title: "Shop photo",
    hint: "Stand outside so your signboard or entrance is in the shot. Logos, product photos and pictures from the internet can’t be accepted.",
  },
  LOCATION: {
    title: "Shop location",
    hint: "Where buyers can find you. We check it against your permit and where you list from.",
  },
};

export const ORDER: ShopVerificationRequirement[] = ["BUSINESS_NAME", "PERMIT", "SHOP_PHOTO", "LOCATION"];
