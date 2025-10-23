import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Clock, 
  Star,
  Play,
  ChevronRight,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipGuide, UserGuide } from './tooltip-guide';
import { allUserGuides } from '@/data/userGuides';

interface UserGuideMenuProps {
  trigger?: React.ReactNode;
  category?: 'workflow' | 'feature' | 'qr-system' | 'general';
}

export const UserGuideMenu: React.FC<UserGuideMenuProps> = ({ 
  trigger,
  category 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredGuides = allUserGuides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || guide.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'workflow': return 'bg-blue-100 text-blue-800';
      case 'feature': return 'bg-purple-100 text-purple-800';
      case 'qr-system': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            User Guides
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            User Guides & Documentation
          </DialogTitle>
          <DialogDescription>
            Interactive guides and documentation to help you master UjenziPro workflows
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guides..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="workflow">Workflows</SelectItem>
                <SelectItem value="feature">Features</SelectItem>
                <SelectItem value="qr-system">QR System</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredGuides.length} guide{filteredGuides.length !== 1 ? 's' : ''} found</span>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filtered by: {selectedCategory !== 'all' ? selectedCategory : 'all categories'}</span>
            </div>
          </div>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGuides.map((guide) => (
            <Card key={guide.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(guide.category)}</span>
                    <div>
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {guide.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <Badge className={getCategoryColor(guide.category)} variant="secondary">
                    {guide.category}
                  </Badge>
                  <Badge className={getDifficultyColor(guide.difficulty)} variant="secondary">
                    {guide.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {guide.estimatedTime}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Prerequisites */}
                  {guide.prerequisites && guide.prerequisites.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-1 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        Prerequisites:
                      </h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {guide.prerequisites.slice(0, 2).map((prereq, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span>{prereq}</span>
                          </li>
                        ))}
                        {guide.prerequisites.length > 2 && (
                          <li className="text-xs text-muted-foreground">
                            +{guide.prerequisites.length - 2} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Steps Preview */}
                  <div>
                    <h5 className="text-sm font-medium mb-1">
                      {guide.steps.length} Steps:
                    </h5>
                    <div className="text-xs text-muted-foreground">
                      {guide.steps.slice(0, 3).map((step, index) => (
                        <div key={step.id} className="flex items-center gap-1">
                          <span className="text-primary">{index + 1}.</span>
                          <span className="truncate">{step.title}</span>
                        </div>
                      ))}
                      {guide.steps.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{guide.steps.length - 3} more steps...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start Guide Button */}
                  <TooltipGuide 
                    guide={guide}
                    trigger={
                      <Button className="w-full" size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Start Interactive Guide
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    }
                    onComplete={() => {
                      // Could track completion here
                      console.log(`Completed guide: ${guide.title}`);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredGuides.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No guides found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or filters to find relevant guides.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserGuideMenu;















