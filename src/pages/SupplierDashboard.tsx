import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLoader } from "@/components/ui/DashboardLoader";
import { toast } from "sonner";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Users,
  Star,
  Truck,
  Plus,
  Eye,
  Edit,
  BarChart3,
  Bell,
  Settings,
  Store,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  Moon,
  Sun,
  Globe,
  Headphones,
  FileCheck,
  XCircle,
  Send,
  MapPin,
  Building2,
  LogOut,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSupplierData, logDataAccessAttempt } from "@/hooks/useDataIsolation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SupplierCharts } from "@/components/supplier/SupplierCharts";
import { ProductManagement } from "@/components/supplier/ProductManagement";
import { OrderManagement } from "@/components/supplier/OrderManagement";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SupplierAnalyticsDashboard } from "@/components/suppliers/SupplierAnalyticsDashboard";
import { SupplierProductManager } from "@/components/suppliers/SupplierProductManager";
import { MessageSquare, QrCode, Boxes, BarChart3 as BarChartIcon, User, Scan } from "lucide-react";
import { EnhancedQRCodeManager } from "@/components/qr/EnhancedQRCodeManager";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { ProfileViewDialog } from "@/components/profile/ProfileViewDialog";
import { InventoryManager } from "@/components/supplier/InventoryManager";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { ReviewsList, SupplierRatingSummary } from "@/components/reviews/ReviewSystem";
import { UserAnalyticsDashboard } from "@/components/analytics/UserAnalyticsDashboard";
import { InAppCommunication } from "@/components/communication/InAppCommunication";
import { DispatchScanner } from "@/components/qr/DispatchScanner";
import { TrackingTab } from "@/components/tracking/TrackingTab";
import { Navigation as NavigationIcon } from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  averageRating: number;
}

