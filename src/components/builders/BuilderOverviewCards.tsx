import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight } from "lucide-react";
import { TabConfig } from "@/config/builderTabs";
import { UserProfile } from "@/types/userProfile";
import { useUserRole } from "@/hooks/useUserRole";

interface BuilderOverviewCardsProps {
  tabConfigs: TabConfig[];
  userProfile: UserProfile;
  onTabChange: (tabId: string) => void;
}

export const BuilderOverviewCards = ({ 
  tabConfigs, 
  userProfile, 
  onTabChange 
}: BuilderOverviewCardsProps) => {
  const { userRole } = useUserRole();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tabConfigs.map((tab) => {
        const Icon = tab.icon;
        
        return (
          <Card 
            key={tab.id} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02]" 
            onClick={() => onTabChange(tab.id)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTabChange(tab.id);
              }
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span>{tab.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>{tab.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {tab.badge && (
                <Badge variant="secondary" className="text-xs">
                  {tab.badge}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card className="hover:shadow-lg transition-all duration-200 group hover:scale-[1.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Profile & Settings
          </CardTitle>
          <CardDescription>
            Manage your builder profile and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {userProfile.user_type === 'company' ? 'Company' : 
               userProfile.is_professional ? 'Professional' : 'Individual'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {userRole ? `Role: ${userRole}` : 'Role: builder'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};