"use client";

import { useState } from "react";

const sections = [
  {
    id: "overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L3 5v5c0 3.5 2.5 6.5 6 7.5C13.5 16.5 16 13.5 16 10V5L9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
    title: "Overview",
    content: (
      <>
        <p>
          This Privacy Policy explains how <strong>UK Tech Developer</strong> ("we", "us", "our") collects, uses, stores, and protects your personal information when you use our AI Video Generator app ("the App"). By using the App, you agree to the terms described here.
        </p>
        <p>
          We are committed to handling your data transparently and in compliance with applicable data protection laws, including the UK GDPR and the Data Protection Act 2018.
        </p>
        <p className="text-sm text-white/40 border border-white/10 rounded-xl px-4 py-3 mt-2">
          Last updated: <span className="text-white/60">January 2025</span> &nbsp;·&nbsp; Applies to: <span className="text-white/60">Android app (Google Play)</span>
        </p>
      </>
    ),
  },
  {
    id: "collect",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "What we collect",
    content: (
      <>
        <p>We collect the following categories of information:</p>
        <div className="space-y-3 mt-3">
          {[
            {
              label: "Account information",
              color: "blue",
              items: ["Email address", "Display name", "Password (hashed, never stored in plain text)"],
            },
            {
              label: "Content you create",
              color: "teal",
              items: ["Prompts and text inputs you provide for video generation", "Generated videos and associated metadata", "Editing history within the app"],
            },
            {
              label: "Usage & technical data",
              color: "amber",
              items: ["Device type, OS version, app version", "IP address and general location (country/region)", "Crash reports and performance logs", "Feature usage patterns (anonymised)"],
            },
            {
              label: "Payment data",
              color: "coral",
              items: ["Billing records (processed by Google Play — we do not store card details)", "Subscription tier and transaction IDs"],
            },
          ].map((cat) => (
            <div key={cat.label} className={`rounded-xl border p-4 space-y-2 ${
              cat.color === "blue" ? "border-blue-500/20 bg-blue-500/5" :
              cat.color === "teal" ? "border-teal-500/20 bg-teal-500/5" :
              cat.color === "amber" ? "border-amber-500/20 bg-amber-500/5" :
              "border-rose-500/20 bg-rose-500/5"
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${
                cat.color === "blue" ? "text-blue-400" :
                cat.color === "teal" ? "text-teal-400" :
                cat.color === "amber" ? "text-amber-400" :
                "text-rose-400"
              }`}>{cat.label}</p>
              <ul className="space-y-1">
                {cat.items.map((item) => (
                  <li key={item} className="text-sm text-white/60 flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
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
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M9 5.5v4l2.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "How we use your data",
    content: (
      <>
        <p>We use your information only for the following purposes:</p>
        <div className="mt-4 space-y-2">
          {[
            ["Provide the service", "Generate videos based on your prompts and manage your account."],
            ["Improve the app", "Analyse anonymised usage data to fix bugs and develop new features."],
            ["Customer support", "Respond to your queries and resolve issues."],
            ["Security", "Detect and prevent fraud, abuse, or unauthorised access."],
            ["Legal compliance", "Meet our obligations under UK and international law."],
            ["Billing", "Manage subscriptions and process payments via Google Play."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3 items-start py-2 border-b border-white/5 last:border-0">
              <div className="w-5 h-5 mt-0.5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">{title}</p>
                <p className="text-sm text-white/40">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/40 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5">
          We do <span className="text-white/70 font-medium">not</span> sell your personal data to third parties, use it for unsolicited advertising, or share it with AI training datasets without your explicit consent.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="6.5" cy="9.5" r="1" fill="currentColor" />
        <circle cx="11.5" cy="9.5" r="1" fill="currentColor" />
      </svg>
    ),
    title: "AI & video generation",
    content: (
      <>
        <p>
          Our app uses AI models to generate videos from your text prompts. Here is how your content is handled during this process:
        </p>
        <div className="mt-4 space-y-3">
          {[
            {
              q: "Are my prompts stored?",
              a: "Yes, your prompts are stored to display your generation history within the app and to allow you to re-use or edit previous inputs. You can delete your history at any time from your account settings.",
            },
            {
              q: "Are my prompts used to train AI models?",
              a: "No. Your prompts and generated videos are not used to train or fine-tune any AI models without your explicit, separate consent.",
            },
            {
              q: "Are my videos shared with anyone?",
              a: "Your generated videos are private by default. They are only accessible to you. We do not share them with third parties unless required by law.",
            },
            {
              q: "What AI providers do we use?",
              a: "We use third-party AI services to power video generation. These providers process your prompts under their own data agreements. They are contractually prohibited from using your data for their own training purposes.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-1.5">
              <p className="text-sm font-medium text-white/80">{q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{a}</p>
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
        <circle cx="14" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="4" cy="9" r="2" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="14" cy="14" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 8L12 5M6 10l6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Data sharing",
    content: (
      <>
        <p>We only share your data in the following limited circumstances:</p>
        <div className="mt-4 space-y-2">
          {[
            ["AI service providers", "To generate videos based on your prompts. Bound by data processing agreements."],
            ["Cloud infrastructure", "Secure hosting providers for storing your account and generated content."],
            ["Analytics (anonymised)", "Crash reporting and performance tools using anonymised, non-identifiable data only."],
            ["Payment processors", "Google Play handles all payments. We receive only transaction IDs and subscription status."],
            ["Legal authorities", "Only when required by applicable law, court order, or to protect against fraud or harm."],
          ].map(([who, why]) => (
            <div key={who} className="flex gap-3 py-2.5 border-b border-white/5 last:border-0 items-start">
              <span className="text-xs font-medium text-white/50 w-36 flex-shrink-0 pt-0.5">{who}</span>
              <span className="text-sm text-white/40">{why}</span>
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
        <path d="M9 2L3 5v5c0 3.5 2.5 6.5 6 7.5C13.5 16.5 16 13.5 16 10V5L9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M6.5 9l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Your rights",
    content: (
      <>
        <p>Under UK GDPR, you have the following rights regarding your personal data:</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            ["Access", "Request a copy of the data we hold about you."],
            ["Rectification", "Correct inaccurate or incomplete data."],
            ["Erasure", "Request deletion of your account and data."],
            ["Portability", "Receive your data in a machine-readable format."],
            ["Restriction", "Limit how we process your data in certain circumstances."],
            ["Objection", "Object to processing based on legitimate interests."],
          ].map(([right, desc]) => (
            <div key={right} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{right}</p>
              <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/40">
          To exercise any of these rights, email us at{" "}
          <a href="mailto:privacy@uktechdeveloper.co.uk" className="text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors">
            privacy@uktechdeveloper.co.uk
          </a>
          . We will respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="4" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 2v3M12 2v3M3 8h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Data retention",
    content: (
      <>
        <p>We retain your data only as long as necessary for the purposes described in this policy:</p>
        <div className="mt-4 space-y-2">
          {[
            { type: "Account & profile", period: "Until account deletion", color: "text-white/60" },
            { type: "Generated videos", period: "Until account deletion or manual deletion", color: "text-white/60" },
            { type: "Prompt history", period: "Until account deletion or manual clear", color: "text-white/60" },
            { type: "Billing records", period: "30 days after account deletion", color: "text-amber-400" },
            { type: "Crash & error logs", period: "90 days (anonymised)", color: "text-white/60" },
            { type: "Legal hold data", period: "As required by applicable law", color: "text-white/60" },
          ].map(({ type, period, color }) => (
            <div key={type} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-white/50">{type}</span>
              <span className={`text-xs font-medium ${color}`}>{period}</span>
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
        <rect x="4" y="8" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 8V6a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
            "Generated videos are stored in encrypted cloud storage with access controls",
            "We conduct regular security reviews and vulnerability assessments",
            "Access to production data is restricted to authorised personnel only",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm text-white/50">
              <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5L2 3.75v4c0 2.8 2 5.2 5 6 3-0.8 5-3.2 5-6v-4L7 1.5z" stroke="#4ade80" strokeWidth="1" strokeLinejoin="round" />
                <path d="M4.5 7l2 2 3-3" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          Despite our best efforts, no system is 100% secure. If you suspect a security breach, please contact us immediately at{" "}
          <a href="mailto:security@uktechdeveloper.co.uk" className="text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors">
            security@uktechdeveloper.co.uk
          </a>.
        </p>
      </>
    ),
  },
  {
    id: "children",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Children's privacy",
    content: (
      <>
        <p>
          Our App is not intended for children under the age of 13 (or 16 in the European Union). We do not knowingly collect personal data from children.
        </p>
        <p className="mt-3">
          If you believe a child has created an account or submitted personal data through our App, please contact us at{" "}
          <a href="mailto:privacy@uktechdeveloper.co.uk" className="text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors">
            privacy@uktechdeveloper.co.uk
          </a>{" "}
          and we will delete the information promptly.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 7l7 4 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Contact us",
    content: (
      <>
        <p>If you have any questions about this Privacy Policy or how we handle your data, please contact:</p>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wider">Company</p>
              <p className="text-sm text-white/70 font-medium">UK Tech Developer</p>
            </div>
          </div>
          {[
            { icon: "email", label: "General", value: "support@uktechdeveloper.co.uk", href: "mailto:support@uktechdeveloper.co.uk" },
            { icon: "privacy", label: "Privacy", value: "privacy@uktechdeveloper.co.uk", href: "mailto:privacy@uktechdeveloper.co.uk" },
            { icon: "web", label: "Website", value: "uktechdeveloper.co.uk", href: "https://uktechdeveloper.co.uk" },
          ].map(({ label, value, href }) => (
            <div key={label} className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-xs text-white/30 uppercase tracking-wider">{label}</span>
              <a href={href} className="text-sm text-white/60 hover:text-white/80 underline underline-offset-2 transition-colors">{value}</a>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/40">
          You also have the right to lodge a complaint with the{" "}
          <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors">
            Information Commissioner's Office (ICO)
          </a>{" "}
          if you believe we have handled your data unlawfully.
        </p>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  const [active, setActive] = useState("overview");

  const activeSection = sections.find((s) => s.id === active)!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Georgia', serif" }}>
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L2 3.5v4C2 10.5 4.3 13 7 14c2.7-1 5-3.5 5-6.5v-4L7 1z" fill="white" fillOpacity="0.9" />
          </svg>
        </div>
        <div>
          <span className="text-xs font-medium text-white/40 tracking-widest uppercase" style={{ fontFamily: "monospace" }}>UK Tech Developer</span>
          <p className="text-xs text-white/20" style={{ fontFamily: "monospace" }}>Privacy Policy · AI Video Generator</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 flex gap-8">
        {/* Sidebar nav */}
        <aside className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0 sticky top-10 self-start">
          <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest mb-2 px-3" style={{ fontFamily: "monospace" }}>Contents</p>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-150 ${
                active === s.id
                  ? "bg-white/[0.06] text-white"
                  : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
              }`}
            >
              <span className={active === s.id ? "text-indigo-400" : "text-white/20"}>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden w-full mb-6">
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Section heading */}
          <div className="flex items-center gap-3 mb-6 animate-fade-in" key={active + "-head"}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
              {activeSection.icon}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{activeSection.title}</h1>
          </div>

          {/* Section body */}
          <div
            key={active + "-body"}
            className="prose-custom space-y-4 text-white/60 leading-relaxed text-[15px] animate-fade-in"
          >
            {activeSection.content}
          </div>

          {/* Prev / Next */}
          <div className="flex justify-between mt-12 pt-6 border-t border-white/5">
            {sections.findIndex((s) => s.id === active) > 0 ? (
              <button
                onClick={() => setActive(sections[sections.findIndex((s) => s.id === active) - 1].id)}
                className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {sections[sections.findIndex((s) => s.id === active) - 1].title}
              </button>
            ) : <span />}
            {sections.findIndex((s) => s.id === active) < sections.length - 1 ? (
              <button
                onClick={() => setActive(sections[sections.findIndex((s) => s.id === active) + 1].id)}
                className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors ml-auto"
              >
                {sections[sections.findIndex((s) => s.id === active) + 1].title}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            ) : <span />}
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease both;
        }
        .prose-custom p {
          margin-bottom: 0.75rem;
        }
        .prose-custom strong {
          color: rgba(255,255,255,0.75);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}