interface RecentOrder {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// QUOTES MANAGEMENT CONTENT COMPONENT - Extracted for reuse in sub-tabs
// ═══════════════════════════════════════════════════════════════════════════════════════════════
interface QuotesManagementContentProps {
  quoteRequests: any[];
  loadingQuotes: boolean;
  isDarkMode: boolean;
  textColor: string;
  mutedText: string;
  cardBg: string;
  openQuoteDialog: (quote: any) => void;
  handleQuoteAction: (action: string) => void;
  setSelectedQuote: (quote: any) => void;
  setActiveTab: (tab: string) => void;
  fetchQuoteRequests: () => void;
}

const QuotesManagementContent: React.FC<QuotesManagementContentProps> = ({
  quoteRequests,
  loadingQuotes,
  isDarkMode,
  textColor,
  mutedText,
  openQuoteDialog,
  handleQuoteAction,
  setSelectedQuote,
  setActiveTab,
  fetchQuoteRequests
}) => {
  // Default to 'pending' to show Pending Response quotes as the primary view
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'quoted' | 'confirmed'>('pending');
  
  const pendingQuotes = quoteRequests.filter(q => q.status === 'pending');
  const quotedQuotes = quoteRequests.filter(q => q.status === 'quoted');
  const confirmedQuotes = quoteRequests.filter(q => q.status === 'confirmed' || q.status === 'accepted');

  // Filter quotes based on active filter
  const filteredQuotes = activeFilter === 'all' 
    ? quoteRequests 
    : activeFilter === 'pending' 
    ? pendingQuotes 
    : activeFilter === 'quoted' 
    ? quotedQuotes 
    : confirmedQuotes;

  return (
    <div className="space-y-4">
      {/* Clickable Status Filter Cards */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
          className={`p-4 rounded-lg border text-left transition-all duration-200 ${
            activeFilter === 'pending'
              ? 'ring-2 ring-amber-500 shadow-lg scale-[1.02]'
              : 'hover:shadow-md hover:scale-[1.01]'
          } ${isDarkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <span className={`font-semibold ${textColor}`}>{pendingQuotes.length}</span>
          </div>
          <p className={`text-xs ${mutedText}`}>Pending Response</p>
          {activeFilter === 'pending' && (
            <p className="text-xs text-amber-600 mt-1 font-medium">✓ Showing</p>
          )}
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === 'quoted' ? 'all' : 'quoted')}
          className={`p-4 rounded-lg border text-left transition-all duration-200 ${
            activeFilter === 'quoted'
              ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02]'
              : 'hover:shadow-md hover:scale-[1.01]'
          } ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}
        >
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-500" />
            <span className={`font-semibold ${textColor}`}>{quotedQuotes.length}</span>
          </div>
          <p className={`text-xs ${mutedText}`}>Awaiting Client</p>
          {activeFilter === 'quoted' && (
            <p className="text-xs text-blue-600 mt-1 font-medium">✓ Showing</p>
          )}
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === 'confirmed' ? 'all' : 'confirmed')}
          className={`p-4 rounded-lg border text-left transition-all duration-200 ${
            activeFilter === 'confirmed'
              ? 'ring-2 ring-green-500 shadow-lg scale-[1.02]'
              : 'hover:shadow-md hover:scale-[1.01]'
          } ${isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className={`font-semibold ${textColor}`}>{confirmedQuotes.length}</span>
          </div>
          <p className={`text-xs ${mutedText}`}>Confirmed Orders</p>
          {activeFilter === 'confirmed' && (
            <p className="text-xs text-green-600 mt-1 font-medium">✓ Showing</p>
          )}
        </button>
      </div>

      {/* Active Filter Indicator & Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeFilter !== 'all' && (
            <>
              <Badge 
                variant="outline" 
                className={`${
                  activeFilter === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                  activeFilter === 'quoted' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                  'bg-green-100 text-green-700 border-green-300'
                }`}
              >
                {activeFilter === 'pending' ? `📋 Pending Response (${pendingQuotes.length})` : 
                 activeFilter === 'quoted' ? `⏳ Awaiting Client (${quotedQuotes.length})` : 
                 `✅ Confirmed Orders (${confirmedQuotes.length})`}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveFilter('all')}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Show All ({quoteRequests.length})
              </Button>
            </>
          )}
          {activeFilter === 'all' && (
            <span className={`text-sm ${mutedText}`}>Showing all {quoteRequests.length} quotes</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuoteRequests} disabled={loadingQuotes}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loadingQuotes ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quote Requests List */}
      {loadingQuotes ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : filteredQuotes.length > 0 ? (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className={`p-4 rounded-lg border ${
                quote.status === 'pending' 
                  ? isDarkMode ? 'border-amber-600 bg-amber-900/10' : 'border-amber-300 bg-amber-50'
                  : quote.status === 'confirmed' || quote.status === 'accepted'
                  ? isDarkMode ? 'border-green-600 bg-green-900/10' : 'border-green-300 bg-green-50'
                  : isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-white'} shadow-sm`}>
                      <Building2 className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${textColor}`}>{quote.builder_name || 'Professional Builder'}</h4>
                      <p className={`text-sm font-medium text-blue-600`}>{quote.material_name}</p>
                      <p className={`text-sm ${mutedText}`}>Qty: {quote.quantity} {quote.unit}</p>
                      {quote.delivery_address && (
                        <p className={`text-xs mt-1 ${mutedText}`}>
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {quote.delivery_address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge className={`${
                    quote.status === 'quote_created' || quote.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    quote.status === 'quote_received_by_supplier' ? 'bg-cyan-100 text-cyan-700' :
                    quote.status === 'quote_responded' || quote.status === 'quoted' ? 'bg-blue-100 text-blue-700' :
                    quote.status === 'quote_revised' ? 'bg-yellow-100 text-yellow-700' :
                    quote.status === 'quote_viewed_by_builder' ? 'bg-indigo-100 text-indigo-700' :
                    quote.status === 'quote_accepted' || quote.status === 'confirmed' || quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    quote.status === 'quote_rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {quote.status === 'quote_created' ? 'Quote Created' :
                     quote.status === 'quote_received_by_supplier' ? 'Viewing Quote' :
                     quote.status === 'quote_responded' ? 'Quote Sent' :
                     quote.status === 'quote_revised' ? 'Quote Revised' :
                     quote.status === 'quote_viewed_by_builder' ? 'Client Viewing' :
                     quote.status === 'quote_accepted' ? 'Quote Accepted' :
                     quote.status === 'quote_rejected' ? 'Quote Rejected' :
                     quote.status === 'pending' ? 'Awaiting Response' :
                     quote.status === 'quoted' ? 'Awaiting Client' :
                     quote.status === 'confirmed' || quote.status === 'accepted' ? 'Confirmed' :
                     quote.status}
                  </Badge>

                  {quote.quote_amount && (
                    <p className={`font-bold ${textColor}`}>KES {Number(quote.quote_amount).toLocaleString()}</p>
                  )}

                  {(quote.status === 'quote_created' || quote.status === 'quote_received_by_supplier' || quote.status === 'pending') && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => openQuoteDialog(quote)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Quote
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => {
                        setSelectedQuote(quote);
                        handleQuoteAction('reject');
                      }}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {(quote.status === 'confirmed' || quote.status === 'accepted') && (
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => setActiveTab('view-orders')}>
                      <Package className="h-4 w-4 mr-1" />
                      View Order
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileCheck className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
          {activeFilter !== 'all' ? (
            <>
              <p className={`text-lg font-medium ${textColor}`}>No {activeFilter === 'pending' ? 'Pending' : activeFilter === 'quoted' ? 'Awaiting Client' : 'Confirmed'} Quotes</p>
              <p className={mutedText}>No quotes match the selected filter</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveFilter('all')}>
                Show All Quotes
              </Button>
            </>
          ) : (
            <>
              <p className={`text-lg font-medium ${textColor}`}>No Quote Requests Yet</p>
              <p className={mutedText}>Quote requests from professional builders will appear here</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SUPPLIER REPORTS TAB COMPONENT - Generates real reports from data
// ═══════════════════════════════════════════════════════════════════════════════════════════════
interface SupplierReportsTabProps {
  supplierId: string;
  isDarkMode: boolean;
  textColor: string;
  mutedText: string;
  cardBg: string;
  stats: DashboardStats;
  recentOrders: RecentOrder[];
  quoteRequests: any[];
}

const SupplierReportsTab: React.FC<SupplierReportsTabProps> = ({
  supplierId,
  isDarkMode,
  textColor,
  mutedText,
  cardBg,
  stats,
  recentOrders,
  quoteRequests
}) => {
  const [reportType, setReportType] = useState<string>('sales');
  const [dateRange, setDateRange] = useState<string>('30days');
  const [generating, setGenerating] = useState(false);

  // Calculate report data
  const completedOrders = recentOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
  const pendingOrders = recentOrders.filter(o => o.status === 'pending' || o.status === 'processing');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  
  const quoteConversionRate = quoteRequests.length > 0 
    ? (quoteRequests.filter(q => q.status === 'confirmed' || q.status === 'accepted').length / quoteRequests.length) * 100 
    : 0;

  const handleGenerateReport = async () => {
    setGenerating(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setGenerating(false);
    
    // Generate CSV content
    let csvContent = '';
    const today = new Date().toLocaleDateString();
    
    if (reportType === 'sales') {
      csvContent = `Sales Report - Generated ${today}\n\n`;
      csvContent += `Total Revenue,KES ${totalRevenue.toLocaleString()}\n`;
      csvContent += `Total Orders,${stats.totalOrders}\n`;
      csvContent += `Completed Orders,${completedOrders.length}\n`;
      csvContent += `Pending Orders,${pendingOrders.length}\n`;
      csvContent += `Average Order Value,KES ${averageOrderValue.toFixed(2)}\n\n`;
      csvContent += `Order ID,Customer,Product,Quantity,Amount,Status,Date\n`;
      recentOrders.forEach(order => {
        csvContent += `${order.id},${order.customer_name},${order.product_name},${order.quantity},${order.total_amount},${order.status},${order.created_at}\n`;
      });
    } else if (reportType === 'quotes') {
      csvContent = `Quote Report - Generated ${today}\n\n`;
      csvContent += `Total Quotes,${quoteRequests.length}\n`;
      csvContent += `Conversion Rate,${quoteConversionRate.toFixed(1)}%\n`;
      csvContent += `Pending Quotes,${quoteRequests.filter(q => q.status === 'pending').length}\n`;
      csvContent += `Confirmed Quotes,${quoteRequests.filter(q => q.status === 'confirmed' || q.status === 'accepted').length}\n\n`;
      csvContent += `Quote ID,Builder,Material,Quantity,Quote Amount,Status,Date\n`;
      quoteRequests.forEach(quote => {
        csvContent += `${quote.id},${quote.builder_name || 'N/A'},${quote.material_name},${quote.quantity},${quote.quote_amount || 'N/A'},${quote.status},${quote.created_at}\n`;
      });
    } else if (reportType === 'inventory') {
      csvContent = `Inventory Report - Generated ${today}\n\n`;
      csvContent += `Total Products,${stats.totalProducts}\n`;
      csvContent += `Note: Detailed inventory data requires database query\n`;
    }

    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className={cardBg}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${textColor}`}>
          <FileText className="h-5 w-5 text-green-600" />
          Reports & Data Export
        </CardTitle>
        <CardDescription className={mutedText}>
          Generate and download reports based on your sales, quotes, and inventory data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} border ${isDarkMode ? 'border-green-800' : 'border-green-200'}`}>
            <DollarSign className="h-6 w-6 text-green-500 mb-2" />
            <p className={`text-2xl font-bold ${textColor}`}>KES {totalRevenue.toLocaleString()}</p>
            <p className={`text-xs ${mutedText}`}>Total Revenue</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDarkMode ? 'border-blue-800' : 'border-blue-200'}`}>
            <ShoppingCart className="h-6 w-6 text-blue-500 mb-2" />
            <p className={`text-2xl font-bold ${textColor}`}>{stats.totalOrders}</p>
            <p className={`text-xs ${mutedText}`}>Total Orders</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'} border ${isDarkMode ? 'border-purple-800' : 'border-purple-200'}`}>
            <TrendingUp className="h-6 w-6 text-purple-500 mb-2" />
            <p className={`text-2xl font-bold ${textColor}`}>{quoteConversionRate.toFixed(1)}%</p>
            <p className={`text-xs ${mutedText}`}>Quote Conversion</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'} border ${isDarkMode ? 'border-orange-800' : 'border-orange-200'}`}>
            <Package className="h-6 w-6 text-orange-500 mb-2" />
            <p className={`text-2xl font-bold ${textColor}`}>{stats.totalProducts}</p>
            <p className={`text-xs ${mutedText}`}>Total Products</p>
          </div>
        </div>

        {/* Report Generator */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
          <h4 className={`font-semibold mb-4 ${textColor}`}>Generate Report</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className={mutedText}>Report Type</Label>
              <select 
                className={`w-full mt-1 p-2 rounded-md border ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="sales">Sales Report</option>
                <option value="quotes">Quote Report</option>
                <option value="inventory">Inventory Report</option>
              </select>
            </div>
            <div>
              <Label className={mutedText}>Date Range</Label>
              <select 
                className={`w-full mt-1 p-2 rounded-md border ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleGenerateReport}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Download CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div>
          <h4 className={`font-semibold mb-4 ${textColor}`}>Recent Activity Summary</h4>
          <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Metric</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>This Period</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${mutedText} uppercase tracking-wider`}>Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-600' : 'divide-gray-200'}`}>
                <tr className={isDarkMode ? 'bg-slate-800' : 'bg-white'}>
                  <td className={`px-4 py-3 ${textColor}`}>Orders Received</td>
                  <td className={`px-4 py-3 font-semibold ${textColor}`}>{stats.totalOrders}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </td>
                </tr>
                <tr className={isDarkMode ? 'bg-slate-800' : 'bg-white'}>
                  <td className={`px-4 py-3 ${textColor}`}>Pending Orders</td>
                  <td className={`px-4 py-3 font-semibold ${textColor}`}>{stats.pendingOrders}</td>
                  <td className="px-4 py-3">
                    <Badge className={stats.pendingOrders > 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                      {stats.pendingOrders > 5 ? 'Needs Attention' : 'On Track'}
                    </Badge>
                  </td>
                </tr>
                <tr className={isDarkMode ? 'bg-slate-800' : 'bg-white'}>
                  <td className={`px-4 py-3 ${textColor}`}>Quote Requests</td>
                  <td className={`px-4 py-3 font-semibold ${textColor}`}>{quoteRequests.length}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-blue-100 text-blue-700">Active</Badge>
                  </td>
                </tr>
                <tr className={isDarkMode ? 'bg-slate-800' : 'bg-white'}>
                  <td className={`px-4 py-3 ${textColor}`}>Customer Rating</td>
                  <td className={`px-4 py-3 font-semibold ${textColor}`}>{stats.averageRating.toFixed(1)} / 5.0</td>
                  <td className="px-4 py-3">
                    <Badge className={stats.averageRating >= 4 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {stats.averageRating >= 4 ? 'Excellent' : 'Good'}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SupplierDashboard = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  
  // NOTE: Role check is already done by RoleProtectedRoute in App.tsx
  // No need for duplicate verification here - this speeds up loading!
  
  // Dark mode state - initialize immediately for instant UI
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('supplier-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('supplier-dark-mode', JSON.stringify(newValue));
      return newValue;
    });
  };
  
  // Use data isolation hook - ensures only THIS supplier's data is fetched
  const {
    profile: isolatedProfile,
    orders: supplierOrders,
    stats: isolatedStats,
    loading: dataLoading,
    error: dataError,
    refetch: refetchData
  } = useSupplierData();
  
  const [loading, setLoading] = useState(true);
  const [supplierProfile, setSupplierProfile] = useState<any>(null);
  const [supplierRecordId, setSupplierRecordId] = useState<string | null>(null); // Actual supplier table ID
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageRating: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewOrdersSubTab, setViewOrdersSubTab] = useState('quotes');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteResponse, setQuoteResponse] = useState({
    quoteAmount: '',
    validUntil: '',
    supplierNotes: ''
  });
  const [processingQuote, setProcessingQuote] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Show UI immediately - don't wait for data
  useEffect(() => {
    if (user) {
      setLoading(false);
    }
    // Safety timeout - show UI after 2 seconds max
    const timeout = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timeout);
  }, [user]);

  // Update local state when isolated data loads (background)
  useEffect(() => {
    if (isolatedProfile) {
      setSupplierProfile(isolatedProfile);
    }
    if (isolatedStats) {
      setStats(isolatedStats);
    }
    // Transform orders to match local format
    if (supplierOrders && supplierOrders.length > 0) {
      const formattedOrders: RecentOrder[] = supplierOrders.slice(0, 10).map((order: any) => ({
        id: order.id,
        customer_name: order.builder_name || 'Customer',
        product_name: order.items?.[0]?.name || order.description || 'Order Items',
        quantity: order.items?.[0]?.quantity || 1,
        total_amount: order.total_amount || 0,
        status: order.status || 'pending',
        created_at: order.created_at
      }));
      setRecentOrders(formattedOrders);
    }
  }, [isolatedProfile, isolatedStats, supplierOrders]);

  // Log data access for security audit
  useEffect(() => {
    if (user?.id) {
      logDataAccessAttempt(user.id, 'view', 'supplier_dashboard', true, 'Dashboard loaded');
    }
  }, [user?.id]);

  // Fetch quote requests function - using native fetch API for reliability
  const fetchQuoteRequests = async () => {
    // Get user ID from multiple sources
    let userId = user?.id;
    let userEmail = user?.email;
    
    if (!userId) {
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          userId = parsed.user?.id;
          userEmail = parsed.user?.email;
        }
      } catch (e) {}
    }
    if (!userId) {
      userId = localStorage.getItem('user_id') || undefined;
      userEmail = localStorage.getItem('user_email') || undefined;
    }
    
