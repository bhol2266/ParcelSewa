// Bridges the ParcelSewa admin page and the extension background worker.
window.addEventListener("message", event => {
    if (event.source !== window || !event.data) return;
    const { type, id } = event.data;
    if (type === "PARCELSEWA_PING") {
        window.postMessage({ type: "PARCELSEWA_PONG", id }, "*");
    } else if (type === "PARCELSEWA_FETCH_HTML") {
        chrome.runtime.sendMessage({ url: event.data.url, mode: event.data.mode }, result => {
            const error = chrome.runtime.lastError?.message;
            window.postMessage({ type: "PARCELSEWA_HTML_RESULT", id, ...(result || { ok: false, error: error || "No response" }) }, "*");
        });
    }
});
