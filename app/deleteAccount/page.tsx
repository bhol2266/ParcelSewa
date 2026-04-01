"use client";

import { useState } from "react";

type Step = "reason" | "confirm" | "success";

const REASONS = [
  "I no longer need the service",
  "I have privacy concerns",
  "I found a better alternative",
  "The app didn't meet my expectations",
  "Too expensive",
  "Other",
];

export default function DeleteAccountPage() {
  const [step, setStep] = useState<Step>("reason");
  const [selectedReason, setSelectedReason] = useState("");
  const [email, setEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [keepData, setKeepData] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async () => {
    setShowModal(false);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    setStep("success");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 13H2L8 1Z" fill="white" fillOpacity="0.9" />
          </svg>
        </div>
        <span className="text-sm font-medium text-white/60 tracking-widest uppercase">
          Account Management
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">

          {/* Step: Reason */}
          {step === "reason" && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium tracking-wider uppercase mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Irreversible Action
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Delete Your Account
                </h1>
                <p className="text-white/40 text-sm leading-relaxed">
                  Before proceeding, please review what will happen to your data and tell us why you're leaving.
                </p>
              </div>

              {/* Data info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-white/80">Deleted immediately</p>
                  <p className="text-xs text-white/40">Account, profile, generated videos</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="#fbbf24" strokeWidth="1.2" />
                      <path d="M5 5V4a3 3 0 016 0v1" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-white/80">Kept 30 days</p>
                  <p className="text-xs text-white/40">Billing records for legal compliance</p>
                </div>
              </div>

              {/* Reason selector */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/60">Why are you deleting your account?</p>
                <div className="space-y-2">
                  {REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 ${
                        selectedReason === reason
                          ? "border-red-500/50 bg-red-500/10 text-white"
                          : "border-white/5 bg-white/[0.02] text-white/50 hover:border-white/10 hover:text-white/70"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                          selectedReason === reason ? "border-red-400 bg-red-400" : "border-white/20"
                        }`}>
                          {selectedReason === reason && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        {reason}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!selectedReason}
                onClick={() => setStep("confirm")}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-150"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <button
                  onClick={() => setStep("reason")}
                  className="text-white/30 hover:text-white/60 text-sm flex items-center gap-2 mb-4 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Back
                </button>
                <h1 className="text-3xl font-bold tracking-tight">Confirm Deletion</h1>
                <p className="text-white/40 text-sm">This cannot be undone. Please verify your details below.</p>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Your account email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>

                {/* Partial data deletion option */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                    Data deletion preference
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: false, label: "Delete everything", sub: "Account + all videos + all data" },
                      { value: true, label: "Keep billing records only", sub: "Delete account and videos, retain invoices for 30 days" },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setKeepData(opt.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                          keepData === opt.value
                            ? "border-red-500/50 bg-red-500/10"
                            : "border-white/5 bg-white/[0.02] hover:border-white/10"
                        }`}
                      >
                        <p className="font-medium text-white/80">{opt.label}</p>
                        <p className="text-xs text-white/40 mt-0.5">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirm type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                    Type <span className="text-red-400 font-mono">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>
              </div>

              <button
                disabled={confirmText !== "DELETE" || !email || keepData === null || loading}
                onClick={() => setShowModal(true)}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  "Permanently Delete Account"
                )}
              </button>

              <p className="text-center text-xs text-white/20">
                Need help instead?{" "}
                <a href="mailto:support@uktechdeveloper.co.uk" className="text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors">
                  Contact support
                </a>
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M6 14l6 6 10-10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Request Received</h1>
                <p className="text-white/40 text-sm leading-relaxed max-w-sm mx-auto">
                  Your account deletion request has been submitted. You'll receive a confirmation email within 24 hours. Your account will be fully deleted within 30 days.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left space-y-2 text-sm">
                <p className="text-white/60"><span className="text-white/30">Deleted:</span> Account, profile, generated videos</p>
                <p className="text-white/60"><span className="text-white/30">Retained 30 days:</span> Billing records only</p>
                <p className="text-white/60"><span className="text-white/30">Confirmation sent to:</span> {email}</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v6M9 11.5v1" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 15L9 2l7 13H2z" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Are you absolutely sure?</p>
                <p className="text-white/40 text-xs">This will permanently delete your account</p>
              </div>
            </div>

            {/* What gets deleted */}
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-1.5 text-xs">
              <p className="text-white/50 font-medium mb-2">This will remove:</p>
              {["Your account & profile", "All generated videos", "All associated data"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-red-400">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="0.8" />
                    <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  {item}
                </div>
              ))}
              <div className="flex items-center gap-2 text-amber-400 pt-1 border-t border-white/5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="0.8" />
                  <path d="M6 3v4M6 8.5v.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
                Billing records kept 30 days (legal requirement)
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white/70 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
              >
                Yes, delete it
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.35s ease both;
        }
      `}</style>
    </div>
  );
}