'use client';

import clsx from 'clsx';

type BadgeVariant = 'required' | 'not-required' | 'yes' | 'no' | 'stc' | 'default';

function getVariant(value: string): BadgeVariant {
  const v = value.toLowerCase().trim();
  if (v === 'required') return 'required';
  if (v === 'not required') return 'not-required';
  if (v === 'yes') return 'yes';
  if (v === 'no') return 'no';
  if (v.includes('stc odu')) return 'stc';
  return 'default';
}

const variantStyles: Record<BadgeVariant, string> = {
  required: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'not-required': 'bg-slate-100 text-slate-500 border-slate-200',
  yes: 'bg-blue-50 text-blue-700 border-blue-200',
  no: 'bg-slate-100 text-slate-500 border-slate-200',
  stc: 'bg-amber-50 text-amber-700 border-amber-200',
  default: 'bg-transparent text-slate-600 border-transparent',
};

export function CellBadge({ value }: { value: string }) {
  const variant = getVariant(value);
  if (variant === 'default') {
    return <span className="text-[13px] text-slate-600 font-medium">{value || '—'}</span>;
  }
  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 text-xs font-bold rounded-md border tracking-wide uppercase',
        variantStyles[variant]
      )}
    >
      {value}
    </span>
  );
}
