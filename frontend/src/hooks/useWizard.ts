import { useState, useCallback } from 'react';
import type { WizardStep, ResumeFile, CareRequirements, MatchResult } from '@/types/caregiver';

interface WizardState {
  currentStep: WizardStep;
  resumes: ResumeFile[];
  requirements: CareRequirements | null;
  results: MatchResult[];
  isProcessing: boolean;
}

const initialRequirements: CareRequirements = {
  careType: 'childcare',
  languages: [],
  specialConsiderations: [],
  overnightCare: false,
  experienceLevel: 'intermediate',
  additionalNotes: '',
};

export function useWizard() {
  const [state, setState] = useState<WizardState>({
    currentStep: 'upload',
    resumes: [],
    requirements: null,
    results: [],
    isProcessing: false,
  });

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const steps: WizardStep[] = ['upload', 'requirements', 'matching', 'results'];
      const currentIndex = steps.indexOf(prev.currentStep);
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
      return { ...prev, currentStep: steps[nextIndex] };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      const steps: WizardStep[] = ['upload', 'requirements', 'matching', 'results'];
      const currentIndex = steps.indexOf(prev.currentStep);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return { ...prev, currentStep: steps[prevIndex] };
    });
  }, []);

  const setResumes = useCallback((resumes: ResumeFile[]) => {
    setState(prev => ({ ...prev, resumes }));
  }, []);

  const updateResume = useCallback((id: string, updates: Partial<ResumeFile>) => {
    setState(prev => ({
      ...prev,
      resumes: prev.resumes.map(r => 
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  }, []);

  const setRequirements = useCallback((requirements: CareRequirements) => {
    setState(prev => ({ ...prev, requirements }));
  }, []);

  const setResults = useCallback((results: MatchResult[]) => {
    setState(prev => ({ ...prev, results }));
  }, []);

  const setProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }));
  }, []);

  const reset = useCallback(() => {
    setState({
      currentStep: 'upload',
      resumes: [],
      requirements: null,
      results: [],
      isProcessing: false,
    });
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case 'upload':
        return state.resumes.length > 0 && 
               state.resumes.every(r => r.status === 'completed');
      case 'requirements':
        return state.requirements !== null;
      case 'matching':
        return false; // Can't skip matching
      case 'results':
        return true;
      default:
        return false;
    }
  }, [state.currentStep, state.resumes, state.requirements]);

  return {
    ...state,
    goToStep,
    nextStep,
    prevStep,
    setResumes,
    updateResume,
    setRequirements,
    setResults,
    setProcessing,
    reset,
    canProceed,
    initialRequirements,
  };
}
