import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, BarChart3, Users, FileText, Settings, Shield, 
  Activity, MessageSquare, Globe, DollarSign, QrCode, X
} from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-blue-400' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, color: 'text-red-400' },
  { id: 'registrations', label: 'Registrations', icon: Users, color: 'text-green-400', badge: true },
  { id: 'pages', label: 'Pages', icon: Globe, color: 'text-purple-400' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-yellow-400' },
  { id: 'documents', label: 'Documents', icon: FileText, color: 'text-orange-400' },
  { id: 'financial', label: 'Financial', icon: DollarSign, color: 'text-emerald-400' },
  { id: 'qr-scanning', label: 'QR Scanning', icon: QrCode, color: 'text-cyan-400' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-400' },
];

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, pendingCount }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-slate-900 border-slate-800 p-0">
          <SheetHeader className="p-4 border-b border-slate-800">
            <SheetTitle className="flex items-center gap-2 text-white">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span>Admin Navigation</span>
            </SheetTitle>
          </SheetHeader>
          
          <nav className="p-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/50' 
                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <Badge className="bg-yellow-600 text-white text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">System Operational</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;




