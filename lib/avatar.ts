/**
 * Deterministic fallback avatar styling — used when a user/post has no avatar
 * image. The gradient is picked from a fixed palette by the id's last hex digit,
 * so the same id always renders the same colour.
 */

const AVATAR_GRADIENTS = [
  "from-primary to-highlight",
  "from-violet-500 to-purple-600",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-rose-500",
  "from-sky-400 to-blue-600",
] as const;

/** Tailwind gradient classes (`from-… to-…`) for an id; use with `bg-linear-to-br`. */
export function avatarGradient(id: string): string {
  return AVATAR_GRADIENTS[
    parseInt(id.slice(-1), 16) % AVATAR_GRADIENTS.length
  ];
}

/** Two-character uppercase initials derived from the tail of an id. */
export function idInitials(id: string): string {
  return id.slice(-2).toUpperCase();
}
