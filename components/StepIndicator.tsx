import clsx from 'clsx';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Step {
  label: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full max-w-2xl mx-auto relative">
      {steps.map((step, idx) => {
        const isCompleted = idx < current;
        const isCurrent = idx === current;

        return (
          <div key={step.label} className={clsx("relative", idx < steps.length - 1 ? "flex-1" : "")}>
            <div className="flex items-center w-full">
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center text-base font-extrabold transition-all relative z-10 border-[3px]',
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                    : isCurrent
                      ? 'bg-white border-blue-700 text-blue-700 shadow-md'
                      : 'bg-slate-100 border-slate-300 text-slate-500'
                )}>
                  {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="h-1 flex-1 mx-3 bg-slate-200 overflow-hidden relative rounded-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-600"
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>

            <div className="absolute top-14 left-0 w-36 -ml-2">
              <p className={clsx('text-base font-extrabold',
                isCurrent ? 'text-slate-900' : isCompleted ? 'text-emerald-800' : 'text-slate-600'
              )}>
                {step.label}
              </p>
              <p className="text-sm text-slate-700 mt-0.5 font-bold">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
