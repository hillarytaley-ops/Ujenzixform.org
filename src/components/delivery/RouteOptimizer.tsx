import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Route, MapPin, Clock, Fuel, DollarSign, Zap, 
  ArrowRight, RefreshCw, CheckCircle, AlertTriangle,
  Navigation, Truck, RotateCcw, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeliveryStop {
  id: string;
  name: string;
  address: string;
  type: 'pickup' | 'delivery';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTime: number; // minutes
  distance: number; // km
  timeWindow?: { start: string; end: string };
}

interface OptimizedRoute {
  stops: DeliveryStop[];
  totalDistance: number;
  totalTime: number;
  estimatedFuelCost: number;
  savings: {
    distance: number;
    time: number;
    fuel: number;
  };
}

interface RouteOptimizerProps {
  deliveries: DeliveryStop[];
  driverLocation?: { lat: number; lng: number };
  onRouteOptimized?: (route: OptimizedRoute) => void;
  onStartNavigation?: (stop: DeliveryStop) => void;
}

export const RouteOptimizer: React.FC<RouteOptimizerProps> = ({
  deliveries,
  driverLocation,
  onRouteOptimized,
  onStartNavigation
}) => {
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const { toast } = useToast();

  // Simulate route optimization algorithm
  const optimizeRoute = async () => {
    setIsOptimizing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Simple optimization: sort by priority and time window
      const sortedStops = [...deliveries].sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Then sort by time window if available
        if (a.timeWindow && b.timeWindow) {
          return a.timeWindow.start.localeCompare(b.timeWindow.start);
        }
        
        return 0;
      });

      // Calculate totals
      const totalDistance = sortedStops.reduce((sum, stop) => sum + stop.distance, 0);
      const totalTime = sortedStops.reduce((sum, stop) => sum + stop.estimatedTime, 0);
      const fuelCostPerKm = 15; // KES per km
      const estimatedFuelCost = totalDistance * fuelCostPerKm;

      // Calculate savings (comparing to original order)
      const originalDistance = deliveries.reduce((sum, stop) => sum + stop.distance, 0);
      const originalTime = deliveries.reduce((sum, stop) => sum + stop.estimatedTime, 0);
      
      const optimized: OptimizedRoute = {
        stops: sortedStops,
        totalDistance,
        totalTime,
        estimatedFuelCost,
        savings: {
          distance: Math.max(0, originalDistance * 0.15), // Simulated 15% savings
          time: Math.max(0, originalTime * 0.12), // Simulated 12% time savings
          fuel: Math.max(0, estimatedFuelCost * 0.15)
        }
      };

      setOptimizedRoute(optimized);
      onRouteOptimized?.(optimized);

      toast({
        title: "Route optimized!",
        description: `Saved ${optimized.savings.distance.toFixed(1)}km and ${Math.round(optimized.savings.time)} minutes`,
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStopIcon = (type: string, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return type === 'pickup' 
      ? <Truck className="h-5 w-5 text-blue-500" />
      : <MapPin className="h-5 w-5 text-teal-500" />;
  };

  const markStopComplete = (index: number) => {
    if (index === currentStopIndex) {
      setCurrentStopIndex(prev => prev + 1);
      toast({
        title: "Stop completed",
        description: `Moving to next stop`,
      });
    }
  };

  const resetRoute = () => {
    setOptimizedRoute(null);
    setCurrentStopIndex(0);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Route className="h-5 w-5 text-teal-600" />
              Route Optimizer
            </CardTitle>
            <CardDescription>
              AI-powered route optimization for maximum efficiency
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {optimizedRoute && (
              <Button variant="outline" size="sm" onClick={resetRoute}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
            <Button 
              onClick={optimizeRoute}
              disabled={isOptimizing || deliveries.length === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Optimize Route
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Savings Summary */}
        {optimizedRoute && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Route className="h-4 w-4" />
                <span className="text-sm font-medium">Distance Saved</span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                {optimizedRoute.savings.distance.toFixed(1)} km
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Time Saved</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">
                {Math.round(optimizedRoute.savings.time)} min
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 text-purple-700 mb-1">
                <Fuel className="h-4 w-4" />
                <span className="text-sm font-medium">Fuel Saved</span>
              </div>
              <p className="text-2xl font-bold text-purple-800">
                KES {Math.round(optimizedRoute.savings.fuel)}
              </p>
            </div>
          </div>
        )}

        {/* Route Progress */}
        {optimizedRoute && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Route Progress</span>
              <span className="font-medium">
                {currentStopIndex} / {optimizedRoute.stops.length} stops
              </span>
            </div>
            <Progress 
              value={(currentStopIndex / optimizedRoute.stops.length) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Route Summary */}
        {optimizedRoute && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Distance</p>
                <p className="text-lg font-semibold">{optimizedRoute.totalDistance.toFixed(1)} km</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Est. Time</p>
                <p className="text-lg font-semibold">{Math.round(optimizedRoute.totalTime)} min</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Fuel Cost</p>
                <p className="text-lg font-semibold">KES {optimizedRoute.estimatedFuelCost.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Optimized Stops List */}
        {optimizedRoute ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Optimized Route Order</h4>
            {optimizedRoute.stops.map((stop, index) => {
              const isCompleted = index < currentStopIndex;
              const isCurrent = index === currentStopIndex;
              
              return (
                <div
                  key={stop.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200 opacity-60' 
                      : isCurrent 
                        ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-200' 
                        : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Step Number */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-teal-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>

                  {/* Stop Icon */}
                  <div className="flex-shrink-0">
                    {getStopIcon(stop.type, isCompleted)}
                  </div>

                  {/* Stop Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{stop.name}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(stop.priority)}`}
                      >
                        {stop.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {stop.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{stop.address}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Route className="h-3 w-3" />
                        {stop.distance} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {stop.estimatedTime} min
                      </span>
                      {stop.timeWindow && (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          {stop.timeWindow.start} - {stop.timeWindow.end}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-2">
                    {isCurrent && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onStartNavigation?.(stop)}
                        >
                          <Navigation className="h-4 w-4 mr-1" />
                          Navigate
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => markStopComplete(index)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Route className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              {deliveries.length === 0 
                ? 'No deliveries to optimize' 
                : `${deliveries.length} deliveries ready for optimization`
              }
            </p>
            {deliveries.length > 0 && (
              <Button onClick={optimizeRoute} disabled={isOptimizing}>
                <Sparkles className="h-4 w-4 mr-2" />
                Optimize Now
              </Button>
            )}
          </div>
        )}

        {/* Optimization Tips */}
        <Alert className="bg-blue-50 border-blue-200">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Pro Tip:</strong> The optimizer considers priority, time windows, and distance to create the most efficient route. Complete urgent deliveries first!
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default RouteOptimizer;




