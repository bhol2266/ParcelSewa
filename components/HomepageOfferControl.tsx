"use client";

import { useEffect, useState } from "react";
import { readHomepageOffer, saveHomepageOffer } from "@/lib/homepage-offer";

export default function HomepageOfferControl() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    readHomepageOffer(controller.signal).then(setVisible).catch(() => {
      if (!controller.signal.aborted) setError("Could not load the setting. Try again.");
    });
    return () => controller.abort();
  }, []);

  const retry = async () => {
    setError("");
    try { setVisible(await readHomepageOffer()); }
    catch { setError("Could not load the setting. Try again."); }
  };

  const toggle = async () => {
    if (visible === null || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveHomepageOffer(!visible);
      setVisible(saved);
      setMessage(saved ? "Offer ad is now shown on the homepage." : "Offer ad is now hidden from the homepage.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the setting. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <section className="mx-6 mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900" aria-labelledby="homepage-offer-control-title">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 id="homepage-offer-control-title" className="text-lg font-semibold text-gray-900 dark:text-white">Homepage offer ad</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Show the Dashain &amp; Tihar offer banner on the homepage.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{saving ? "Saving…" : visible === null ? "Loading…" : visible ? "Shown" : "Hidden"}</span>
          <button type="button" role="switch" aria-label="Show homepage offer ad" aria-checked={visible === true} disabled={visible === null || saving} onClick={toggle}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-50 ${visible ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"}`}>
            <span aria-hidden="true" className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${visible ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-green-700 dark:text-green-400" role="status">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}{visible === null && <button type="button" onClick={retry} className="ml-2 font-semibold underline">Try again</button>}</p>}
    </section>
  );
}
