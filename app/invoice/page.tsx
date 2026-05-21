"use client";

import { useState, useCallback, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Item {
  id: string;
  productName: string;
  qty: string;
  rate: string;
}

interface FittingSection {
  id: string;
  type: "wall" | "ceiling";
  inputMode: "dimensions" | "area";
  length: string;
  breadth: string;
  area: string;
}

const DEFAULT_FITTING_RATES = { wall: 25, ceiling: 35 };

const DEFAULT_PRODUCT_RATES: Record<string, number | null> = {
  "Louver Panel (9ft)": 1150,
  "5mm Panel (9ft)": 525,
  "2G Panel (9ft)": 500,
  "L Channel (9ft)": 150,
  "U Channel (9ft)": 150,
  "Aluminium Channels": null,
  "Grip": 1,
  "Wall Clip": 20,
  "Glue": 150,
};

const PRODUCT_OPTIONS = Object.keys(DEFAULT_PRODUCT_RATES);

const emptyItem = (): Item => ({
  id: crypto.randomUUID(),
  productName: "",
  qty: "",
  rate: "",
});

const emptyFittingSection = (): FittingSection => ({
  id: crypto.randomUUID(),
  type: "wall",
  inputMode: "dimensions",
  length: "",
  breadth: "",
  area: "",
});

const generateInvoiceNo = () =>
  String(Math.floor(Math.random() * 900) + 100);

const getSectionArea = (s: FittingSection): number => {
  if (s.inputMode === "area") return parseFloat(s.area) || 0;
  const l = parseFloat(s.length) || 0;
  const b = parseFloat(s.breadth) || 0;
  return l * b;
};

export default function InvoicePage() {
  const [partyName, setPartyName] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [fittingSections, setFittingSections] = useState<FittingSection[]>([]);
  const [advanceDeposit, setAdvanceDeposit] = useState<number | "">("");
  const [remainingPanels, setRemainingPanels] = useState<string>("");
  const [remainingChannels, setRemainingChannels] = useState<string>("");

  // Editable rates
  const [productRates, setProductRates] = useState<Record<string, number | null>>({ ...DEFAULT_PRODUCT_RATES });
  const [fittingRates, setFittingRates] = useState({ ...DEFAULT_FITTING_RATES });
  const [editingRates, setEditingRates] = useState(false);
  const [productRateInputs, setProductRateInputs] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(DEFAULT_PRODUCT_RATES).map(([k, v]) => [k, v === null ? "" : String(v)]))
  );
  const [fittingRateInputs, setFittingRateInputs] = useState({
    wall: String(DEFAULT_FITTING_RATES.wall),
    ceiling: String(DEFAULT_FITTING_RATES.ceiling),
  });

  useEffect(() => {
    setInvoiceNo(generateInvoiceNo());
  }, []);

  const saveRates = () => {
    const newProductRates: Record<string, number | null> = { ...productRates };
    PRODUCT_OPTIONS.forEach((key) => {
      const raw = productRateInputs[key];
      if (raw === "" || raw === undefined) {
        newProductRates[key] = null;
      } else {
        const val = parseFloat(raw);
        if (!isNaN(val) && val >= 0) newProductRates[key] = val;
      }
    });
    setProductRates(newProductRates);

    const wallRate = parseFloat(fittingRateInputs.wall);
    const ceilRate = parseFloat(fittingRateInputs.ceiling);
    setFittingRates({
      wall: !isNaN(wallRate) && wallRate >= 0 ? wallRate : fittingRates.wall,
      ceiling: !isNaN(ceilRate) && ceilRate >= 0 ? ceilRate : fittingRates.ceiling,
    });

    // Re-sync rates on existing items
    setItems((prev) =>
      prev.map((item) => {
        if (!item.productName) return item;
        const newRate = newProductRates[item.productName];
        if (newRate === undefined) return item;
        // Only update if rate matches old product rate (not manually overridden)
        return { ...item, rate: String(newRate) };
      })
    );

    setEditingRates(false);
  };

  const cancelRates = () => {
    setProductRateInputs(
      Object.fromEntries(Object.entries(productRates).map(([k, v]) => [k, v === null ? "" : String(v)]))
    );
    setFittingRateInputs({
      wall: String(fittingRates.wall),
      ceiling: String(fittingRates.ceiling),
    });
    setEditingRates(false);
  };

  const addItem = () => setItems((p) => [...p, emptyItem()]);

  const updateItem = useCallback(
    (id: string, field: keyof Item, value: string) => {
      setItems((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== id) return p;
          const newItem = { ...p, [field]: value };
          if (field === "productName") {
            const r = productRates[value];
            newItem.rate = r !== undefined && r !== null ? String(r) : "";
          }
          return newItem;
        });

        if (field === "productName" && value === "Wall Clip") {
          const currentItem = updated.find((p) => p.id === id);
          const linkedGripId = `grip-for-${id}`;
          const hasLinkedGrip = updated.some((p) => p.id === linkedGripId);
          if (!hasLinkedGrip) {
            const gripItem: Item = {
              id: linkedGripId,
              productName: "Grip",
              qty: currentItem?.qty || "1",
              rate: String(productRates["Grip"]),
            };
            return [...updated, gripItem];
          }
        }

        if (field === "qty") {
          const changedItem = updated.find((p) => p.id === id);
          if (changedItem?.productName === "Wall Clip") {
            const linkedGripId = `grip-for-${id}`;
            return updated.map((p) =>
              p.id === linkedGripId ? { ...p, qty: value } : p
            );
          }
        }

        return updated;
      });
    },
    [productRates]
  );

  const addFittingSection = () =>
    setFittingSections((p) => [...p, emptyFittingSection()]);

  const removeFittingSection = (id: string) =>
    setFittingSections((p) => p.filter((s) => s.id !== id));

  const updateFittingSection = (id: string, patch: Partial<FittingSection>) =>
    setFittingSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );

  // ── Computed values ──────────────────────────────────────────
  const computedItems = items.map((p) => {
    const qty = parseFloat(p.qty) || 0;
    const rate = parseFloat(p.rate) || 0;
    const amount = qty > 0 && rate > 0 ? qty * rate : 0;
    return { ...p, computedQty: qty, computedRate: rate, amount };
  });

  const totalPcs = computedItems.reduce((s, p) => s + p.computedQty, 0);
  const productTotal = computedItems.reduce((s, p) => s + p.amount, 0);

  const computedFitting = fittingSections.map((s) => {
    const area = getSectionArea(s);
    const rate = fittingRates[s.type];
    const amount = area * rate;
    return { ...s, computedArea: area, rate, amount };
  });

  const totalFittingAmount = computedFitting.reduce((s, f) => s + f.amount, 0);
  const totalWallArea = computedFitting
    .filter((f) => f.type === "wall")
    .reduce((s, f) => s + f.computedArea, 0);
  const totalCeilingArea = computedFitting
    .filter((f) => f.type === "ceiling")
    .reduce((s, f) => s + f.computedArea, 0);

  const advance = advanceDeposit !== "" ? (advanceDeposit as number) : 0;
  const grandTotal = productTotal + totalFittingAmount;
  const netPayable = grandTotal - advance;

  // ── PDF ─────────────────────────────────────────────────────
  const generatePDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 40, 80);
    doc.rect(0, 0, pw, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("UK PLASTIC AND PRODUCT", pw / 2, 14, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 210, 255);
    doc.text("Buddhanagar, Kathmandu", pw / 2, 21, { align: "center" });
    doc.setFillColor(230, 160, 20);
    doc.roundedRect(pw / 2 - 22, 25, 44, 10, 2, 2, "F");
    doc.setTextColor(15, 40, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("INVOICE", pw / 2, 31.5, { align: "center" });

    let y = 46;
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Bill To:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(partyName || "—", 14, y + 6);
    const addressLines = doc.splitTextToSize(partyAddress || "—", 90);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(addressLines, 14, y + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text("Invoice No:", pw - 60, y);
    doc.text("Date:", pw - 60, y + 7);
    doc.setFont("helvetica", "normal");
    doc.text(`#${invoiceNo}`, pw - 30, y, { align: "right" });
    doc.text(
      new Date(invoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      pw - 30,
      y + 7,
      { align: "right" }
    );

    y += 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 40, 80);
    doc.text("PRODUCTS", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["#", "Product", "Qty (pcs)", "Rate / pcs (Rs)", "Amount (Rs)"]],
      body: computedItems.map((p, i) => [
        i + 1,
        p.productName || "—",
        p.computedQty > 0 ? p.computedQty.toString() : "—",
        p.computedRate > 0 ? `Rs ${p.computedRate.toFixed(2)}` : "—",
        `Rs ${p.amount.toFixed(2)}`,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [15, 40, 80],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { halign: "left", cellWidth: 55 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      alternateRowStyles: { fillColor: [240, 246, 255] },
      margin: { left: 14, right: 14 },
      foot: [
        ["", "Products Sub-total", "", "", `Rs ${productTotal.toFixed(2)}`],
      ],
      footStyles: {
        fillColor: [230, 240, 255],
        textColor: [15, 40, 80],
        fontStyle: "bold",
        fontSize: 9,
      },
    });

    // @ts-ignore
    let afterProducts = doc.lastAutoTable.finalY + 6;

    if (computedFitting.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 40, 80);
      doc.text("FITTING CHARGES", 14, afterProducts);
      afterProducts += 4;

      const fittingBody = computedFitting.map((f, i) => {
        const dimStr =
          f.inputMode === "dimensions"
            ? `${f.length || "—"} ft × ${f.breadth || "—"} ft`
            : "Direct area input";
        return [
          i + 1,
          f.type === "wall" ? "Wall Fitting" : "Ceiling Fitting",
          dimStr,
          `${f.computedArea.toFixed(2)} sqft`,
          `Rs ${f.rate}/sqft`,
          `Rs ${f.amount.toFixed(2)}`,
        ];
      });

      autoTable(doc, {
        startY: afterProducts,
        head: [["#", "Type", "Dimensions", "Area (sqft)", "Rate", "Amount (Rs)"]],
        body: fittingBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 100, 60],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { halign: "left", cellWidth: 30 },
          2: { halign: "center" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
        },
        alternateRowStyles: { fillColor: [240, 255, 245] },
        margin: { left: 14, right: 14 },
        foot: [
          [
            "",
            "Fitting Sub-total",
            "",
            totalWallArea > 0
              ? `Wall: ${totalWallArea.toFixed(2)} sqft` +
                (totalCeilingArea > 0
                  ? `  Ceil: ${totalCeilingArea.toFixed(2)} sqft`
                  : "")
              : totalCeilingArea > 0
              ? `Ceil: ${totalCeilingArea.toFixed(2)} sqft`
              : "",
            "",
            `Rs ${totalFittingAmount.toFixed(2)}`,
          ],
        ],
        footStyles: {
          fillColor: [215, 245, 225],
          textColor: [20, 80, 40],
          fontStyle: "bold",
          fontSize: 9,
        },
      });
    }

    // @ts-ignore
    const afterTable = doc.lastAutoTable.finalY + 6;
    const boxX = pw - 90;
    const boxW = 76;
    let by = afterTable;

    const drawRow = (
      label: string,
      value: string,
      highlight = false,
      large = false,
      color?: [number, number, number]
    ) => {
      const rowH = large ? 9 : 7;
      if (highlight) {
        doc.setFillColor(15, 40, 80);
        doc.rect(boxX, by, boxW, rowH, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFillColor(245, 245, 252);
        doc.rect(boxX, by, boxW, rowH, "F");
        if (color) doc.setTextColor(...color);
        else doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "normal");
      }
      doc.setFontSize(large ? 10 : 8.5);
      doc.text(label, boxX + 3, by + rowH - 2);
      doc.text(value, boxX + boxW - 3, by + rowH - 2, { align: "right" });
      by += rowH;
    };

    drawRow("Total Pcs", `${totalPcs} pcs`);
    drawRow("Products Total", `Rs ${productTotal.toFixed(2)}`);
    if (computedFitting.length > 0) {
      if (totalWallArea > 0)
        drawRow(
          `Wall Fitting (${totalWallArea.toFixed(2)} sqft @ Rs ${fittingRates.wall})`,
          `Rs ${(totalWallArea * fittingRates.wall).toFixed(2)}`
        );
      if (totalCeilingArea > 0)
        drawRow(
          `Ceiling Fitting (${totalCeilingArea.toFixed(2)} sqft @ Rs ${fittingRates.ceiling})`,
          `Rs ${(totalCeilingArea * fittingRates.ceiling).toFixed(2)}`
        );
      drawRow("Fitting Charges Total", `Rs ${totalFittingAmount.toFixed(2)}`);
    }
    drawRow("Grand Total", `Rs ${grandTotal.toFixed(2)}`);
    if (advance > 0)
      drawRow(
        "Advance Deposit (-)",
        `- Rs ${advance.toFixed(2)}`,
        false,
        false,
        [160, 100, 0]
      );
    drawRow("NET PAYABLE", `Rs ${netPayable.toFixed(2)}`, true, true);

    const remPanels = parseInt(remainingPanels) || 0;
    const remChannels = parseInt(remainingChannels) || 0;
    if (remPanels > 0 || remChannels > 0) {
      const remStartY = by + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(120, 60, 0);
      doc.text(
        "REMAINING ITEMS  (For Reference Only — Not Billed)",
        14,
        remStartY
      );

      const remBody: (string | number)[][] = [];
      if (remPanels > 0)
        remBody.push(["Panel", remPanels, "pcs", "Not included in billing"]);
      if (remChannels > 0)
        remBody.push([
          "U/L Channel",
          remChannels,
          "pcs",
          "Not included in billing",
        ]);

      autoTable(doc, {
        startY: remStartY + 3,
        head: [["Item", "Quantity", "Unit", "Note"]],
        body: remBody,
        theme: "grid",
        headStyles: {
          fillColor: [180, 100, 20],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: { fontSize: 9, textColor: [80, 40, 0] },
        columnStyles: {
          0: { halign: "left", cellWidth: 40 },
          1: { halign: "center", cellWidth: 25 },
          2: { halign: "center", cellWidth: 20 },
          3: { halign: "left" },
        },
        alternateRowStyles: { fillColor: [255, 245, 230] },
        margin: { left: 14, right: 14 },
      });
    }

    const footerY = doc.internal.pageSize.getHeight() - 22;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footerY, pw - 14, footerY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Thank you for your business!", 14, footerY + 6);
    doc.text("UK Plastic and Product", pw - 14, footerY + 6, {
      align: "right",
    });
    doc.text("VAT No: 624020806", pw - 14, footerY + 12, { align: "right" });

    const filename = `Invoice_${invoiceNo}_${
      partyName.replace(/\s+/g, "_") || "party"
    }.pdf`;
    doc.save(filename);
  };

  const inputCls =
    "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition placeholder:text-slate-400";
  const labelCls =
    "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 font-sans">
      <header className="bg-[#0f2850] text-white px-4 py-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">UK Plastic and Product</h1>
            <p className="text-blue-300 text-xs mt-0.5">Buddhanagar, Kathmandu</p>
          </div>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full border border-white/20 hidden sm:inline">
            Invoice Generator
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-5">

        {/* ── Rate Editor ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setEditingRates((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700 uppercase tracking-widest">Rate Settings</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                Wall Rs {fittingRates.wall} · Ceil Rs {fittingRates.ceiling} /sqft
              </span>
            </div>
            <span className={`text-slate-400 transition-transform duration-200 ${editingRates ? "rotate-180" : ""}`}>▾</span>
          </button>

          {editingRates && (
            <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-5">
              {/* Fitting rates */}
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Fitting Rates (Rs/sqft)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>🧱 Wall Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                      <input
                        type="number"
                        min="0"
                        className={`${inputCls} pl-9`}
                        value={fittingRateInputs.wall}
                        onChange={(e) => setFittingRateInputs((p) => ({ ...p, wall: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>🔳 Ceiling Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                      <input
                        type="number"
                        min="0"
                        className={`${inputCls} pl-9`}
                        value={fittingRateInputs.ceiling}
                        onChange={(e) => setFittingRateInputs((p) => ({ ...p, ceiling: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product rates */}
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Product Rates (Rs/pcs)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRODUCT_OPTIONS.map((product) => (
                    <div key={product} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <span className="text-xs text-slate-600 flex-1 min-w-0 truncate">{product}</span>
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rs</span>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-right text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition pl-7"
                          value={productRateInputs[product]}
                          onChange={(e) =>
                            setProductRateInputs((p) => ({ ...p, [product]: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveRates}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition"
                >
                  ✓ Save Rates
                </button>
                <button
                  onClick={cancelRates}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Invoice Details ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Party Name</label>
                <input className={inputCls} placeholder="Customer / Company name" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Party Address</label>
                <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Full address" value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Invoice Number</label>
                <div className="flex gap-2">
                  <input className={`${inputCls} font-mono font-bold text-blue-700`} value={`#${invoiceNo}`} readOnly />
                  <button onClick={() => setInvoiceNo(generateInvoiceNo())} title="Regenerate" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition text-base font-bold shrink-0">↻</button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Auto-generated · click ↻ to refresh</p>
              </div>
              <div>
                <label className={labelCls}>Invoice Date</label>
                <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Items ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Items</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
              <span className="text-base leading-none">+</span> Add Row
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-2 mb-2 px-1">
            <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">#</div>
            <div className="col-span-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product</div>
            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Qty</div>
            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Rate (Rs)</div>
            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-2">
            {computedItems.map((p, idx) => {
              const isLinkedGrip = p.id.startsWith("grip-for-");
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-2 sm:p-3 ${
                    isLinkedGrip
                      ? "bg-green-50/60 border-green-200"
                      : "bg-slate-50/70 border-slate-100"
                  }`}
                >
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      {!isLinkedGrip && items.length > 1 && (
                        <button
                          onClick={() => {
                            const linkedGripId = `grip-for-${p.id}`;
                            setItems((prev) =>
                              prev.filter((x) => x.id !== p.id && x.id !== linkedGripId)
                            );
                          }}
                          className="text-red-400 hover:text-red-600 transition text-lg font-bold leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {isLinkedGrip ? (
                      <div className={`${inputCls} text-green-700 font-medium flex items-center gap-1 text-sm`}>
                        <span className="text-green-500">⚙</span>
                        {p.productName}
                        <span className="ml-auto text-[10px] text-green-500 font-semibold">auto</span>
                      </div>
                    ) : (
                      <select
                        className={`${inputCls} cursor-pointer`}
                        value={p.productName}
                        onChange={(e) => updateItem(p.id, "productName", e.target.value)}
                      >
                        <option value="">Select product</option>
                        {PRODUCT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">Qty (pcs)</p>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`${inputCls} text-center`}
                          placeholder="0"
                          value={p.qty}
                          onChange={(e) => updateItem(p.id, "qty", e.target.value)}
                          readOnly={isLinkedGrip}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">Rate (Rs)</p>
                        {productRates[p.productName] === null || p.productName === "" ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`${inputCls} text-center text-slate-800 text-sm`}
                            placeholder="enter"
                            value={p.rate}
                            onChange={(e) => updateItem(p.id, "rate", e.target.value)}
                          />
                        ) : (
                          <div className={`${inputCls} text-center text-slate-600 bg-slate-50 text-sm`}>
                            {p.computedRate > 0 ? p.computedRate : "—"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">Amount</p>
                        <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-2 rounded-lg block text-center">
                          Rs {p.amount.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-center text-xs font-bold text-slate-400">{idx + 1}</div>
                    <div className="col-span-4">
                      {isLinkedGrip ? (
                        <div className={`${inputCls} text-green-700 font-medium flex items-center gap-1`}>
                          <span className="text-green-500 text-xs">⚙</span>
                          {p.productName}
                          <span className="ml-auto text-[10px] text-green-500 font-semibold">auto</span>
                        </div>
                      ) : (
                        <select
                          className={`${inputCls} cursor-pointer`}
                          value={p.productName}
                          onChange={(e) => updateItem(p.id, "productName", e.target.value)}
                        >
                          <option value="">Select product</option>
                          {PRODUCT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`${inputCls} text-center`}
                        placeholder="0"
                        value={p.qty}
                        onChange={(e) => updateItem(p.id, "qty", e.target.value)}
                        readOnly={isLinkedGrip}
                      />
                    </div>
                    <div className="col-span-2">
                      {productRates[p.productName] === null || p.productName === "" ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`${inputCls} text-center`}
                          placeholder="enter rate"
                          value={p.rate}
                          onChange={(e) => updateItem(p.id, "rate", e.target.value)}
                        />
                      ) : (
                        <div className={`${inputCls} text-center text-slate-600 bg-slate-50`}>
                          Rs {p.computedRate > 0 ? p.computedRate.toFixed(2) : "—"}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1.5 rounded-lg block">
                        Rs {p.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {!isLinkedGrip && items.length > 1 && (
                        <button
                          onClick={() => {
                            const linkedGripId = `grip-for-${p.id}`;
                            setItems((prev) =>
                              prev.filter((x) => x.id !== p.id && x.id !== linkedGripId)
                            );
                          }}
                          className="text-red-400 hover:text-red-600 transition text-lg font-bold leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Items total row */}
          {computedItems.some((p) => p.amount > 0) && (
            <div className="mt-3 flex justify-between items-center bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
              <span className="text-xs text-blue-600 font-semibold">Products Sub-total</span>
              <span className="text-sm font-extrabold text-blue-700">Rs {productTotal.toFixed(2)}</span>
            </div>
          )}
        </section>

        {/* ── Fitting Charges ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-widest">Fitting Charges</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Wall: Rs {fittingRates.wall}/sqft · Ceiling: Rs {fittingRates.ceiling}/sqft
              </p>
            </div>
            <button
              onClick={addFittingSection}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0"
            >
              <span className="text-base leading-none">+</span> <span className="hidden sm:inline">Add</span> Section
            </button>
          </div>

          {fittingSections.length === 0 && (
            <div className="mt-4 text-center text-slate-400 text-sm py-6 border-2 border-dashed border-slate-200 rounded-xl">
              No fitting charges added · click <span className="font-semibold text-emerald-600">+ Section</span> to begin
            </div>
          )}

          <div className="space-y-3 mt-4">
            {computedFitting.map((s, idx) => (
              <div
                key={s.id}
                className={`rounded-xl border p-3 sm:p-4 ${
                  s.type === "wall"
                    ? "bg-blue-50/40 border-blue-200"
                    : "bg-purple-50/40 border-purple-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Section {idx + 1}
                  </span>
                  <button
                    onClick={() => removeFittingSection(s.id)}
                    className="text-red-400 hover:text-red-600 text-lg font-bold leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => updateFittingSection(s.id, { type: "wall" })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                      s.type === "wall"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    🧱 Wall
                    <span className="hidden sm:inline font-normal opacity-80"> (Rs {fittingRates.wall}/sqft)</span>
                  </button>
                  <button
                    onClick={() => updateFittingSection(s.id, { type: "ceiling" })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                      s.type === "ceiling"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-purple-300"
                    }`}
                  >
                    🔳 Ceiling
                    <span className="hidden sm:inline font-normal opacity-80"> (Rs {fittingRates.ceiling}/sqft)</span>
                  </button>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => updateFittingSection(s.id, { inputMode: "dimensions" })}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                      s.inputMode === "dimensions"
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    L × B
                  </button>
                  <button
                    onClick={() => updateFittingSection(s.id, { inputMode: "area" })}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                      s.inputMode === "area"
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    Direct Area
                  </button>
                </div>

                {s.inputMode === "dimensions" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Length (ft)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`${inputCls} text-center`}
                        placeholder="e.g. 12"
                        value={s.length}
                        onChange={(e) => updateFittingSection(s.id, { length: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Breadth (ft)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`${inputCls} text-center`}
                        placeholder="e.g. 10"
                        value={s.breadth}
                        onChange={(e) => updateFittingSection(s.id, { breadth: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Area (sqft)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputCls} text-center`}
                      placeholder="e.g. 120"
                      value={s.area}
                      onChange={(e) => updateFittingSection(s.id, { area: e.target.value })}
                    />
                  </div>
                )}

                {s.computedArea > 0 && (
                  <div
                    className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${
                      s.type === "wall"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{s.computedArea.toFixed(2)} sqft × Rs {s.rate}/sqft</span>
                    <span>Rs {s.amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {fittingSections.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 gap-2">
              <div className="text-sm text-emerald-700 space-y-0.5">
                {totalWallArea > 0 && (
                  <div className="text-xs">
                    Wall: {totalWallArea.toFixed(2)} sqft × Rs {fittingRates.wall} = Rs {(totalWallArea * fittingRates.wall).toFixed(2)}
                  </div>
                )}
                {totalCeilingArea > 0 && (
                  <div className="text-xs">
                    Ceiling: {totalCeilingArea.toFixed(2)} sqft × Rs {fittingRates.ceiling} = Rs {(totalCeilingArea * fittingRates.ceiling).toFixed(2)}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wide">Fitting Total</p>
                <p className="text-lg font-extrabold text-emerald-700">Rs {totalFittingAmount.toFixed(2)}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Advance + Summary ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <section className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4 sm:p-6">
            <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-4">Advance Deposit</h2>
            <label className={labelCls}>Amount Received (Rs)</label>
            <input
              type="text"
              inputMode="decimal"
              className={`${inputCls} border-amber-200 focus:border-amber-400`}
              placeholder="0.00"
              value={advanceDeposit}
              onChange={(e) =>
                setAdvanceDeposit(
                  e.target.value === "" ? "" : parseFloat(e.target.value)
                )
              }
            />
            {advance > 0 && (
              <p className="text-[11px] text-amber-600 mt-2 font-medium">
                ✓ Rs {advance.toFixed(2)} will be deducted
              </p>
            )}
          </section>

          <section className="bg-[#0f2850] rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-4">Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-200">Products Total</span>
                <span className="font-semibold">Rs {productTotal.toFixed(2)}</span>
              </div>
              {totalFittingAmount > 0 && (
                <>
                  {totalWallArea > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-300">Wall ({totalWallArea.toFixed(2)} sqft)</span>
                      <span className="text-emerald-300">Rs {(totalWallArea * fittingRates.wall).toFixed(2)}</span>
                    </div>
                  )}
                  {totalCeilingArea > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-300">Ceiling ({totalCeilingArea.toFixed(2)} sqft)</span>
                      <span className="text-emerald-300">Rs {(totalCeilingArea * fittingRates.ceiling).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200">Fitting Total</span>
                    <span className="font-semibold">Rs {totalFittingAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                <span className="text-blue-200">Grand Total</span>
                <span className="font-semibold">Rs {grandTotal.toFixed(2)}</span>
              </div>
              {advance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-300">Advance (-)</span>
                  <span className="font-semibold text-amber-300">- Rs {advance.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-3 mt-1 flex justify-between items-center">
                <span className="text-base font-bold">Net Payable</span>
                <span className="text-xl font-extrabold text-yellow-400">Rs {netPayable.toFixed(2)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* ── Remaining Items ───────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-orange-800 uppercase tracking-widest">Remaining Items</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">For reference only · not included in billing</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls}>Panels (pcs)</label>
              <input
                type="text"
                inputMode="numeric"
                className={`${inputCls} text-center border-orange-200 focus:border-orange-400`}
                placeholder="e.g. 5"
                value={remainingPanels}
                onChange={(e) => setRemainingPanels(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>U/L Channels (pcs)</label>
              <input
                type="text"
                inputMode="numeric"
                className={`${inputCls} text-center border-orange-200 focus:border-orange-400`}
                placeholder="e.g. 3"
                value={remainingChannels}
                onChange={(e) => setRemainingChannels(e.target.value)}
              />
            </div>
          </div>
          {(parseInt(remainingPanels) > 0 || parseInt(remainingChannels) > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parseInt(remainingPanels) > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  📦 Panel: {remainingPanels} pcs
                </span>
              )}
              {parseInt(remainingChannels) > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  📦 U/L Channel: {remainingChannels} pcs
                </span>
              )}
            </div>
          )}
        </section>

        {/* ── Download ─────────────────────────────────────────── */}
        <div className="flex justify-end pb-8">
          <button
            onClick={generatePDF}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0f2850] hover:bg-blue-900 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition text-sm tracking-wide"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download Invoice PDF
          </button>
        </div>
      </main>
    </div>
  );
}