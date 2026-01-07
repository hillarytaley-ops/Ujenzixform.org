import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';

interface LanguageOption {
  code: 'en' | 'sw';
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
];

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'full';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'default',
  className = '' 
}) => {
  const { language, setLanguage } = useLanguage();
  
  const currentLang = languages.find(l => l.code === language) || languages[0];

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 px-2 ${className}`}
            aria-label="Change language"
          >
            <span className="text-lg">{currentLang.flag}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[150px]">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </div>
              {language === lang.code && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 ${
              language === lang.code 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'hover:bg-green-50'
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.nativeName}</span>
          </Button>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex items-center gap-2 ${className}`}
          aria-label="Change language"
        >
          <Globe className="h-4 w-4" />
          <span className="text-lg">{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          Select Language / Chagua Lugha
        </div>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{lang.flag}</span>
              <div>
                <p className="font-medium">{lang.nativeName}</p>
                <p className="text-xs text-muted-foreground">{lang.name}</p>
              </div>
            </div>
            {language === lang.code && (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;




