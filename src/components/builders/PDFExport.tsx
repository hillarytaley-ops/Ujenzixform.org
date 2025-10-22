import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, BarChart3, User, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFExportProps {
  builderId: string;
  builderData: any;
  className?: string;
}

export const PDFExport: React.FC<PDFExportProps> = ({ 
  builderId, 
  builderData, 
  className = '' 
}) => {
  const { toast } = useToast();

  const generateBuilderProfile = async () => {
    try {
      // In a real implementation, this would call a PDF generation service
      const profileData = {
        ...builderData,
        generatedAt: new Date().toISOString(),
        type: 'builder_profile'
      };

      // Mock PDF generation
      const blob = new Blob([JSON.stringify(profileData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${builderData.company_name || builderData.full_name}_Profile.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Profile Exported",
        description: "Builder profile has been exported as PDF"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export builder profile",
        variant: "destructive"
      });
    }
  };

  const generateAnalyticsReport = async () => {
    try {
      // Mock analytics data
      const analyticsData = {
        builderId,
        builderName: builderData.company_name || builderData.full_name,
        reportPeriod: 'Last 30 days',
        metrics: {
          profileViews: 1247,
          contactRequests: 89,
          projectInquiries: 34,
          averageRating: 4.8,
          responseRate: 94,
          bookingRate: 67
        },
        generatedAt: new Date().toISOString(),
        type: 'analytics_report'
      };

      const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${builderData.company_name || builderData.full_name}_Analytics_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Analytics report has been exported as PDF"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics report",
        variant: "destructive"
      });
    }
  };

  const generateProjectReport = async () => {
    try {
      // Mock project data
      const projectData = {
        builderId,
        builderName: builderData.company_name || builderData.full_name,
        projects: [
          {
            id: 'proj-001',
            name: 'Karen Villa Project',
            client: 'The Ndungu Family',
            status: 'Completed',
            value: 'KES 8.5M',
            startDate: '2024-01-15',
            endDate: '2024-09-15',
            location: 'Karen, Nairobi'
          },
          {
            id: 'proj-002',
            name: 'Westlands Commercial Complex',
            client: 'Westlands Properties Ltd',
            status: 'In Progress',
            value: 'KES 45M',
            startDate: '2024-03-01',
            endDate: '2024-12-31',
            location: 'Westlands, Nairobi'
          }
        ],
        generatedAt: new Date().toISOString(),
        type: 'project_report'
      };

      const blob = new Blob([JSON.stringify(projectData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${builderData.company_name || builderData.full_name}_Project_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Project report has been exported as PDF"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export project report",
        variant: "destructive"
      });
    }
  };

  const generateReviewsReport = async () => {
    try {
      const reviewsData = {
        builderId,
        builderName: builderData.company_name || builderData.full_name,
        averageRating: builderData.rating || 4.8,
        totalReviews: builderData.reviews?.length || 0,
        reviews: builderData.reviews || [],
        generatedAt: new Date().toISOString(),
        type: 'reviews_report'
      };

      const blob = new Blob([JSON.stringify(reviewsData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${builderData.company_name || builderData.full_name}_Reviews_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Reviews report has been exported as PDF"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export reviews report",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={generateBuilderProfile} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Builder Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateAnalyticsReport} className="cursor-pointer">
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>Analytics Report</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateProjectReport} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          <span>Project Report</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateReviewsReport} className="cursor-pointer">
          <Star className="mr-2 h-4 w-4" />
          <span>Reviews Report</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};













