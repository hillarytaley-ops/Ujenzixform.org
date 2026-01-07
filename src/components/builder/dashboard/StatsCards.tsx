import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, FileText, CheckCircle, DollarSign, Users, Star, Package,
  TrendingUp, TrendingDown
} from 'lucide-react';

interface ProfessionalStats {
  activeProjects: number;
  pendingQuotes: number;
  completedProjects: number;
  totalSpent: string;
  suppliersConnected: number;
  averageRating: number;
  teamMembers: number;
  monthlyOrders: number;
}

interface PrivateStats {
  activeProjects: number;
  pendingQuotes: number;
  completedProjects: number;
  totalSpent: string;
  suppliersConnected: number;
  savedItems: number;
}

interface StatsCardsProps {
  isProfessional: boolean;
  stats: ProfessionalStats | PrivateStats;
  isDarkMode?: boolean;
  trends?: {
    activeProjects?: number;
    pendingQuotes?: number;
    completedProjects?: number;
    totalSpent?: number;
  };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ 
  isProfessional, 
  stats, 
  isDarkMode = false,
  trends 
}) => {
  const TrendIndicator = ({ value }: { value?: number }) => {
    if (!value) return null;
    const isPositive = value > 0;
    return (
      <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(value)}%
      </span>
    );
  };

  const cardClass = isDarkMode 
    ? 'bg-gray-800 border-gray-700 shadow-lg' 
    : 'bg-white shadow-sm hover:shadow-md transition-shadow';

  const textClass = isDarkMode ? 'text-gray-400' : 'text-muted-foreground';
  const valueClass = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${isProfessional ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-4`}>
      {/* Active Projects */}
      <Card className={cardClass}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${textClass}`}>Active Projects</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${valueClass}`}>{stats.activeProjects}</p>
                <TrendIndicator value={trends?.activeProjects} />
              </div>
            </div>
            <div className={`p-2 rounded-lg ${isProfessional ? 'bg-blue-100' : 'bg-emerald-100'}`}>
              <Building2 className={`h-6 w-6 ${isProfessional ? 'text-blue-600' : 'text-emerald-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pending Quotes */}
      <Card className={cardClass}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${textClass}`}>Pending Quotes</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${valueClass}`}>{stats.pendingQuotes}</p>
                <TrendIndicator value={trends?.pendingQuotes} />
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Completed Projects */}
      <Card className={cardClass}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${textClass}`}>Completed</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${valueClass}`}>{stats.completedProjects}</p>
                <TrendIndicator value={trends?.completedProjects} />
              </div>
            </div>
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Total Spent */}
      <Card className={cardClass}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs ${textClass}`}>Total Spent</p>
              <p className={`text-lg font-bold ${valueClass}`}>{stats.totalSpent}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-100">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional-only stats */}
      {isProfessional && (
        <>
          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${textClass}`}>Team Members</p>
                  <p className={`text-2xl font-bold ${valueClass}`}>
                    {(stats as ProfessionalStats).teamMembers}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-purple-100">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={cardClass}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${textClass}`}>Rating</p>
                  <p className={`text-2xl font-bold ${valueClass} flex items-center gap-1`}>
                    {(stats as ProfessionalStats).averageRating}
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Private-only stats */}
      {!isProfessional && (
        <Card className={cardClass}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${textClass}`}>Saved Items</p>
                <p className={`text-2xl font-bold ${valueClass}`}>
                  {(stats as PrivateStats).savedItems}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-pink-100">
                <Package className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCards;




