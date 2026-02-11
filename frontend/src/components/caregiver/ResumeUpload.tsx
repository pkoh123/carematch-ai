import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ResumeFile } from '@/types/caregiver';
import { processResumeFile } from '@/lib/pdf-parser';

interface ResumeUploadProps {
  resumes: ResumeFile[];
  onResumesChange: (resumes: ResumeFile[]) => void;
  onResumeUpdate: (id: string, updates: Partial<ResumeFile>) => void;
  onContinue: () => void;
}

const MAX_FILES = 5;

export function ResumeUpload({
  resumes,
  onResumesChange,
  onResumeUpdate,
  onContinue,
}: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(async (resumeFile: ResumeFile) => {
    onResumeUpdate(resumeFile.id, { status: 'processing' });

    try {
      const { extractedText, profile } = await processResumeFile(resumeFile);

      onResumeUpdate(resumeFile.id, {
        status: 'completed',
        extractedText,
        profile,
      });
    } catch (error) {
      onResumeUpdate(resumeFile.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to process resume',
      });
    }
  }, [onResumeUpdate]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const pdfFiles = fileArray.filter(f => f.type === 'application/pdf');
    
    const availableSlots = MAX_FILES - resumes.length;
    const filesToAdd = pdfFiles.slice(0, availableSlots);

    if (filesToAdd.length === 0) return;

    const newResumes: ResumeFile[] = filesToAdd.map(file => ({
      id: `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending' as const,
    }));

    onResumesChange([...resumes, ...newResumes]);

    // Process each file
    newResumes.forEach(r => processFile(r));
  }, [resumes, onResumesChange, processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeResume = useCallback((id: string) => {
    onResumesChange(resumes.filter(r => r.id !== id));
  }, [resumes, onResumesChange]);

  const allProcessed = resumes.length > 0 && resumes.every(r => r.status === 'completed');
  const hasErrors = resumes.some(r => r.status === 'error');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Upload Caregiver Resumes</h2>
        <p className="text-muted-foreground">
          Upload up to {MAX_FILES} PDF resumes to begin matching
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50',
          resumes.length >= MAX_FILES && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Drag and drop PDF resumes here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse files
            </p>
          </div>
          <label>
            <input
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              disabled={resumes.length >= MAX_FILES}
            />
            <Button
              type="button"
              variant="outline"
              disabled={resumes.length >= MAX_FILES}
              className="cursor-pointer"
              asChild
            >
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      </div>

      {/* File list */}
      {resumes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {resumes.length} of {MAX_FILES} resumes uploaded
          </p>
          
          <div className="space-y-2">
            {resumes.map((resume) => (
              <Card key={resume.id} className="overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {resume.file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(resume.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {resume.status === 'pending' && (
                      <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                    {resume.status === 'processing' && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    )}
                    {resume.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                    {resume.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeResume(resume.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={onContinue}
          disabled={!allProcessed || hasErrors}
          size="lg"
          className="px-8"
        >
          Continue to Requirements
        </Button>
      </div>
    </div>
  );
}
