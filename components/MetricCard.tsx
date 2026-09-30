import clsx from 'clsx';
import { motion } from 'framer-motion';

interface MetricCardProps {
  value: number | string;
  label: string;
  accent?: boolean;
}

export function MetricCard({ value, label, accent }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'rounded-xl p-5 border-2 transition-shadow shadow-sm',
        accent
          ? 'bg-blue-700 border-blue-800'
          : 'bg-white border-slate-300'
      )}
    >
      <div className="relative z-10">
        <p className={clsx(
          'text-3xl font-extrabold tracking-tight',
          accent ? 'text-white' : 'text-slate-900'
        )}>
          {value}
        </p>
        <p className={clsx(
          'text-sm mt-1 font-bold uppercase tracking-wider',
          accent ? 'text-blue-100' : 'text-slate-700'
        )}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}
