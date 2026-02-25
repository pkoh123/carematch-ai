import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/types/caregiver';

interface WizardProgressProps {
  currentStep: WizardStep;
}

const steps: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload Resumes' },
  { key: 'requirements', label: 'Care Requirements' },
  { key: 'matching', label: 'AI Matching' },
  { key: 'results', label: 'View Results' },
];

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-start justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.key} className="flex items-start flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center max-w-[80px]',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mt-5">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      index < currentIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
