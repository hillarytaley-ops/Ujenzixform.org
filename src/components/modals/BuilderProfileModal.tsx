import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, MapPin, Building2, Star, Users, Calendar, Award, X } from "lucide-react";
import { UserProfile } from "@/types/userProfile";

interface BuilderProfileModalProps {
  builder: UserProfile & {
    company_name?: string;
    phone?: string;
    email?: string;
    rating?: number;
    total_projects?: number;
    location?: string;
    specialties?: string[];
    description?: string;
    founded_year?: number;
    team_size?: number;
    certifications?: string[];
    recent_projects?: Array<{
      name: string;
      location: string;
      type: string;
      year: number;
      image?: string;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
  onContact: () => void;
}

export const BuilderProfileModal = ({ builder, isOpen, onClose, onContact }: BuilderProfileModalProps) => {
  const mockProjects = [
    {
      name: "Riverside Apartments",
      location: "Nairobi, Karen",
      type: "Residential Complex",
      year: 2023,
      description: "30-unit luxury apartment complex with modern amenities"
    },
    {
      name: "Commercial Plaza",
      location: "Nakuru, CBD",
      type: "Commercial Building", 
      year: 2022,
      description: "5-story commercial building with retail and office spaces"
    },
    {
      name: "Family Villa",
      location: "Kiambu, Runda",
      type: "Residential Villa",
      year: 2023,
      description: "Custom 4-bedroom villa with swimming pool and gardens"
    }
  ];

  const mockCertifications = [
    "National Construction Authority (NCA) License",
    "Kenya Association of Building Contractors",
    "ISO 9001:2015 Quality Management",
    "Environmental Impact Assessment Certification"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
              {(builder.company_name || builder.full_name || "U").charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{builder.company_name || builder.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {builder.user_type === 'company' ? 'Company' : 'Individual'}
                </Badge>
                {builder.is_professional && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Professional
                  </Badge>
                )}
                {builder.rating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{builder.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{builder.total_projects || 45}</div>
                <div className="text-sm text-muted-foreground">Projects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{2024 - (builder.founded_year || 2015)}</div>
                <div className="text-sm text-muted-foreground">Years</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{builder.team_size || 25}</div>
                <div className="text-sm text-muted-foreground">Team Size</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{builder.certifications?.length || 4}</div>
                <div className="text-sm text-muted-foreground">Certifications</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {builder.description || "A professional construction company with extensive experience in residential and commercial projects. We pride ourselves on quality workmanship, timely delivery, and customer satisfaction."}
                  </p>
                  
                  {builder.specialties && builder.specialties.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {builder.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Service Areas</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>• Nairobi County</div>
                        <div>• Kiambu County</div>
                        <div>• Nakuru County</div>
                        <div>• Kajiado County</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Services Offered</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>• New Construction</div>
                        <div>• Renovations & Extensions</div>
                        <div>• Project Management</div>
                        <div>• Architectural Design</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <div className="grid gap-4">
                {mockProjects.map((project, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{project.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {project.location}
                          </div>
                        </div>
                        <Badge variant="outline">{project.year}</Badge>
                      </div>
                      <Badge variant="secondary" className="mb-2">
                        {project.type}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="certifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Professional Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockCertifications.map((cert, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                        <div>
                          <div className="font-medium">{cert}</div>
                          <div className="text-sm text-muted-foreground">Valid • Last verified 2024</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Get In Touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {builder.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Phone</div>
                          <div className="text-muted-foreground">{builder.phone}</div>
                        </div>
                      </div>
                    )}
                    {builder.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Email</div>
                          <div className="text-muted-foreground">{builder.email}</div>
                        </div>
                      </div>
                    )}
                    {builder.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Location</div>
                          <div className="text-muted-foreground">{builder.location}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <Button onClick={onContact} className="w-full" size="lg">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};