"use client";

import { useState, useRef, useCallback } from "react";

interface PassportData {
  surname: string;
  givenNames: string;
  fullName: string;
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  dateOfIssue: string;
  nationality: string;
  sex: string;
  placeOfBirth: string;
  personalNumber: string;
  permanentAddress: string;
  temporaryAddress: string;
  municipality: string;
  wardNo: string;
  district: string;
  province: string;
  country: string;
}

interface ExtractionResult {
  filename: string;
  data: PassportData | null;
  error: string | null;
  preview?: string;
}

interface DuplicateAlert {
  duplicates: string[];
  message: string;
}

type Step = "upload-passport" | "extracting" | "review" | "updating" | "done";
type ExcelMode = "existing" | "new";

const PASSPORT_FIELDS: [keyof PassportData, string][] = [
  ["fullName", "Full Name"],
  ["passportNumber", "Passport Number"],
  ["dateOfBirth", "Date of Birth"],
  ["dateOfExpiry", "Date of Expiry"],
  ["dateOfIssue", "Date of Issue"],
  ["nationality", "Nationality"],
  ["sex", "Sex"],
  ["placeOfBirth", "Place of Birth"],
  ["personalNumber", "Personal Number"],
];

const ADDRESS_FIELDS: [keyof PassportData, string][] = [
  ["permanentAddress", "Permanent Address"],
  ["temporaryAddress", "Temporary Address"],
  ["municipality", "Municipality"],
  ["wardNo", "Ward No."],
  ["district", "District"],
  ["province", "Province"],
  ["country", "Country"],
];

