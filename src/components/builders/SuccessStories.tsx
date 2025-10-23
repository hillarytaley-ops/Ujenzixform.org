import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar, DollarSign } from 'lucide-react';

const SuccessStories: React.FC = () => {
  const stories = [
    {
      id: 1,
      title: "Luxury Villa in Karen",
      builder: "Kamau Construction Ltd",
      client: "The Ndungu Family",
      location: "Karen, Nairobi",
      value: "KES 8.5M",
      duration: "8 months",
      image: "/project-karen-villa.jpg",
      description: "A stunning 4-bedroom villa with modern amenities, completed ahead of schedule with exceptional quality.",
      specialties: ["Luxury Residential", "Interior Design", "Landscaping"]
    },
    {
      id: 2,
      title: "Commercial Complex in Westlands",
      builder: "Elite Builders Kenya",
      client: "Westlands Properties Ltd",
      location: "Westlands, Nairobi",
      value: "KES 45M",
      duration: "18 months",
      image: "/project-westlands-complex.jpg",
      description: "A 6-story commercial complex with retail spaces and offices, featuring modern HVAC and security systems.",
      specialties: ["Commercial Construction", "HVAC Systems", "Security Installation"]
    },
    {
      id: 3,
      title: "Coastal Resort in Malindi",
      builder: "Coastal Construction Co.",
      client: "Malindi Beach Resort",
      location: "Malindi, Kilifi",
      value: "KES 25M",
      duration: "12 months",
      image: "/project-malindi-resort.jpg",
      description: "A beautiful beachfront resort with 30 rooms, infinity pool, and sustainable design elements.",
      specialties: ["Resort Construction", "Swimming Pools", "Sustainable Design"]
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Success Stories</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how our verified builders have transformed dreams into reality across Kenya
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {stories.map((story, index) => (
            <Card key={story.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
              {/* Project Image Placeholder */}
              <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 to-blue-700/80 flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-white opacity-60" />
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    {story.value}
                  </Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg drop-shadow-lg group-hover:scale-105 transition-transform duration-300">
                    {story.title}
                  </h3>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Project Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{story.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{story.duration}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {story.description}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2">
                    {story.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  {/* Builder & Client */}
                  <div className="pt-4 border-t">
                    <div className="text-sm">
                      <div className="font-semibold text-primary">{story.builder}</div>
                      <div className="text-gray-600">for {story.client}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">Ready to start your own success story?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-200"
              onClick={() => window.location.href = '/private-client-registration'}
            >
              Find Your Builder
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="hover:scale-105 transition-transform duration-200"
              onClick={() => window.location.href = '/professional-builder-registration'}
            >
              Join as Builder
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;
















