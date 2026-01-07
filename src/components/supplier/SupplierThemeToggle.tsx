import React from 'react';
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

interface SupplierThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export const SupplierThemeToggle: React.FC<SupplierThemeToggleProps> = ({ isDarkMode, onToggle }) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={`
        ${isDarkMode 
          ? 'bg-slate-800 border-slate-600 text-white hover:bg-slate-700' 
          : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
        }
      `}
    >
      {isDarkMode ? (
        <>
          <Sun className="h-4 w-4 mr-2" />
          Light Mode
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 mr-2" />
          Dark Mode
        </>
      )}
    </Button>
  );
};

export default SupplierThemeToggle;




