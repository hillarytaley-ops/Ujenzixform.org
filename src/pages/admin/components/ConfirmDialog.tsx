import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogVariant = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-900/30',
      iconColor: 'text-red-500',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-900/30',
      iconColor: 'text-yellow-500',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
    },
    success: {
      icon: CheckCircle,
      iconBg: 'bg-green-900/30',
      iconColor: 'text-green-500',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    info: {
      icon: CheckCircle,
      iconBg: 'bg-blue-900/30',
      iconColor: 'text-blue-500',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95">
        <CardHeader className="text-center">
          <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4', config.iconBg)}>
            <Icon className={cn('h-8 w-8', config.iconColor)} />
          </div>
          <CardTitle className="text-white">{title}</CardTitle>
          <CardDescription className="text-gray-400">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          <Button
            variant="outline"
            className="border-slate-600 text-gray-300 hover:bg-slate-800"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            className={config.buttonClass}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Hook for managing confirm dialog state
export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    description: string;
    variant: DialogVariant;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const openDialog = (dialogConfig: {
    title: string;
    description: string;
    variant?: DialogVariant;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
  }) => {
    setConfig({
      ...dialogConfig,
      variant: dialogConfig.variant || 'danger',
    });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setConfig(null);
  };

  const handleConfirm = async () => {
    if (!config) return;
    
    setIsLoading(true);
    try {
      await config.onConfirm();
      closeDialog();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const DialogComponent = config ? (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={closeDialog}
      onConfirm={handleConfirm}
      title={config.title}
      description={config.description}
      variant={config.variant}
      confirmLabel={config.confirmLabel}
      isLoading={isLoading}
    />
  ) : null;

  return {
    openDialog,
    closeDialog,
    DialogComponent,
  };
};


