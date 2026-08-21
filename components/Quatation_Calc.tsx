"use client";

import React, { useState } from "react";

// Flat NPR charges for orders below IC 1500, keyed by option value.
const FLAT_RATES = {
    below_1500: 600,
    below_1500_700: 700,
    below_1500_1000: 1000,
} as const;

type FlatOption = keyof typeof FLAT_RATES;
type CommissionOption = number | FlatOption;

const isFlatOption = (value: string): value is FlatOption => value in FLAT_RATES;

const PriceCalculator: React.FC = () => {
    const [amountINR, setAmountINR] = useState<string>("");
    const [commissionRate, setCommissionRate] = useState<CommissionOption>(20);
    const [result, setResult] = useState<{
        nprConverted: number;
        commissionAmount: number;
        total: number;
        flatRateType: "none" | "flat";
    } | null>(null);

    const conversionRate = 1.6;

    const handleCalculate = () => {
        const amount = parseFloat(amountINR);
        if (isNaN(amount)) return;

        const nprConverted = Math.round(amount * conversionRate);
        let commissionAmount: number;
        let total: number;
        let textToCopy: string;
        let flatRateType: "none" | "flat" = "none";

        if (typeof commissionRate === "string") {
            const flatRate = FLAT_RATES[commissionRate];
            flatRateType = "flat";
            commissionAmount = flatRate;
            total = nprConverted + commissionAmount;

            textToCopy = `
🇮🇳 INR ${Math.round(amount).toLocaleString()} x ${conversionRate} = ${nprConverted.toLocaleString()} NPR 🇳🇵
Below order 1500 charge will be flat ${flatRate} + courier charge

**TOTAL = ${total.toLocaleString()} NPR** + courier charge

🏷️ Product + Nepali Custom + Service charge
`.trim();
        } else {
            const rate = commissionRate as number;
            commissionAmount = Math.round((nprConverted * rate) / 100);
            total = nprConverted + commissionAmount;

            textToCopy = `
🇮🇳 INR ${Math.round(amount).toLocaleString()} x ${conversionRate} = ${nprConverted.toLocaleString()} NPR 🇳🇵
NPR ${nprConverted.toLocaleString()} + ${rate}% = ${nprConverted.toLocaleString()} + ${commissionAmount.toLocaleString()}

**TOTAL = ${total.toLocaleString()} NPR**

🏷️ Product + Nepali Custom + Service charge
`.trim();
        }

        setResult({ nprConverted, commissionAmount, total, flatRateType });
        navigator.clipboard.writeText(textToCopy);
    };

    const commissionOptions: { label: string; value: CommissionOption }[] = [
        { label: "5%", value: 5 },
        { label: "10%", value: 10 },
        { label: "15%", value: 15 },
        { label: "20%", value: 20 },
        { label: "25%", value: 25 },
        { label: "30%", value: 30 },
        { label: "35%", value: 35 },
        { label: "40%", value: 40 },
        { label: "50%", value: 50 },
        { label: "Below order IC 1500 (Flat NPR 600)", value: "below_1500" },
        { label: "Below order IC 1500 (Flat NPR 700)", value: "below_1500_700" },
        { label: "Below order IC 1500 (Flat NPR 1000)", value: "below_1500_1000" },
    ];

    return (
        <div className="max-w-md mx-auto p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Price Calculator</h2>

            <div className="mb-4">
                <label className="block mb-1 font-medium">Amount (INR):</label>
                <input
                    type="number"
                    value={amountINR}
                    onChange={(e) => setAmountINR(e.target.value)}
                    className="w-full border px-3 py-2 rounded"
                    placeholder="Enter amount in INR"
                />
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">Commission Rate (%):</label>
                <select
                    value={commissionRate}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (isFlatOption(val)) {
                            setCommissionRate(val);
                        } else {
                            setCommissionRate(parseInt(val));
                        }
                    }}
                    className="w-full border px-3 py-2 rounded"
                >
                    {commissionOptions.map((opt) => (
                        <option key={String(opt.value)} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleCalculate}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
                Calculate &amp; Copy
            </button>

            {result && (
                <div className="mt-6 p-4 border rounded bg-gray-50 dark:bg-gray-900">
                    <p>
                        INR {parseFloat(amountINR).toLocaleString()} x {conversionRate} ={" "}
                        {result.nprConverted.toLocaleString()} NPR
                    </p>

                    {result.flatRateType !== "none" ? (
                        <>
                            <p className="mt-1">
                                Below order 1500 — flat charge:{" "}
                                <strong>NPR {result.commissionAmount.toLocaleString()}</strong>
                            </p>
                            <p className="mt-1">
                                Total + courier charge:{" "}
                                <strong>{result.total.toLocaleString()} NPR</strong>
                            </p>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                                Below order 1500 charge will be flat {result.commissionAmount} + courier charge
                            </p>
                        </>
                    ) : (
                        <p>
                            NPR {result.nprConverted.toLocaleString()} + {commissionRate}% ={" "}
                            {result.nprConverted.toLocaleString()} +{" "}
                            {result.commissionAmount.toLocaleString()} ={" "}
                            <strong>{result.total.toLocaleString()} NPR</strong>
                        </p>
                    )}

                    <p className="mt-2 font-medium">Product + Nepali Custom + Service charge</p>
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Copied to clipboard</p>
                </div>
            )}
        </div>
    );
};

export default PriceCalculator;