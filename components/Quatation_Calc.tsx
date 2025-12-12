"use client";

import React, { useState } from "react";

const PriceCalculator: React.FC = () => {
    const [amountINR, setAmountINR] = useState<string>(""); // empty by default
    const [commissionRate, setCommissionRate] = useState<number>(20);
    const [result, setResult] = useState<{
        nprConverted: number;
        commissionAmount: number;
        total: number;
    } | null>(null);

    const conversionRate = 1.6; // INR to NPR multiplier

    const handleCalculate = () => {
        const amount = parseFloat(amountINR);
        if (isNaN(amount)) return; // prevent calculation if empty or invalid

        const nprConverted = amount * conversionRate;
        const commissionAmount = (nprConverted * commissionRate) / 100;
        const total = nprConverted + commissionAmount;

        setResult({ nprConverted, commissionAmount, total });

        // Create styled text with emojis
       const textToCopy = `
🇮🇳 INR ${amount.toLocaleString()} x ${conversionRate} = ${nprConverted.toLocaleString()} NPR 🇳🇵
🇳🇵 NPR ${nprConverted.toLocaleString()} + ${commissionRate}% = ${nprConverted.toLocaleString()} + ${commissionAmount.toLocaleString()} = ${total.toLocaleString()} NPR
🏷️ Product + Nepali Custom + Service charge
    `.trim();

        // Copy to clipboard
        navigator.clipboard.writeText(textToCopy)
       
    };

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
                    onChange={(e) => setCommissionRate(parseInt(e.target.value))}
                    className="w-full border px-3 py-2 rounded"
                >
                    {[10, 15, 20, 25, 30, 35, 40].map((rate) => (
                        <option key={rate} value={rate}>
                            {rate}%
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleCalculate}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
                Calculate
            </button>

            {result && (
                <div className="mt-6 p-4 border rounded bg-gray-50">
                    <p>
                        INR {parseFloat(amountINR).toLocaleString()} x {conversionRate} ={" "}
                        {result.nprConverted.toLocaleString()} NPR
                    </p>
                    <p>
                        NPR {result.nprConverted.toLocaleString()} + {commissionRate}% =
                        {result.nprConverted.toLocaleString()} +{" "}
                        {result.commissionAmount.toLocaleString()} ={" "}
                        {result.total.toLocaleString()} NPR
                    </p>
                    <p className="mt-2 font-medium">Product + Nepali Custom + Service charge</p>
                </div>
            )}
        </div>
    );
};

export default PriceCalculator;
