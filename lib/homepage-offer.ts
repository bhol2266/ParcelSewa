export async function readHomepageOffer(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch("/api/homepage-offer", { cache: "no-store", signal });
  const data: unknown = await response.json();
  if (!response.ok || !data || typeof data !== "object" || !("homepageOfferVisible" in data) || typeof data.homepageOfferVisible !== "boolean") {
    throw new Error("Could not load the homepage offer setting.");
  }
  return data.homepageOfferVisible;
}

export async function saveHomepageOffer(homepageOfferVisible: boolean): Promise<boolean> {
  const response = await fetch("/api/homepage-offer", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homepageOfferVisible }),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Could not save the setting. Please try again.";
    throw new Error(message);
  }
  if (!data || typeof data !== "object" || !("homepageOfferVisible" in data) || typeof data.homepageOfferVisible !== "boolean") {
    throw new Error("Could not confirm the saved setting. Please refresh and try again.");
  }
  return data.homepageOfferVisible;
}
