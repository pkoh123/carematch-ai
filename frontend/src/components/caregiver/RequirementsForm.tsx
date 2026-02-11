import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { 
  CareRequirements, 
  CareType, 
  SpecialConsideration, 
  ExperienceLevel 
} from '@/types/caregiver';

interface RequirementsFormProps {
  initialValues: CareRequirements;
  onSubmit: (requirements: CareRequirements) => void;
  onBack: () => void;
}

const CARE_TYPES: { value: CareType; label: string }[] = [
  { value: 'childcare', label: 'Childcare' },
  { value: 'eldercare', label: 'Eldercare' },
  { value: 'special-needs', label: 'Special Needs Care' },
  { value: 'post-surgery', label: 'Post-Surgery Recovery' },
  { value: 'dementia', label: 'Dementia/Memory Care' },
  { value: 'disability', label: 'Disability Support' },
];

const LANGUAGES = [
  'English',
  'Mandarin',
  'Hokkien',
  'Cantonese',
  'Malay',
  'Tamil',
  'Hindi',
];

const SPECIAL_CONSIDERATIONS: { value: SpecialConsideration; label: string }[] = [
  { value: 'medical-conditions', label: 'Medical conditions requiring monitoring' },
  { value: 'mobility-assistance', label: 'Mobility assistance needed' },
  { value: 'memory-care', label: 'Memory care requirements' },
  { value: 'behavioral-support', label: 'Behavioral support needed' },
  { value: 'medication-management', label: 'Medication management' },
  { value: 'physical-therapy', label: 'Physical therapy assistance' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'entry', label: 'Entry Level', description: '0-2 years' },
  { value: 'intermediate', label: 'Intermediate', description: '2-5 years' },
  { value: 'experienced', label: 'Experienced', description: '5-10 years' },
  { value: 'expert', label: 'Expert', description: '10+ years' },
];

export function RequirementsForm({ initialValues, onSubmit, onBack }: RequirementsFormProps) {
  const [formData, setFormData] = useState<CareRequirements>(initialValues);

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language],
    }));
  };

  const handleConsiderationToggle = (consideration: SpecialConsideration) => {
    setFormData(prev => ({
      ...prev,
      specialConsiderations: prev.specialConsiderations.includes(consideration)
        ? prev.specialConsiderations.filter(c => c !== consideration)
        : [...prev.specialConsiderations, consideration],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Care Requirements</h2>
        <p className="text-muted-foreground">
          Tell us about the care needs so we can find the best matches
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Care Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Type of Care Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.careType}
              onValueChange={(value: CareType) => 
                setFormData(prev => ({ ...prev, careType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select care type" />
              </SelectTrigger>
              <SelectContent>
                {CARE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Experience Level */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Minimum Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.experienceLevel}
              onValueChange={(value: ExperienceLevel) => 
                setFormData(prev => ({ ...prev, experienceLevel: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label} ({level.description})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Language Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Language Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {LANGUAGES.map(language => (
              <label
                key={language}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={formData.languages.includes(language)}
                  onCheckedChange={() => handleLanguageToggle(language)}
                />
                <span className="text-sm">{language}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Special Considerations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Special Considerations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {SPECIAL_CONSIDERATIONS.map(consideration => (
              <label
                key={consideration.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={formData.specialConsiderations.includes(consideration.value)}
                  onCheckedChange={() => handleConsiderationToggle(consideration.value)}
                />
                <span className="text-sm">{consideration.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overnight Care */}
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={formData.overnightCare}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, overnightCare: checked === true }))
              }
            />
            <div>
              <span className="font-medium">Overnight care required</span>
              <p className="text-sm text-muted-foreground">
                The caregiver may need to stay overnight
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any other requirements or preferences..."
            value={formData.additionalNotes}
            onChange={(e) => 
              setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))
            }
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="lg" className="px-8">
          Find Matches
        </Button>
      </div>
    </form>
  );
}
