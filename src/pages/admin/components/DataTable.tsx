import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState, NoResultsState } from './EmptyState';
import { TableSkeleton } from './LoadingSkeleton';

// Column Definition
export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

// Action Definition
export interface RowAction<T> {
  label: string;
  icon?: LucideIcon;
  onClick: (row: T) => void;
  variant?: 'default' | 'danger';
  show?: (row: T) => boolean;
}

interface DataTableProps<T extends { id: string }> {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  data: T[];
  columns: Column<T>[];
  actions?: RowAction<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  emptyState?: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  pageSize?: number;
  onRefresh?: () => void;
  onExport?: () => void;
  headerActions?: React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  title,
  description,
  icon: Icon,
  data,
  columns,
  actions,
  loading = false,
  searchPlaceholder = 'Search...',
  emptyState,
  pageSize = 10,
  onRefresh,
  onExport,
  headerActions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Get nested value from object
  const getNestedValue = (obj: T, path: string): unknown => {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const searchLower = searchTerm.toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        if (col.searchable === false) return false;
        const value = getNestedValue(row, col.key as string);
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortColumn);
      const bValue = getNestedValue(b, sortColumn);
      
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return <TableSkeleton rows={pageSize} columns={columns.length} />;
  }

  const showEmptyState = data.length === 0 && emptyState;
  const showNoResults = data.length > 0 && filteredData.length === 0;

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      {(title || description) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                {Icon && <Icon className="h-5 w-5 text-blue-500" />}
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-gray-400 mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-gray-400"
                  onClick={onRefresh}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-gray-400"
                  onClick={onExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {/* Search */}
        {!showEmptyState && (
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="text-sm text-gray-400">
              {filteredData.length} of {data.length} items
            </div>
          </div>
        )}

        {/* Empty State */}
        {showEmptyState && emptyState && (
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
            action={emptyState.action}
          />
        )}

        {/* No Results */}
        {showNoResults && (
          <NoResultsState
            searchTerm={searchTerm}
            onClear={() => setSearchTerm('')}
          />
        )}

        {/* Table */}
        {!showEmptyState && !showNoResults && (
          <>
            <div className="rounded-md border border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/50">
                    {columns.map((column) => (
                      <TableHead
                        key={column.key as string}
                        className={cn(
                          'text-gray-400',
                          column.sortable && 'cursor-pointer select-none hover:text-white',
                          column.className
                        )}
                        onClick={() => column.sortable && handleSort(column.key as string)}
                      >
                        <div className="flex items-center gap-2">
                          {column.label}
                          {column.sortable && (
                            <span className="text-gray-600">
                              {sortColumn === column.key ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {actions && actions.length > 0 && (
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row) => (
                    <TableRow key={row.id} className="border-slate-700 hover:bg-slate-800/50">
                      {columns.map((column) => {
                        const value = getNestedValue(row, column.key as string);
                        return (
                          <TableCell
                            key={column.key as string}
                            className={cn('text-gray-300', column.className)}
                          >
                            {column.render ? column.render(value, row) : String(value ?? '-')}
                          </TableCell>
                        );
                      })}
                      {actions && actions.length > 0 && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-slate-800 border-slate-700"
                            >
                              {actions
                                .filter((action) => !action.show || action.show(row))
                                .map((action, idx) => {
                                  const ActionIcon = action.icon;
                                  return (
                                    <DropdownMenuItem
                                      key={idx}
                                      className={cn(
                                        'cursor-pointer',
                                        action.variant === 'danger'
                                          ? 'text-red-400 hover:text-red-300'
                                          : 'text-gray-300 hover:text-white'
                                      )}
                                      onClick={() => action.onClick(row)}
                                    >
                                      {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                                      {action.label}
                                    </DropdownMenuItem>
                                  );
                                })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-gray-400"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-gray-400"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-gray-400"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-gray-400"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Status Badge Helper
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { className: string; label: string }> = {
    pending: { className: 'bg-yellow-600', label: 'Pending' },
    approved: { className: 'bg-green-600', label: 'Approved' },
    rejected: { className: 'bg-red-600', label: 'Rejected' },
    active: { className: 'bg-green-600', label: 'Active' },
    inactive: { className: 'bg-gray-600', label: 'Inactive' },
    online: { className: 'bg-green-600', label: 'Online' },
    offline: { className: 'bg-red-600', label: 'Offline' },
    completed: { className: 'bg-blue-600', label: 'Completed' },
    cancelled: { className: 'bg-gray-600', label: 'Cancelled' },
    verified: { className: 'bg-green-600', label: 'Verified' },
  };

  const config = statusConfig[status.toLowerCase()] || {
    className: 'bg-gray-600',
    label: status,
  };

  return <Badge className={config.className}>{config.label}</Badge>;
};


