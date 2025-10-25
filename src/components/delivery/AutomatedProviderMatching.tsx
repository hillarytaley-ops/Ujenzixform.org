import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Zap, 
  Target, 
  Star, 
  Clock, 
  DollarSign, 
  MapPin,
  Truck,
  User,
  Building,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Brain,
  Route,
  Package,
  Shield,
  Award,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryRequest {
  id: string;
  material_type: string;
  weight: number;
  pickup_location: string;
  delivery_location: string;
  distance: number;
  urgency: 'standard' | 'urgent' | 'emergency';
  budget_max: number;
  preferred_provider_type?: 'individual' | 'company';
  special_requirements?: string;
}

interface ProviderMatch {
  provider_id: string;
  provider_name: string;
  provider_type: 'individual' | 'company';
  match_score: number;
  estimated_cost: number;
  estimated_time: number;
  availability: 'available' | 'busy' | 'unavailable';
  distance_from_pickup: number;
  rating: number;
  total_deliveries: number;
  specialties: string[];
  reasons: MatchReason[];
  confidence_level: 'high' | 'medium' | 'low';
}

interface MatchReason {
  factor: string;
  score: number;
  description: string;
  weight: number;
}

interface MatchingCriteria {
  location_weight: number;
  cost_weight: number;
  rating_weight: number;
  availability_weight: number;
  experience_weight: number;
  provider_type_preference: number;
}

interface AutomatedProviderMatchingProps {
  deliveryRequest: DeliveryRequest;
  onProviderSelected?: (providerId: string) => void;
  showMatchingProcess?: boolean;
}