export default function PassportExtractorPage() {
  const [step, setStep] = useState<Step>("upload-passport");
  const [passportFiles, setPassportFiles] = useState<File[]>([]);
  const [passportPreviews, setPassportPreviews] = useState<string[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelMode, setExcelMode] = useState<ExcelMode>("existing");
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateAlert | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const passportInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const excelInputRefStep1 = useRef<HTMLInputElement>(null);

  const handlePassportDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    addPassportFiles(files);
  }, []);

  const addPassportFiles = (files: File[]) => {
    setPassportFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => setPassportPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePassport = (index: number) => {
    setPassportFiles((prev) => prev.filter((_, i) => i !== index));
    setPassportPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (passportFiles.length === 0) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep("extracting");
    setErrorMsg(null);

    const formData = new FormData();
    passportFiles.forEach((file) => formData.append("images", file));

    try {
      const res = await fetch("/api/extract-passport", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Extraction failed");

      const enriched: ExtractionResult[] = json.results.map(
        (r: ExtractionResult, i: number) => ({ ...r, preview: passportPreviews[i] })
      );
      setResults(enriched);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setStep("review");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Extraction failed");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setStep("upload-passport");
    }
  };

  const updateField = (resultIndex: number, field: keyof PassportData, value: string) => {
    setResults((prev) =>
      prev.map((r, i) =>
        i === resultIndex && r.data ? { ...r, data: { ...r.data, [field]: value } } : r
      )
    );
  };

  const handleUpdateExcel = async (forceOverride = false) => {
    if (excelMode === "existing" && !excelFile) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep("updating");
    setErrorMsg(null);
    setDuplicateAlert(null);

    const validResults = results.filter((r) => r.data !== null);
    const passportData = validResults.map((r) => r.data);

    const formData = new FormData();
    if (excelFile) formData.append("excel", excelFile);
    formData.append("passportData", JSON.stringify(passportData));
    formData.append("mode", excelMode);
    if (forceOverride) formData.append("forceOverride", "true");

    try {
      const res = await fetch("/api/update-excel", { method: "POST", body: formData });

      if (res.status === 409) {
        const json = await res.json();
        setDuplicateAlert({ duplicates: json.duplicates, message: json.message });
        window.scrollTo({ top: 0, behavior: "smooth" });
        setStep("review");
        return;
      }

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Excel update failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Excel update failed");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setStep("review");
    }
  };

  const reset = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep("upload-passport");
    setPassportFiles([]);
    setPassportPreviews([]);
    setExcelFile(null);
    setExcelMode("existing");
    setResults([]);
    setDownloadUrl(null);
    setErrorMsg(null);
    setDuplicateAlert(null);
  };

  const canProceed = excelMode === "new" || (excelMode === "existing" && excelFile !== null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-100 leading-none">Passport Extractor</h1>
              <p className="text-xs text-slate-400 mt-0.5">AI-powered data extraction for Nepal passports</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {(["upload-passport", "review", "done"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-all ${
                  step === s ? "bg-emerald-400 scale-125" :
                  (step === "review" && s === "upload-passport") ||
                  (step === "done" && s !== "done") ||
                  (step === "updating" && s !== "done") ? "bg-emerald-600" : "bg-slate-700"
                }`} />
                {i < 2 && <div className="w-8 h-px bg-slate-700" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Error banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm flex items-start gap-3">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* Duplicate alert */}
        {duplicateAlert && (
          <div className="mb-6 rounded-xl bg-amber-950 border border-amber-700 overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-amber-300 font-semibold text-sm mb-1">Duplicate Entry Detected</p>
                <p className="text-amber-400/80 text-xs mb-3">{duplicateAlert.message}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {duplicateAlert.duplicates.map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700 text-amber-300 text-xs font-mono">{d}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateExcel(true)}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors">
                    Add Anyway
                  </button>
                  <button onClick={() => setDuplicateAlert(null)}
                    className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 */}
        {step === "upload-passport" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-100">Upload Passport Images</h2>
              <p className="text-slate-400 mt-1 text-sm">Upload one or more Nepali passport scans — Claude AI will extract all details automatically.</p>
            </div>

            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                dragActive ? "border-emerald-400 bg-emerald-950/30" : "border-slate-700 hover:border-slate-500 bg-slate-900/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handlePassportDrop}
              onClick={() => passportInputRef.current?.click()}
            >
              <input ref={passportInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => addPassportFiles(Array.from(e.target.files || []))} />
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-300 font-medium">Drop passport images here</p>
              <p className="text-slate-500 text-sm mt-1">or click to browse — JPG, PNG supported</p>
            </div>

            {passportPreviews.length > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {passportPreviews.map((src, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden bg-slate-800 aspect-[3/4]">
                    <img src={src} alt={`Passport ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={(e) => { e.stopPropagation(); removePassport(i); }}
                        className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs text-slate-200 bg-slate-900/80 rounded px-2 py-1 truncate">{passportFiles[i]?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Excel mode */}
            <div className="mt-8 rounded-2xl bg-slate-900 border border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="font-semibold text-slate-200 text-sm">Excel Output</h3>
              </div>

              <div className="flex rounded-xl bg-slate-800 p-1 gap-1 mb-4">
                <button onClick={() => setExcelMode("existing")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    excelMode === "existing" ? "bg-emerald-500 text-slate-900" : "text-slate-400 hover:text-slate-200"
                  }`}>
                  Upload Existing File
                </button>
                <button onClick={() => { setExcelMode("new"); setExcelFile(null); }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    excelMode === "new" ? "bg-emerald-500 text-slate-900" : "text-slate-400 hover:text-slate-200"
                  }`}>
                  Create New File
                </button>
              </div>

              {excelMode === "existing" ? (
                <>
                  <p className="text-slate-500 text-xs mb-3">Upload your previous Excel file — new records will be appended and duplicate passport numbers will be flagged.</p>
                  <div
                    className={`border border-dashed rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer transition-all ${
                      excelFile ? "border-emerald-700 bg-emerald-950/20" : "border-slate-700 hover:border-slate-500 bg-slate-800/40"
                    }`}
                    onClick={() => excelInputRefStep1.current?.click()}
                  >
                    <input ref={excelInputRefStep1} type="file" accept=".xlsx,.xls" className="hidden"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                    {excelFile ? (
                      <>
                        <div className="w-9 h-9 rounded-lg bg-emerald-900/60 border border-emerald-700 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 font-medium truncate">{excelFile.name}</p>
                          <p className="text-xs text-emerald-400 mt-0.5">Ready — data will be appended to this file</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setExcelFile(null); }}
                          className="text-slate-500 hover:text-red-400 transition-colors shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Click to upload .xlsx file</p>
                          <p className="text-xs text-slate-600 mt-0.5">Records will be appended after existing rows</p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-800">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <div>
                    <p className="text-sm text-emerald-300 font-medium">A fresh Excel file will be created</p>
                    <p className="text-xs text-emerald-500 mt-0.5">Includes passport details + full address columns with headers</p>
                  </div>
                </div>
              )}
            </div>

            {passportFiles.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button onClick={handleExtract}
                  className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Extract Data from {passportFiles.length} Passport{passportFiles.length > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Extracting */}
        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Extracting passport data...</h2>
            <p className="text-slate-400 text-sm mt-2">Claude AI is reading {passportFiles.length} passport{passportFiles.length > 1 ? "s" : ""}</p>
          </div>
        )}

        {/* STEP 2: Review */}
        {step === "review" && (
          <div>
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Review Extracted Data</h2>
                <p className="text-slate-400 mt-1 text-sm">Check and correct any fields before writing to Excel.</p>
              </div>
              <button onClick={reset}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start over
              </button>
            </div>

            <div className="space-y-6 mb-10">
              {results.map((result, idx) => (
                <div key={idx} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                  <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800">
                    {result.preview && <img src={result.preview} alt="" className="w-12 h-16 object-cover rounded-lg" />}
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{result.filename}</p>
                      {result.error
                        ? <span className="text-xs text-red-400">{result.error}</span>
                        : <span className="text-xs text-emerald-400">✓ Extracted successfully</span>}
                    </div>
                  </div>

                  {result.data && (
                    <div className="p-6 space-y-6">
                      {/* Passport details */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Passport Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {PASSPORT_FIELDS.map(([field, label]) => (
                            <div key={field}>
                              <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                              <input type="text" value={result.data![field] || ""}
                                onChange={(e) => updateField(idx, field, e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Address details */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Address Details
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {ADDRESS_FIELDS.map(([field, label]) => (
                            <div key={field} className={field === "permanentAddress" || field === "temporaryAddress" ? "lg:col-span-3 sm:col-span-2" : ""}>
                              <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                              <input type="text" value={result.data![field] || ""}
                                onChange={(e) => updateField(idx, field, e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Excel section */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-200">
                  {excelMode === "new" ? "Create New Excel File" : excelFile ? "Excel File Ready" : "Upload Your Excel File"}
                </h3>
                <button onClick={reset}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Change mode
                </button>
              </div>

              {excelMode === "new" ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-800 mb-4">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <div>
                    <p className="text-sm text-emerald-300 font-medium">A fresh Excel file will be created with all columns</p>
                    <p className="text-xs text-emerald-500 mt-0.5">Includes passport details + full address columns</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-400 text-sm mb-4">
                    {excelFile ? "Records will be appended. Duplicate passport numbers will be flagged before saving." : "Upload the Excel file to append passport data."}
                  </p>
                  <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                  {excelFile ? (
                    <div className="border border-emerald-800 bg-emerald-950/30 rounded-xl px-5 py-4 flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-900/60 border border-emerald-700 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-sm font-medium truncate">{excelFile.name}</p>
                        <p className="text-emerald-400 text-xs mt-0.5">{(excelFile.size / 1024).toFixed(1)} KB · Ready to update</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => excelInputRef.current?.click()}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Change</button>
                        <button onClick={() => setExcelFile(null)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-slate-500 transition-all mb-4"
                      onClick={() => excelInputRef.current?.click()}>
                      <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-400 text-sm">Click to upload .xlsx file</p>
                      <p className="text-slate-600 text-xs mt-1">Records will be appended after existing rows</p>
                    </div>
                  )}
                </>
              )}

              {canProceed && results.some((r) => r.data) && (
                <div className="flex justify-end">
                  <button onClick={() => handleUpdateExcel(false)}
                    className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm transition-all flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {excelMode === "new" ? "Create Excel & Download" : "Update Excel & Download"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Updating */}
        {step === "updating" && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              {excelMode === "new" ? "Creating Excel file..." : "Updating Excel file..."}
            </h2>
            <p className="text-slate-400 text-sm mt-2">Writing passport data into the spreadsheet</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && downloadUrl && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Done!</h2>
            <p className="text-slate-400 text-sm mb-8">
              {results.filter((r) => r.data).length} passport record{results.filter((r) => r.data).length > 1 ? "s" : ""} have been {excelMode === "new" ? "written to a new" : "added to your"} Excel file.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={downloadUrl}
                download={excelMode === "new" ? "passport_data_new.xlsx" : "passport_data_updated.xlsx"}
                className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm transition-all flex items-center gap-2 justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel
              </a>
              <button onClick={reset}
                className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all">
                Process More Passports
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}