"use client";

import { useState } from "react";
import Image from "next/image";

// ─── Account Deletion Form ────────────────────────────────────────────────────
function AccountDeletionForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5 sm:p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 11l4 4 8-8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-base font-bold text-green-800">Request received</p>
        <p className="text-sm font-semibold text-green-700">
          We have received your account deletion request for <strong>{email}</strong>. A member of the <strong>UK Developers</strong> team will process your request within <strong>30 days</strong> and send a confirmation to your email address.
        </p>
        <p className="text-xs font-semibold text-green-600 mt-1">
          Questions? Email{" "}
          <a href="mailto:enquiry@uktechdeveloper.co.uk" className="underline underline-offset-2 font-bold break-all">
            enquiry@uktechdeveloper.co.uk
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-amber-800 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
        <span className="font-extrabold text-amber-700">Important:</span> Deleting your <strong>HuggAI</strong> account is permanent and cannot be undone. All your generated videos, images, prompts, and account data will be erased within 30 days. Billing records may be retained for up to 30 additional days as required by law.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-1.5">
            Full name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-1.5">
            Email address on your HuggAI account <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-1.5">
            Reason for deletion <span className="text-gray-400 normal-case font-semibold">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Let us know why you'd like to delete your account…"
            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!name.trim() || !email.trim() || loading}
        className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl px-6 py-3 transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30" strokeDashoffset="10" />
            </svg>
            Submitting…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Submit deletion request
          </>
        )}
      </button>

      <p className="text-xs font-semibold text-gray-500 text-center">
        This request is submitted to <strong>UK Developers</strong> for <strong>HuggAI – AI Video Maker</strong>. We will respond within 30 days.
      </p>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────
