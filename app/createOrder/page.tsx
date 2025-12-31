"use client";

import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import toast, { Toaster } from "react-hot-toast";
import brands from "@/constants/brands";

type Brand = {
    name: string;
};

type Order = {
    id: string;
    name: string;
    mobile?: string;
    address?: string;
};

const CreateOrder: React.FC = () => {
    const [name, setName] = useState("");
    const [countryCode, setCountryCode] = useState("+977");
    const [mobileNumber, setMobileNumber] = useState(""); // 10-digit number
    const [notes, setNotes] = useState("");
    const [address, setAddress] = useState("");
    const [storeName, setStoreName] = useState("Amazon");
    const [quantity, setQuantity] = useState(1);
    const [commission, setCommission] = useState("20%");
    const [courierCharge, setCourierCharge] = useState("Included");
    const [totalAmount, setTotalAmount] = useState(""); // store as string
    const [advancePayment, setAdvancePayment] = useState(""); // store as string

    const [deliveryStatus, setDeliveryStatus] = useState(false);
    const [productUrls, setProductUrls] = useState([""]);
    const [loading, setLoading] = useState(false);

    const handleAddUrl = () => setProductUrls([...productUrls, ""]);

    const handleUrlChange = (index: number, value: string) => {
        const urls = [...productUrls];
        urls[index] = value;
        setProductUrls(urls);
    };

    const handleSubmit = async () => {

        const totalAmountNum = Number(totalAmount);
        const advancePaymentNum = Number(advancePayment);

        // Validate Customer Name
        if (!name.trim()) {
            toast.error("Customer name is required.");
            return;
        }

        // Validate Mobile Number
        if (!mobileNumber.match(/^\d{10}$/)) {
            toast.error("Mobile number must be 10 digits.");
            return;
        }

        // Validate Store Name
        if (!storeName.trim()) {
            toast.error("Store name is required.");
            return;
        }

        if (!quantity || quantity < 1) {
            toast.error("Quantity must be at least 1.");
            return;
        }

        if (!commission.trim()) {
            toast.error("Commission is required.");
            return;
        }

        if (!courierCharge.trim()) {
            toast.error("Courier charge selection is required.");
            return;
        }

        if (totalAmountNum < 0) {
            toast.error("Total amount cannot be negative.");
            return;
        }

        if (advancePaymentNum < 0) {
            toast.error("Advance payment cannot be negative.");
            return;
        }





        if (!address.trim()) {
            toast.error("Customer Address is required.");
            return;
        }

        if (productUrls.some((url) => !url.trim())) {
            toast.error("All product URLs must be filled.");
            return;
        }

        console.log(totalAmount);



        try {
            setLoading(true);

            await addDoc(collection(db, "Confirm Orders"), {
                name,
                mobile: `${countryCode}${mobileNumber}`,
                notes,
                address,
                storeName,
                quantity,
                orderedDate: Timestamp.now(),
                commission,
                courierCharge,
                totalAmount: totalAmountNum,
                advancePayment: advancePaymentNum,
                deliveryStatus,
                productUrls,
                createdAt: Timestamp.now(),
            });

            toast.success("Order created successfully!");

            // Reset fields
            setName("");
            setCountryCode("+977");
            setMobileNumber("");
            setNotes("");
            setAddress("");
            setStoreName("");
            setQuantity(1);
            setCommission("15%");
            setCourierCharge("Included");
            setTotalAmount("");
            setAdvancePayment("");
            setDeliveryStatus(false);
            setProductUrls([""]);
        } catch (error) {
            console.log("Error creating order:", error);
            toast.error("Something went wrong! Try again.");
        } finally {
            setLoading(false);
        }
    };



    /* -------- AUTOCOMPLETE STATE -------- */
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [nameSuggestions, setNameSuggestions] = useState<Order[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [mobileSuggestions, setMobileSuggestions] = useState<Order[]>([]);
    const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);


    const [nameHighlightedIndex, setNameHighlightedIndex] = useState(-1);
    const [mobileHighlightedIndex, setMobileHighlightedIndex] = useState(-1);

    /* ---------------- LOAD ALL ORDERS ONCE ---------------- */

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const snap = await getDocs(collection(db, "Confirm Orders"));

                const orders = snap.docs.slice(0, 5000).map((d) => ({
                    id: d.id,
                    name: d.data().name,
                    mobile: d.data().mobile,
                    address: d.data().address,
                })) as Order[];

                setAllOrders(orders);
            } catch (err) {
                console.error("Failed to load orders:", err);
            }
        };

        loadOrders();
    }, []);


    const handleNameChange = (value: string) => {
        setName(value);

        if (!value.trim()) {
            setNameSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const filtered = allOrders
            .filter((o) =>
                o.name?.toLowerCase().includes(value.toLowerCase())
            )
            .slice(0, 5);

        setNameSuggestions(filtered);
        setShowSuggestions(true);
    };

    const handleMobileChange = (value: string) => {
        // user types only digits, max 10
        const digits = value.replace(/\D/g, "").slice(0, 10);
        setMobileNumber(digits);

        // only show suggestions after 4 digits
        if (digits.length < 4) {
            setMobileSuggestions([]);
            setShowMobileSuggestions(false);
            return;
        }

        const filtered = allOrders
            .filter((o) =>
                o.mobile?.startsWith(`+977${digits}`)
            )
            .slice(0, 5);

        setMobileSuggestions(filtered);
        setShowMobileSuggestions(true);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setNameHighlightedIndex((prev) =>
                prev < nameSuggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setNameHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : nameSuggestions.length - 1
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (nameHighlightedIndex >= 0) {
                const selected = nameSuggestions[nameHighlightedIndex];
                setName(selected.name);
                setAddress(selected.address || "");
                if (selected.mobile?.startsWith("+")) {
                    setCountryCode(selected.mobile.slice(0, 4));
                    setMobileNumber(selected.mobile.slice(4));
                }
                setShowSuggestions(false);
                setNameHighlightedIndex(-1);
            }
        }
    };

    const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showMobileSuggestions) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setMobileHighlightedIndex((prev) =>
                prev < mobileSuggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMobileHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : mobileSuggestions.length - 1
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (mobileHighlightedIndex >= 0) {
                const selected = mobileSuggestions[mobileHighlightedIndex];
                setName(selected.name || "");
                setAddress(selected.address || "");
                setMobileNumber(selected.mobile?.slice(4) || "");
                setShowMobileSuggestions(false);
                setMobileHighlightedIndex(-1);
            }
        }
    };



    return (
        <section className="w-full px-6 py-4 flex justify-center">
            <Toaster position="top-center" />

            <div className="w-full max-w-3xl border border-gray-300 rounded-2xl p-6 shadow-sm">
                <h2 className="text-3xl font-bold text-[#002f5c] mb-4">Create Manual Order</h2>

                {/* Customer Name */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <div className="relative mb-3">
                    <input
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        onBlur={() =>
                            setTimeout(() => setShowSuggestions(false), 150)
                        }
                        onKeyDown={handleNameKeyDown} // <-- here

                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="John Doe"
                    />

                    {showSuggestions && nameSuggestions.length > 0 && (
                        <ul className="absolute z-20 w-full bg-white border border-neutral-200 rounded-lg shadow mt-1">
                            {nameSuggestions.map((o) => (
                                <li
                                    key={o.id}
                                    onClick={() => {
                                        setName(o.name);

                                        if (o.mobile?.startsWith("+")) {
                                            setCountryCode(o.mobile.slice(0, 4));
                                            setMobileNumber(o.mobile.slice(4));
                                        }

                                        setAddress(o.address || "");
                                        setShowSuggestions(false);
                                    }}
                                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${nameSuggestions.indexOf(o) === nameHighlightedIndex ? "bg-blue-100" : ""
                                        }`}                                >
                                    <div className="font-medium">{o.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {o.mobile} • {o.address}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Mobile */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="relative flex-1">
                        <input
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            onFocus={() =>
                                mobileSuggestions.length && setShowMobileSuggestions(true)
                            }
                            onBlur={() =>
                                setTimeout(() => setShowMobileSuggestions(false), 150)
                            }
                            onKeyDown={handleMobileKeyDown} // <-- here

                            placeholder="9812345678"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />

                        {showMobileSuggestions && mobileSuggestions.length > 0 && (
                            <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow mt-1 max-h-48 overflow-auto">
                                {mobileSuggestions.map((order) => (
                                    <li
                                        key={order.id}
                                        onClick={() => {
                                            setName(order.name || "");
                                            setAddress(order.address || "");
                                            setMobileNumber(order.mobile?.slice(4) || ""); // remove +977
                                            setShowMobileSuggestions(false);
                                        }}
                                        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${mobileSuggestions.indexOf(order) === mobileHighlightedIndex ? "bg-blue-100" : ""
                                            }`}                                    >
                                        <div className="font-medium">{order.mobile}</div>
                                        <div className="text-xs text-gray-500">
                                            {order.name} • {order.address}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Address */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Customer Delivery Address"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                />

                {/* Store Name + Quantity in same row */}
                <div className="flex gap-4 mb-3">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                        <input
                            list="store-options"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="Type or select a store"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <datalist id="store-options">
                            {brands.map((b: Brand) => (
                                <option key={b.name} value={b.name} />
                            ))}
                        </datalist>
                    </div>

                    <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                            type="number"
                            value={quantity}
                            min={1}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Commission */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Percentage</label>
                <select
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    {["15%", "20%", "25%", "30%", "35%"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>


                {/* Advance + Remaining Payment in same row */}
                <span className="text-xs">*Total amount with commision</span>
                <div className="flex gap-4 mb-3">

                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (NPR) </label>
                        <input
                            type="number"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment</label>
                        <input
                            type="number"
                            value={advancePayment}
                            onChange={(e) => setAdvancePayment(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                </div>


                {/* Courier Charge */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Courier Charge</label>
                <select
                    value={courierCharge}
                    onChange={(e) => setCourierCharge(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    {["Included", "Not Included"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                {/* Delivery Status */}
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <input
                        type="checkbox"
                        checked={deliveryStatus}
                        onChange={(e) => setDeliveryStatus(e.target.checked)}
                        className="w-4 h-4"
                    />
                    Delivered?
                </label>

                {/* Notes */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                />



                {/* Product URLs */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Product URLs</label>
                {productUrls.map((url, index) => (
                    <div key={index} className="flex mb-2">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => handleUrlChange(index, e.target.value)}
                            placeholder="https://www.amazon.in/…"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                ))}
                <button
                    type="button"
                    onClick={handleAddUrl}
                    className="mb-4 text-blue-600 hover:underline text-sm"
                >
                    + Add more URL
                </button>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full mt-2 bg-[#002f5c] text-white font-semibold rounded-full py-2 text-sm shadow hover:bg-[#003c75] transition flex items-center justify-center"
                >
                    {loading ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        "Create Order"
                    )}
                </button>
            </div>
        </section>
    );
};

export default CreateOrder;