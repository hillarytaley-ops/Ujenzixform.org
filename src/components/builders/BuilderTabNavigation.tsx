import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building } from "lucide-react";
import { TabConfig } from "@/config/builderTabs";

interface BuilderTabNavigationProps {
  tabConfigs: TabConfig[];
  gridCols: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const BuilderTabNavigation = ({ 
  tabConfigs, 
  gridCols, 
  onKeyDown 
}: BuilderTabNavigationProps) => {
  return (
    <TabsList 
      className={`grid w-full mb-8 ${
        gridCols <= 4 ? 'grid-cols-4' : 
        gridCols <= 6 ? 'grid-cols-6' : 
        'grid-cols-8'
      }`}
      onKeyDown={onKeyDown}
    >
      <TabsTrigger value="overview" className="flex items-center gap-2">
        <Building className="h-4 w-4" />
        <span className="hidden sm:inline">Overview</span>
      </TabsTrigger>
      
      {tabConfigs.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger 
            key={tab.id} 
            value={tab.id}
            className="flex items-center gap-2"
            title={tab.description}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
};