    if (!userId) {
      console.log('❌ Cannot fetch quotes - no user.id available');
      return;
    }
    
    setLoadingQuotes(true);
    console.log('🔄 Fetching quotes for supplier userId:', userId, 'email:', userEmail);
    
    // Get auth token from localStorage for faster access
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {
      console.warn('Could not get session from localStorage');
    }
    
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    try {
      // STEP 1: Find ALL supplier records that could belong to this user
      // Check by user_id, email, and also by id (in case userId IS the supplier.id)
      const supplierIds = new Set<string>([userId]); // Always include userId
      
      // Try to find supplier by user_id
      try {
        const supplierResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${userId}&select=id,user_id,company_name,email`,
          { headers, cache: 'no-store' }
        );
        
        if (supplierResponse.ok) {
          const supplierData = await supplierResponse.json();
          if (supplierData?.[0]) {
            supplierIds.add(supplierData[0].id);
            if (supplierData[0].user_id) supplierIds.add(supplierData[0].user_id);
            console.log('📦 Found supplier by user_id:', supplierData[0]);
            setSupplierRecordId(supplierData[0].id);
          }
        }
      } catch (e) {
        console.warn('Supplier lookup by user_id failed');
      }
      
      // Also try to find supplier by email
      if (userEmail) {
        try {
          const emailResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?email=eq.${encodeURIComponent(userEmail)}&select=id,user_id,company_name,email`,
            { headers, cache: 'no-store' }
          );
          
          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            if (emailData?.[0]) {
              supplierIds.add(emailData[0].id);
              if (emailData[0].user_id) supplierIds.add(emailData[0].user_id);
              console.log('📦 Found supplier by email:', emailData[0]);
              if (!supplierRecordId) setSupplierRecordId(emailData[0].id);
            }
          }
        } catch (e) {
          console.warn('Supplier lookup by email failed');
        }
      }
      
      // Also check if userId itself is a supplier.id (direct match)
      try {
        const directResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${userId}&select=id,user_id,company_name,email`,
          { headers, cache: 'no-store' }
        );
        
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData?.[0]) {
            supplierIds.add(directData[0].id);
            if (directData[0].user_id) supplierIds.add(directData[0].user_id);
            console.log('📦 Found supplier by direct id match:', directData[0]);
          }
        }
      } catch (e) {
        console.warn('Supplier lookup by direct id failed');
      }
      
      const supplierIdsArray = Array.from(supplierIds);
      console.log('🔍 Looking for quotes with supplier_id in:', supplierIdsArray);

      // STEP 2: Fetch ALL pending/quoted purchase_orders and filter client-side
      // This ensures we don't miss any due to ID mismatches
      let allQuotes: any[] = [];
      try {
        // Include both new status flow and legacy statuses for backward compatibility
        const quotesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?status=in.(quote_created,quote_received_by_supplier,quote_responded,quote_revised,quote_viewed_by_builder,quote_accepted,quote_rejected,pending,quoted,rejected,confirmed)&order=created_at.desc&limit=100`,
          { headers, cache: 'no-store' }
        );
        
        if (quotesResponse.ok) {
          allQuotes = await quotesResponse.json();
          console.log('📋 Total quotes in system:', allQuotes.length);
        }
      } catch (e) {
        console.error('Failed to fetch quotes');
      }
      
      // Filter quotes that match any of our supplier IDs
      const purchaseOrderQuotes = allQuotes.filter(q => supplierIdsArray.includes(q.supplier_id));
      console.log('📋 Quotes matching this supplier:', purchaseOrderQuotes.length);
      
      // DEBUG: Show all quotes and their supplier_ids
      console.log('🔎 DEBUG - All quotes breakdown:');
      allQuotes.forEach((q: any) => {
        const matches = supplierIdsArray.includes(q.supplier_id);
        console.log(`   ${q.po_number}: supplier_id=${q.supplier_id} ${matches ? '✓ MATCH' : '✗'}`);
      });

      // Transform purchase_orders to match quote display format
      const transformedPOQuotes = (purchaseOrderQuotes || []).map(po => ({
        id: po.id,
        material_name: po.items?.[0]?.material_name || po.project_name || 'Quote Request',
        quantity: po.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 1,
        unit: po.items?.[0]?.unit || 'items',
        delivery_address: po.delivery_address || 'To be provided',
        project_description: po.project_name,
        special_requirements: null,
        preferred_delivery_date: po.delivery_date,
        status: po.status,
        quote_amount: po.quote_amount || po.total_amount,
        quote_valid_until: null,
        supplier_notes: null,
        created_at: po.created_at,
        buyer_id: po.buyer_id,
        purchase_order_id: po.id,
        // Include all items for display
        items: po.items,
        po_number: po.po_number,
        total_amount: po.total_amount
      }));

      // Remove duplicates by id
      const uniqueQuotes = transformedPOQuotes.filter((quote, index, self) => 
        index === self.findIndex(q => q.id === quote.id)
      );

      console.log('📋 Quote requests loaded:', uniqueQuotes.length, 'from purchase_orders:', transformedPOQuotes.length);
      setQuoteRequests(uniqueQuotes);
      
      // Mark quotes as received by supplier when they're displayed
      // Only mark if status is quote_created or pending
      const quotesToMarkAsReceived = uniqueQuotes.filter(
        q => q.status === 'quote_created' || q.status === 'pending'
      );
      
      if (quotesToMarkAsReceived.length > 0) {
        // Mark as received asynchronously (don't wait)
        quotesToMarkAsReceived.forEach(async (quote) => {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_quote_received_by_supplier`, {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ po_id: quote.id })
            });
          } catch (e) {
            // Silently fail - not critical
            console.debug('Could not mark quote as received:', e);
          }
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Quote fetch timed out');
      } else {
        console.error('Error fetching quote requests:', error);
      }
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Fetch quote requests on mount and when user changes
  useEffect(() => {
    // Try to get user ID from multiple sources
    let userId = user?.id;
    if (!userId) {
      try {
        const stored = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          userId = parsed.user?.id;
        }
      } catch (e) {}
    }
    if (!userId) {
      userId = localStorage.getItem('user_id') || undefined;
    }
    
    console.log('📋 Quote fetch trigger - user.id:', user?.id, 'fallback userId:', userId);
    
    if (userId) {
      // Small delay to ensure component is ready
      setTimeout(() => fetchQuoteRequests(), 500);
    } else {
      console.log('⚠️ No user ID available for quote fetch');
    }
    
    // Set up real-time subscription for new quote requests
    // Listen to all purchase_orders changes and filter in callback
    const subscription = supabase
      .channel('supplier-quotes-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'purchase_orders' },
        (payload: any) => {
          console.log('📬 NEW quote request detected:', payload.new?.po_number, 'supplier_id:', payload.new?.supplier_id);
          fetchQuoteRequests();
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'purchase_orders' },
        (payload: any) => {
          console.log('🔄 Quote UPDATE detected:', payload.new?.po_number, 'status:', payload.new?.status);
          fetchQuoteRequests();
        }
      )
      .subscribe();
    
    console.log('📡 Supplier Dashboard: Real-time subscription active for quote requests');

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleQuoteAction = async (action: 'approve' | 'reject') => {
    if (!selectedQuote) return;
    
    setProcessingQuote(true);
    
    // Get auth token from localStorage for faster access
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    let accessToken: string | null = null;
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token;
      }
    } catch (e) {
      console.warn('Could not get session from localStorage');
    }
    
    if (!accessToken) {
      toast.error('Not authenticated', {
        description: 'Please sign in again to continue.',
        duration: 5000,
      });
      setProcessingQuote(false);
      return;
    }
    
    try {
      // Use new status flow: quote_responded for approved, quote_rejected for rejected
      const newStatus = action === 'approve' ? 'quote_responded' : 'quote_rejected';
      
      if (action === 'approve' && !quoteResponse.quoteAmount) {
        throw new Error('Please enter a quote amount');
      }

      // Check if this is a purchase_order quote (has purchase_order_id or po_number)
      const isPurchaseOrderQuote = selectedQuote.purchase_order_id || selectedQuote.po_number;
      
      if (isPurchaseOrderQuote) {
        // Update purchase_orders table directly using fetch API
        const updateData: any = {
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        
        // If this is a revision (status was already quote_responded), use quote_revised
        if (action === 'approve' && selectedQuote.status === 'quote_responded') {
          updateData.status = 'quote_revised';
        }
        
        if (action === 'approve') {
          const quoteAmountValue = parseFloat(quoteResponse.quoteAmount);
          updateData.quote_amount = quoteAmountValue;
          // Also save supplier notes if provided
          if (quoteResponse.supplierNotes) {
            updateData.supplier_notes = quoteResponse.supplierNotes;
          }
          if (quoteResponse.validUntil) {
            updateData.quote_valid_until = quoteResponse.validUntil;
          }
          console.log('💰 Quote amount being saved:', quoteAmountValue, 'from input:', quoteResponse.quoteAmount);
        }

        const quoteId = selectedQuote.purchase_order_id || selectedQuote.id;
        console.log('🔄 Attempting to update purchase_order:', quoteId);
        console.log('📝 Update data:', JSON.stringify(updateData, null, 2));
        console.log('🔑 Current user.id:', user?.id);

        // Use fetch API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        let response = await fetch(
          `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${quoteId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        // Handle JWT expiration - refresh token and retry
        if (response.status === 401) {
          console.log('🔄 JWT expired, refreshing token and retrying...');
          try {
            // Refresh session using Supabase client
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              throw new Error('Session expired. Please refresh the page and try again.');
            }
            
            if (newSession?.access_token) {
              // Retry with new token
              const retryController = new AbortController();
              const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
              
              response = await fetch(
                `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${quoteId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${newSession.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify(updateData),
                  signal: retryController.signal
                }
              );
              
              clearTimeout(retryTimeoutId);
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error updating purchase order after retry:', response.status, errorText);
                throw new Error(`Failed to update quote: ${response.status}`);
              }
            } else {
              throw new Error('Session expired. Please refresh the page and try again.');
            }
          } catch (retryError: any) {
            console.error('❌ Retry failed:', retryError);
            if (retryError.message) {
              throw retryError;
            }
            throw new Error('Session expired. Please refresh the page and try again.');
          }
        } else if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error updating purchase order:', response.status, errorText);
          throw new Error(`Failed to update quote: ${response.status}`);
        }
        
        const updateResult = await response.json();
        
        // Check if any rows were actually updated
        if (!updateResult || updateResult.length === 0) {
          console.error('⚠️ No rows updated! RLS policy may be blocking the update.');
          console.error('Quote ID:', quoteId, 'Supplier user.id:', user?.id);
          
          // This is likely an RLS policy issue - the supplier needs permission to update
          // Show a more helpful error message
          throw new Error('Database permission error. Please contact admin to run the RLS policy fix migration.');
        }
        
        console.log(`✅ Quote ${action === 'approve' ? 'sent' : 'rejected'} - Purchase order updated:`, updateResult);
        console.log('💰 Saved quote_amount:', updateResult[0]?.quote_amount);
      } else {
        // Legacy: Update quotation_requests table using fetch API
        const updateData: any = {
          status: newStatus,
          updated_at: new Date().toISOString()
        };

        if (action === 'approve') {
          updateData.quote_amount = parseFloat(quoteResponse.quoteAmount);
          updateData.quote_valid_until = quoteResponse.validUntil || null;
          updateData.supplier_notes = quoteResponse.supplierNotes || null;
        } else {
          updateData.supplier_notes = quoteResponse.supplierNotes || 'Quote request rejected';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        let response = await fetch(
          `${SUPABASE_URL}/rest/v1/quotation_requests?id=eq.${selectedQuote.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updateData),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        // Handle JWT expiration - refresh token and retry
        if (response.status === 401) {
          console.log('🔄 JWT expired, refreshing token and retrying...');
          try {
            // Refresh session using Supabase client
            const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              throw new Error('Session expired. Please refresh the page and try again.');
            }
            
            if (newSession?.access_token) {
              // Retry with new token
              const retryController = new AbortController();
              const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
              
              response = await fetch(
                `${SUPABASE_URL}/rest/v1/quotation_requests?id=eq.${selectedQuote.id}`,
                {
                  method: 'PATCH',
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${newSession.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify(updateData),
                  signal: retryController.signal
                }
              );
              
              clearTimeout(retryTimeoutId);
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update quote: ${errorText}`);
              }
            } else {
              throw new Error('Session expired. Please refresh the page and try again.');
            }
          } catch (retryError: any) {
            console.error('❌ Retry failed:', retryError);
            if (retryError.message) {
              throw retryError;
            }
            throw new Error('Session expired. Please refresh the page and try again.');
          }
        } else if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update quote: ${errorText}`);
        }
      }

      // Close dialog and reset form
      setQuoteDialogOpen(false);
      setSelectedQuote(null);
      setQuoteResponse({ quoteAmount: '', validUntil: '', supplierNotes: '' });

      // Show success toast notification
      if (action === 'approve') {
        toast.success('Quote sent to builder!', {
          description: 'They will review and accept/reject your quote.',
          duration: 5000,
        });
      } else {
        toast.error('Quote request rejected', {
          description: 'The builder has been notified.',
          duration: 5000,
        });
      }
      
      // Refresh quote requests using the existing fetchQuoteRequests function
      fetchQuoteRequests();

    } catch (error: any) {
      console.error('Error processing quote:', error);
      toast.error('Failed to process quote', {
        description: error.message || 'Please try again later.',
        duration: 5000,
      });
    } finally {
      setProcessingQuote(false);
    }
  };

  const openQuoteDialog = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteResponse({
      quoteAmount: quote.quote_amount?.toString() || '',
      validUntil: quote.quote_valid_until || '',
      supplierNotes: quote.supplier_notes || ''
    });
    setQuoteDialogOpen(true);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      // Use native fetch with auth headers to avoid Supabase client timeouts
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token from localStorage
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {
        console.warn('Could not get access token');
      }
      
      const authHeaders: Record<string, string> = { 
        'apikey': apiKey,
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        authHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      try {
        // Fetch supplier profile
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const profileResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
            { headers: authHeaders, signal: controller.signal, cache: 'no-store' }
          );
          clearTimeout(timeoutId);
          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            if (profiles?.[0]) setSupplierProfile(profiles[0]);
          }
        } catch (e) {
          console.log('Profile fetch timeout');
        }

        // Build supplier IDs list - check suppliers table for this user using multiple methods
        const orderSupplierIds = [user.id];
        console.log('📊 Dashboard: Starting supplier lookup for user.id:', user.id, 'email:', user.email);
        
        // Method 1: Look up supplier by user_id = auth.uid
        try {
          const supplierController = new AbortController();
          const supplierTimeout = setTimeout(() => supplierController.abort(), 5000);
          
          const supplierResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${user.id}&select=id,user_id,email,company_name`,
            { headers: authHeaders, signal: supplierController.signal, cache: 'no-store' }
          );
          clearTimeout(supplierTimeout);
          
          if (supplierResponse.ok) {
            const supplierData = await supplierResponse.json();
            console.log('📦 Dashboard: Supplier by user_id:', supplierData);
            if (supplierData?.[0]) {
              if (supplierData[0].id && !orderSupplierIds.includes(supplierData[0].id)) {
                orderSupplierIds.push(supplierData[0].id);
              }
              if (supplierData[0].user_id && !orderSupplierIds.includes(supplierData[0].user_id)) {
                orderSupplierIds.push(supplierData[0].user_id);
              }
              setSupplierRecordId(supplierData[0].id);
            }
          }
        } catch (e) {
          console.log('Supplier lookup by user_id timeout');
        }
        
        // Method 2: Look up supplier by id = auth.uid (in case user_id is profile.id)
        if (orderSupplierIds.length === 1) {
          try {
            const supplierController = new AbortController();
            const supplierTimeout = setTimeout(() => supplierController.abort(), 5000);
            
            const supplierResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${user.id}&select=id,user_id,email,company_name`,
              { headers: authHeaders, signal: supplierController.signal, cache: 'no-store' }
            );
            clearTimeout(supplierTimeout);
            
            if (supplierResponse.ok) {
              const supplierData = await supplierResponse.json();
              console.log('📦 Dashboard: Supplier by id:', supplierData);
              if (supplierData?.[0]) {
                if (supplierData[0].id && !orderSupplierIds.includes(supplierData[0].id)) {
                  orderSupplierIds.push(supplierData[0].id);
                }
                if (supplierData[0].user_id && !orderSupplierIds.includes(supplierData[0].user_id)) {
                  orderSupplierIds.push(supplierData[0].user_id);
                }
                setSupplierRecordId(supplierData[0].id);
              }
            }
          } catch (e) {
            console.log('Supplier lookup by id timeout');
          }
        }
        
        // Method 3: Look up supplier by email
        if (orderSupplierIds.length === 1 && user.email) {
          try {
            const emailController = new AbortController();
            const emailTimeout = setTimeout(() => emailController.abort(), 5000);
            
            const emailResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/suppliers?email=eq.${encodeURIComponent(user.email)}&select=id,user_id,email,company_name`,
              { headers: authHeaders, signal: emailController.signal, cache: 'no-store' }
            );
            clearTimeout(emailTimeout);
            
            if (emailResponse.ok) {
              const emailData = await emailResponse.json();
              console.log('📦 Dashboard: Supplier by email:', emailData);
              if (emailData?.[0]) {
                if (emailData[0].id && !orderSupplierIds.includes(emailData[0].id)) {
                  orderSupplierIds.push(emailData[0].id);
                }
                if (emailData[0].user_id && !orderSupplierIds.includes(emailData[0].user_id)) {
                  orderSupplierIds.push(emailData[0].user_id);
                }
                setSupplierRecordId(emailData[0].id);
              }
            }
          } catch (e) {
            console.log('Supplier lookup by email timeout');
          }
        }
        
        // Method 4: Get profile.id and look up supplier by user_id = profile.id
        if (orderSupplierIds.length === 1) {
          try {
            const profileController = new AbortController();
            const profileTimeout = setTimeout(() => profileController.abort(), 5000);
            
            const profileResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=id`,
              { headers: authHeaders, signal: profileController.signal, cache: 'no-store' }
            );
            clearTimeout(profileTimeout);
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              console.log('📦 Dashboard: Profile lookup:', profileData);
              if (profileData?.[0]?.id && profileData[0].id !== user.id) {
                // Profile ID is different from user ID, try to find supplier by profile.id
                const supplierController2 = new AbortController();
                const supplierTimeout2 = setTimeout(() => supplierController2.abort(), 5000);
                
                const supplierResponse2 = await fetch(
                  `${SUPABASE_URL}/rest/v1/suppliers?user_id=eq.${profileData[0].id}&select=id,user_id,email,company_name`,
                  { headers: authHeaders, signal: supplierController2.signal, cache: 'no-store' }
                );
                clearTimeout(supplierTimeout2);
                
                if (supplierResponse2.ok) {
                  const supplierData2 = await supplierResponse2.json();
                  console.log('📦 Dashboard: Supplier by profile.id:', supplierData2);
                  if (supplierData2?.[0]) {
                    if (supplierData2[0].id && !orderSupplierIds.includes(supplierData2[0].id)) {
                      orderSupplierIds.push(supplierData2[0].id);
                    }
                    if (supplierData2[0].user_id && !orderSupplierIds.includes(supplierData2[0].user_id)) {
                      orderSupplierIds.push(supplierData2[0].user_id);
                    }
                    // Also add profile.id to the list
                    if (!orderSupplierIds.includes(profileData[0].id)) {
                      orderSupplierIds.push(profileData[0].id);
                    }
                    setSupplierRecordId(supplierData2[0].id);
                  }
                }
              }
            }
          } catch (e) {
            console.log('Profile/supplier lookup timeout');
          }
        }
        
        // Debug: Fetch ALL recent orders to see what supplier_id values exist
        try {
          const debugController = new AbortController();
          const debugTimeout = setTimeout(() => debugController.abort(), 5000);
          
          const debugResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?select=id,po_number,supplier_id,buyer_id,status&order=created_at.desc&limit=15`,
            { headers: authHeaders, signal: debugController.signal, cache: 'no-store' }
          );
          clearTimeout(debugTimeout);
          
          if (debugResponse.ok) {
            const debugOrders = await debugResponse.json();
            console.log('📊 Dashboard DEBUG: All recent orders supplier_ids:');
            debugOrders.forEach((o: any) => {
              const matches = orderSupplierIds.includes(o.supplier_id);
              console.log(`   ${o.po_number}: supplier_id=${o.supplier_id} ${matches ? '✅ MATCH' : '❌ no match'}`);
            });
            
            // If we found orders but no matches, add the most common supplier_id
            if (debugOrders.length > 0 && orderSupplierIds.length === 1) {
              const supplierIdCounts: Record<string, number> = {};
              debugOrders.forEach((o: any) => {
                if (o.supplier_id) {
                  supplierIdCounts[o.supplier_id] = (supplierIdCounts[o.supplier_id] || 0) + 1;
                }
              });
              console.log('📊 Dashboard DEBUG: Supplier ID counts:', supplierIdCounts);
            }
          }
        } catch (e) {
          console.log('Debug orders fetch timeout');
        }
        
        console.log('📊 Dashboard: Final supplier IDs for stats query:', orderSupplierIds);

        // Fetch ALL orders for this supplier (not just 10) for accurate stats
        try {
          const supplierIdsParam = orderSupplierIds.join(',');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const ordersResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/purchase_orders?supplier_id=in.(${supplierIdsParam})&order=created_at.desc`,
            { headers: authHeaders, signal: controller.signal, cache: 'no-store' }
          );
          clearTimeout(timeoutId);

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            console.log('📊 Dashboard: Orders loaded:', ordersData?.length || 0);

            if (ordersData && ordersData.length > 0) {
              // Fetch buyer profiles to get actual names
              const buyerIds = [...new Set(ordersData.map((o: any) => o.buyer_id).filter(Boolean))];
              let buyerProfiles: Record<string, string> = {};
              
              if (buyerIds.length > 0) {
                try {
                  const profilesController = new AbortController();
                  const profilesTimeout = setTimeout(() => profilesController.abort(), 5000);
                  
                  const profilesResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${buyerIds.join(',')})&select=user_id,full_name,company_name`,
                    { headers: authHeaders, signal: profilesController.signal, cache: 'no-store' }
                  );
                  clearTimeout(profilesTimeout);
                  
                  if (profilesResponse.ok) {
                    const profiles = await profilesResponse.json();
                    profiles.forEach((p: any) => {
                      buyerProfiles[p.user_id] = p.full_name || p.company_name || 'Customer';
                    });
                  }
                } catch (e) {
                  console.log('Buyer profiles fetch timeout');
                }
              }
              
              // Take first 10 for recent orders display
              const formattedOrders: RecentOrder[] = ordersData.slice(0, 10).map((order: any) => {
                // Get product names from items array
                const items = order.items || [];
                let productName = 'Order Items';
                let totalQty = 0;
                
                if (items.length > 0) {
                  // Get first item name, or summarize if multiple
                  const itemNames = items.map((item: any) => item.name || item.material_name || 'Item').filter(Boolean);
                  totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
                  
                  if (itemNames.length === 1) {
                    productName = itemNames[0];
                  } else if (itemNames.length > 1) {
                    productName = `${itemNames[0]} +${itemNames.length - 1} more`;
                  }
                }
                
                return {
                  id: order.id,
                  customer_name: buyerProfiles[order.buyer_id] || order.builder_name || order.project_name || 'Customer',
                  product_name: productName,
                  quantity: totalQty || order.items?.length || 1,
                  total_amount: order.total_amount || 0,
                  status: order.status || 'pending',
                  created_at: order.created_at
                };
              });
              setRecentOrders(formattedOrders);
              
              // Calculate stats from ALL orders
              const pendingCount = ordersData.filter((o: any) => o.status === 'pending').length;
              const confirmedCount = ordersData.filter((o: any) => o.status === 'confirmed').length;
              const totalRevenue = ordersData.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
              const uniqueCustomers = new Set(ordersData.map((o: any) => o.buyer_id)).size;
              
              console.log('📊 Dashboard stats: Orders:', ordersData.length, 'Pending:', pendingCount, 'Confirmed:', confirmedCount, 'Revenue:', totalRevenue);
              
              setStats(prev => ({
                ...prev,
                totalOrders: ordersData.length,
                pendingOrders: pendingCount,
                totalRevenue,
                totalCustomers: uniqueCustomers
              }));
            }
          }
        } catch (e) {
          console.log('Orders fetch timeout for stats');
        }

        // Fetch products count from supplier_product_prices
        try {
          const supplierIdsParam = orderSupplierIds.join(',');
          const productsController = new AbortController();
          const productsTimeout = setTimeout(() => productsController.abort(), 5000);
          
          const productsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/supplier_product_prices?supplier_id=in.(${supplierIdsParam})&select=id`,
            { headers: authHeaders, signal: productsController.signal, cache: 'no-store' }
          );
          clearTimeout(productsTimeout);
          
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            console.log('📦 Dashboard: Products count:', productsData?.length || 0);
            setStats(prev => ({
              ...prev,
              totalProducts: productsData?.length || 0
            }));
          }
        } catch (e) {
          console.log('Products count fetch timeout');
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const formatCurrency = (amount: number | undefined | null) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Theme classes
  const bgMain = isDarkMode 
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
    : 'bg-gradient-to-br from-orange-50 via-white to-amber-50';
  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // Exit dashboard - goes back to home page, stays logged in
  const handleExitDashboard = () => {
    console.log('🚪 Exit Dashboard: Redirecting to home...');
    window.location.href = '/home';
  };

  if (loading) {
    return <DashboardLoader type="supplier" />;
  }

  return (
    <div className={`min-h-screen ${bgMain}`}>
      {/* Navigation hidden in dashboard - use Exit Dashboard to access main navigation */}

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Store className="h-8 w-8" />
                {t('supplier.dashboard.title')}
              </h1>
              <p className="text-orange-100 mt-1">
                {t('supplier.dashboard.welcome')}, {supplierProfile?.company_name || supplierProfile?.store_name || supplierProfile?.full_name || 'Supplier'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LanguageSwitcher variant="compact" />
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={toggleDarkMode}
              >
                {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {isDarkMode ? 'Light' : 'Dark'}
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Bell className="h-4 w-4 mr-2" />
                {t('supplier.dashboard.notifications')}
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setShowProfileView(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                {t('supplier.dashboard.settings')}
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={handleExitDashboard}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Exit Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.products')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.totalProducts}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.totalOrders')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.totalOrders}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.pending')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.revenue')}</p>
                  <p className={`text-xl font-bold ${textColor}`}>{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.customers')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.totalCustomers}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} shadow-lg hover:shadow-xl transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${mutedText}`}>{t('supplier.stats.rating')}</p>
                  <p className={`text-2xl font-bold ${textColor}`}>{stats.averageRating || '4.5'}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards - Single Row */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-6">
          <Button 
            className={`h-auto py-4 transition-all ${activeTab === 'overview' 
              ? 'bg-gradient-to-r from-slate-600 to-slate-700 ring-2 ring-slate-400 shadow-lg' 
              : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('overview')}
          >
            <div className="flex flex-col items-center gap-2">
              <Store className="h-6 w-6" />
              <span className="text-xs sm:text-sm">Overview</span>
            </div>
          </Button>
          <Button 
            className={`h-auto py-4 transition-all ${activeTab === 'materials' 
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 ring-2 ring-orange-300 shadow-lg' 
              : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('materials')}
          >
            <div className="flex flex-col items-center gap-2">
              <Boxes className="h-6 w-6" />
              <span className="text-xs sm:text-sm">My Materials</span>
            </div>
          </Button>
          <Button 
            className={`h-auto py-4 transition-all relative ${activeTab === 'view-orders' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 ring-2 ring-blue-300 shadow-lg' 
              : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('view-orders')}
          >
            <div className="flex flex-col items-center gap-2">
              <Eye className="h-6 w-6" />
              <span className="text-xs sm:text-sm">View Orders</span>
              {quoteRequests.filter(q => q.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {quoteRequests.filter(q => q.status === 'pending').length}
                </span>
              )}
            </div>
          </Button>
          <Button 
            className={`h-auto py-4 transition-all ${activeTab === 'scan-qr' 
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 ring-2 ring-cyan-300 shadow-lg' 
              : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('scan-qr')}
          >
            <div className="flex flex-col items-center gap-2">
              <QrCode className="h-6 w-6" />
              <span className="text-xs sm:text-sm">QR Codes</span>
            </div>
          </Button>
          <Button 
            className={`h-auto py-4 transition-all ${activeTab === 'extra' 
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 ring-2 ring-purple-300 shadow-lg' 
              : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('extra')}
          >
            <div className="flex flex-col items-center gap-2">
              <Settings className="h-6 w-6" />
              <span className="text-xs sm:text-sm">Extra</span>
            </div>
          </Button>
          <Button 
            className={`h-auto py-4 transition-all ${activeTab === 'analytics' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 ring-2 ring-blue-300 shadow-lg' 
              : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('analytics')}
          >
            <div className="flex flex-col items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </div>
          </Button>
          <Button 
            className={`h-auto py-4 transition-all ${activeTab === 'reports' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 ring-2 ring-green-300 shadow-lg' 
              : isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('reports')}
          >
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-xs sm:text-sm">Reports</span>
            </div>
          </Button>
        </div>

        {/* Tab Content - Hidden TabsList, content controlled by cards above */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="materials">My Materials</TabsTrigger>
            <TabsTrigger value="view-orders">View Orders</TabsTrigger>
            <TabsTrigger value="scan-qr">QR Codes</TabsTrigger>
            <TabsTrigger value="extra">Extra</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Recent Orders Summary */}
              <Card className={cardBg}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className={textColor}>{t('supplier.orders.title')}</CardTitle>
                      <CardDescription className={mutedText}>{t('supplier.orders.description')}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>
                      {t('supplier.orders.viewAll')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg hover:${isDarkMode ? 'bg-slate-600' : 'bg-gray-100'} transition-colors`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2 ${isDarkMode ? 'bg-slate-600' : 'bg-white'} rounded-lg shadow-sm`}>
                            <Package className="h-8 w-8 text-orange-500" />
                          </div>
                          <div>
                            <p className={`font-medium ${textColor}`}>{order.product_name}</p>
                            <p className={`text-sm ${mutedText}`}>
                              {order.customer_name} • Qty: {order.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-semibold ${textColor}`}>{formatCurrency(order.total_amount)}</p>
                            <p className={`text-xs ${mutedText}`}>
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(order.status || 'pending')} flex items-center gap-1`}>
                            {getStatusIcon(order.status || 'pending')}
                            {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {recentOrders.length === 0 && (
                      <div className="text-center py-12">
                        <ShoppingCart className={`h-12 w-12 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'} mx-auto mb-4`} />
                        <p className={mutedText}>{t('supplier.orders.noOrders')}</p>
                        <p className={`text-sm ${mutedText}`}>{t('supplier.orders.ordersAppear')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Analytics */}
              <SupplierCharts isDarkMode={isDarkMode} />
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          {/* MY MATERIALS TAB - Contains: Add Products, My Products, View Inventory */}
          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="materials">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                  <Boxes className="h-5 w-5 text-orange-500" />
                  My Materials Management
                </CardTitle>
                <CardDescription className={mutedText}>
                  Manage your products, inventory, and material catalog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="add-products" className="space-y-4">
                  <TabsList className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'} p-1 rounded-lg`}>
                    <TabsTrigger value="add-products" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Products
                    </TabsTrigger>
                    <TabsTrigger value="my-products" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                      <Package className="h-4 w-4 mr-1" />
                      My Products
                    </TabsTrigger>
                    <TabsTrigger value="view-inventory" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      <Boxes className="h-4 w-4 mr-1" />
                      View Inventory
                    </TabsTrigger>
                  </TabsList>

                  {/* Add Products Sub-Tab */}
                  <TabsContent value="add-products">
                    <ProductManagement supplierId={supplierRecordId || user?.id || ''} isDarkMode={isDarkMode} />
                  </TabsContent>

                  {/* My Products Sub-Tab */}
                  <TabsContent value="my-products">
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-orange-50'} border ${isDarkMode ? 'border-slate-600' : 'border-orange-200'}`}>
                        <h4 className={`font-semibold mb-2 ${textColor}`}>My Uploaded Products</h4>
                        <p className={`text-sm ${mutedText}`}>
                          Manage your own products - add new products, update images, prices, and variants.
                        </p>
                      </div>
                      <SupplierProductManager supplierId={supplierRecordId || user?.id || ''} />
                    </div>
                  </TabsContent>

                  {/* View Inventory Sub-Tab */}
                  <TabsContent value="view-inventory">
                    {user && <InventoryManager supplierId={supplierRecordId || user.id} />}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          {/* VIEW ORDERS TAB - Contains: Orders, Quotes, Dispatch */}
          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="view-orders">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                  Orders & Quotes Management
                </CardTitle>
                <CardDescription className={mutedText}>
                  View and manage all your orders, quotes, and dispatch operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={viewOrdersSubTab} onValueChange={setViewOrdersSubTab} className="space-y-4">
                  <TabsList className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'} p-1 rounded-lg`}>
                    <TabsTrigger value="quotes" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                      <FileCheck className="h-4 w-4 mr-1" />
                      Quotes
                      {quoteRequests.filter(q => q.status === 'pending').length > 0 && (
                        <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                          {quoteRequests.filter(q => q.status === 'pending').length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                      <Package className="h-4 w-4 mr-1" />
                      Orders
                    </TabsTrigger>
                    <TabsTrigger value="dispatch" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                      <Truck className="h-4 w-4 mr-1" />
                      Dispatch
                    </TabsTrigger>
                  </TabsList>

                  {/* Quotes Sub-Tab */}
                  <TabsContent value="quotes">
                    <QuotesManagementContent 
                      quoteRequests={quoteRequests}
                      loadingQuotes={loadingQuotes}
                      isDarkMode={isDarkMode}
                      textColor={textColor}
                      mutedText={mutedText}
                      cardBg={cardBg}
                      openQuoteDialog={openQuoteDialog}
                      handleQuoteAction={handleQuoteAction}
                      setSelectedQuote={setSelectedQuote}
                      setActiveTab={setActiveTab}
                      fetchQuoteRequests={fetchQuoteRequests}
                    />
                  </TabsContent>

                  {/* Orders Sub-Tab */}
                  <TabsContent value="orders">
                    <OrderManagement 
                      supplierId={supplierRecordId || user?.id || ''} 
                      isDarkMode={isDarkMode} 
                      onNavigateToDispatch={() => setViewOrdersSubTab('dispatch')}
                    />
                  </TabsContent>

                  {/* Dispatch Sub-Tab */}
                  <TabsContent value="dispatch">
                    <div className="space-y-4">
                      <Alert className="bg-teal-50 border-teal-200">
                        <Truck className="h-4 w-4 text-teal-600" />
                        <AlertTitle className="text-teal-800">Dispatch Workflow</AlertTitle>
                        <AlertDescription className="text-teal-700 text-sm">
                          <ol className="list-decimal list-inside space-y-1 mt-2">
                            <li>Prepare materials for the order</li>
                            <li>Attach the generated QR code to each material/package</li>
                            <li>When delivery vehicle arrives, scan each QR code below</li>
                            <li>Confirm all items are loaded before releasing the vehicle</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                      <DispatchScanner />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          {/* QR CODES TAB - Contains: QR Code Management */}
          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="scan-qr">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                  <QrCode className="h-5 w-5 text-cyan-500" />
                  QR Code Management
                </CardTitle>
                <CardDescription className={mutedText}>
                  View and download QR codes for confirmed orders. Attach these to materials before dispatch.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4 bg-cyan-50 border-cyan-200">
                  <QrCode className="h-4 w-4 text-cyan-600" />
                  <AlertTitle className="text-cyan-800">How QR Codes Work</AlertTitle>
                  <AlertDescription className="text-cyan-700 text-sm">
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>QR codes are <strong>automatically generated</strong> when a professional builder accepts your quote</li>
                      <li>Download and print QR codes to attach to each material item</li>
                      <li>Delivery providers and builders scan these codes to verify materials</li>
                      <li>Track the full journey: Dispatch → In Transit → Delivered</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <EnhancedQRCodeManager supplierId={supplierRecordId || undefined} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          {/* EXTRA TAB - Contains: Tracking, Reviews, Support */}
          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="extra">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                  <Settings className="h-5 w-5 text-purple-500" />
                  Additional Features
                </CardTitle>
                <CardDescription className={mutedText}>
                  Tracking, reviews, and support services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tracking" className="space-y-4">
                  <TabsList className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'} p-1 rounded-lg`}>
                    <TabsTrigger value="tracking" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                      <NavigationIcon className="h-4 w-4 mr-1" />
                      Tracking
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                      <Star className="h-4 w-4 mr-1" />
                      Reviews
                    </TabsTrigger>
                    <TabsTrigger value="support" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                      <Headphones className="h-4 w-4 mr-1" />
                      Support
                    </TabsTrigger>
                  </TabsList>

                  {/* Tracking Sub-Tab */}
                  <TabsContent value="tracking">
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDarkMode ? 'border-blue-800' : 'border-blue-200'}`}>
                        <h4 className={`font-semibold mb-2 flex items-center gap-2 ${textColor}`}>
                          <NavigationIcon className="h-4 w-4 text-blue-600" />
                          Delivery Tracking
                        </h4>
                        <p className={`text-sm ${mutedText}`}>
                          Track your material deliveries to customers in real-time
                        </p>
                      </div>
                      <TrackingTab
                        userId={user?.id || localStorage.getItem('user_id') || ''}
                        userRole="supplier"
                        userName={supplierProfile?.company_name || supplierProfile?.full_name || user?.email?.split('@')[0] || 'Supplier'}
                      />
                    </div>
                  </TabsContent>

                  {/* Reviews Sub-Tab */}
                  <TabsContent value="reviews">
                    <div className="space-y-6">
                      {/* Rating Summary */}
                      {user && <SupplierRatingSummary supplierId={supplierRecordId || user.id} />}
                      
                      {/* Reviews List */}
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'} border ${isDarkMode ? 'border-yellow-800' : 'border-yellow-200'}`}>
                        <h4 className={`font-semibold mb-2 flex items-center gap-2 ${textColor}`}>
                          <Star className="h-4 w-4 text-yellow-600" />
                          Customer Reviews
                        </h4>
                        <p className={`text-sm ${mutedText}`}>
                          See what your customers are saying
                        </p>
                      </div>
                      {user && <ReviewsList supplierId={supplierRecordId || user.id} />}
                    </div>
                  </TabsContent>

                  {/* Support Sub-Tab */}
                  <TabsContent value="support">
                    <div className="space-y-6">
                      {/* In-App Communication */}
                      {user && (
                        <InAppCommunication
                          userId={user.id}
                          userName={supplierProfile?.company_name || supplierProfile?.full_name || user.email || 'Supplier'}
                          userRole="supplier"
                          isDarkMode={isDarkMode}
                        />
                      )}

                      {/* Quick Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'} border ${isDarkMode ? 'border-orange-800' : 'border-orange-200'}`}>
                          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${textColor}`}>
                            <Clock className="h-4 w-4 text-orange-500" />
                            Support Hours
                          </h4>
                          <p className={`text-sm ${mutedText}`}>
                            Mon - Fri: 8AM - 6PM<br />
                            Saturday: 9AM - 4PM<br />
                            Sunday: Closed
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50'} border ${isDarkMode ? 'border-purple-800' : 'border-purple-200'}`}>
                          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${textColor}`}>
                            <AlertCircle className="h-4 w-4 text-purple-500" />
                            Supplier Hotline
                          </h4>
                          <p className={`text-sm ${mutedText}`}>
                            Call: +254 700 000 000<br />
                            Email: suppliers@UjenziXform.co.ke
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          {/* ANALYTICS TAB - Real-time analytics with actual data */}
          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="analytics">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${textColor}`}>
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription className={mutedText}>
                  Real-time sales metrics, performance insights, and business analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && (
                  <SupplierAnalyticsDashboard 
                    supplierId={supplierRecordId || user.id} 
                    onNavigateToOrders={() => setActiveTab('view-orders')}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          {/* REPORTS TAB - Generate and download reports */}
          {/* ═══════════════════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="reports">
            <SupplierReportsTab 
              supplierId={supplierRecordId || user?.id || ''} 
              isDarkMode={isDarkMode}
              textColor={textColor}
              mutedText={mutedText}
              cardBg={cardBg}
              stats={stats}
              recentOrders={recentOrders}
              quoteRequests={quoteRequests}
            />
          </TabsContent>


        </Tabs>
      </main>

      <Footer />

      {/* Profile View Dialog */}
      <ProfileViewDialog
        isOpen={showProfileView}
        onClose={() => setShowProfileView(false)}
        onEditProfile={() => {
          setShowProfileView(false);
          setShowProfileEdit(true);
        }}
        onExitDashboard={handleExitDashboard}
        userRole="supplier"
      />

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          // Refresh data after profile save
          refetchData();
        }}
        userRole="supplier"
      />

      {/* Quote Response Dialog - Used by QuotesManagementContent */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-500" />
              Respond to Quote Request
            </DialogTitle>
            <DialogDescription>
              {selectedQuote && (
                <span>
                  Provide your quote for <strong>{selectedQuote.material_name}</strong> ({selectedQuote.quantity} {selectedQuote.unit})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quoteAmount">Quote Amount (KES) *</Label>
              <Input
                id="quoteAmount"
                type="number"
                placeholder="Enter your quote amount"
                value={quoteResponse.quoteAmount}
                onChange={(e) => setQuoteResponse(prev => ({ ...prev, quoteAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Quote Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={quoteResponse.validUntil}
                onChange={(e) => setQuoteResponse(prev => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierNotes">Notes to Builder</Label>
              <Textarea
                id="supplierNotes"
                placeholder="Add any notes about pricing, delivery terms, etc."
                value={quoteResponse.supplierNotes}
                onChange={(e) => setQuoteResponse(prev => ({ ...prev, supplierNotes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleQuoteAction('approve')}
              disabled={processingQuote}
              className="bg-green-500 hover:bg-green-600"
            >
              {processingQuote ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierDashboard;
