import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Building2, Calendar } from "lucide-react";
import { UserProfile } from "@/types/userProfile";

interface ContactBuilderModalProps {
  builder: UserProfile & {
    company_name?: string;
    phone?: string;
    email?: string;
    location?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const ContactBuilderModal = ({ builder, isOpen, onClose }: ContactBuilderModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    budget: "",
    timeline: "",
    message: ""
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Message Sent Successfully",
      description: `Your inquiry has been sent to ${builder.company_name || builder.full_name}. They will contact you within 24 hours.`,
    });
    
    onClose();
    setFormData({
      name: "", email: "", phone: "", projectType: "", budget: "", timeline: "", message: ""
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Contact {builder.company_name || builder.full_name}
          </DialogTitle>
          <DialogDescription>
            Send a message to discuss your construction project requirements.
          </DialogDescription>
        </DialogHeader>

        {/* Builder Info */}
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{builder.company_name || builder.full_name}</span>
          </div>
          {builder.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{builder.location}</span>
            </div>
          )}
          {builder.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{builder.phone}</span>
            </div>
          )}
          {builder.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{builder.email}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Full Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+254 7XX XXX XXX"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select value={formData.projectType} onValueChange={(value) => handleInputChange("projectType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="renovation">Renovation</SelectItem>
                  <SelectItem value="extension">Extension</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget Range (KSh)</Label>
              <Select value={formData.budget} onValueChange={(value) => handleInputChange("budget", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under-500k">Under 500K</SelectItem>
                  <SelectItem value="500k-1m">500K - 1M</SelectItem>
                  <SelectItem value="1m-3m">1M - 3M</SelectItem>
                  <SelectItem value="3m-5m">3M - 5M</SelectItem>
                  <SelectItem value="over-5m">Over 5M</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timeline</Label>
            <Select value={formData.timeline} onValueChange={(value) => handleInputChange("timeline", value)}>
              <SelectTrigger>
                <SelectValue placeholder="When do you want to start?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediately">Immediately</SelectItem>
                <SelectItem value="1-month">Within 1 month</SelectItem>
                <SelectItem value="1-3-months">1-3 months</SelectItem>
                <SelectItem value="3-6-months">3-6 months</SelectItem>
                <SelectItem value="planning">Still planning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Project Details *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              placeholder="Describe your project requirements, location, and any specific needs..."
              rows={4}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};