const sections = [
  {
    id: "overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L3 5v5c0 3.5 2.5 6.5 6 7.5C13.5 16.5 16 13.5 16 10V5L9 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
    title: "Overview",
    content: (
      <>
        <p>
          This Privacy Policy explains how <strong>UK Developers</strong> ("we", "us", "our") collects, uses, stores, and protects your personal information when you use <strong>HuggAI – AI Video Maker</strong> ("the App"). By using the App, you agree to the terms described here.
        </p>
        <p>
          We are committed to handling your data transparently and in compliance with applicable data protection laws, including the UK GDPR and the Data Protection Act 2018.
        </p>
        <p className="text-sm font-semibold text-gray-600 border-2 border-gray-200 bg-white rounded-xl px-4 py-3 mt-2">
          Last updated: <span className="text-gray-900 font-bold">January 2025</span> &nbsp;·&nbsp; Applies to: <span className="text-gray-900 font-bold">HuggAI Android app (Google Play)</span>
        </p>
      </>
    ),
  },
  {
    id: "collect",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "What we collect",
    content: (
      <>
        <p>We collect the following categories of information:</p>
        <div className="space-y-3 mt-3">
          {[
            { label: "Account information", color: "blue", items: ["Email address", "Display name", "Password (hashed, never stored in plain text)"] },
            { label: "Content you create", color: "teal", items: ["Prompts and text inputs for video/image generation", "Generated videos, images and metadata", "Editing history within the app"] },
            { label: "Usage & technical data", color: "amber", items: ["Device type, OS version, app version", "IP address and general location (country/region)", "Crash reports and performance logs", "Feature usage patterns (anonymised)"] },
            { label: "Payment data", color: "coral", items: ["Billing records (processed by Google Play — we do not store card details)", "Subscription tier and transaction IDs"] },
          ].map((cat) => (
            <div key={cat.label} className={`rounded-xl border-2 p-4 space-y-2 ${
              cat.color === "blue" ? "border-blue-200 bg-blue-50" :
              cat.color === "teal" ? "border-teal-200 bg-teal-50" :
              cat.color === "amber" ? "border-amber-200 bg-amber-50" :
              "border-rose-200 bg-rose-50"
            }`}>
              <p className={`text-xs font-extrabold uppercase tracking-wider ${
                cat.color === "blue" ? "text-blue-700" :
                cat.color === "teal" ? "text-teal-700" :
                cat.color === "amber" ? "text-amber-700" :
                "text-rose-700"
              }`}>{cat.label}</p>
              <ul className="space-y-1">
                {cat.items.map((item) => (
                  <li key={item} className="text-sm font-semibold text-gray-700 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "use",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 5.5v4l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "How we use your data",
    content: (
      <>
        <p>We use your information only for the following purposes:</p>
        <div className="mt-4 space-y-2">
          {[
            ["Provide the service", "Generate AI videos and images based on your prompts and manage your account."],
            ["Improve the app", "Analyse anonymised usage data to fix bugs and develop new features."],
            ["Customer support", "Respond to your queries and resolve issues."],
            ["Security", "Detect and prevent fraud, abuse, or unauthorised access."],
            ["Legal compliance", "Meet our obligations under UK and international law."],
            ["Billing", "Manage subscriptions and process payments via Google Play."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3 items-start py-2.5 border-b-2 border-gray-100 last:border-0">
              <div className="w-5 h-5 mt-0.5 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="#e11d48" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-sm font-medium text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-700 bg-white rounded-xl px-4 py-3 border-2 border-gray-200">
          We do <span className="text-gray-900 font-extrabold">not</span> sell your personal data to third parties, use it for unsolicited advertising, or share it with AI training datasets without your explicit consent.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="6.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="11.5" cy="9.5" r="1" fill="currentColor" />
      </svg>
    ),
    title: "AI & video generation",
    content: (
      <>
        <p>HuggAI uses AI models to generate videos and images from your text prompts. Here is how your content is handled:</p>
        <div className="mt-4 space-y-3">
          {[
            { q: "Are my prompts stored?", a: "Yes — to display your generation history and allow re-use. You can delete your history at any time from account settings." },
            { q: "Are my prompts used to train AI models?", a: "No. Your prompts and generated videos are not used to train or fine-tune any AI models without your explicit, separate consent." },
            { q: "Are my videos shared with anyone?", a: "Your generated videos and images are private by default, accessible only to you. We do not share them unless required by law." },
            { q: "What AI providers do we use?", a: "We use third-party AI services for generation. These providers are bound by data processing agreements and are contractually prohibited from using your data for their own training." },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border-2 border-gray-200 bg-white p-4 space-y-1.5">
              <p className="text-sm font-bold text-gray-900">{q}</p>
              <p className="text-sm font-medium text-gray-600 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "sharing",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="14" cy="4" r="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="4" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="14" cy="14" r="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 8L12 5M6 10l6 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Data sharing",
    content: (
      <>
        <p>We only share your data in the following limited circumstances:</p>
        <div className="mt-4 space-y-2">
          {[
            ["AI service providers", "To generate videos and images. Bound by data processing agreements."],
            ["Cloud infrastructure", "Secure hosting providers for storing your account and generated content."],
            ["Analytics (anonymised)", "Crash reporting and performance tools — non-identifiable data only."],
            ["Payment processors", "Google Play handles all payments. We receive only transaction IDs and subscription status."],
            ["Legal authorities", "Only when required by applicable law, court order, or to protect against fraud."],
          ].map(([who, why]) => (
            <div key={who} className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-2.5 border-b-2 border-gray-100 last:border-0 items-start">
              <span className="text-xs font-extrabold text-pink-600 sm:w-36 flex-shrink-0">{who}</span>
              <span className="text-sm font-medium text-gray-600">{why}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "rights",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L3 5v5c0 3.5 2.5 6.5 6 7.5C13.5 16.5 16 13.5 16 10V5L9 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M6.5 9l2 2 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Your rights",
    content: (
      <>
        <p>Under UK GDPR, you have the following rights regarding your personal data:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {[
            ["Access", "Request a copy of the data we hold about you."],
            ["Rectification", "Correct inaccurate or incomplete data."],
            ["Erasure", "Request deletion of your account and data."],
            ["Portability", "Receive your data in a machine-readable format."],
            ["Restriction", "Limit how we process your data."],
            ["Objection", "Object to processing based on legitimate interests."],
          ].map(([right, desc]) => (
            <div key={right} className="rounded-xl border-2 border-gray-200 bg-white p-3 space-y-1">
              <p className="text-xs font-extrabold text-pink-600 uppercase tracking-wider">{right}</p>
              <p className="text-xs font-medium text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-700">
          To exercise any of these rights, email us at{" "}
          <a href="mailto:enquiry@uktechdeveloper.co.uk" className="text-pink-600 underline underline-offset-2 hover:text-pink-700 transition-colors font-bold break-all">
            enquiry@uktechdeveloper.co.uk
          </a>. We will respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="4" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 2v3M12 2v3M3 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Data retention",
    content: (
      <>
        <p>We retain your data only as long as necessary for the purposes described in this policy:</p>
        <div className="mt-4 space-y-2">
          {[
            { type: "Account & profile", period: "Until account deletion" },
            { type: "Generated videos & images", period: "Until account deletion or manual deletion" },
            { type: "Prompt history", period: "Until account deletion or manual clear" },
            { type: "Billing records", period: "30 days after account deletion", highlight: true },
            { type: "Crash & error logs", period: "90 days (anonymised)" },
            { type: "Legal hold data", period: "As required by applicable law" },
          ].map(({ type, period, highlight }) => (
            <div key={type} className="flex flex-col xs:flex-row justify-between items-start xs:items-center py-2.5 border-b-2 border-gray-100 last:border-0 gap-0.5">
              <span className="text-sm font-bold text-gray-700">{type}</span>
              <span className={`text-xs font-bold ${highlight ? "text-amber-600" : "text-gray-500"}`}>{period}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "security",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="4" y="8" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 8V6a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="9" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    title: "Security",
    content: (
      <>
        <p>We take the security of your data seriously and implement the following measures:</p>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {[
            "All data is encrypted in transit using TLS 1.2+",
            "Passwords are hashed using bcrypt — never stored in plain text",
            "Generated videos and images are stored in encrypted cloud storage with access controls",
            "We conduct regular security reviews and vulnerability assessments",
            "Access to production data is restricted to authorised personnel only",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm font-semibold text-gray-700 bg-green-50 border-2 border-green-100 rounded-xl px-4 py-3">
              <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5L2 3.75v4c0 2.8 2 5.2 5 6 3-0.8 5-3.2 5-6v-4L7 1.5z" stroke="#16a34a" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M4.5 7l2 2 3-3" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl px-4 py-3">
          Despite our best efforts, no system is 100% secure. If you suspect a security breach, contact us immediately at{" "}
          <a href="mailto:admin@uktechdeveloper.co.uk" className="text-pink-600 underline underline-offset-2 hover:text-pink-700 transition-colors font-bold break-all">
            admin@uktechdeveloper.co.uk
          </a>.
        </p>
      </>
    ),
  },
  {
    id: "children",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Children's privacy",
    content: (
      <>
        <p>
          HuggAI is not intended for children under the age of 13 (or 16 in the EU). We do not knowingly collect personal data from children.
        </p>
        <p className="mt-3">
          If you believe a child has created an account or submitted personal data through our App, please contact us at{" "}
          <a href="mailto:enquiry@uktechdeveloper.co.uk" className="text-pink-600 underline underline-offset-2 hover:text-pink-700 transition-colors font-bold break-all">
            enquiry@uktechdeveloper.co.uk
          </a>{" "}
          and we will delete the information promptly.
        </p>
      </>
    ),
  },
  {
    id: "delete-account",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 5h12M7 5V3h4v2M6 5l.5 10h5L12 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Account deletion",
    content: (
      <>
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 mb-5 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 mt-0.5">
            <circle cx="9" cy="9" r="7" stroke="#e11d48" strokeWidth="1.6" />
            <path d="M9 6v4" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="9" cy="12.5" r="0.8" fill="#e11d48" />
          </svg>
          <p className="text-sm font-bold text-rose-800">
            This is the official account deletion page for <strong>HuggAI – AI Video Maker</strong> published by <strong>UK Developers</strong> on Google Play (<span className="font-mono text-xs font-bold break-all">com.bhola.aivideogeneratorhugging</span>). Submit the form below to permanently delete your account and all associated data.
          </p>
        </div>

        <p className="text-sm font-semibold text-gray-700 mb-4">
          Under UK GDPR and Google Play's User Data policy, you have the right to request deletion of your <strong>HuggAI</strong> account and all personal data held by <strong>UK Developers</strong> at any time. You may also delete your account directly inside the app via <span className="font-extrabold text-gray-900">Settings → Account → Delete Account</span>.
        </p>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <p className="text-sm font-extrabold text-gray-900 mb-4">Request account deletion</p>
          <AccountDeletionForm />
        </div>

        <div className="mt-5 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-4 space-y-3">
          <p className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">What happens after you submit</p>
          {[
            "We will verify your identity using the email address provided.",
            "Your HuggAI account, generated videos, images, and prompts will be permanently deleted within 30 days.",
            "Billing records may be retained for up to 30 additional days as required by law.",
            "A confirmation email will be sent to your address once deletion is complete.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm font-semibold text-gray-700">
              <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm font-semibold text-gray-700">
          Questions? Email{" "}
          <a href="mailto:enquiry@uktechdeveloper.co.uk" className="text-pink-600 underline underline-offset-2 hover:text-pink-700 transition-colors font-bold break-all">
            enquiry@uktechdeveloper.co.uk
          </a>
        </p>
      </>
    ),
  },
  {
    id: "contact",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 7l7 4 7-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Contact us",
    content: (
      <>
        <p>If you have any questions about this Privacy Policy or how we handle your data, please contact:</p>
        <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Developer</p>
              <p className="text-sm font-extrabold text-gray-900">UK Developers</p>
            </div>
          </div>
          {[
            { label: "Enquiry", value: "enquiry@uktechdeveloper.co.uk", href: "mailto:enquiry@uktechdeveloper.co.uk" },
            { label: "Info", value: "info@uktechdeveloper.co.uk", href: "mailto:info@uktechdeveloper.co.uk" },
            { label: "Admin", value: "admin@uktechdeveloper.co.uk", href: "mailto:admin@uktechdeveloper.co.uk" },
            { label: "Website", value: "uktechdeveloper.co.uk", href: "https://uktechdeveloper.co.uk" },
          ].map(({ label, value, href }) => (
            <div key={label} className="flex flex-col xs:flex-row xs:items-center justify-between py-2 border-t-2 border-gray-100 gap-0.5">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">{label}</span>
              <a href={href} className="text-sm font-bold text-pink-600 hover:text-pink-700 underline underline-offset-2 transition-colors break-all">{value}</a>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-700">
          You also have the right to lodge a complaint with the{" "}
          <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-pink-600 underline underline-offset-2 hover:text-pink-700 transition-colors font-bold">
            Information Commissioner's Office (ICO)
          </a>{" "}
          if you believe we have handled your data unlawfully.
        </p>
      </>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrivacyPolicyPage() {
  const [active, setActive] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeSection = sections.find((s) => s.id === active)!;

  const handleSectionChange = (id: string) => {
    setActive(id);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        colorScheme: "light",
        backgroundColor: "#f9fafb",
        fontFamily: "'Georgia', serif",
        color: "#111827",
      }}
    >
      {/* Header */}
      <header
        className="border-b-2 border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-20"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        {/* App Icon */}
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
          <Image
            src="/app_icon.png"
            alt="HuggAI App Icon"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-base font-extrabold text-gray-900 tracking-tight block leading-tight">HuggAI</span>
          <p className="text-xs font-bold text-gray-500 truncate" style={{ fontFamily: "monospace" }}>
            Privacy Policy · AI Video & Image Maker
          </p>
        </div>

        {/* Badge — hidden on very small screens */}
        <div className="hidden xs:block flex-shrink-0">
          <span className="text-xs font-extrabold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full tracking-wide whitespace-nowrap">
            UK Developers
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex-shrink-0 w-9 h-9 rounded-lg border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile slide-down nav menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden sticky top-[65px] z-10 border-b-2 border-gray-200 bg-white px-3 py-2 shadow-md"
        >
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSectionChange(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-150 ${
                active === s.id
                  ? "bg-pink-50 text-pink-700 font-extrabold"
                  : s.id === "delete-account"
                  ? "text-rose-500 font-bold hover:text-rose-700 hover:bg-rose-50"
                  : "text-gray-500 font-semibold hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span className={
                active === s.id ? "text-pink-500" :
                s.id === "delete-account" ? "text-rose-400" :
                "text-gray-400"
              }>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 flex gap-6 lg:gap-8">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex flex-col gap-0.5 w-52 lg:w-56 flex-shrink-0 sticky top-20 self-start">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-3" style={{ fontFamily: "monospace" }}>Contents</p>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-150 ${
                active === s.id
                  ? "bg-pink-50 text-pink-700 font-extrabold"
                  : s.id === "delete-account"
                  ? "text-rose-500 font-bold hover:text-rose-700 hover:bg-rose-50"
                  : "text-gray-500 font-semibold hover:text-gray-800 hover:bg-white"
              }`}
            >
              <span className={
                active === s.id ? "text-pink-500" :
                s.id === "delete-account" ? "text-rose-400" :
                "text-gray-400"
              }>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Section heading */}
          <div className="flex items-center gap-3 mb-5 sm:mb-6 animate-fade-in" key={active + "-head"}>
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              active === "delete-account" ? "bg-rose-100 text-rose-600" : "bg-pink-100 text-pink-600"
            }`}>
              {activeSection.icon}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{activeSection.title}</h1>
          </div>

          {/* Section body */}
          <div
            key={active + "-body"}
            className="prose-custom space-y-4 leading-relaxed text-[14px] sm:text-[15px] animate-fade-in"
            style={{ color: "#374151" }}
          >
            {activeSection.content}
          </div>

          {/* Prev / Next */}
          <div className="flex justify-between mt-10 sm:mt-12 pt-5 sm:pt-6 border-t-2 border-gray-100">
            {sections.findIndex((s) => s.id === active) > 0 ? (
              <button
                onClick={() => setActive(sections[sections.findIndex((s) => s.id === active) - 1].id)}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-pink-500 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="max-w-[100px] sm:max-w-none truncate">
                  {sections[sections.findIndex((s) => s.id === active) - 1].title}
                </span>
              </button>
            ) : <span />}
            {sections.findIndex((s) => s.id === active) < sections.length - 1 ? (
              <button
                onClick={() => setActive(sections[sections.findIndex((s) => s.id === active) + 1].id)}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-pink-500 transition-colors ml-auto"
              >
                <span className="max-w-[100px] sm:max-w-none truncate">
                  {sections[sections.findIndex((s) => s.id === active) + 1].title}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            ) : <span />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-gray-200 mt-8 sm:mt-10 py-5 sm:py-6 px-4 sm:px-6 text-center" style={{ backgroundColor: "#ffffff" }}>
        <p className="text-xs font-bold text-gray-500">© 2025 UK Developers · HuggAI – AI Video & Image Maker · All rights reserved</p>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease both;
        }
        .prose-custom p {
          margin-bottom: 0.75rem;
          font-weight: 500;
        }
        .prose-custom strong {
          color: #111827;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}