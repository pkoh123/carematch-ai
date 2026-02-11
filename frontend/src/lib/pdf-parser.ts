import type { CaregiverProfile, ResumeFile } from '@/types/caregiver';
import { parseResume } from '@/lib/api';

/**
 * Parse a resume PDF file by sending it to the backend API.
 * Returns the extracted text and structured caregiver profile.
 */
export async function processResumeFile(
  resumeFile: ResumeFile
): Promise<{ extractedText: string; profile: CaregiverProfile }> {
  return parseResume(resumeFile.file, resumeFile.id);
}
