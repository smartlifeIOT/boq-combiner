'use client';

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface UploadZoneProps {
  onFile: (file: File) => void;
  loading?: boolean;
}

export function UploadZone({ onFile, loading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) return;
    onFile(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => !loading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-6 border-[3px] border-dashed rounded-xl p-12 cursor-pointer transition-all duration-200 bg-white shadow-sm',
        dragging
          ? 'border-blue-600 bg-blue-50'
          : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50',
        loading && 'pointer-events-none opacity-60'
      )}
    >
      <div className={clsx(
        'w-16 h-16 rounded-xl flex items-center justify-center transition-all',
        dragging ? 'bg-blue-200' : 'bg-slate-100 border-2 border-slate-300'
      )}>
        {loading ? (
          <div className="w-8 h-8 border-[3px] border-blue-700 border-t-transparent rounded-full animate-spin" />
        ) : dragging ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Upload className="w-8 h-8 text-blue-700" />
          </motion.div>
        ) : (
          <FileSpreadsheet className="w-8 h-8 text-slate-500" />
        )}
      </div>

      <div className="text-center space-y-1">
        <p className="text-xl font-extrabold text-slate-900">
          {loading ? 'Reading workbook…' : 'Drop your Excel file here'}
        </p>
        <p className="text-base font-semibold text-slate-600">
          {loading ? 'Please wait, analyzing structure' : 'or click to browse — .xlsx or .xls'}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-700 mt-2">
        <span className="px-3 py-1.5 bg-white border-2 border-slate-300 rounded font-extrabold shadow-sm">Sheet 1: Site data</span>
        <span className="text-slate-600 font-extrabold">+</span>
        <span className="px-3 py-1.5 bg-white border-2 border-slate-300 rounded font-extrabold shadow-sm">Sheet 2: Categories</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </motion.div>
  );
}
