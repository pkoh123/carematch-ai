import { Trophy, Star, AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { MatchResult } from '@/types/caregiver';

interface MatchResultsProps {
  results: MatchResult[];
  onStartOver: () => void;
}

export function MatchResults({ results, onStartOver }: MatchResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    results.length > 0 ? results[0].caregiver.id : null
  );

  // Debug: Log results to see if match_badge is present
  console.log('Match Results:', results);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-primary bg-primary/10';
    if (score >= 70) return 'text-accent bg-accent/10';
    if (score >= 50) return 'text-warning bg-warning/10';
    return 'text-muted-foreground bg-muted';
  };

  const getMatchBadge = (matchBadge: string) => {
    switch (matchBadge) {
      case 'Top Match':
        return { icon: Trophy, label: 'Top Match', className: 'bg-primary text-primary-foreground' };
      case 'Strong Match':
        return { icon: Star, label: 'Strong Match', className: 'bg-accent text-accent-foreground' };
      case 'Good Match':
        return { icon: Star, label: 'Good Match', className: 'bg-secondary text-secondary-foreground' };
      case 'No Match':
        return { icon: AlertTriangle, label: 'No Match', className: 'bg-muted text-muted-foreground' };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Match Results</h2>
        <p className="text-muted-foreground">
          {results.length} caregiver{results.length !== 1 ? 's' : ''} analyzed and ranked
        </p>
      </div>

      <div className="space-y-4">
        {results.map((result) => {
          const matchBadge = getMatchBadge(result.match_badge);
          console.log(`Caregiver: ${result.caregiver.name}, match_badge: ${result.match_badge}, matchBadge:`, matchBadge);
          const isExpanded = expandedId === result.caregiver.id;

          return (
            <Card
              key={result.caregiver.id}
              className={cn(
                'transition-all duration-200',
                result.rank === 1 && 'ring-2 ring-primary/20'
              )}
            >
              <Collapsible
                open={isExpanded}
                onOpenChange={() => 
                  setExpandedId(isExpanded ? null : result.caregiver.id)
                }
              >
                <CardHeader className="pb-4">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-4">
                        {/* Rank indicator */}
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
                            result.rank <= 3 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {result.rank}
                        </div>

                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {result.caregiver.name}
                            </h3>
                            {matchBadge && (
                              <Badge className={matchBadge.className}>
                                <matchBadge.icon className="w-3 h-3 mr-1" />
                                {matchBadge.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.caregiver.yearsOfExperience} years experience • 
                            {result.caregiver.careTypes.map(ct => 
                              ct.replace('-', ' ')
                            ).join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Score */}
                        <div
                          className={cn(
                            'px-3 py-1 rounded-full font-semibold',
                            getScoreColor(result.score)
                          )}
                        >
                          {result.score}%
                        </div>
                        
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-6 pb-6 px-6 space-y-4">
                    {/* Overall fit */}
                    <div className="p-6 rounded-lg bg-muted/50">
                      <p className="text-foreground">
                        {result.explanation.overallFit}
                      </p>
                      <p className="mt-2 text-sm font-medium text-primary">
                        {result.explanation.recommendation}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div>
                        <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {result.explanation.strengths.map((strength, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <span className="text-primary mt-1">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Gaps */}
                      <div>
                        <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-accent" />
                          Considerations
                        </h4>
                        <ul className="space-y-1">
                          {result.explanation.gaps.map((gap, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <span className="text-accent mt-1">•</span>
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Caregiving Experience Details */}
                    {result.explanation.caregiving_experience && (
                      <div className="pt-6 space-y-4">
                        <h4 className="font-medium text-foreground">
                          Relevant Experience Details
                        </h4>
                        {Object.entries(result.explanation.caregiving_experience).map(([careType, experience]) => {
                          if (!experience || !careType) return null;

                          const displayType = careType.replace('_', '-').split('-').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');

                          return (
                            <div key={careType} className="p-5 rounded-lg bg-muted/30 space-y-2">
                              <h5 className="font-medium text-sm text-primary">
                                {displayType} ({experience.years} years)
                              </h5>
                              <div className="grid gap-2 text-xs">
                                {experience.conditions_experienced && experience.conditions_experienced.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Conditions: </span>
                                    <span className="text-muted-foreground">
                                      {experience.conditions_experienced.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.tasks_performed && experience.tasks_performed.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Tasks: </span>
                                    <span className="text-muted-foreground">
                                      {experience.tasks_performed.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.medical_care && experience.medical_care.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Medical Care: </span>
                                    <span className="text-muted-foreground">
                                      {experience.medical_care.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.age_range && experience.age_range.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Age Range: </span>
                                    <span className="text-muted-foreground">
                                      {experience.age_range.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.therapies_supported && experience.therapies_supported.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Therapies: </span>
                                    <span className="text-muted-foreground">
                                      {experience.therapies_supported.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.surgeries_supported && experience.surgeries_supported.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Surgeries: </span>
                                    <span className="text-muted-foreground">
                                      {experience.surgeries_supported.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.recovery_phases && experience.recovery_phases.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Recovery Phases: </span>
                                    <span className="text-muted-foreground">
                                      {experience.recovery_phases.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.dementia_types && experience.dementia_types.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Dementia Types: </span>
                                    <span className="text-muted-foreground">
                                      {experience.dementia_types.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.stages_experienced && experience.stages_experienced.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Stages: </span>
                                    <span className="text-muted-foreground">
                                      {experience.stages_experienced.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.disability_types && experience.disability_types.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Disability Types: </span>
                                    <span className="text-muted-foreground">
                                      {experience.disability_types.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {experience.specialized_skills && experience.specialized_skills.length > 0 && (
                                  <div>
                                    <span className="font-medium text-foreground">Specialized Skills: </span>
                                    <span className="text-muted-foreground">
                                      {experience.specialized_skills.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Profile details */}
                    <div className="pt-4 border-t border-border">
                      <div className="flex flex-wrap gap-2">
                        {result.caregiver.languages.map(lang => (
                          <Badge key={lang} variant="secondary">
                            {lang}
                          </Badge>
                        ))}
                        {result.caregiver.certifications.map(cert => (
                          <Badge key={cert} variant="outline">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Start over */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={onStartOver} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Start New Search
        </Button>
      </div>
    </div>
  );
}
