'use client';

import { CellBadge } from './CellBadge';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const BADGE_COLS = ['rms', 'expander', 'smart meter', 'smart lock', 'new smart lock cabinets', 'category'];

function shouldBadge(col: string): boolean {
  return BADGE_COLS.some((c) => col.toLowerCase().includes(c));
}

interface DataTableProps {
  rows: Record<string, unknown>[];
  maxRows?: number;
  highlightFirst?: boolean;
}

export function DataTable({ rows, maxRows = 50, highlightFirst }: DataTableProps) {
  if (!rows.length) {
    return <p className="text-base font-semibold text-slate-600 py-8 text-center bg-white border border-slate-300 rounded-xl shadow-sm">No data available.</p>;
  }

  const cols = Object.keys(rows[0]);
  const preview = rows.slice(0, maxRows);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            {cols.map((col) => (
              <th
                key={col}
                className={clsx(
                  "px-4 py-4 text-left text-sm font-extrabold whitespace-nowrap uppercase tracking-wider",
                  highlightFirst && (col === 'TAWAL ID' || col === 'Category')
                    ? 'text-blue-900 bg-blue-100'
                    : 'text-slate-800'
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {preview.map((row, i) => (
            <motion.tr
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.2), duration: 0.2 }}
              key={i}
              className="hover:bg-slate-50 transition-colors"
            >
              {cols.map((col) => (
                <td key={col} className="px-4 py-3 whitespace-nowrap">
                  {shouldBadge(col) ? (
                    <CellBadge value={String(row[col] ?? '')} />
                  ) : (
                    <span className="text-slate-900 text-sm font-semibold">{String(row[col] ?? '') || '—'}</span>
                  )}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <div className="flex items-center justify-center p-3 border-t border-slate-300 bg-slate-100">
          <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
            Showing {maxRows} of {rows.length} rows
          </p>
        </div>
      )}
    </div>
  );
}
