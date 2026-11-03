"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Cookies from "js-cookie";
import toast, { Toaster } from "react-hot-toast";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/admin-access";
import { PRODUCT_IMAGE_ACCEPT, pastedImages, uploadProductImages } from "@/lib/upload-product-image";

type Upload = { url: string; at: number };

// Recent links are a per-browser convenience, so storage failures are ignored.
const HISTORY_KEY = "parcelsewa_uploaded_images";
const HISTORY_LIMIT = 40;

// Kept in memory too, so the list still works when the browser blocks storage.
let memoryHistory = "[]";
const historyListeners = new Set<() => void>();

function historySnapshot(): string {
    try {
        return localStorage.getItem(HISTORY_KEY) ?? memoryHistory;
    } catch {
        return memoryHistory;
    }
}

function subscribeHistory(onChange: () => void) {
    historyListeners.add(onChange);
    window.addEventListener("storage", onChange);
    return () => {
        historyListeners.delete(onChange);
        window.removeEventListener("storage", onChange);
    };
}

function parseHistory(raw: string): Upload[] {
    try {
        const saved = JSON.parse(raw);
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function writeHistory(items: Upload[]) {
    memoryHistory = JSON.stringify(items.slice(0, HISTORY_LIMIT));
    try {
        localStorage.setItem(HISTORY_KEY, memoryHistory);
    } catch { }
    historyListeners.forEach((notify) => notify());
}

const noSubscribe = () => () => { };

// Reading the clipboard asks the browser for permission the first time; Chrome hands images over as PNG.
async function readClipboardImages(): Promise<File[]> {
    const files: File[] = [];
    for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        files.push(new File([blob], `clipboard-${Date.now()}-${files.length}.${type.split("/")[1] || "png"}`, { type }));
    }
    return files;
}

// "unknown" means the page may not look yet (no permission), so the button stays visible.
type ClipboardState = { status: "unknown" | "image" | "none"; preview?: string };

// The upload finishes after an await, which some browsers treat as outside the click, so fall back to execCommand.
async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
    }
}

