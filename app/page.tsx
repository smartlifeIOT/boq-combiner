'use client';

import { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { X, ChevronDown, Download, RotateCcw, ArrowRight, AlertCircle, LayoutDashboard, Search, Tag, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

import { UploadZone } from '@/components/UploadZone';
import { DataTable } from '@/components/DataTable';
import { MetricCard } from '@/components/MetricCard';
import { StepIndicator } from '@/components/StepIndicator';
import {
  parseWorkbook,
  processWorkbook,
  buildOutputWorkbook,
  extractTawalIds,
  extractAvailableCategories,
  findTawalIdKey,
} from '@/lib/excel';
import type { WorkbookData, ProcessingResult } from '@/types';

const STEPS = [
  { label: 'Upload', description: 'Select workbook' },
  { label: 'Configure', description: 'Filter & preview' },
  { label: 'Export', description: 'Download results' },
];

const PREVIEW_COLS = [
  'TAWAL ID', 'site Name', 'RMS', 'Expander', 'Smart Meter',
  'Smart Lock for New Request', 'New Smart Lock Cabinets',
];

// Category color palette — cycles through for as many categories as Sheet 2 has
const CAT_COLORS = [
  { bg: 'bg-blue-50',    border: 'border-blue-300',   text: 'text-blue-800',   dot: 'bg-blue-400',    activeBg: 'bg-blue-100',  activeRing: 'ring-blue-400' },
  { bg: 'bg-violet-50',  border: 'border-violet-300', text: 'text-violet-800', dot: 'bg-violet-400',  activeBg: 'bg-violet-100',activeRing: 'ring-violet-400' },
  { bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-800',  dot: 'bg-amber-400',   activeBg: 'bg-amber-100', activeRing: 'ring-amber-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-300',text: 'text-emerald-800',dot: 'bg-emerald-400', activeBg: 'bg-emerald-100',activeRing: 'ring-emerald-400' },
  { bg: 'bg-rose-50',    border: 'border-rose-300',   text: 'text-rose-800',   dot: 'bg-rose-400',    activeBg: 'bg-rose-100',  activeRing: 'ring-rose-400' },
  { bg: 'bg-cyan-50',    border: 'border-cyan-300',   text: 'text-cyan-800',   dot: 'bg-cyan-400',    activeBg: 'bg-cyan-100',  activeRing: 'ring-cyan-400' },
];

export default function Home() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [tawalIds, setTawalIds] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectValue, setSelectValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'sheet1' | 'sheet2'>('output');

  // Filtered dropdown options based on search query
  const filteredDropdownIds = useMemo(() => {
    if (!searchQuery.trim()) return tawalIds;
    const q = searchQuery.trim().toLowerCase();
    return tawalIds.filter((id) => id.toLowerCase().includes(q));
  }, [tawalIds, searchQuery]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const data = parseWorkbook(buffer);
      const tawalKey = findTawalIdKey(data.sheet1);
      const ids = tawalKey ? extractTawalIds(data.sheet1, tawalKey) : [];
      const cats = extractAvailableCategories(data.sheet2);
      setWorkbookData(data);
      setRawBuffer(buffer);
      setFileName(file.name);
      setTawalIds(ids);
      setAvailableCategories(cats);
      setSelectedCategories(cats); // all selected by default
      setSelectedIds([]);
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addId = () => {
    if (!selectValue || selectedIds.includes(selectValue)) return;
    setSelectedIds((prev) => [...prev, selectValue]);
    setSelectValue('');
    setSearchQuery('');
  };

  const addAllFiltered = () => {
    const toAdd = filteredDropdownIds.filter((id) => !selectedIds.includes(id));
    if (!toAdd.length) return;
    setSelectedIds((prev) => [...prev, ...toAdd]);
    setSelectValue('');
    setSearchQuery('');
  };

  const removeId = (id: string) => setSelectedIds((prev) => prev.filter((x) => x !== id));

  const filteredPreview = () => {
    if (!workbookData) return [];
    const tawalKey = findTawalIdKey(workbookData.sheet1);
    const rows = !selectedIds.length
      ? workbookData.sheet1
      : workbookData.sheet1.filter((r) =>
          selectedIds.includes(String(r[tawalKey ?? ''] ?? '').trim())
        );
    return rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const col of PREVIEW_COLS) {
        const k = Object.keys(r).find(
          (k) => k.toLowerCase().trim() === col.toLowerCase().trim()
        );
        out[col] = k ? r[k] : '';
      }
      return out;
    });
  };

  const handleGenerate = () => {
    if (!workbookData) return;
    if (selectedCategories.length === 0) {
      setError('Please select at least one category to process.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = processWorkbook(workbookData, selectedIds, selectedCategories);
      setResult(res);
      setActiveTab('output');
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!rawBuffer || !result) return;
    const wb = buildOutputWorkbook(rawBuffer, result.outputRows);
    XLSX.writeFile(wb, fileName.replace(/\.(xlsx|xls)$/i, '') + '_combined_output.xlsx');
  };

  const handleReset = () => {
    setStep(0);
    setWorkbookData(null);
    setRawBuffer(null);
    setFileName('');
    setTawalIds([]);
    setAvailableCategories([]);
    setSelectedCategories([]);
    setSelectedIds([]);
    setResult(null);
    setError(null);
    setSelectValue('');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 selection:bg-blue-200 selection:text-blue-900">
      <header className="bg-white sticky top-0 z-50 border-b border-slate-300 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm p-1 bg-white">
              <img src="/smart-life.png" alt="Smart Life Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 uppercase tracking-wide">Smart Life x Tawal</p>
              <p className="text-sm text-slate-600 font-semibold">Site data × BOQ Combiner</p>
            </div>
          </div>
          {step > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={handleReset}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Start over
            </motion.button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-16">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-8 text-center space-y-2">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upload your workbook</h1>
                <p className="text-base font-semibold text-slate-600">
                  Your file needs at least 2 sheets — site data and a categories reference.
                </p>
              </div>

              <UploadZone onFile={handleFile} loading={loading} />

              <div className="mt-8 bg-white border border-slate-300 shadow-sm rounded-2xl p-6">
                <p className="text-sm font-extrabold text-slate-700 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  Expected structure
                </p>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-extrabold">1</span>
                      Site data
                    </p>
                    <div className="space-y-2">
                      {['TAWAL ID', 'RMS', 'Expander', 'Smart Meter', 'Smart Lock for New Request', '+ output columns…'].map((c) => (
                        <div key={c} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-slate-800 font-semibold text-sm">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold">2</span>
                      Categories
                    </p>
                    <div className="space-y-2">
                      {['Categories column', 'RMS', 'Expander', 'Smart Meter', 'Smart Lock for New Request'].map((c, i) => (
                        <div key={c} className="flex items-center gap-2">
                          <div className={clsx('w-2 h-2 rounded-full', i === 0 ? 'bg-transparent' : 'bg-emerald-500')} />
                          <span className={clsx('text-sm font-semibold', i === 0 ? 'text-slate-900 font-extrabold' : 'text-slate-700')}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && workbookData && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* File info banner */}
              <div className="bg-white border border-slate-300 shadow-sm rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-center">
                    <span className="text-emerald-600 font-extrabold text-xl">✓</span>
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-slate-900">{fileName}</p>
                    <p className="text-sm font-semibold text-slate-600 mt-1">
                      {workbookData.sheet1.length} rows in Sheet 1 <span className="opacity-50 mx-1">·</span> {workbookData.sheet2.length} categories in Sheet 2
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {workbookData.allSheetNames.map((n) => (
                    <span key={n} className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-md font-bold">{n}</span>
                  ))}
                </div>
              </div>

              {/* ── Category Selection ───────────────────────────────────────── */}
              {availableCategories.length > 0 && (
                <div className="bg-white border border-slate-300 shadow-sm rounded-xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-slate-500" />
                      <p className="text-sm font-extrabold text-slate-700 uppercase tracking-widest">Categories to include</p>
                      <span className="ml-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-full">
                        {selectedCategories.length}/{availableCategories.length}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        selectedCategories.length === availableCategories.length
                          ? setSelectedCategories([])
                          : setSelectedCategories([...availableCategories])
                      }
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                    >
                      {selectedCategories.length === availableCategories.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableCategories.map((cat, i) => {
                      const color = CAT_COLORS[i % CAT_COLORS.length];
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <motion.button
                          key={cat}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleCategory(cat)}
                          className={clsx(
                            'relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                            isSelected
                              ? `${color.activeBg} ${color.border} ring-2 ${color.activeRing} ring-offset-1`
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                          )}
                        >
                          <div className={clsx(
                            'flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors',
                            isSelected ? `${color.bg} ${color.border} border` : 'bg-white border border-slate-300'
                          )}>
                            {isSelected
                              ? <div className={clsx('w-2.5 h-2.5 rounded-sm', color.dot)} />
                              : null
                            }
                          </div>
                          <span className={clsx(
                            'text-sm font-bold leading-tight',
                            isSelected ? color.text : 'text-slate-600'
                          )}>
                            {cat}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {selectedCategories.length === 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-xs font-semibold text-red-500 flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Select at least one category to generate output.
                    </motion.p>
                  )}
                </div>
              )}

              {/* ── TAWAL ID Filter ──────────────────────────────────────────── */}
              <div className="bg-white border border-slate-300 shadow-sm rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-extrabold text-slate-700 uppercase tracking-widest">Filter by TAWAL ID</p>
                  {tawalIds.length > 0 && (
                    <button
                      onClick={() =>
                        selectedIds.length === tawalIds.length
                          ? setSelectedIds([])
                          : setSelectedIds([...tawalIds])
                      }
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                    >
                      {selectedIds.length === tawalIds.length ? 'Clear all' : 'Select all'}
                    </button>
                  )}
                </div>

                {/* Search input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectValue('');
                    }}
                    placeholder="Search TAWAL IDs…"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSelectValue(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {searchQuery.trim() && (
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500">
                      {filteredDropdownIds.length === 0
                        ? 'No IDs match your search'
                        : `${filteredDropdownIds.length} ID${filteredDropdownIds.length !== 1 ? 's' : ''} match${filteredDropdownIds.length === 1 ? 'es' : ''}`}
                    </p>
                    {filteredDropdownIds.length > 0 && (
                      <button
                        onClick={addAllFiltered}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                      >
                        Add all {filteredDropdownIds.length} matching
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <select
                      value={selectValue}
                      onChange={(e) => setSelectValue(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border-2 border-slate-300 rounded-lg px-4 py-3 text-base font-semibold text-slate-900 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    >
                      <option value="">
                        {searchQuery.trim()
                          ? filteredDropdownIds.length
                            ? `${filteredDropdownIds.length} result${filteredDropdownIds.length !== 1 ? 's' : ''} — pick one…`
                            : 'No matches found'
                          : 'Select a TAWAL ID…'}
                      </option>
                      {filteredDropdownIds.map((id) => (
                        <option key={id} value={id} disabled={selectedIds.includes(id)}>
                          {id}{selectedIds.includes(id) ? ' ✓' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 pointer-events-none" />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addId}
                    disabled={!selectValue}
                    className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white text-base font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:bg-blue-900"
                  >
                    Add
                  </motion.button>
                </div>

                {selectedIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    <AnimatePresence>
                      {selectedIds.map((id) => (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5 bg-blue-100 border border-blue-300 text-blue-900 text-sm font-bold px-4 py-2 rounded-full"
                        >
                          {id}
                          <button onClick={() => removeId(id)} className="hover:text-blue-950 transition-colors ml-1">
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 font-semibold italic">No filter — all {workbookData.sheet1.length} rows will be processed.</p>
                )}
              </div>

              {/* Preview */}
              <div className="bg-white border border-slate-300 shadow-sm rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-extrabold text-slate-700 uppercase tracking-widest">Preview</p>
                  <span className="text-sm bg-slate-100 border border-slate-300 px-3 py-1 font-bold rounded-md text-slate-700">{filteredPreview().length} rows</span>
                </div>
                <DataTable rows={filteredPreview()} maxRows={10} />
              </div>

              <div className="flex gap-4 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={loading || selectedCategories.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20"
                >
                  Generate combined output
                  <ArrowRight className="w-4 h-4 ml-1" />
                </motion.button>
                {selectedCategories.length > 0 && (
                  <p className="self-center text-xs font-semibold text-slate-500">
                    Processing {selectedCategories.length} categor{selectedCategories.length !== 1 ? 'ies' : 'y'}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && result && workbookData && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricCard value={result.filteredCount} label="Filtered rows" />
                <MetricCard value={result.outputRows.length} label="Combined rows" accent />
                <MetricCard value={result.uniqueTawalIds.length} label="Unique TAWAL IDs" />
                <MetricCard value={result.uniqueCategories.length} label="Categories matched" />
              </div>

              {result.uniqueCategories.length > 0 && (
                <div className="bg-white border border-slate-300 shadow-sm rounded-xl p-6">
                  <p className="text-sm font-extrabold text-slate-700 uppercase tracking-widest mb-4">Categories matched</p>
                  <div className="flex flex-wrap gap-2.5">
                    {result.uniqueCategories.map((cat, i) => {
                      const color = CAT_COLORS[
                        availableCategories.indexOf(cat) % CAT_COLORS.length
                      ] ?? CAT_COLORS[i % CAT_COLORS.length];
                      return (
                        <span key={cat} className={clsx(
                          'px-4 py-2 border text-sm font-bold rounded-full',
                          color.bg, color.border, color.text
                        )}>
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-300 shadow-sm rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
                  <p className="text-sm font-extrabold text-slate-700 uppercase tracking-widest">Data preview</p>
                  <div className="flex gap-1 bg-slate-100 border border-slate-300 rounded-lg p-1 relative">
                    {(['output', 'sheet1', 'sheet2'] as const).map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={clsx(
                            'relative px-4 py-2 text-sm font-bold rounded-md transition-all z-10',
                            isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeTabBadgeLight"
                              className="absolute inset-0 bg-white border border-slate-300 rounded-md shadow-sm"
                              style={{ zIndex: -1 }}
                              transition={{ type: 'spring', duration: 0.5 }}
                            />
                          )}
                          {tab === 'output' ? 'Final Sheet' : tab === 'sheet1' ? workbookData.sheet1Name : workbookData.sheet2Name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'output' && <DataTable rows={result.outputRows as unknown as Record<string, unknown>[]} maxRows={20} highlightFirst />}
                    {activeTab === 'sheet1' && <DataTable rows={workbookData.sheet1 as unknown as Record<string, unknown>[]} maxRows={20} />}
                    {activeTab === 'sheet2' && <DataTable rows={workbookData.sheet2 as unknown as Record<string, unknown>[]} maxRows={20} />}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:bg-blue-800"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download workbook
                </motion.button>
                <button onClick={() => setStep(1)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-sm">
                  Back to filter
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}