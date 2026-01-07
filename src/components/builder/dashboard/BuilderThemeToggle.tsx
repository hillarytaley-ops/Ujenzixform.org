import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from 'lucide-react';

interface BuilderThemeToggleProps {
  isDarkMode: boolean;
  onToggle: (isDark: boolean) => void;
  variant?: 'default' | 'outline' | 'ghost';
}

export const BuilderThemeToggle: React.FC<BuilderThemeToggleProps> = ({ 
  isDarkMode, 
  onToggle,
  variant = 'outline'
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size="icon"
          className={isDarkMode ? 'border-gray-600 text-gray-300' : ''}
        >
          {isDarkMode ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onToggle(false)}>
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggle(true)}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          onToggle(prefersDark);
        }}>
          <Monitor className="h-4 w-4 mr-2" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BuilderThemeToggle;