export default function UploadImagePage() {
    const hasAdminCookie = useSyncExternalStore(noSubscribe, () => Cookies.get(ADMIN_COOKIE) === ADMIN_PASSWORD, () => false);
    const [unlocked, setUnlocked] = useState(false);
    const accessGranted = hasAdminCookie || unlocked;
    const [passwordInput, setPasswordInput] = useState("");

    const historyRaw = useSyncExternalStore(subscribeHistory, historySnapshot, () => "[]");
    const uploads = useMemo(() => parseHistory(historyRaw), [historyRaw]);
    const [uploading, setUploading] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    const [clip, setClip] = useState<ClipboardState>({ status: "unknown" });

    const showClipboard = (next: ClipboardState) =>
        setClip((prev) => {
            if (prev.preview && prev.preview !== next.preview) URL.revokeObjectURL(prev.preview);
            return next;
        });

    // Looks at the clipboard only when the browser already allows it, so it never pops up a prompt.
    const checkClipboard = async () => {
        if (!navigator.clipboard?.read) return showClipboard({ status: "none" });
        try {
            const permission = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
            if (permission.state === "denied") return showClipboard({ status: "none" });
            if (permission.state !== "granted" || !document.hasFocus()) return showClipboard({ status: "unknown" });
            const [image] = await readClipboardImages();
            showClipboard(image ? { status: "image", preview: URL.createObjectURL(image) } : { status: "none" });
        } catch {
            showClipboard({ status: "unknown" });
        }
    };

    const pasteFromClipboard = async () => {
        try {
            const images = await readClipboardImages();
            if (images.length === 0) {
                toast.error("There's no image on the clipboard. Copy one first.");
                showClipboard({ status: "none" });
                return;
            }
            await handleFiles(images);
        } catch {
            toast.error("Clipboard access is blocked. Allow it from the icon in the address bar, or press Ctrl+V.");
        }
    };

    const handlePassword = (value: string) => {
        if (value === ADMIN_PASSWORD) {
            setUnlocked(true);
            setPasswordInput("");
            Cookies.set(ADMIN_COOKIE, ADMIN_PASSWORD, { expires: 5, path: "/" });
        } else {
            setPasswordInput(value);
        }
    };

    const markCopied = (url: string) => {
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl((current) => (current === url ? "" : current)), 2000);
    };

    const copy = async (text: string, label = "Link copied") => {
        if (await copyText(text)) {
            toast.success(label);
            markCopied(text);
        } else {
            toast.error("Couldn't copy. Select the link and copy it yourself.");
        }
    };

    // Called straight from the paste, drop or file-pick event, before any await.
    const handleFiles = async (files: File[]) => {
        const images = files.filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) {
            if (files.length > 0) toast.error("That isn't an image.");
            return;
        }
        setUploading((n) => n + images.length);
        const job = uploadProductImages(images);

        // Browsers only allow clipboard writes right after a key press or click, and the upload takes
        // longer than that. Starting the write now with a promise of the links keeps that permission.
        let earlyCopy: Promise<boolean> | null = null;
        try {
            if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
                const links = job.then(({ urls }) => {
                    if (urls.length === 0) throw new Error("Nothing uploaded");
                    return new Blob([urls.join("\n")], { type: "text/plain" });
                });
                earlyCopy = navigator.clipboard.write([new ClipboardItem({ "text/plain": links })]).then(() => true, () => false);
            }
        } catch {
            earlyCopy = null;
        }

        const { urls, errors } = await job;
        setUploading((n) => n - images.length);
        errors.forEach((msg) => toast.error(msg));
        if (urls.length === 0) return;

        const now = Date.now();
        writeHistory([...urls.map((url, i) => ({ url, at: now + i })).reverse(), ...parseHistory(historySnapshot())]);
        // Several images copy as one link per line, ready to paste into the order form.
        const text = urls.join("\n");
        const label = urls.length === 1 ? "Uploaded. Link copied." : `${urls.length} uploaded. Links copied.`;
        if (earlyCopy && (await earlyCopy)) {
            toast.success(label);
            markCopied(text);
        } else {
            await copy(text, label);
        }
        // The clipboard now holds the link instead of the image.
        checkClipboard();
    };

    // Ctrl+V anywhere on the page uploads a screenshot or an image copied with the mouse.
    useEffect(() => {
        if (!accessGranted) return;
        const onPaste = (e: ClipboardEvent) => {
            const images = pastedImages(e);
            if (images.length === 0) return;
            e.preventDefault();
            handleFiles(images);
        };
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    });

    // Re-check the clipboard whenever the tab comes back into focus, e.g. after copying an image elsewhere.
    useEffect(() => {
        if (!accessGranted) return;
        const recheck = () => {
            if (document.visibilityState === "visible") checkClipboard();
        };
        const first = setTimeout(recheck, 0);
        window.addEventListener("focus", recheck);
        document.addEventListener("visibilitychange", recheck);
        return () => {
            clearTimeout(first);
            window.removeEventListener("focus", recheck);
            document.removeEventListener("visibilitychange", recheck);
        };
        // checkClipboard only touches state setters, so it doesn't need to be a dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessGranted]);

    const removeFromList = (url: string) => writeHistory(uploads.filter((item) => item.url !== url));

    const clearList = () => writeHistory([]);

    return (
        <div className="relative min-h-screen bg-gray-50/60 text-gray-700 dark:bg-gray-950 dark:text-gray-300">
            <Toaster position="top-center" />
            <div className={`mx-auto max-w-3xl space-y-5 p-4 sm:p-6 ${!accessGranted ? "pointer-events-none select-none blur-md" : ""}`}>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Upload image</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Paste an image with <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-gray-600 dark:bg-gray-800">Ctrl</kbd>
                        {" + "}
                        <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-gray-600 dark:bg-gray-800">V</kbd>
                        , drop it here, or pick a file. The public link is copied as soon as it uploads.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        handleFiles(Array.from(e.dataTransfer.files));
                    }}
                    className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${dragging
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                        : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-900/70"
                        }`}
                >
                    {uploading > 0 ? (
                        <>
                            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                Uploading {uploading === 1 ? "image" : `${uploading} images`}…
                            </span>
                        </>
                    ) : (
                        <>
                            <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Paste, drop, or click to choose images</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG, WebP, GIF or AVIF · several at once is fine</span>
                        </>
                    )}
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept={PRODUCT_IMAGE_ACCEPT}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(Array.from(e.target.files || []));
                        e.target.value = "";
                    }}
                />

                {clip.status !== "none" && (
                    <button
                        type="button"
                        onClick={pasteFromClipboard}
                        disabled={uploading > 0}
                        className={`flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${clip.status === "image"
                            ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                            : "bg-white text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 dark:bg-gray-900 dark:text-blue-300 dark:ring-blue-900"
                            }`}
                    >
                        {clip.status === "image" && clip.preview ? (
                            <img src={clip.preview} alt="" className="h-9 w-9 rounded-md bg-white object-contain" />
                        ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                            </svg>
                        )}
                        {clip.status === "image" ? "Paste copied image" : "Paste from clipboard"}
                    </button>
                )}

                {uploads.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent uploads</h2>
                            <div className="flex items-center gap-3 text-xs font-semibold">
                                {uploads.length > 1 && (
                                    <button type="button" onClick={() => copy(uploads.map((u) => u.url).join("\n"), "All links copied")} className="text-blue-600 hover:underline dark:text-blue-400">
                                        Copy all
                                    </button>
                                )}
                                <button type="button" onClick={clearList} className="text-gray-500 hover:underline">
                                    Clear list
                                </button>
                            </div>
                        </div>
                        <ul className="space-y-2">
                            {uploads.map((item) => (
                                <li key={item.url} className="flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
                                    <a href={item.url} target="_blank" rel="noreferrer" className="shrink-0">
                                        <img src={item.url} alt="" className="h-14 w-14 rounded-lg bg-gray-100 object-contain dark:bg-gray-800" />
                                    </a>
                                    <div className="min-w-0 flex-1">
                                        <input
                                            readOnly
                                            value={item.url}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full truncate rounded-md bg-transparent text-sm text-gray-700 outline-none dark:text-gray-200"
                                        />
                                        <p className="text-xs text-gray-400">{new Date(item.at).toLocaleString()}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copy(item.url)}
                                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${copiedUrl === item.url
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800"
                                            : "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800"
                                            }`}
                                    >
                                        {copiedUrl === item.url ? "Copied" : "Copy"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeFromList(item.url)}
                                        title="Remove from this list (the image stays online)"
                                        className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {!accessGranted && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="w-80 rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
                        <h2 className="mb-4 text-2xl font-bold">Admin Access</h2>
                        <input
                            type="password"
                            placeholder="Enter Password"
                            value={passwordInput}
                            onChange={(e) => handlePassword(e.target.value)}
                            className="w-full rounded-md border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
