import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Star, Phone, Navigation } from 'lucide-react';

interface BuilderMapProps {
  builders: any[];
  onBuilderSelect: (builder: any) => void;
}

const BuilderMap: React.FC<BuilderMapProps> = ({ builders, onBuilderSelect }) => {
  const [selectedBuilder, setSelectedBuilder] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Kenya coordinates for different counties
  const countyCoordinates: { [key: string]: { lat: number; lng: number } } = {
    'Nairobi': { lat: -1.2921, lng: 36.8219 },
    'Mombasa': { lat: -4.0435, lng: 39.6682 },
    'Kisumu': { lat: -0.0917, lng: 34.7680 },
    'Nakuru': { lat: -0.3031, lng: 36.0800 },
    'Eldoret': { lat: 0.5143, lng: 35.2698 },
    'Thika': { lat: -1.0332, lng: 37.0692 },
    'Malindi': { lat: -3.2175, lng: 40.1169 },
    'Kitale': { lat: 1.0177, lng: 35.0062 },
    'Garissa': { lat: -0.4536, lng: 39.6401 },
    'Nyeri': { lat: -0.4167, lng: 36.9500 },
    'Machakos': { lat: -1.5177, lng: 37.2634 },
    'Meru': { lat: 0.0500, lng: 37.6500 }
  };

  const getBuilderPosition = (location: string) => {
    return countyCoordinates[location] || { lat: -1.2921, lng: 36.8219 };
  };

  return (
    <div className="space-y-4">
      {/* Map/List Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Builder Locations</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapPin className="h-4 w-4 mr-1" />
            Map View
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <Building2 className="h-4 w-4 mr-1" />
            List View
          </Button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <Card className="h-96">
          <CardContent className="p-0 h-full">
            {/* Map Placeholder - In production, integrate with Google Maps or Mapbox */}
            <div className="h-full bg-gradient-to-br from-blue-100 to-green-100 relative overflow-hidden rounded-lg">
              {/* Kenya Map Outline */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl text-gray-300 font-bold">🇰🇪</div>
              </div>
              
              {/* Builder Markers */}
              {builders.map((builder, index) => {
                const position = getBuilderPosition(builder.location);
                const x = ((position.lng + 42) / 8) * 100; // Rough conversion to percentage
                const y = ((position.lat + 5) / 6) * 100;
                
                return (
                  <div
                    key={builder.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                    style={{ 
                      left: `${Math.max(10, Math.min(90, x))}%`, 
                      top: `${Math.max(10, Math.min(90, 100 - y))}%` 
                    }}
                    onClick={() => setSelectedBuilder(builder)}
                  >
                    <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                );
              })}

              {/* Selected Builder Info */}
              {selectedBuilder && (
                <div className="absolute bottom-4 left-4 right-4">
                  <Card className="bg-white/95 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(selectedBuilder.company_name || selectedBuilder.full_name || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">
                            {selectedBuilder.company_name || selectedBuilder.full_name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {selectedBuilder.location}
                            <Star className="h-3 w-3 text-yellow-500 fill-current ml-2" />
                            {selectedBuilder.rating?.toFixed(1)}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => onBuilderSelect(selectedBuilder)}
                        >
                          Contact
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <div className="grid gap-4">
          {builders.map((builder) => (
            <Card key={builder.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(builder.company_name || builder.full_name || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="font-semibold">{builder.company_name || builder.full_name}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {builder.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        {builder.rating?.toFixed(1)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {builder.total_projects} projects
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onRemoveBuilder(builder.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => onBuilderSelect(builder)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Contact
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Map Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Navigation className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-blue-800 text-sm">Interactive Map</div>
              <div className="text-blue-700 text-xs">
                Click on numbered markers to see builder details. Use the comparison table above to evaluate multiple builders side by side.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuilderMap;
















