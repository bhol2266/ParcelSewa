"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { DETAIL_TYPES, extractUrl, isValidUrl, MAX_ITEMS, type CartItem, type DetailType, type OrderMark } from "@/lib/cart";

// "amazon.in" / "flipkart.com" from a valid product link, for the label beside the product title.
const storeOf = (url: string) => (isValidUrl(url) ? new URL(url.trim()).hostname.replace(/^(www|m|dl)\./, "") : "");

const MARK_TEXT: Record<OrderMark, string> = { ordered: "✓ Ordered", changed: "Qty changed", new: "New" };

// Products while they are being edited. `key` only keeps React rows stable while rows are added and removed.
export type EditorDetail = { key: number; type: DetailType; label: string; value: string };
// `imageUrl` is the product picture the team fetched; it shows only while the link it belongs to (`imageOf`) is unchanged.
export type EditorItem = { key: number; productUrl: string; quantity: number; details: EditorDetail[]; imageUrl?: string; imageOf?: string };

// The first product of a new form uses key 0 so the server and browser render the same ids; later rows use the counter.
let nextKey = 1;
export const emptyItem = (key = nextKey++): EditorItem => ({ key, productUrl: "", quantity: 1, details: [] });

export const toEditorItems = (items: CartItem[]): EditorItem[] =>
  items.map(item => ({
    key: nextKey++, productUrl: item.productUrl, quantity: item.quantity, details: item.details.map(d => ({ ...d, key: nextKey++ })),
    ...(item.imageUrl ? { imageUrl: item.imageUrl, imageOf: item.productUrl } : {}),
  }));

/** Products ready to send: empty details dropped, an unnamed "Something else" called "Detail". */
export const fromEditorItems = (items: EditorItem[]): CartItem[] =>
  items.map(item => ({
    productUrl: extractUrl(item.productUrl), quantity: item.quantity,
    details: item.details.filter(d => d.value.trim()).map(d => ({ type: d.type, label: d.label.trim() || "Detail", value: d.value.trim() })),
  }));

export const countPieces = (items: EditorItem[]) => items.reduce((sum, item) => sum + (Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 0), 0);

/** The first problem with the products, focusing that field; null when they're fine. */
export function checkItems(items: EditorItem[], idPrefix: string): string | null {
  const badLink = items.findIndex(item => !isValidUrl(item.productUrl));
  if (badLink !== -1) {
    document.getElementById(`${idPrefix}-product-${items[badLink].key}`)?.focus();
    return `Product ${badLink + 1}: paste the product link (it starts with https://).`;
  }
  const badQuantity = items.findIndex(item => !Number.isInteger(item.quantity) || item.quantity < 1);
  if (badQuantity !== -1) return `Product ${badQuantity + 1}: quantity must be a whole number of at least 1.`;
  return null;
}

