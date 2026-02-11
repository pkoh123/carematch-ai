import { useEffect, useState, useRef } from 'react';
import { Loader2, Brain, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface MatchingProgressProps {
  totalCaregivers: number;
  onComplete: () => void;
}

const MATCHING_STAGES = [
  { id: 'send', label: 'Sending profiles to AI engine...', duration: 1000 },
  { id: 'analyze', label: 'Analyzing caregiver qualifications...', duration: 1500 },
  { id: 'match', label: 'Matching against your requirements...', duration: 2000 },
  { id: 'rank', label: 'Ranking and generating explanations...', duration: 1500 },
];

export function MatchingProgress({ totalCaregivers, onComplete }: MatchingProgressProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Run the progress animation
  useEffect(() => {
    let isMounted = true;

    const runStages = async () => {
      for (let i = 0; i < MATCHING_STAGES.length; i++) {
        if (!isMounted) return;

        setCurrentStageIndex(i);

        const startProgress = (i / MATCHING_STAGES.length) * 100;
        const endProgress = ((i + 1) / MATCHING_STAGES.length) * 100;
        const duration = MATCHING_STAGES[i].duration;
        const steps = 20;
        const stepDuration = duration / steps;
        const progressIncrement = (endProgress - startProgress) / steps;

        for (let step = 0; step <= steps; step++) {
          if (!isMounted) return;
          await new Promise(resolve => setTimeout(resolve, stepDuration));
          setProgress(startProgress + (progressIncrement * step));
        }
      }

      if (isMounted) {
        setProgress(100);
        setAnimationDone(true);
      }
    };

    runStages();

    return () => {
      isMounted = false;
    };
  }, []);

  // When animation finishes, call onComplete (which will await the API)
  useEffect(() => {
    if (animationDone) {
      onCompleteRef.current();
    }
  }, [animationDone]);

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Brain className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Finding Your Matches</h2>
        <p className="text-muted-foreground">
          Analyzing {totalCaregivers} caregiver{totalCaregivers !== 1 ? 's' : ''} against your requirements
        </p>
      </div>

      <div className="space-y-4">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm text-muted-foreground">
          {animationDone ? 'Finalizing results...' : `${Math.round(progress)}% complete`}
        </p>
      </div>

      <div className="space-y-3">
        {MATCHING_STAGES.map((stage, index) => {
          const isCompleted = index < currentStageIndex || animationDone;
          const isCurrent = index === currentStageIndex && !animationDone;
          const isUpcoming = index > currentStageIndex && !animationDone;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                isCurrent && 'bg-primary/5',
                isCompleted && 'opacity-60'
              )}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {isCompleted && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
                {isCurrent && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {isUpcoming && (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              <span
                className={cn(
                  'text-sm',
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}

        {animationDone && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
            <div className="w-6 h-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <span className="text-sm text-foreground font-medium">
              Finalizing results...
            </span>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        AI-powered matching
      </p>
    </div>
  );
}
