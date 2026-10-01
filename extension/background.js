const CRAWLER_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
// Any public https site is allowed (the admin page decides what to read), but never local-network addresses.
const isStore = url => url.protocol === "https:"
    && url.hostname.includes(".")
    && !/^[\d.]+$/.test(url.hostname)
    && !url.hostname.includes(":")
    && !/\.(local|localhost|internal|lan|home)$/i.test(url.hostname);
const registrableDomain = hostname => hostname.split(".").slice(-2).join(".");

// Requests change a shared header rule, so run them one at a time.
let queue = Promise.resolve();

// "tab" mode loads the page like a normal visit (Ajio blocks plain fetches) and reads the finished DOM.
async function readInTab(url) {
    const tab = await chrome.tabs.create({ url: url.href, active: false });
    try {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error("Page load timed out")); }, 30000);
            const listener = (tabId, info) => {
                if (tabId === tab.id && info.status === "complete") { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve(); }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
        // Gallery URLs are filled in shortly after load.
        await new Promise(resolve => setTimeout(resolve, 2500));
        const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => ({ url: location.href, html: document.documentElement.outerHTML }) });
        const finalUrl = new URL(result.url);
        if (!isStore(finalUrl)) return { ok: false, error: `Redirected to ${finalUrl.hostname}` };
        return { ok: true, status: 200, finalUrl: finalUrl.href, html: result.html };
    } catch (error) {
        return { ok: false, error: String(error && error.message || error) };
    } finally {
        chrome.tabs.remove(tab.id).catch(() => {});
    }
}

async function fetchPage(rawUrl, mode) {
    let url;
    try { url = new URL(rawUrl); } catch { return { ok: false, error: "Invalid URL" }; }
    if (!isStore(url)) return { ok: false, error: "Only public https pages are allowed" };
    if (mode === "tab") return readInTab(url);
    // "crawler" mode: Flipkart serves search-engine crawlers its full page even when it bot-checks browsers.
    if (mode === "crawler") {
        await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [1],
            addRules: [{
                id: 1, priority: 1,
                action: { type: "modifyHeaders", requestHeaders: [{ header: "User-Agent", operation: "set", value: CRAWLER_UA }] },
                condition: { requestDomains: [registrableDomain(url.hostname)], resourceTypes: ["xmlhttprequest"], tabIds: [-1] },
            }],
        });
    }
    try {
        const response = await fetch(url.href, { credentials: "include", cache: "no-store" });
        const finalUrl = new URL(response.url || url.href);
        if (!isStore(finalUrl)) return { ok: false, error: `Redirected to ${finalUrl.hostname}` };
        return { ok: response.ok, status: response.status, finalUrl: finalUrl.href, html: response.ok ? await response.text() : "" };
    } catch (error) {
        return { ok: false, error: String(error && error.message || error) };
    } finally {
        if (mode === "crawler") await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1] });
    }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    queue = queue.then(() => fetchPage(message.url, message.mode)).then(sendResponse, error => sendResponse({ ok: false, error: String(error) }));
    return true;
});
