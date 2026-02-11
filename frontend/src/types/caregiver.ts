// Caregiving experience types
export interface CareTypeExperience {
  years: number;
  conditions_experienced: string[];
  tasks_performed: string[];
}

export interface EldercareExperience extends CareTypeExperience {
  medical_care: string[];
}

export interface ChildcareExperience extends CareTypeExperience {
  age_range: string[];
}

export interface SpecialNeedsExperience extends CareTypeExperience {
  therapies_supported: string[];
}

export interface PostSurgeryExperience {
  years: number;
  surgeries_supported: string[];
  tasks_performed: string[];
  recovery_phases: string[];
}

export interface DementiaExperience {
  years: number;
  dementia_types: string[];
  tasks_performed: string[];
  stages_experienced: string[];
}

export interface DisabilityExperience {
  years: number;
  disability_types: string[];
  tasks_performed: string[];
  specialized_skills: string[];
}

export interface CaregivingExperience {
  eldercare?: EldercareExperience;
  childcare?: ChildcareExperience;
  special_needs?: SpecialNeedsExperience;
  post_surgery?: PostSurgeryExperience;
  dementia?: DementiaExperience;
  disability?: DisabilityExperience;
}

// Caregiver profile extracted from resume
export interface CaregiverProfile {
  id: string;
  name: string;
  careTypes: CareType[];
  yearsOfExperience: number;
  languages: string[];
  skills: string[];
  certifications: string[];
  summary: string;
  rawText: string; // Original extracted text
  caregiving_experience?: CaregivingExperience;
}

export type CareType =
  | 'childcare'
  | 'eldercare'
  | 'special-needs'
  | 'post-surgery'
  | 'dementia'
  | 'disability'
  | 'not-applicable';

// Employer care requirements
export interface CareRequirements {
  careType: CareType;
  languages: string[];
  specialConsiderations: SpecialConsideration[];
  overnightCare: boolean;
  experienceLevel: ExperienceLevel;
  additionalNotes: string;
}

export type SpecialConsideration = 
  | 'medical-conditions'
  | 'mobility-assistance'
  | 'memory-care'
  | 'behavioral-support'
  | 'medication-management'
  | 'physical-therapy';

export type ExperienceLevel = 
  | 'entry' 
  | 'intermediate' 
  | 'experienced' 
  | 'expert';

// Match result with explanation
export interface MatchResult {
  caregiver: CaregiverProfile;
  score: number; // 0-100
  rank: number;
  match_badge: 'Top Match' | 'Strong Match' | 'Good Match' | 'No Match';
  explanation: MatchExplanation;
}

export interface MatchExplanation {
  overallFit: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  caregiving_experience?: CaregivingExperience;
}

// Resume file with extracted content
export interface ResumeFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText?: string;
  profile?: CaregiverProfile;
  error?: string;
}

// Wizard step tracking
export type WizardStep = 'upload' | 'requirements' | 'matching' | 'results';
