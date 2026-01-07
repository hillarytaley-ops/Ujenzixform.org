import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  const ActionIcon = action?.icon || Plus;

  return (
    <div className={cn('text-center py-12', className)}>
      <Icon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">{description}</p>
      <div className="flex items-center justify-center gap-3">
        {action && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={action.onClick}
          >
            <ActionIcon className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button 
            variant="outline"
            className="border-slate-600 text-gray-300"
            onClick={secondaryAction.onClick}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};

// Error State Component
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'Failed to load data. Please try again.',
  onRetry,
  className,
}) => {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6">{description}</p>
      {onRetry && (
        <Button 
          variant="outline"
          className="border-slate-600 text-gray-300"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
};

// No Results State (for search/filter)
interface NoResultsStateProps {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}

export const NoResultsState: React.FC<NoResultsStateProps> = ({
  searchTerm,
  onClear,
  className,
}) => {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🔍</span>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
      <p className="text-gray-400 mb-6">
        {searchTerm 
          ? `No items match "${searchTerm}". Try a different search term.`
          : 'No items match your current filters.'
        }
      </p>
      {onClear && (
        <Button 
          variant="outline"
          className="border-slate-600 text-gray-300"
          onClick={onClear}
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
};


