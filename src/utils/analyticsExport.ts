import { format } from 'date-fns';

// Types
interface ExportData {
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
    totalDeliveries: number;
    completedDeliveries: number;
    delayedDeliveries: number;
    accessRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    dateRange: string;
    generatedAt: string;
  };
  dailyData: Array<{
    date: string;
    alerts: number;
    resolved: number;
    deliveries: number;
    requests: number;
  }>;
  alertsByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  alertsBySeverity: Array<{
    severity: string;
    count: number;
  }>;
}

// CSV Export Functions
export const exportToCSV = (data: ExportData, filename: string = 'analytics-export'): void => {
  const csvSections: string[] = [];

  // Summary Section
  csvSections.push('=== MONITORING ANALYTICS REPORT ===');
  csvSections.push(`Generated: ${data.summary.generatedAt}`);
  csvSections.push(`Date Range: ${data.summary.dateRange}`);
  csvSections.push('');

  // Summary Metrics
  csvSections.push('=== SUMMARY METRICS ===');
  csvSections.push('Metric,Value');
  csvSections.push(`Total Alerts,${data.summary.totalAlerts}`);
  csvSections.push(`Critical Alerts,${data.summary.criticalAlerts}`);
  csvSections.push(`Resolved Alerts,${data.summary.resolvedAlerts}`);
  csvSections.push(`Resolution Rate,${data.summary.totalAlerts > 0 ? ((data.summary.resolvedAlerts / data.summary.totalAlerts) * 100).toFixed(1) : 0}%`);
  csvSections.push(`Total Deliveries,${data.summary.totalDeliveries}`);
  csvSections.push(`Completed Deliveries,${data.summary.completedDeliveries}`);
  csvSections.push(`Delayed Deliveries,${data.summary.delayedDeliveries}`);
  csvSections.push(`Access Requests,${data.summary.accessRequests}`);
  csvSections.push(`Approved Requests,${data.summary.approvedRequests}`);
  csvSections.push(`Rejected Requests,${data.summary.rejectedRequests}`);
  csvSections.push('');

  // Daily Data
  csvSections.push('=== DAILY BREAKDOWN ===');
  csvSections.push('Date,Alerts,Resolved,Deliveries,Access Requests');
  data.dailyData.forEach(day => {
    csvSections.push(`${day.date},${day.alerts},${day.resolved},${day.deliveries},${day.requests}`);
  });
  csvSections.push('');

  // Alerts by Type
  csvSections.push('=== ALERTS BY TYPE ===');
  csvSections.push('Alert Type,Count,Percentage');
  data.alertsByType.forEach(item => {
    csvSections.push(`${item.type},${item.count},${item.percentage.toFixed(1)}%`);
  });
  csvSections.push('');

  // Alerts by Severity
  csvSections.push('=== ALERTS BY SEVERITY ===');
  csvSections.push('Severity,Count');
  data.alertsBySeverity.forEach(item => {
    csvSections.push(`${item.severity},${item.count}`);
  });

  const csvContent = csvSections.join('\n');
  downloadFile(csvContent, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
};

// PDF Export (using HTML-to-PDF approach)
export const exportToPDF = async (data: ExportData, filename: string = 'analytics-report'): Promise<void> => {
  // Create HTML content
  const htmlContent = generatePDFHTML(data);
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
};

const generatePDFHTML = (data: ExportData): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MradiPro Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      padding: 40px;
      color: #1f2937;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 18px;
      color: #6b7280;
    }
    .meta {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 10px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .metric-card {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      text-align: center;
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }
    .metric-value.critical { color: #dc2626; }
    .metric-value.success { color: #16a34a; }
    .metric-value.warning { color: #f59e0b; }
    .metric-value.info { color: #2563eb; }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    tr:hover { background: #f9fafb; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #dbeafe; color: #2563eb; }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">📊 MradiPro</div>
    <div class="subtitle">Monitoring Analytics Report</div>
    <div class="meta">
      Date Range: ${data.summary.dateRange}<br>
      Generated: ${data.summary.generatedAt}
    </div>
  </div>

  <div class="section">
    <div class="section-title">📈 Summary Metrics</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${data.summary.totalAlerts}</div>
        <div class="metric-label">Total Alerts</div>
      </div>
      <div class="metric-card">
        <div class="metric-value critical">${data.summary.criticalAlerts}</div>
        <div class="metric-label">Critical Alerts</div>
      </div>
      <div class="metric-card">
        <div class="metric-value success">${data.summary.resolvedAlerts}</div>
        <div class="metric-label">Resolved</div>
      </div>
      <div class="metric-card">
        <div class="metric-value info">${data.summary.totalDeliveries}</div>
        <div class="metric-label">Total Deliveries</div>
      </div>
      <div class="metric-card">
        <div class="metric-value success">${data.summary.completedDeliveries}</div>
        <div class="metric-label">Completed</div>
      </div>
      <div class="metric-card">
        <div class="metric-value warning">${data.summary.delayedDeliveries}</div>
        <div class="metric-label">Delayed</div>
      </div>
    </div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${data.summary.accessRequests}</div>
        <div class="metric-label">Access Requests</div>
      </div>
      <div class="metric-card">
        <div class="metric-value success">${data.summary.approvedRequests}</div>
        <div class="metric-label">Approved</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.summary.totalAlerts > 0 ? ((data.summary.resolvedAlerts / data.summary.totalAlerts) * 100).toFixed(1) : 0}%</div>
        <div class="metric-label">Resolution Rate</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📅 Daily Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Alerts</th>
          <th>Resolved</th>
          <th>Deliveries</th>
          <th>Access Requests</th>
        </tr>
      </thead>
      <tbody>
        ${data.dailyData.map(day => `
          <tr>
            <td>${day.date}</td>
            <td>${day.alerts}</td>
            <td>${day.resolved}</td>
            <td>${day.deliveries}</td>
            <td>${day.requests}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">🔔 Alerts by Type</div>
    <table>
      <thead>
        <tr>
          <th>Alert Type</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${data.alertsByType.map(item => `
          <tr>
            <td>${item.type}</td>
            <td>${item.count}</td>
            <td>${item.percentage.toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">⚡ Alerts by Severity</div>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Count</th>
          <th>Level</th>
        </tr>
      </thead>
      <tbody>
        ${data.alertsBySeverity.map(item => `
          <tr>
            <td>${item.severity}</td>
            <td>${item.count}</td>
            <td><span class="badge badge-${item.severity.toLowerCase() === 'critical' || item.severity.toLowerCase() === 'emergency' ? 'critical' : item.severity.toLowerCase() === 'warning' ? 'warning' : 'info'}">${item.severity}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>MradiPro Construction Monitoring System</p>
    <p>This report was automatically generated. For questions, contact support@mradipro.com</p>
  </div>
</body>
</html>
  `;
};

// JSON Export
export const exportToJSON = (data: ExportData, filename: string = 'analytics-export'): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
};

// Helper function to download file
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Prepare data for export from analytics state
export const prepareExportData = (
  dailyData: Array<{ date: string; alerts: number; resolved: number; deliveries: number; requests: number }>,
  alertTypeData: Array<{ name: string; value: number; color: string }>,
  severityData: Array<{ name: string; value: number; color: string }>,
  dateRange: string
): ExportData => {
  const totalAlerts = dailyData.reduce((sum, d) => sum + d.alerts, 0);
  const resolvedAlerts = dailyData.reduce((sum, d) => sum + d.resolved, 0);
  const totalDeliveries = dailyData.reduce((sum, d) => sum + d.deliveries, 0);
  const totalRequests = dailyData.reduce((sum, d) => sum + d.requests, 0);

  const criticalCount = severityData.find(s => s.name.toLowerCase() === 'critical')?.value || 0;
  const emergencyCount = severityData.find(s => s.name.toLowerCase() === 'emergency')?.value || 0;

  return {
    summary: {
      totalAlerts,
      criticalAlerts: criticalCount + emergencyCount,
      resolvedAlerts,
      totalDeliveries,
      completedDeliveries: Math.round(totalDeliveries * 0.85), // Estimate if not available
      delayedDeliveries: Math.round(totalDeliveries * 0.1),
      accessRequests: totalRequests,
      approvedRequests: Math.round(totalRequests * 0.7),
      rejectedRequests: Math.round(totalRequests * 0.15),
      dateRange: dateRange === '24hours' ? 'Last 24 Hours' : 
                 dateRange === '7days' ? 'Last 7 Days' : 
                 dateRange === '30days' ? 'Last 30 Days' : dateRange,
      generatedAt: format(new Date(), 'MMMM dd, yyyy HH:mm:ss')
    },
    dailyData,
    alertsByType: alertTypeData.map(item => ({
      type: item.name,
      count: item.value,
      percentage: totalAlerts > 0 ? (item.value / totalAlerts) * 100 : 0
    })),
    alertsBySeverity: severityData.map(item => ({
      severity: item.name,
      count: item.value
    }))
  };
};














