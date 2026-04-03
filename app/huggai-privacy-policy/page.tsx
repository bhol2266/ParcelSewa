"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Section definitions ───────────────────────────────────────────────────────
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
          This Privacy Policy explains how <strong>UK Developers</strong> ("we", "us", "our") collects, uses, stores, and protects your personal information when you use <strong>HuggAI – AI Video Maker</strong> ("the App"). By downloading or using the App, you agree to the practices described in this policy.
        </p>
        <p>
          We are committed to handling your data responsibly and transparently, in compliance with applicable data protection laws including the <strong>UK GDPR</strong> and the <strong>Data Protection Act 2018</strong>.
        </p>
        <div className="mt-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 space-y-1.5">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-500 font-semibold">Last updated: <span className="text-gray-900 font-bold">January 2025</span></span>
            <span className="text-gray-500 font-semibold">Platform: <span className="text-gray-900 font-bold">Android (Google Play)</span></span>
            <span className="text-gray-500 font-semibold">Package: <span className="font-mono text-xs text-gray-900 font-bold">com.bhola.aivideogeneratorhugging</span></span>
          </div>
        </div>
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
        <p>We collect only the information necessary to provide and improve the App:</p>
        <div className="space-y-3 mt-3">
          {[
            {
              label: "Account information",
              color: "blue",
              items: [
                "Email address",
                "Display name",
                "Password (hashed with bcrypt — never stored in plain text)",
              ],
            },
            {
              label: "Content you create",
              color: "teal",
              items: [
                "Text prompts you enter for video and image generation",
                "Generated videos, images, and associated metadata",
                "Your editing and generation history within the app",
              ],
            },
            {
              label: "Usage & device data",
              color: "amber",
              items: [
                "Device type, operating system version, and app version",
                "IP address and approximate location (country / region only)",
                "Crash reports and performance diagnostics",
                "Anonymised feature usage patterns",
              ],
            },
            {
              label: "Payment information",
              color: "coral",
              items: [
                "All payments are processed by Google Play — we never receive or store card details",
                "We receive only: transaction IDs, subscription tier, and purchase status",
              ],
            },
          ].map((cat) => (
            <div
              key={cat.label}
              className={`rounded-xl border-2 p-4 space-y-2 ${
                cat.color === "blue"  ? "border-blue-200 bg-blue-50" :
                cat.color === "teal"  ? "border-teal-200 bg-teal-50" :
                cat.color === "amber" ? "border-amber-200 bg-amber-50" :
                "border-rose-200 bg-rose-50"
              }`}
            >
              <p className={`text-xs font-extrabold uppercase tracking-wider ${
                cat.color === "blue"  ? "text-blue-700" :
                cat.color === "teal"  ? "text-teal-700" :
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
        <p>We use your information solely to operate and improve HuggAI:</p>
        <div className="mt-4 space-y-1">
          {[
            ["🎬", "Provide the service", "Generate AI videos and images from your prompts and manage your account."],
            ["🔧", "Improve the app", "Analyse anonymised usage data to fix bugs and build new features."],
            ["💬", "Customer support", "Respond to your queries, feedback, and issues."],
            ["🔒", "Security", "Detect and prevent fraud, abuse, or unauthorised access."],
            ["⚖️", "Legal compliance", "Meet our obligations under UK and international data protection law."],
            ["💳", "Billing", "Manage your subscription and process payments via Google Play."],
          ].map(([emoji, title, desc]) => (
            <div key={title as string} className="flex gap-3 items-start py-3 border-b-2 border-gray-100 last:border-0">
              <span className="text-lg flex-shrink-0 mt-0.5">{emoji}</span>
              <div>
                <p className="text-sm font-bold text-gray-900">{title as string}</p>
                <p className="text-sm font-medium text-gray-500 mt-0.5">{desc as string}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white rounded-xl border-2 border-gray-200 px-4 py-3">
          <p className="text-sm font-semibold text-gray-700">
            We <span className="font-extrabold text-gray-900">never</span> sell your personal data, use it for unsolicited advertising, or share it with AI training datasets without your explicit consent.
          </p>
        </div>
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
        <p>HuggAI uses AI models to generate videos and images from your text prompts. Here is how your content is handled during that process:</p>
        <div className="mt-4 space-y-3">
          {[
            {
              q: "Are my prompts stored?",
              a: "Yes — your prompt history is saved so you can view and reuse previous generations. You can delete your history at any time from Settings → History.",
            },
            {
              q: "Are my prompts used to train AI models?",
              a: "No. Your prompts and generated content are never used to train or fine-tune AI models without your separate, explicit consent.",
            },
            {
              q: "Are my videos and images private?",
              a: "Yes. All generated content is private by default and accessible only to you. We do not share, publish, or sell your creations.",
            },
            {
              q: "Which AI providers power the app?",
              a: "We use trusted third-party AI generation services. Each provider is bound by a data processing agreement and is contractually prohibited from using your data for their own model training.",
            },
            {
              q: "How long is my generated content kept?",
              a: "Your content is retained until you delete it or your account is deleted. See the Data Retention section for full details.",
            },
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
        <p>We do not sell or trade your data. We share it only in these specific, limited circumstances:</p>
        <div className="mt-4 space-y-2">
          {[
            {
              who: "AI service providers",
              why: "To process your prompts and generate videos/images. All providers are contractually bound by data processing agreements.",
              badge: "blue",
            },
            {
              who: "Cloud infrastructure",
              why: "Secure hosting and storage providers that hold your account data and generated content under strict access controls.",
              badge: "teal",
            },
            {
              who: "Analytics (anonymised)",
              why: "Crash reporting and app performance tools receive non-identifiable, aggregated data only.",
              badge: "amber",
            },
            {
              who: "Google Play (payments)",
              why: "Google Play processes all in-app purchases. We receive only transaction IDs, subscription tier, and purchase status — never card details.",
              badge: "green",
            },
            {
              who: "Legal authorities",
              why: "Only when required by applicable law, a valid court order, or to protect against fraud or illegal activity.",
              badge: "red",
            },
          ].map(({ who, why, badge }) => (
            <div key={who} className="rounded-xl border-2 border-gray-100 bg-white p-4 flex gap-3 items-start">
              <span className={`mt-0.5 text-xs font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap ${
                badge === "blue"  ? "bg-blue-100 text-blue-700" :
                badge === "teal"  ? "bg-teal-100 text-teal-700" :
                badge === "amber" ? "bg-amber-100 text-amber-700" :
                badge === "green" ? "bg-green-100 text-green-700" :
                "bg-rose-100 text-rose-700"
              }`}>{who}</span>
              <p className="text-sm font-medium text-gray-600 leading-relaxed">{why}</p>
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
        <p>Under the UK GDPR you have the following rights over your personal data. To exercise any of them, email us — we will respond within 30 days.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {[
            { right: "Access", icon: "🔍", desc: "Request a copy of all personal data we hold about you." },
            { right: "Rectification", icon: "✏️", desc: "Ask us to correct any inaccurate or incomplete data." },
            { right: "Erasure", icon: "🗑️", desc: "Request permanent deletion of your account and all associated data." },
            { right: "Portability", icon: "📦", desc: "Receive your data in a portable, machine-readable format." },
            { right: "Restriction", icon: "⏸️", desc: "Ask us to pause or limit processing of your data." },
            { right: "Objection", icon: "🙋", desc: "Object to processing carried out on the basis of legitimate interests." },
          ].map(({ right, icon, desc }) => (
            <div key={right} className="rounded-xl border-2 border-gray-200 bg-white p-3.5 space-y-1.5">
              <p className="text-sm font-extrabold text-pink-600 flex items-center gap-1.5">
                <span>{icon}</span> {right}
              </p>
              <p className="text-xs font-medium text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border-2 border-pink-100 bg-pink-50 px-4 py-3">
          <p className="text-sm font-semibold text-pink-900">
            To exercise any right, email{" "}
            <a href="mailto:enquiry@uktechdeveloper.co.uk" className="font-bold underline underline-offset-2 hover:text-pink-700 break-all">
              enquiry@uktechdeveloper.co.uk
            </a>. We respond within <strong>30 days</strong>.
          </p>
        </div>
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
        <p>We keep your data only for as long as necessary. Here is exactly how long each category is retained:</p>
        <div className="mt-4 rounded-xl border-2 border-gray-200 overflow-hidden">
          {[
            { type: "Account & profile data", period: "Until account deletion", note: "" },
            { type: "Generated videos & images", period: "Until deleted by you or account deletion", note: "" },
            { type: "Prompt history", period: "Until cleared by you or account deletion", note: "" },
            { type: "Billing & transaction records", period: "Up to 30 days after account deletion", note: "legal", highlight: true },
            { type: "Crash reports & error logs", period: "90 days (anonymised)", note: "" },
            { type: "Legal hold data", period: "As required by applicable law", note: "" },
          ].map(({ type, period, highlight }, i) => (
            <div
              key={type}
              className={`flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-1 ${
                i !== 0 ? "border-t-2 border-gray-100" : ""
              } ${highlight ? "bg-amber-50" : "bg-white"}`}
            >
              <span className="text-sm font-bold text-gray-700">{type}</span>
              <span className={`text-xs font-bold whitespace-nowrap ${highlight ? "text-amber-600" : "text-gray-500"}`}>
                {period}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold text-gray-500">
          Billing records are retained slightly longer than other data as required by UK financial regulations.
        </p>
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
        <p>We implement industry-standard security measures to protect your data:</p>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {[
            { icon: "🔐", text: "All data transmitted between your device and our servers is encrypted using TLS 1.2+" },
            { icon: "🔑", text: "Passwords are hashed using bcrypt — they are never stored or transmitted in plain text" },
            { icon: "☁️", text: "Generated videos and images are stored in encrypted cloud storage with strict access controls" },
            { icon: "🔬", text: "We conduct regular security reviews and vulnerability assessments" },
            { icon: "👥", text: "Access to production data is restricted to authorised personnel only, on a need-to-know basis" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3 text-sm font-semibold text-gray-700 bg-green-50 border-2 border-green-100 rounded-xl px-4 py-3">
              <span className="flex-shrink-0">{icon}</span>
              {text}
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white border-2 border-gray-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-gray-700">
            No system is 100% secure. If you suspect a security issue or breach, contact us immediately at{" "}
            <a href="mailto:admin@uktechdeveloper.co.uk" className="text-pink-600 underline underline-offset-2 hover:text-pink-700 font-bold break-all">
              admin@uktechdeveloper.co.uk
            </a>.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "third-party",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2a7 7 0 100 14A7 7 0 009 2z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 9h14M9 2c-2 2-3 4.5-3 7s1 5 3 7M9 2c2 2 3 4.5 3 7s-1 5-3 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Third-party services",
    content: (
      <>
        <p>The App integrates with the following third-party services. Each has its own privacy policy:</p>
        <div className="mt-4 space-y-2">
          {[
            { name: "Google Play", purpose: "App distribution and in-app payments", link: "https://policies.google.com/privacy" },
            { name: "Google Firebase", purpose: "Authentication, analytics, and crash reporting", link: "https://firebase.google.com/support/privacy" },
            { name: "AI generation APIs", purpose: "Video and image generation from your prompts", link: null },
            { name: "Cloud storage provider", purpose: "Secure storage of your generated content", link: null },
          ].map(({ name, purpose, link }) => (
            <div key={name} className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">{name}</p>
                <p className="text-xs font-medium text-gray-500">{purpose}</p>
              </div>
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-pink-600 hover:text-pink-700 underline underline-offset-2 whitespace-nowrap">
                  Privacy policy →
                </a>
              ) : (
                <span className="text-xs font-semibold text-gray-400">Policy on request</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-600">
          We are not responsible for the privacy practices of third-party services. We recommend reviewing their policies independently.
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
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 mb-4">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <p className="text-sm font-bold text-amber-800">
            HuggAI is <strong>not intended for children under 13</strong> (or under 16 in the European Union). We do not knowingly collect personal data from minors.
          </p>
        </div>
        <p className="text-sm font-semibold text-gray-700">
          If you are a parent or guardian and believe your child has registered or submitted personal data through our App, please contact us immediately. We will verify and delete the information promptly.
        </p>
        <div className="mt-4 rounded-xl border-2 border-pink-100 bg-pink-50 px-4 py-3">
          <p className="text-sm font-semibold text-pink-900">
            Contact us at{" "}
            <a href="mailto:enquiry@uktechdeveloper.co.uk" className="font-bold underline underline-offset-2 hover:text-pink-700 break-all">
              enquiry@uktechdeveloper.co.uk
            </a>{" "}
            and include the subject line <strong>"Child Account"</strong> so we can prioritise your request.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "changes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 9a6 6 0 0110.5-4M15 9a6 6 0 01-10.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M13 5l.5 2.5-2.5.5M5 13l-.5-2.5 2.5-.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Policy changes",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in the App, our practices, or legal requirements.
        </p>
        <div className="mt-4 space-y-3">
          {[
            { label: "How we notify you", text: "We will notify you of material changes via an in-app notification and/or an email to the address on your account." },
            { label: "When changes take effect", text: "Updated policies take effect 14 days after notification, giving you time to review the changes." },
            { label: "Continued use", text: "Continuing to use the App after the effective date constitutes acceptance of the updated policy." },
            { label: "Version history", text: "The 'Last updated' date at the top of this page always reflects the most recent revision." },
          ].map(({ label, text }) => (
            <div key={label} className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0 mt-2" />
              <div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-sm font-medium text-gray-500 mt-0.5">{text}</p>
              </div>
            </div>
          ))}
        </div>
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
        <p>For any questions, concerns, or requests relating to this Privacy Policy or your personal data, please contact us:</p>
        <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
          {/* Developer card */}
          <div className="px-5 py-4 flex items-center gap-3 border-b-2 border-gray-100">
            <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
              <Image src="/app_icon.png" alt="HuggAI" width={44} height={44} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Developer</p>
              <p className="text-sm font-extrabold text-gray-900">UK Developers</p>
              <p className="text-xs font-semibold text-gray-500">HuggAI – AI Video Maker</p>
            </div>
          </div>
          {/* Contact rows */}
          {[
            { label: "Enquiry", value: "enquiry@uktechdeveloper.co.uk", href: "mailto:enquiry@uktechdeveloper.co.uk" },
            { label: "Info", value: "info@uktechdeveloper.co.uk", href: "mailto:info@uktechdeveloper.co.uk" },
            { label: "Admin", value: "admin@uktechdeveloper.co.uk", href: "mailto:admin@uktechdeveloper.co.uk" },
            { label: "Website", value: "uktechdeveloper.co.uk", href: "https://uktechdeveloper.co.uk" },
          ].map(({ label, value, href }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3 border-t-2 border-gray-100 gap-3">
              <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex-shrink-0">{label}</span>
              <a href={href} className="text-sm font-bold text-pink-600 hover:text-pink-700 underline underline-offset-2 transition-colors break-all text-right">
                {value}
              </a>
            </div>
          ))}
        </div>

        {/* ICO */}
        <div className="mt-4 rounded-xl border-2 border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900">
            You also have the right to lodge a complaint with the{" "}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2 hover:text-blue-700">
              Information Commissioner's Office (ICO)
            </a>{" "}
            if you believe we have handled your data unlawfully.
          </p>
        </div>

        {/* Delete account CTA */}
        <div className="mt-4 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-bold text-rose-800">Want to delete your account?</p>
          <Link
            href="/huggai-delete-account"
            className="text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Delete account →
          </Link>
        </div>
      </>
    ),
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PrivacyPolicyPage() {
  const [active, setActive] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeSection = sections.find((s) => s.id === active)!;
  const activeIndex = sections.findIndex((s) => s.id === active);

  const handleNav = (id: string) => {
    setActive(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="border-b-2 border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-20"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
          <Image src="/app_icon.png" alt="HuggAI" width={40} height={40} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-base font-extrabold text-gray-900 tracking-tight block leading-tight">HuggAI</span>
          <p className="text-xs font-bold text-gray-500 truncate" style={{ fontFamily: "monospace" }}>
            Privacy Policy · AI Video & Image Maker
          </p>
        </div>
        <span className="hidden xs:inline-flex text-xs font-extrabold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full tracking-wide whitespace-nowrap flex-shrink-0">
          UK Developers
        </span>
        {/* Hamburger */}
        <button
          className="md:hidden flex-shrink-0 w-9 h-9 rounded-lg border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 transition-colors"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 2l11 11M13 2L2 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 3.5h11M2 7.5h11M2 11.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </header>

      {/* ── Mobile nav dropdown ────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden sticky top-[61px] z-10 bg-white border-b-2 border-gray-200 shadow-md px-3 py-2 max-h-[60vh] overflow-y-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => handleNav(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all ${
                active === s.id
                  ? "bg-pink-50 text-pink-700 font-extrabold"
                  : "text-gray-500 font-semibold hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span className={active === s.id ? "text-pink-500" : "text-gray-400"}>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 flex gap-6 lg:gap-8">
        {/* ── Sidebar ────────────────────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col gap-0.5 w-52 lg:w-56 flex-shrink-0 sticky top-20 self-start">
          <p
            className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 px-3"
            style={{ fontFamily: "monospace" }}
          >
            Contents
          </p>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => handleNav(s.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-150 ${
                active === s.id
                  ? "bg-pink-50 text-pink-700 font-extrabold"
                  : "text-gray-500 font-semibold hover:text-gray-800 hover:bg-white"
              }`}
            >
              <span className={active === s.id ? "text-pink-500" : "text-gray-400"}>{s.icon}</span>
              {s.title}
            </button>
          ))}

          {/* Progress indicator */}
          <div className="mt-6 px-3">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
              <span>Progress</span>
              <span>{activeIndex + 1}/{sections.length}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-400 rounded-full transition-all duration-300"
                style={{ width: `${((activeIndex + 1) / sections.length) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5 sm:mb-6 animate-fade-in" key={active + "-head"}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-pink-100 text-pink-600">
              {activeSection.icon}
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest" style={{ fontFamily: "monospace" }}>
                {activeIndex + 1} of {sections.length}
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {activeSection.title}
              </h1>
            </div>
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
            {activeIndex > 0 ? (
              <button
                onClick={() => handleNav(sections[activeIndex - 1].id)}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-pink-500 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="max-w-[110px] sm:max-w-none truncate">{sections[activeIndex - 1].title}</span>
              </button>
            ) : <span />}
            {activeIndex < sections.length - 1 ? (
              <button
                onClick={() => handleNav(sections[activeIndex + 1].id)}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-pink-500 transition-colors ml-auto"
              >
                <span className="max-w-[110px] sm:max-w-none truncate">{sections[activeIndex + 1].title}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            ) : <span />}
          </div>
        </main>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t-2 border-gray-200 mt-8 sm:mt-10 py-5 sm:py-6 px-4 sm:px-6" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-bold text-gray-500 text-center sm:text-left">
            © 2025 UK Developers · HuggAI – AI Video & Image Maker · All rights reserved
          </p>
          <Link
            href="/huggai-delete-account"
            className="text-xs font-extrabold text-rose-500 hover:text-rose-700 underline underline-offset-2 transition-colors whitespace-nowrap"
          >
            Request account deletion
          </Link>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.25s ease both; }
        .prose-custom p { margin-bottom: 0.75rem; font-weight: 500; }
        .prose-custom strong { color: #111827; font-weight: 800; }
      `}</style>
    </div>
  );
}