/** The product cards shared by the /order form and the /cart page. */
export default function OrderItemsEditor({ items, setItems, idPrefix, priceFor, orderMark }: {
  items: EditorItem[]; setItems: Dispatch<SetStateAction<EditorItem[]>>; idPrefix: string;
  /** The quoted INR price for a product link, once the team has saved a quotation. */
  priceFor?: (productUrl: string) => number | undefined;
  /** Once an order exists: whether a product is in it ("ordered"), in it with another quantity, or added later. */
  orderMark?: (productUrl: string, quantity: number) => OrderMark;
}) {
  const [openPicker, setOpenPicker] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);
  const focusLater = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 0);

  const updateItem = (key: number, changes: Partial<EditorItem>) =>
    setItems(current => current.map(item => (item.key === key ? { ...item, ...changes } : item)));

  function addItem() {
    if (items.length >= MAX_ITEMS) { toast.error(`You can add up to ${MAX_ITEMS} products in one request.`); return; }
    const added = emptyItem();
    setItems(current => [added, ...current]);
    focusLater(`${idPrefix}-product-${added.key}`);
  }

  const removeItem = (key: number) => setItems(current => (current.length > 1 ? current.filter(item => item.key !== key) : current));

  function addDetail(itemKey: number, type: DetailType) {
    const detail: EditorDetail = { key: nextKey++, type, label: type === "other" ? "" : DETAIL_TYPES.find(d => d.type === type)!.label, value: "" };
    setItems(current => current.map(item => (item.key === itemKey ? { ...item, details: [...item.details, detail] } : item)));
    setOpenPicker(null);
    // "Something else" starts on its name field; every other detail starts on its value.
    focusLater(type === "other" ? `${idPrefix}-detail-label-${detail.key}` : `${idPrefix}-detail-${detail.key}`);
  }

  const updateDetail = (itemKey: number, detailKey: number, changes: Partial<EditorDetail>) =>
    setItems(current => current.map(item => (item.key === itemKey ? { ...item, details: item.details.map(d => (d.key === detailKey ? { ...d, ...changes } : d)) } : item)));

  const removeDetail = (itemKey: number, detailKey: number) =>
    setItems(current => current.map(item => (item.key === itemKey ? { ...item, details: item.details.filter(d => d.key !== detailKey) } : item)));

  return (
    <div className="order-items">
      {zoomed && <ImageViewer src={zoomed.src} alt={zoomed.alt} onClose={() => setZoomed(null)} />}
      {/* At the top: a new product goes first, so it is in view without scrolling past the list. */}
      <button type="button" className="order-item-add" onClick={addItem} disabled={items.length >= MAX_ITEMS}><span aria-hidden="true">+</span> Add another product</button>
      {items.map((item, index) => {
        const available = DETAIL_TYPES.filter(d => d.type === "other" || !item.details.some(existing => existing.type === d.type));
        const pickerOpen = openPicker === item.key;
        const id = (name: string) => `${idPrefix}-${name}-${item.key}`;
        const link = extractUrl(item.productUrl);
        const mark = orderMark && isValidUrl(link) ? orderMark(link, item.quantity) : null;
        return (
          <fieldset key={item.key} className={`order-item${mark ? ` is-${mark}` : ""}`}>
            <legend className="sr-only">Product {index + 1}{mark ? ` (${MARK_TEXT[mark]})` : ""}</legend>
            {mark && <span className={`order-mark is-${mark} order-item-mark`} aria-hidden="true">{MARK_TEXT[mark]}</span>}
            {/* Two compact rows: [picture or number] [link] [×], then quantity · store · details. */}
            <div className="order-item-top">
              {item.imageUrl && item.imageOf === extractUrl(item.productUrl)
                ? <button type="button" className="order-item-thumb-btn" onClick={() => setZoomed({ src: item.imageUrl!, alt: `Product ${index + 1}` })} aria-label={`View product ${index + 1} picture`}>
                    <img className="order-item-thumb" src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  </button>
                : <span className="order-item-num" aria-hidden="true">{index + 1}</span>}
              <label htmlFor={id("product")} className="sr-only">Product {index + 1} link</label>
              {/* type="text": shared text with words around the link must not be blocked; only the link is kept. */}
              <input id={id("product")} className="order-input" type="text" required autoComplete="off" autoCapitalize="off" spellCheck={false} inputMode="url" placeholder="Paste the product link here" value={item.productUrl} onChange={event => {
                const typed = event.target.value;
                const link = extractUrl(typed);
                updateItem(item.key, { productUrl: /https?:\/\//i.test(typed) && link !== typed.trim() ? link : typed });
              }} />
              {items.length > 1 && <button type="button" className="order-item-x" onClick={() => removeItem(item.key)} aria-label={`Remove product ${index + 1}`} title="Remove">×</button>}
            </div>

            <div className="order-item-bar">
              <div className="order-qty">
                <label htmlFor={id("quantity")}>Qty</label>
                <div className="qty-stepper">
                  <button type="button" aria-label="Decrease quantity" disabled={!(item.quantity > 1)} onClick={() => updateItem(item.key, { quantity: Math.max(1, (item.quantity || 1) - 1) })}>−</button>
                  <input id={id("quantity")} type="number" min="1" step="1" required inputMode="numeric" value={Number.isNaN(item.quantity) ? "" : item.quantity} onChange={event => updateItem(item.key, { quantity: event.target.valueAsNumber })} />
                  <button type="button" aria-label="Increase quantity" onClick={() => updateItem(item.key, { quantity: (item.quantity || 0) + 1 })}>+</button>
                </div>
              </div>
              {(() => {
                const price = priceFor?.(extractUrl(item.productUrl));
                if (price) return <span className="order-item-price" title="Quoted price per piece">₹{price.toLocaleString("en-IN")}{item.quantity > 1 ? <small> × {item.quantity}</small> : null}</span>;
                return storeOf(item.productUrl) ? <span className="order-item-store">{storeOf(item.productUrl)}</span> : null;
              })()}
              {!pickerOpen && <button type="button" className="order-detail-toggle" onClick={() => setOpenPicker(item.key)}><span aria-hidden="true">+</span> {item.details.length ? "More" : "Details"}</button>}
            </div>

            {item.details.map(detail => {
              const meta = DETAIL_TYPES.find(d => d.type === detail.type)!;
              const valueId = `${idPrefix}-detail-${detail.key}`;
              return (
                <div key={detail.key} className="order-detail">
                  {detail.type === "other"
                    ? <input id={`${idPrefix}-detail-label-${detail.key}`} className="order-detail-name" aria-label="Detail name" placeholder="Name" value={detail.label} onChange={event => updateDetail(item.key, detail.key, { label: event.target.value })} />
                    : <label htmlFor={valueId} className="order-detail-name">{meta.label}</label>}
                  {detail.type === "notes"
                    ? <textarea id={valueId} className="order-input" rows={2} placeholder={meta.placeholder} value={detail.value} onChange={event => updateDetail(item.key, detail.key, { value: event.target.value })} />
                    : <input id={valueId} className="order-input" aria-label={detail.type === "other" ? detail.label || "Detail" : undefined} placeholder={meta.placeholder} value={detail.value} onChange={event => updateDetail(item.key, detail.key, { value: event.target.value })} />}
                  <button type="button" className="order-detail-remove" onClick={() => removeDetail(item.key, detail.key)} aria-label={`Remove ${detail.label || "detail"}`}>×</button>
                </div>
              );
            })}

            {pickerOpen && (
              <div className="order-detail-options" role="group" aria-label={`Add a detail to product ${index + 1}`}>
                {available.map(d => <button key={d.type} type="button" onClick={() => addDetail(item.key, d.type)}>{d.label}</button>)}
                <button type="button" className="order-detail-close" onClick={() => setOpenPicker(null)} aria-label="Close">×</button>
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

/** A product picture shown large over the page; tap outside, the × or Esc closes it. */
function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = scroll; };
  }, [onClose]);
  return createPortal(
    <div className="image-viewer" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button type="button" className="image-viewer-close" onClick={onClose} aria-label="Close picture" autoFocus>×</button>
      <img src={src} alt={alt} referrerPolicy="no-referrer" onClick={event => event.stopPropagation()} />
    </div>,
    document.body,
  );
}
