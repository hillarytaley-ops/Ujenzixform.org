import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white/90 hover:bg-white text-gray-700 border-gray-300 gap-2 px-3">
          <Languages className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium hidden sm:inline">
            {language === 'en' ? 'EN' : 'SW'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border shadow-lg">
        <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
          <span className="mr-2">🇬🇧</span>
          <span>English</span>
          {language === 'en' && <span className="ml-auto text-green-600">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('sw')} className="cursor-pointer">
          <span className="mr-2">🇰🇪</span>
          <span>Kiswahili</span>
          {language === 'sw' && <span className="ml-auto text-green-600">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
