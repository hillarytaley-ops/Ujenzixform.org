import React, { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    const getSystemTheme = (): 'light' | 'dark' => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const applyTheme = (newTheme: Theme) => {
      const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
      setResolvedTheme(resolved);

      root.classList.remove('light', 'dark');
      root.classList.add(resolved);

      // Update CSS variables for theme
      if (resolved === 'light') {
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f8fafc');
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--text-secondary', '#475569');
        root.style.setProperty('--border-color', '#e2e8f0');
      } else {
        root.style.setProperty('--bg-primary', '#0f172a');
        root.style.setProperty('--bg-secondary', '#1e293b');
        root.style.setProperty('--text-primary', '#f8fafc');
        root.style.setProperty('--text-secondary', '#94a3b8');
        root.style.setProperty('--border-color', '#334155');
      }
    };

    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme Toggle Button Component
export const ThemeToggle: React.FC<{ variant?: 'default' | 'compact' }> = ({ variant = 'default' }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="w-9 h-9 p-0"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4 text-yellow-400" />
        ) : (
          <Moon className="h-4 w-4 text-slate-600" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="hidden sm:inline capitalize">{theme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={`cursor-pointer ${theme === 'light' ? 'bg-slate-700' : ''}`}
        >
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={`cursor-pointer ${theme === 'dark' ? 'bg-slate-700' : ''}`}
        >
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={`cursor-pointer ${theme === 'system' ? 'bg-slate-700' : ''}`}
        >
          <Monitor className="h-4 w-4 mr-2" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;




