import type { CaregiverProfile, CareRequirements, MatchResult } from '@/types/caregiver';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ParseResumeResponse {
  extractedText: string;
  profile: {
    name: string;
    careTypes: string[];
    yearsOfExperience: number;
    languages: string[];
    skills: string[];
    certifications: string[];
    summary: string;
    rawText: string;
  };
}

export async function parseResume(
  file: File,
  id: string
): Promise<{ extractedText: string; profile: CaregiverProfile }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/parse-resume`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to parse resume' }));
    throw new Error(error.detail || 'Failed to parse resume');
  }

  const data: ParseResumeResponse = await response.json();

  return {
    extractedText: data.extractedText,
    profile: {
      id,
      name: data.profile.name,
      careTypes: data.profile.careTypes as CaregiverProfile['careTypes'],
      yearsOfExperience: data.profile.yearsOfExperience,
      languages: data.profile.languages,
      skills: data.profile.skills,
      certifications: data.profile.certifications,
      summary: data.profile.summary,
      rawText: data.extractedText,
    },
  };
}

export async function matchCaregivers(
  profiles: CaregiverProfile[],
  requirements: CareRequirements
): Promise<MatchResult[]> {
  const response = await fetch(`${API_BASE_URL}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profiles, requirements }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Matching failed' }));
    throw new Error(error.detail || 'Matching failed');
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
