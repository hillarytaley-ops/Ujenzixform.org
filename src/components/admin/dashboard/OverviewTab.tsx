import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Server, Database, Wifi, Globe, Activity, Zap, Users, 
  MessageSquare, BarChart3, Layers, ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Registration {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
}

interface AppPage {
  name: string;
  path: string;
  icon: React.ElementType;
  category: string;
  status: string;
}

interface OverviewTabProps {
  registrations: Registration[];
  appPages: AppPage[];
  stats: {
    pendingRegistrations: number;
  };
  setActiveTab: (tab: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

// System Health Card Component
const SystemHealthCard: React.FC = () => (
  <Card className="bg-slate-900/50 border-slate-800">
    <CardHeader>
      <CardTitle className="text-white flex items-center gap-2">
        <Server className="h-5 w-5 text-green-500" />
        System Health
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Server, name: 'API Server', status: 'Operational' },
          { icon: Database, name: 'Database', status: 'Supabase Connected' },
          { icon: Wifi, name: 'Auth Service', status: 'Active' },
          { icon: Globe, name: 'CDN', status: 'All Regions' },
        ].map((item, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
            <div className="p-2 bg-green-600/20 rounded-full">
              <item.icon className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-green-400 font-medium truncate">{item.name}</p>
              <p className="text-xs text-gray-400 truncate">{item.status}</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Recent Activity Card Component
const RecentActivityCard: React.FC<{
  registrations: Registration[];
  getStatusBadge: (status: string) => React.ReactNode;
}> = ({ registrations, getStatusBadge }) => (
  <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
    <CardHeader>
      <CardTitle className="text-white flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-500" />
        Recent Activity
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {registrations.slice(0, 6).map((reg) => (
          <div key={reg.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                reg.status === 'approved' ? 'bg-green-500' :
                reg.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{reg.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {reg.type} registration • {new Date(reg.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {getStatusBadge(reg.status)}
          </div>
        ))}
        {registrations.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// Quick Actions Card Component
const QuickActionsCard: React.FC<{
  pendingCount: number;
  setActiveTab: (tab: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ pendingCount, setActiveTab, navigate }) => (
  <Card className="bg-slate-900/50 border-slate-800">
    <CardHeader>
      <CardTitle className="text-white flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        Quick Actions
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Button 
        className="w-full justify-start bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30"
        onClick={() => setActiveTab('registrations')}
      >
        <Users className="h-4 w-4 mr-2" />
        Pending ({pendingCount})
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>
      
      <Button 
        className="w-full justify-start bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/30"
        onClick={() => setActiveTab('pages')}
      >
        <Globe className="h-4 w-4 mr-2" />
        View All Pages
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>
      
      <Button 
        className="w-full justify-start bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30"
        onClick={() => setActiveTab('feedback')}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        View Feedback
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>
      
      <Button 
        className="w-full justify-start bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/30"
        onClick={() => navigate('/analytics')}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Analytics
        <ChevronRight className="h-4 w-4 ml-auto" />
      </Button>
    </CardContent>
  </Card>
);

// App Pages Overview Card Component
const AppPagesOverviewCard: React.FC<{
  appPages: AppPage[];
  setActiveTab: (tab: string) => void;
}> = ({ appPages, setActiveTab }) => (
  <Card className="bg-slate-900/50 border-slate-800">
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-500" />
          Application Pages Overview
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-gray-400 hover:text-white"
          onClick={() => setActiveTab('pages')}
        >
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {appPages.slice(0, 12).map((page, index) => (
          <div 
            key={index}
            className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-center hover:border-blue-500/50 transition-all cursor-pointer"
            onClick={() => window.open(page.path, '_blank')}
          >
            <page.icon className={`h-6 w-6 mx-auto mb-2 ${
              page.category === 'admin' ? 'text-red-400' :
              page.category === 'protected' ? 'text-green-400' : 'text-blue-400'
            }`} />
            <p className="text-xs text-white font-medium truncate">{page.name}</p>
            <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-2 ${
              page.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Main Overview Tab Component
export const OverviewTab: React.FC<OverviewTabProps> = ({
  registrations,
  appPages,
  stats,
  setActiveTab,
  getStatusBadge
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <SystemHealthCard />
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RecentActivityCard 
          registrations={registrations} 
          getStatusBadge={getStatusBadge} 
        />
        <QuickActionsCard 
          pendingCount={stats.pendingRegistrations}
          setActiveTab={setActiveTab}
          navigate={navigate}
        />
      </div>
      
      <AppPagesOverviewCard 
        appPages={appPages}
        setActiveTab={setActiveTab}
      />
    </div>
  );
};

export default OverviewTab;




