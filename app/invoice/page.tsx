"use client";

import { useState, useCallback, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Item {
  id: string;
  productName: string;
  area: string;
  rate: string;
}

const PRODUCT_OPTIONS = ["Louver Panel", "5mm Panel"];

const emptyItem = (): Item => ({
  id: crypto.randomUUID(),
  productName: "",
  area: "",
  rate: "",
});

const generateInvoiceNo = () =>
  String(Math.floor(Math.random() * 900) + 100);

export default function InvoicePage() {
  const [partyName, setPartyName] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [localTransport, setLocalTransport] = useState<number | "">("");
  const [advanceDeposit, setAdvanceDeposit] = useState<number | "">("");

  useEffect(() => {
    setInvoiceNo(generateInvoiceNo());
  }, []);

  const addItem = () => setItems((p) => [...p, emptyItem()]);

  const removeItem = (id: string) =>
    setItems((p) => p.filter((x) => x.id !== id));

  const updateItem = useCallback(
    (id: string, field: keyof Item, value: string) => {
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  const computedItems = items.map((p) => {
    const area = parseFloat(p.area) || 0;
    const rate = parseFloat(p.rate) || 0;
    const amount = area > 0 && rate > 0 ? area * rate : 0;
    return { ...p, computedArea: area, computedRate: rate, amount };
  });

  const totalArea = computedItems.reduce((s, p) => s + p.computedArea, 0);
  const productTotal = computedItems.reduce((s, p) => s + p.amount, 0);
  const transport = localTransport !== "" ? (localTransport as number) : 0;
  const advance = advanceDeposit !== "" ? (advanceDeposit as number) : 0;
  const grandTotal = productTotal + transport;
  const netPayable = grandTotal - advance;
  const avgRate = totalArea > 0 ? productTotal / totalArea : 0;

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
    const tableHead = [["#", "Product", "Area (sqft)", "Rate / sqft (Rs)", "Amount (Rs)"]];
    const tableBody = computedItems.map((p, i) => [
      i + 1,
      p.productName || "—",
      p.computedArea > 0 ? p.computedArea.toFixed(2) : "—",
      p.computedRate > 0 ? `Rs ${p.computedRate.toFixed(2)}` : "—",
      `Rs ${p.amount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
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
        1: { halign: "left", cellWidth: 45 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      alternateRowStyles: { fillColor: [240, 246, 255] },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    const afterTable = doc.lastAutoTable.finalY + 6;

    const boxX = pw - 90;
    const boxW = 76;
    let by = afterTable;

    const drawRow = (label: string, value: string, highlight = false, large = false) => {
      const rowH = large ? 9 : 7;
      if (highlight) {
        doc.setFillColor(15, 40, 80);
        doc.rect(boxX, by, boxW, rowH, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFillColor(245, 245, 252);
        doc.rect(boxX, by, boxW, rowH, "F");
        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "normal");
      }
      doc.setFontSize(large ? 10 : 8.5);
      doc.text(label, boxX + 3, by + rowH - 2);
      doc.text(value, boxX + boxW - 3, by + rowH - 2, { align: "right" });
      by += rowH;
    };

    drawRow("Total Area", `${totalArea.toFixed(2)} sqft`);
    drawRow("Avg Rate / sqft", `Rs ${avgRate.toFixed(2)}`);
    drawRow("Area Total", `Rs ${productTotal.toFixed(2)}`);
    drawRow("Local Transportation", `Rs ${transport.toFixed(2)}`);
    drawRow("Grand Total", `Rs ${grandTotal.toFixed(2)}`);
    if (advance > 0) {
      drawRow("Advance Deposit (-)", `- Rs ${advance.toFixed(2)}`);
    }
    drawRow("NET PAYABLE", `Rs ${netPayable.toFixed(2)}`, true, true);

    const footerY = doc.internal.pageSize.getHeight() - 22;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footerY, pw - 14, footerY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Thank you for your business!", 14, footerY + 6);
    doc.text("UK Plastic and Product", pw - 14, footerY + 6, { align: "right" });
    doc.text("VAT No: 624020806", pw - 14, footerY + 12, { align: "right" });

    const filename = `Invoice_${invoiceNo}_${partyName.replace(/\s+/g, "_") || "party"}.pdf`;
    doc.save(filename);
  };

  const inputCls =
    "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition placeholder:text-slate-400";
  const labelCls =
    "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 font-sans">
      <header className="bg-[#0f2850] text-white px-6 py-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">UK Plastic and Product</h1>
            <p className="text-blue-300 text-xs mt-0.5">Buddhanagar, Kathmandu</p>
          </div>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full border border-white/20">
            Invoice Generator
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Invoice Details */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">
            Invoice Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Party Name</label>
                <input
                  className={inputCls}
                  placeholder="Customer / Company name"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Party Address</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Full address"
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Invoice Number</label>
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} font-mono font-bold text-blue-700`}
                    value={`#${invoiceNo}`}
                    readOnly
                  />
                  <button
                    onClick={() => setInvoiceNo(generateInvoiceNo())}
                    title="Regenerate invoice number"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition text-base font-bold"
                  >
                    ↻
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Auto-generated · click ↻ to refresh</p>
              </div>
              <div>
                <label className={labelCls}>Invoice Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Items</h2>
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              <span className="text-base leading-none">+</span> Add Row
            </button>
          </div>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-12 gap-2 mb-2 px-1">
            <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">#</div>
            <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Product</div>
            <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Area (sqft)</div>
            <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Rate / sqft (Rs)</div>
            <div className="col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-2">
            {computedItems.map((p, idx) => (
              <div
                key={p.id}
                className="grid grid-cols-12 gap-2 items-center bg-slate-50/70 rounded-xl p-2 border border-slate-100"
              >
                <div className="col-span-1 text-center text-xs font-bold text-slate-400">
                  {idx + 1}
                </div>
                <div className="col-span-11 md:col-span-3">
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
                </div>
                <div className="col-span-5 md:col-span-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputCls} text-center`}
                    placeholder="e.g. 120"
                    value={p.area}
                    onChange={(e) => updateItem(p.id, "area", e.target.value)}
                  />
                </div>
                <div className="col-span-5 md:col-span-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputCls} text-center`}
                    placeholder="e.g. 45"
                    value={p.rate}
                    onChange={(e) => updateItem(p.id, "rate", e.target.value)}
                  />
                </div>
                <div className="col-span-10 md:col-span-1 text-right">
                  <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1.5 rounded-lg block">
                    Rs {p.amount.toFixed(2)}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(p.id)}
                      className="text-red-400 hover:text-red-600 transition text-lg font-bold leading-none"
                      title="Remove row"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transport + Advance + Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">
              Local Transportation
            </h2>
            <label className={labelCls}>Amount (Rs)</label>
            <input
              type="text"
              inputMode="decimal"
              className={inputCls}
              placeholder="0.00"
              value={localTransport}
              onChange={(e) =>
                setLocalTransport(e.target.value === "" ? "" : parseFloat(e.target.value))
              }
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
            <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-4">
              Advance Deposit
            </h2>
            <label className={labelCls}>Amount Received (Rs)</label>
            <input
              type="text"
              inputMode="decimal"
              className={`${inputCls} border-amber-200 focus:border-amber-400`}
              placeholder="0.00"
              value={advanceDeposit}
              onChange={(e) =>
                setAdvanceDeposit(e.target.value === "" ? "" : parseFloat(e.target.value))
              }
            />
            {advance > 0 && (
              <p className="text-[11px] text-amber-600 mt-2 font-medium">
                ✓ Rs {advance.toFixed(2)} will be deducted
              </p>
            )}
          </section>

          <section className="bg-[#0f2850] rounded-2xl shadow-lg p-6 text-white">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-4">
              Summary
            </h2>
            <div className="space-y-2.5">
              {[
                ["Total Area", `${totalArea.toFixed(2)} sqft`],
                ["Avg Rate / sqft", `Rs ${avgRate.toFixed(2)}`],
                ["Area Total", `Rs ${productTotal.toFixed(2)}`],
                ["Local Transportation", `Rs ${transport.toFixed(2)}`],
                ["Grand Total", `Rs ${grandTotal.toFixed(2)}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-blue-200">{label}</span>
                  <span className="font-semibold">{val}</span>
                </div>
              ))}
              {advance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-300">Advance Deposit (-)</span>
                  <span className="font-semibold text-amber-300">- Rs {advance.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-3 mt-1 flex justify-between items-center">
                <span className="text-base font-bold">Net Payable</span>
                <span className="text-xl font-extrabold text-yellow-400">
                  Rs {netPayable.toFixed(2)}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Download */}
        <div className="flex justify-end pb-8">
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 bg-[#0f2850] hover:bg-blue-900 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition text-sm tracking-wide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download Invoice PDF
          </button>
        </div>
      </main>
    </div>
  );
}