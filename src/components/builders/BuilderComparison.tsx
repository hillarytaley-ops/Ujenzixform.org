import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, Star, MapPin, Building2, Phone, Mail, CheckCircle, Award } from 'lucide-react';
import { UserProfile } from '@/types/userProfile';

interface BuilderComparisonProps {
  builders: (UserProfile & { 
    company_name?: string; 
    rating?: number; 
    total_projects?: number; 
    location?: string; 
    specialties?: string[];
    phone?: string;
    email?: string;
  })[];
  onRemoveBuilder: (builderId: string) => void;
  onContactBuilder: (builder: any) => void;
}

const BuilderComparison: React.FC<BuilderComparisonProps> = ({ 
  builders, 
  onRemoveBuilder, 
  onContactBuilder 
}) => {
  if (builders.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent>
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Builders to Compare</h3>
          <p className="text-gray-500">Select builders from the directory to compare them side by side</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Builder Comparison ({builders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700 min-w-[200px]">Builder</th>
                {builders.map((builder) => (
                  <th key={builder.id} className="text-center p-4 min-w-[250px] relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={() => onRemoveBuilder(builder.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={builder.user_type === 'company' ? builder.company_logo_url : builder.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(builder.company_name || builder.full_name || 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-semibold text-center">
                        {builder.company_name || builder.full_name}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Rating */}
              <tr className="border-t">
                <td className="p-4 font-medium text-gray-700">Rating</td>
                {builders.map((builder) => (
                  <td key={builder.id} className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{builder.rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Location */}
              <tr className="border-t bg-gray-50/50">
                <td className="p-4 font-medium text-gray-700">Location</td>
                {builders.map((builder) => (
                  <td key={builder.id} className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{builder.location || 'N/A'}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Projects Completed */}
              <tr className="border-t">
                <td className="p-4 font-medium text-gray-700">Projects Completed</td>
                {builders.map((builder) => (
                  <td key={builder.id} className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{builder.total_projects || 0}</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Builder Type */}
              <tr className="border-t bg-gray-50/50">
                <td className="p-4 font-medium text-gray-700">Type</td>
                {builders.map((builder) => (
                  <td key={builder.id} className="p-4 text-center">
                    <Badge variant={builder.user_type === 'company' ? 'default' : 'outline'}>
                      {builder.user_type === 'company' ? 'Company' : 'Individual'}
                    </Badge>
                  </td>
                ))}
              </tr>

              {/* Professional Status */}
              <tr className="border-t">
                <td className="p-4 font-medium text-gray-700">Professional</td>
                {builders.map((builder) => (
                  <td key={builder.id} className="p-4 text-center">
                    {builder.is_professional ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-gray-400 mx-auto" />
                    )}
                  </td>
                ))}
              </tr>

              {/* Specialties */}
              <tr className="border-t bg-gray-50/50">
                <td className="p-4 font-medium text-gray-700">Top Specialties</td>
                {builders.map((builder) => (
                  <td key={builder.id} className="p-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {builder.specialties?.slice(0, 2).map((specialty) => (
                        <Badge key={specialty} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {(builder.specialties?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(builder.specialties?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr className="border-t">
                <td className="p-4 font-medium text-gray-700">Actions</td>
                {builders.map((builder) => (
                  <td key={builder.id} className="p-4">
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => onContactBuilder(builder)}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Contact
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                      >
                        View Profile
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BuilderComparison;














