/**
 * ============================================================================
 * BULK ACTIONS COMPONENT FOR ADMIN
 * ============================================================================
 * 
 * Allows admins to approve/reject multiple items at once.
 * 
 * Features:
 * - Select all / deselect all
 * - Bulk approve
 * - Bulk reject
 * - Bulk delete
 * - Progress indicator
 * - Confirmation dialogs
 * 
 * @author MradiPro Team
 * @version 1.0.0
 * @created December 28, 2025
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle,
  XCircle,
  Trash2,
  MoreHorizontal,
  CheckSquare,
  Square,
  Loader2,
  AlertTriangle,
  ListChecks
} from 'lucide-react';

export interface BulkActionItem {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  [key: string]: any;
}

interface BulkActionsProps {
  items: BulkActionItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBulkApprove?: (ids: string[]) => Promise<void>;
  onBulkReject?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkAction?: (action: string, ids: string[]) => Promise<void>;
  customActions?: Array<{
    label: string;
    icon: React.ReactNode;
    action: string;
    variant?: 'default' | 'destructive';
  }>;
  entityName?: string;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  items,
  selectedIds,
  onSelectionChange,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  onBulkAction,
  customActions = [],
  entityName = 'items'
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    label: string;
    variant: 'default' | 'destructive';
  } | null>(null);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item.id));
    }
  };

  const handleSelectItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const confirmAction = (type: string, label: string, variant: 'default' | 'destructive' = 'default') => {
    setPendingAction({ type, label, variant });
    setShowConfirmDialog(true);
  };

  const executeAction = async () => {
    if (!pendingAction || selectedIds.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setShowConfirmDialog(false);

    try {
      const totalItems = selectedIds.length;
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      switch (pendingAction.type) {
        case 'approve':
          if (onBulkApprove) await onBulkApprove(selectedIds);
          break;
        case 'reject':
          if (onBulkReject) await onBulkReject(selectedIds);
          break;
        case 'delete':
          if (onBulkDelete) await onBulkDelete(selectedIds);
          break;
        default:
          if (onBulkAction) await onBulkAction(pendingAction.type, selectedIds);
      }

      clearInterval(progressInterval);
      setProgress(100);

      toast({
        title: "Success",
        description: `Successfully ${pendingAction.label.toLowerCase()} ${totalItems} ${entityName}.`,
      });

      // Clear selection after successful action
      onSelectionChange([]);
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: `Failed to ${pendingAction.label.toLowerCase()} ${entityName}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setPendingAction(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Bulk Actions Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-4">
          {/* Select All Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              // @ts-ignore - indeterminate is valid but not in types
              indeterminate={someSelected}
              onCheckedChange={handleSelectAll}
              disabled={isProcessing}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.length === 0 
                ? `Select all (${items.length})`
                : `${selectedIds.length} of ${items.length} selected`
              }
            </span>
          </div>

          {/* Selection Badge */}
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <ListChecks className="h-3 w-3" />
              {selectedIds.length} selected
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            {onBulkApprove && (
              <Button
                size="sm"
                variant="default"
                onClick={() => confirmAction('approve', 'Approved', 'default')}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve All
              </Button>
            )}

            {onBulkReject && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => confirmAction('reject', 'Rejected', 'default')}
                disabled={isProcessing}
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject All
              </Button>
            )}

            {onBulkDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => confirmAction('delete', 'Deleted', 'destructive')}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete All
              </Button>
            )}

            {/* Custom Actions Dropdown */}
            {customActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={isProcessing}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {customActions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => confirmAction(action.action, action.label, action.variant)}
                      className={action.variant === 'destructive' ? 'text-red-600' : ''}
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Processing {selectedIds.length} {entityName}...
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction?.variant === 'destructive' && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Confirm Bulk Action
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {pendingAction?.label.toLowerCase()} {selectedIds.length} {entityName}?
              {pendingAction?.type === 'delete' && (
                <span className="block mt-2 text-red-500 font-medium">
                  This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {items
                .filter(item => selectedIds.includes(item.id))
                .slice(0, 10)
                .map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{item.name || item.email || item.id}</span>
                  </div>
                ))
              }
              {selectedIds.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  ...and {selectedIds.length - 10} more
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={pendingAction?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `${pendingAction?.label} ${selectedIds.length} ${entityName}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component for selectable table rows
export const SelectableRow: React.FC<{
  item: BulkActionItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}> = ({ item, isSelected, onSelect, children }) => {
  return (
    <tr className={`${isSelected ? 'bg-blue-50' : ''} hover:bg-muted/50 transition-colors`}>
      <td className="p-3 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(item.id)}
        />
      </td>
      {children}
    </tr>
  );
};

export default BulkActions;