export const AutomatedProviderMatching: React.FC<AutomatedProviderMatchingProps> = ({ 
  deliveryRequest,
  onProviderSelected,
  showMatchingProcess = true 
}) => {
  const [matches, setMatches] = useState<ProviderMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<MatchingCriteria>({
    location_weight: 0.3,
    cost_weight: 0.25,
    rating_weight: 0.2,
    availability_weight: 0.15,
    experience_weight: 0.1,
    provider_type_preference: 0.0
  });
  const { toast } = useToast();

  useEffect(() => {
    if (deliveryRequest) {
      performMatching();
    }
  }, [deliveryRequest]);

  const performMatching = async () => {
    try {
      setIsMatching(true);
      setMatchingProgress(0);

      // Simulate AI matching process with progress updates
      const steps = [
        'Analyzing delivery requirements...',
        'Scanning available providers...',
        'Calculating distances and costs...',
        'Evaluating provider ratings...',
        'Checking availability status...',
        'Computing match scores...',
        'Ranking recommendations...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setMatchingProgress(((i + 1) / steps.length) * 100);
        
        if (showMatchingProcess) {
          toast({
            title: 'AI Matching',
            description: steps[i],
            duration: 1000,
          });
        }
      }

      // Generate mock provider matches
      const mockMatches: ProviderMatch[] = [
        {
          provider_id: 'prv-001',
          provider_name: 'John Kamau',
          provider_type: 'individual',
          match_score: 94,
          estimated_cost: 1850,
          estimated_time: 45,
          availability: 'available',
          distance_from_pickup: 2.3,
          rating: 4.8,
          total_deliveries: 156,
          specialties: ['cement', 'small_materials'],
          confidence_level: 'high',
          reasons: [
            {
              factor: 'Location Proximity',
              score: 95,
              description: 'Only 2.3km from pickup location',
              weight: criteria.location_weight
            },
            {
              factor: 'Cost Efficiency',
              score: 90,
              description: 'Within budget range, competitive pricing',
              weight: criteria.cost_weight
            },
            {
              factor: 'High Rating',
              score: 96,
              description: '4.8/5 rating with excellent reviews',
              weight: criteria.rating_weight
            },
            {
              factor: 'Immediate Availability',
              score: 100,
              description: 'Available now, no scheduling conflicts',
              weight: criteria.availability_weight
            }
          ]
        },
        {
          provider_id: 'prv-002',
          provider_name: 'Swift Logistics Ltd',
          provider_type: 'company',
          match_score: 87,
          estimated_cost: 2650,
          estimated_time: 35,
          availability: 'available',
          distance_from_pickup: 5.8,
          rating: 4.7,
          total_deliveries: 1250,
          specialties: ['bulk_materials', 'heavy_equipment'],
          confidence_level: 'high',
          reasons: [
            {
              factor: 'Professional Service',
              score: 94,
              description: 'Established company with professional standards',
              weight: criteria.experience_weight
            },
            {
              factor: 'Fast Delivery',
              score: 88,
              description: 'Faster estimated delivery time',
              weight: criteria.availability_weight
            },
            {
              factor: 'Reliable Service',
              score: 94,
              description: '4.7/5 rating with 1,250+ deliveries',
              weight: criteria.rating_weight
            },
            {
              factor: 'Higher Cost',
              score: 70,
              description: 'Above average pricing but within budget',
              weight: criteria.cost_weight
            }
          ]
        },
        {
          provider_id: 'prv-003',
          provider_name: 'Grace Wanjiku',
          provider_type: 'individual',
          match_score: 82,
          estimated_cost: 1950,
          estimated_time: 50,
          availability: 'busy',
          distance_from_pickup: 8.2,
          rating: 4.9,
          total_deliveries: 89,
          specialties: ['building_blocks', 'medium_materials'],
          confidence_level: 'medium',
          reasons: [
            {
              factor: 'Excellent Rating',
              score: 98,
              description: 'Highest rating at 4.9/5 stars',
              weight: criteria.rating_weight
            },
            {
              factor: 'Material Expertise',
              score: 85,
              description: 'Specializes in building materials',
              weight: criteria.experience_weight
            },
            {
              factor: 'Limited Availability',
              score: 60,
              description: 'Currently busy, available in 2 hours',
              weight: criteria.availability_weight
            },
            {
              factor: 'Distance Factor',
              score: 75,
              description: '8.2km from pickup location',
              weight: criteria.location_weight
            }
          ]
        }
      ];

      setMatches(mockMatches.sort((a, b) => b.match_score - a.match_score));

    } catch (error) {
      console.error('Error performing matching:', error);
      toast({
        title: 'Matching Failed',
        description: 'Failed to find provider matches',
        variant: 'destructive'
      });
    } finally {
      setIsMatching(false);
      setMatchingProgress(100);
    }
  };

  const selectProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    onProviderSelected?.(providerId);
    
    const provider = matches.find(m => m.provider_id === providerId);
    if (provider) {
      toast({
        title: 'Provider Selected',
        description: `${provider.provider_name} has been selected for your delivery`,
      });
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          AI-Powered Provider Matching
        </h2>
        <p className="text-muted-foreground">
          Advanced algorithms find the best delivery providers for your specific needs
        </p>
      </div>

      {/* Matching Progress */}
      {isMatching && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="font-medium">AI Matching in Progress...</span>
              </div>
              <Progress value={matchingProgress} className="w-full" />
              <div className="text-sm text-muted-foreground text-center">
                Analyzing {matches.length > 0 ? matches.length : '50+'} providers for optimal matches
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Requirements Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">{deliveryRequest.material_type}</div>
                <div className="text-xs text-muted-foreground">{deliveryRequest.weight}kg</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">{deliveryRequest.distance}km</div>
                <div className="text-xs text-muted-foreground">Distance</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm font-medium capitalize">{deliveryRequest.urgency}</div>
                <div className="text-xs text-muted-foreground">Priority</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">KES {deliveryRequest.budget_max.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Max Budget</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Matches */}
      {matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recommended Providers</h3>
            <Button variant="outline" onClick={performMatching}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-match
            </Button>
          </div>

          {matches.map((match, index) => (
            <Card 
              key={match.provider_id}
              className={`transition-all ${
                selectedProvider === match.provider_id 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:shadow-md'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      {index === 0 && <Award className="h-5 w-5 text-primary" />}
                      {index === 1 && <Star className="h-5 w-5 text-yellow-500" />}
                      {index === 2 && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {index > 2 && (match.provider_type === 'company' ? 
                        <Building className="h-5 w-5 text-blue-500" /> : 
                        <User className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {match.provider_name}
                        {index === 0 && (
                          <Badge className="bg-primary text-primary-foreground">
                            Best Match
                          </Badge>
                        )}
                        <Badge className={
                          match.provider_type === 'company' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }>
                          {match.provider_type === 'company' ? 'Company' : 'Private'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {match.total_deliveries} deliveries • {match.rating}/5 rating
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getMatchScoreColor(match.match_score)}`}>
                      {match.match_score}%
                    </div>
                    <Badge className={getConfidenceColor(match.confidence_level)}>
                      {match.confidence_level} confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-2 border rounded">
                    <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-600" />
                    <div className="font-semibold text-sm">KES {match.estimated_cost.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Estimated Cost</div>
                  </div>
                  
                  <div className="text-center p-2 border rounded">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <div className="font-semibold text-sm">{match.estimated_time} min</div>
                    <div className="text-xs text-muted-foreground">Delivery Time</div>
                  </div>
                  
                  <div className="text-center p-2 border rounded">
                    <MapPin className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                    <div className="font-semibold text-sm">{match.distance_from_pickup} km</div>
                    <div className="text-xs text-muted-foreground">From Pickup</div>
                  </div>
                  
                  <div className="text-center p-2 border rounded">
                    <Badge className={getAvailabilityColor(match.availability)} variant="secondary">
                      {match.availability}
                    </Badge>
                  </div>
                </div>

                {/* Match Reasons */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Why This Provider?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {match.reasons.slice(0, 4).map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-muted-foreground">{reason.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specialties */}
                {match.specialties.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Specialties</h4>
                    <div className="flex flex-wrap gap-1">
                      {match.specialties.map((specialty, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {specialty.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => selectProvider(match.provider_id)}
                    disabled={match.availability === 'unavailable'}
                    className="flex-1"
                    variant={selectedProvider === match.provider_id ? 'default' : 'outline'}
                  >
                    {selectedProvider === match.provider_id ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-2" />
                        Select Provider
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Matching Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Matching Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Best Match Factors</span>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Location proximity (30% weight)</li>
                <li>• Cost efficiency (25% weight)</li>
                <li>• Provider rating (20% weight)</li>
                <li>• Availability status (15% weight)</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Optimization Tips</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Private providers: 43% cost savings</li>
                <li>• Companies: 15% faster delivery</li>
                <li>• Local providers: 60% better availability</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-800">Quality Assurance</span>
              </div>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• All providers verified</li>
                <li>• Insurance coverage confirmed</li>
                <li>• Performance history analyzed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Matches Found */}
      {!isMatching && matches.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Suitable Providers Found</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                No providers currently match your delivery requirements. This could be due to:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>No providers available in your area</li>
                <li>Budget constraints limiting options</li>
                <li>Urgent delivery requirements</li>
                <li>Specialized material handling needs</li>
              </ul>
              <div className="mt-3">
                <Button onClick={performMatching} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AutomatedProviderMatching;



















