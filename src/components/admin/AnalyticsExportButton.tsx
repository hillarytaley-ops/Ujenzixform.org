import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileJson,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  exportToCSV, 
  exportToPDF, 
  exportToJSON,
  prepareExportData 
} from '@/utils/analyticsExport';

interface AnalyticsExportButtonProps {
  dailyData: Array<{ date: string; alerts: number; resolved: number; deliveries: number; requests: number }>;
  alertTypeData: Array<{ name: string; value: number; color: string }>;
  severityData: Array<{ name: string; value: number; color: string }>;
  dateRange: string;
  disabled?: boolean;
}

export const AnalyticsExportButton: React.FC<AnalyticsExportButtonProps> = ({
  dailyData,
  alertTypeData,
  severityData,
  dateRange,
  disabled = false
}) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
    if (dailyData.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(format);
    
    try {
      const exportData = prepareExportData(dailyData, alertTypeData, severityData, dateRange);
      
      switch (format) {
        case 'csv':
          exportToCSV(exportData, 'ujenzixform-analytics');
          toast.success('CSV file downloaded successfully!');
          break;
        case 'pdf':
          await exportToPDF(exportData, 'ujenzixform-analytics');
          toast.success('PDF report opened for printing');
          break;
        case 'json':
          exportToJSON(exportData, 'ujenzixform-analytics');
          toast.success('JSON file downloaded successfully!');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || exporting !== null}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleExport('csv')}
          disabled={exporting !== null}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          <span>Export as CSV</span>
          {exporting === 'csv' && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          <span>Export as PDF</span>
          {exporting === 'pdf' && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('json')}
          disabled={exporting !== null}
          className="cursor-pointer"
        >
          <FileJson className="h-4 w-4 mr-2 text-blue-600" />
          <span>Export as JSON</span>
          {exporting === 'json' && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AnalyticsExportButton;














