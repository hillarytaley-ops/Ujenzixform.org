import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  RotateCcw,
  BookOpen,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'focus';
  tips?: string[];
}

export interface UserGuide {
  id: string;
  title: string;
  description: string;
  category: 'workflow' | 'feature' | 'qr-system' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  steps: GuideStep[];
  prerequisites?: string[];
}

interface TooltipGuideProps {
  guide: UserGuide;
  trigger?: React.ReactNode;
  autoStart?: boolean;
  onComplete?: () => void;
}

interface QuickTooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  tips?: string[];
}

// Quick Tooltip Component for simple help
export const QuickTooltip: React.FC<QuickTooltipProps> = ({ 
  content, 
  children, 
  side = 'top',
  tips = []
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            {children}
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm">{content}</p>
            {tips.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">💡 Tips:</p>
                <ul className="text-xs space-y-1">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-primary">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Interactive Guide Component
export const TooltipGuide: React.FC<TooltipGuideProps> = ({ 
  guide, 
  trigger,
  autoStart = false,
  onComplete 
}) => {
  const [isOpen, setIsOpen] = useState(autoStart);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const currentGuideStep = guide.steps[currentStep];
  const isLastStep = currentStep === guide.steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (!isLastStep) {
      setCompletedSteps(prev => new Set([...prev, currentGuideStep.id]));
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentGuideStep.id]));
    setIsOpen(false);
    setCurrentStep(0);
    setIsPlaying(false);
    onComplete?.();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsPlaying(false);
  };

  const startAutoPlay = () => {
    setIsPlaying(true);
    // Auto-advance every 5 seconds
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= guide.steps.length - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 5000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'workflow': return '🔄';
      case 'feature': return '⚡';
      case 'qr-system': return '📱';
      default: return '📚';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{getCategoryIcon(guide.category)}</span>
                {guide.title}
              </DialogTitle>
              <DialogDescription>{guide.description}</DialogDescription>
              <div className="flex items-center gap-2">
                <Badge className={getDifficultyColor(guide.difficulty)}>
                  {guide.difficulty}
                </Badge>
                <Badge variant="outline">
                  ⏱️ {guide.estimatedTime}
                </Badge>
                <Badge variant="outline">
                  {currentStep + 1} of {guide.steps.length}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Prerequisites */}
        {guide.prerequisites && guide.prerequisites.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Prerequisites
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm space-y-1">
                {guide.prerequisites.map((prereq, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>{prereq}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Current Step */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                  {currentStep + 1}
                </span>
                {currentGuideStep.title}
              </span>
              {completedSteps.has(currentGuideStep.id) && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </CardTitle>
            <CardDescription>{currentGuideStep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step Content */}
            <div className="prose prose-sm max-w-none">
              {currentGuideStep.content}
            </div>

            {/* Tips */}
            {currentGuideStep.tips && currentGuideStep.tips.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Pro Tips
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {currentGuideStep.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500">💡</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(((currentStep + 1) / guide.steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / guide.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={currentStep === 0 && completedSteps.size === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={isPlaying ? () => setIsPlaying(false) : startAutoPlay}
              disabled={isLastStep}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Auto Play
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={isPlaying}
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TooltipGuide;

















