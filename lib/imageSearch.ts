import { useAuthStore } from "@/stores/auth";

export type ImageSearchSurface = "HOME" | "MARKET";

/** Resize before transport; the server embeds the image directly. */
export async function prepareSearchImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    throw new Error("Choose an image under 8 MB.");
  }
  // The browser's own decode errors ("The source image could not be
  // decoded.") mean nothing to a shopper; say what to do instead.
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Could not read that photo. Try another one.");
  });
  try {
    if (!bitmap.width || !bitmap.height) throw new Error("Could not read that image.");
    const canvas = document.createElement("canvas");
    for (const [side, quality] of [[512, 0.7], [384, 0.62], [320, 0.55]]) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare that image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= 256 * 1024 * 1.4) return dataUrl;
    }
    throw new Error("That image could not be made small enough. Try another photo.");
  } finally {
    bitmap.close();
  }
}

export type ImageSearchMatch = { id: string; title: string; slug?: string | null; imageUrl: string; price: number; currency: string; score: number };

export async function imageSearchQuery(imageDataUrl: string, surface: ImageSearchSurface): Promise<ImageSearchMatch[]> {
  const token = useAuthStore.getState().accessToken;
  let response: Response;
  let result: {
    data?: { searchByImage?: { matches?: ImageSearchMatch[]; unavailable?: boolean } };
    errors?: Array<{ message?: string }>;
  };
  try {
    response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/graphql`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: "mutation SearchByImage($imageDataUrl: String!, $surface: ImageSearchSurface!) { searchByImage(imageDataUrl: $imageDataUrl, surface: $surface) { matches { id title slug imageUrl price currency score } unavailable } }",
        variables: { imageDataUrl, surface },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    result = await response.json();
  } catch {
    // Offline, timed out, or a non-JSON error page.
    throw new Error("Couldn't reach Shopi. Check your connection and try again.");
  }
  if (!response.ok || result.errors?.length) {
    throw new Error(result.errors?.[0]?.message || "Image search is unavailable. Try again.");
  }
  if (result.data?.searchByImage?.unavailable) {
    throw new Error("Image search is temporarily unavailable. Try again later.");
  }
  return result.data?.searchByImage?.matches ?? [];
}
