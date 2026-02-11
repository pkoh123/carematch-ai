import { useCallback, useRef, useState } from 'react';
import { useWizard } from '@/hooks/useWizard';
import { WizardProgress } from './WizardProgress';
import { ResumeUpload } from './ResumeUpload';
import { RequirementsForm } from './RequirementsForm';
import { MatchingProgress } from './MatchingProgress';
import { MatchResults } from './MatchResults';
import { matchCaregivers } from '@/lib/api';
import type { CareRequirements, MatchResult } from '@/types/caregiver';
import { toast } from 'sonner';

export function CaregiverMatcher() {
  const {
    currentStep,
    resumes,
    requirements,
    results,
    setResumes,
    updateResume,
    setRequirements,
    setResults,
    nextStep,
    prevStep,
    goToStep,
    reset,
    initialRequirements,
  } = useWizard();

  const [matchError, setMatchError] = useState<string | null>(null);
  const matchPromiseRef = useRef<Promise<MatchResult[]> | null>(null);

  const handleRequirementsSubmit = useCallback((reqs: CareRequirements) => {
    setRequirements(reqs);
    setMatchError(null);
    nextStep(); // Go to 'matching' step

    // Start the API call immediately
    const profiles = resumes
      .filter(r => r.status === 'completed' && r.profile)
      .map(r => r.profile!);

    matchPromiseRef.current = matchCaregivers(profiles, reqs);
  }, [setRequirements, nextStep, resumes]);

  const handleMatchingComplete = useCallback(async () => {
    if (!matchPromiseRef.current) return;

    try {
      const matches = await matchPromiseRef.current;
      setResults(matches);
      nextStep(); // Go to 'results'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Matching failed';
      setMatchError(message);
      toast.error('Matching failed. Please try again.');
      goToStep('requirements');
    } finally {
      matchPromiseRef.current = null;
    }
  }, [setResults, nextStep, goToStep]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">
            CareMatch
          </h1>
          <p className="text-muted-foreground">
            AI-powered caregiver matching
          </p>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <WizardProgress currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {currentStep === 'upload' && (
          <ResumeUpload
            resumes={resumes}
            onResumesChange={setResumes}
            onResumeUpdate={updateResume}
            onContinue={nextStep}
          />
        )}

        {currentStep === 'requirements' && (
          <>
            {matchError && (
              <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {matchError}
              </div>
            )}
            <RequirementsForm
              initialValues={requirements || initialRequirements}
              onSubmit={handleRequirementsSubmit}
              onBack={prevStep}
            />
          </>
        )}

        {currentStep === 'matching' && (
          <MatchingProgress
            totalCaregivers={resumes.filter(r => r.status === 'completed').length}
            onComplete={handleMatchingComplete}
          />
        )}

        {currentStep === 'results' && (
          <MatchResults
            results={results}
            onStartOver={reset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Matching powered by AI agents
          </p>
        </div>
      </footer>
    </div>
  );
}
