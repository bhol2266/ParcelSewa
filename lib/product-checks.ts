// A product's "received" tick lives on its entry in the order's productItems, so it moves with the product when links are edited.
export const isProductChecked = (order: any, index: number): boolean => order.productItems?.[index]?.checked === true;

// The order's productItems with one product's tick set; older orders without productItems get them built from the links.
export function withProductChecked(order: any, index: number, checked: boolean) {
    const items = (order.productUrls ?? []).map((url: string, i: number) => ({ url, quantity: "1", ...(order.productItems?.[i] ?? {}) }));
    items[index] = { ...items[index], checked };
    return items;
}

// A pending order whose product images are all ticked: everything has been received.
export function isOrderAllReceived(order: any): boolean {
    if (order.deliveryStatus !== false) return false;
    const linked = (order.productUrls ?? []).map((url: string, i: number) => (url ? i : -1)).filter((i: number) => i >= 0);
    return linked.length > 0 && linked.every((i: number) => isProductChecked(order, i));
}

// The tile's border carries the theme: green once ticked, red until then.
export const tickTheme = (checked: boolean) => (checked ? "border-2 border-green-500" : "border-2 border-red-400");
