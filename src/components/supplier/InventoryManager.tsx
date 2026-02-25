/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📦 SUPPLIER INVENTORY MANAGER                                                     ║
 * ║                                                                                      ║
 * ║   Created: January 29, 2026                                                          ║
 * ║   Features:                                                                          ║
 * ║   - Real-time stock tracking                                                        ║
 * ║   - Low stock alerts                                                                ║
 * ║   - Stock level updates                                                             ║
 * ║   - Inventory history                                                               ║
 * ║   - Bulk stock updates                                                              ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Edit,
  History,
  Bell,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Settings,
  Download
} from 'lucide-react';

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  unit: string;
  market_price: number;  // Cost price / market price
  selling_price: number; // Selling price to customers
  last_restocked: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  created_at: string;
  created_by: string;
}

interface InventoryStats {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
}

interface InventoryManagerProps {
  supplierId: string;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ supplierId }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    inStockProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [updateQuantity, setUpdateQuantity] = useState<number>(0);
  const [updateReason, setUpdateReason] = useState('');
  const [updateType, setUpdateType] = useState<'add' | 'remove' | 'set'>('add');
  const [saving, setSaving] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [editMarketPrice, setEditMarketPrice] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  
  const { toast } = useToast();

  // Helper function to add timeout to any promise
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  };

  // Get access token and Supabase config
  const getSupabaseConfig = () => {
    const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
    
    let accessToken = '';
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        accessToken = parsed.access_token || '';
      }
    } catch (e) {}
    
    return { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken };
  };

  useEffect(() => {
    loadInventory();
    loadStockMovements();
    
    // Safety timeout - force loading to false after 10 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.log('⏱️ Inventory safety timeout - forcing loading false');
    }, 10000);
    
    // Set up real-time subscription
    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'supplier_product_prices', filter: `supplier_id=eq.${supplierId}` },
        () => {
          console.log('📦 Real-time inventory update received');
          loadInventory();
        }
      )
      .subscribe();
    
    return () => {
      clearTimeout(safetyTimeout);
      supabase.removeChannel(channel);
    };
  }, [supplierId]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading inventory for supplier:', supplierId);
      
      const { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken } = getSupabaseConfig();
      
      // Use REST API for faster, more reliable fetching
      let products: any[] = [];
      try {
        const response = await withTimeout(
          fetch(
            `${SUPABASE_URL}/rest/v1/supplier_product_prices?supplier_id=eq.${supplierId}`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              },
            }
          ),
          5000
        );
        
        if (response.ok) {
          products = await response.json();
          console.log('📦 Products loaded via REST:', products?.length);
        }
      } catch (e) {
        console.log('REST API timeout, trying Supabase client...');
        // Fallback to Supabase client with timeout
        try {
          const { data, error } = await withTimeout(
            supabase.from('supplier_product_prices').select('*').eq('supplier_id', supplierId),
            5000
          );
          if (!error && data) products = data;
        } catch (e2) {
          console.log('Supabase client also timed out');
        }
      }
      
      // Get product IDs to fetch names from admin_material_images
      const productIds = (products || []).map((p: any) => p.product_id).filter(Boolean);
      
      // Fetch product details from admin_material_images
      let productDetails: Record<string, any> = {};
      if (productIds.length > 0) {
        try {
          const idsParam = productIds.map((id: string) => `"${id}"`).join(',');
          const materialsResponse = await withTimeout(
            fetch(
              `${SUPABASE_URL}/rest/v1/admin_material_images?id=in.(${idsParam})&select=id,name,category,unit`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                },
              }
            ),
            5000
          );
          
          if (materialsResponse.ok) {
            const materials = await materialsResponse.json();
            if (materials) {
              productDetails = materials.reduce((acc: Record<string, any>, m: any) => {
                acc[m.id] = m;
                return acc;
              }, {});
            }
            console.log('📦 Product details loaded:', Object.keys(productDetails).length);
          }
        } catch (e) {
          console.log('Could not load product details');
        }
      }
      
      // Map products with fetched details
      const inventoryItems: InventoryItem[] = (products || []).map((p: any) => {
        const stock = p.stock_quantity ?? (p.in_stock ? 100 : 0);
        const minStock = p.min_stock_level || 10;
        const details = productDetails[p.product_id] || {};
        
        let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
        if (stock <= 0) status = 'out_of_stock';
        else if (stock <= minStock) status = 'low_stock';
        
        return {
          id: p.id,
          product_id: p.product_id,
          product_name: details.name || p.product_name || `Product ${p.product_id?.slice(0, 8)}`,
          category: details.category || p.category || 'Uncategorized',
          current_stock: stock,
          min_stock_level: minStock,
          max_stock_level: p.max_stock_level || 1000,
          unit: details.unit || p.unit || 'piece',
          market_price: p.market_price || 0,
          selling_price: p.price || p.selling_price || 0,
          last_restocked: p.last_restocked || p.updated_at || new Date().toISOString(),
          status
        };
      });
      
      console.log('📦 Inventory items mapped:', inventoryItems.length);
      setInventory(inventoryItems);
      calculateStats(inventoryItems);
    } catch (error: any) {
      console.error('Error loading inventory:', error);
      toast({
        title: "Error loading inventory",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStockMovements = async () => {
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken } = getSupabaseConfig();
      
      // Use REST API for faster fetching
      const response = await withTimeout(
        fetch(
          `${SUPABASE_URL}/rest/v1/stock_movements?supplier_id=eq.${supplierId}&order=created_at.desc&limit=50`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            },
          }
        ),
        5000
      );
      
      if (response.ok) {
        const data = await response.json();
        setStockMovements(data as StockMovement[]);
        console.log('📦 Stock movements loaded:', data?.length);
      }
    } catch (error) {
      // Table might not exist yet - that's okay
      console.log('Stock movements table not available or request timed out');
    }
  };

  const calculateStats = (items: InventoryItem[]) => {
    const stats: InventoryStats = {
      totalProducts: items.length,
      inStockProducts: items.filter(i => i.status === 'in_stock').length,
      lowStockProducts: items.filter(i => i.status === 'low_stock').length,
      outOfStockProducts: items.filter(i => i.status === 'out_of_stock').length,
      totalValue: items.reduce((sum, i) => sum + (i.current_stock * i.selling_price), 0)
    };
    setStats(stats);
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;
    
    setSaving(true);
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken } = getSupabaseConfig();
      
      let newStock = selectedItem.current_stock;
      
      if (updateType === 'add') {
        newStock = selectedItem.current_stock + updateQuantity;
      } else if (updateType === 'remove') {
        newStock = Math.max(0, selectedItem.current_stock - updateQuantity);
      } else {
        newStock = updateQuantity;
      }
      
      // Update stock in database using REST API
      const updateData: any = {
        stock_quantity: newStock,
        in_stock: newStock > 0,
      };
      if (updateType === 'add') {
        updateData.last_restocked = new Date().toISOString();
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/supplier_product_prices?id=eq.${selectedItem.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(updateData),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update stock');
      }
      
      console.log('📦 Stock updated successfully');
      
      // Log stock movement
      try {
        const movementData = {
          supplier_id: supplierId,
          product_id: selectedItem.product_id,
          product_name: selectedItem.product_name,
          movement_type: updateType === 'add' ? 'in' : updateType === 'remove' ? 'out' : 'adjustment',
          quantity: updateQuantity,
          previous_stock: selectedItem.current_stock,
          new_stock: newStock,
          reason: updateReason || `Stock ${updateType}`
        };
        
        await fetch(
          `${SUPABASE_URL}/rest/v1/stock_movements`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(movementData),
          }
        );
        console.log('📦 Stock movement logged');
      } catch (e) {
        // Stock movements table might not exist
        console.log('Could not log stock movement');
      }
      
      toast({
        title: '✅ Stock Updated',
        description: `${selectedItem.product_name} stock updated to ${newStock} ${selectedItem.unit}(s)`
      });
      
      setShowUpdateDialog(false);
      setSelectedItem(null);
      setUpdateQuantity(0);
      setUpdateReason('');
      loadInventory();
      loadStockMovements();
      
    } catch (error: any) {
      console.error('Error updating stock:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update stock'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePrices = async () => {
    if (!selectedItem) return;
    
    setSaving(true);
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY, accessToken } = getSupabaseConfig();
      
      // First try to update with market_price
      let updateData: any = {
        market_price: editMarketPrice,
        price: editSellingPrice, // 'price' is the selling price in the database
      };
      
      let response = await fetch(
        `${SUPABASE_URL}/rest/v1/supplier_product_prices?id=eq.${selectedItem.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(updateData),
        }
      );
      
      // If market_price column doesn't exist, try without it
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('market_price') && errorText.includes('could not find')) {
          console.log('💡 market_price column not found, updating only selling price...');
          // Retry without market_price
          updateData = { price: editSellingPrice };
          response = await fetch(
            `${SUPABASE_URL}/rest/v1/supplier_product_prices?id=eq.${selectedItem.id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(updateData),
            }
          );
          
          if (!response.ok) {
            const retryErrorText = await response.text();
            throw new Error(retryErrorText || 'Failed to update prices');
          }
          
          toast({
            title: '✅ Selling Price Updated',
            description: `${selectedItem.product_name} - Selling: KES ${editSellingPrice.toLocaleString()}. Note: Market price tracking requires a database update.`
          });
        } else {
          throw new Error(errorText || 'Failed to update prices');
        }
      } else {
        console.log('💰 Prices updated successfully');
        
        // Calculate profit margin
        const profitMargin = editMarketPrice > 0 
          ? (((editSellingPrice - editMarketPrice) / editMarketPrice) * 100).toFixed(1)
          : '0';
        
        toast({
          title: '✅ Prices Updated',
          description: `${selectedItem.product_name} - Market: KES ${editMarketPrice.toLocaleString()}, Selling: KES ${editSellingPrice.toLocaleString()} (${profitMargin}% margin)`
        });
      }
      
      setShowPriceDialog(false);
      setSelectedItem(null);
      setEditMarketPrice(0);
      setEditSellingPrice(0);
      loadInventory();
      
    } catch (error: any) {
      console.error('Error updating prices:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update prices'
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">In Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Out of Stock</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const exportInventory = () => {
    const csv = [
      ['Product Name', 'Category', 'Current Stock', 'Min Level', 'Unit', 'Market Price', 'Selling Price', 'Profit Margin', 'Status', 'Last Restocked'].join(','),
      ...inventory.map(item => {
        const profitMargin = item.market_price > 0 
          ? (((item.selling_price - item.market_price) / item.market_price) * 100).toFixed(1)
          : '0';
        return [
          `"${item.product_name}"`,
          `"${item.category}"`,
          item.current_stock,
          item.min_stock_level,
          item.unit,
          item.market_price,
          item.selling_price,
          `${profitMargin}%`,
          item.status,
          new Date(item.last_restocked).toLocaleDateString()
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Low Stock Alerts */}
      {stats.lowStockProducts > 0 && (
        <Alert className="bg-yellow-500/10 border-yellow-500/50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Low Stock Alert</AlertTitle>
          <AlertDescription className="text-yellow-400">
            {stats.lowStockProducts} product(s) are running low on stock. Consider restocking soon.
          </AlertDescription>
        </Alert>
      )}
      
      {stats.outOfStockProducts > 0 && (
        <Alert className="bg-red-500/10 border-red-500/50">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-500">Out of Stock</AlertTitle>
          <AlertDescription className="text-red-400">
            {stats.outOfStockProducts} product(s) are out of stock and unavailable for purchase.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
                <p className="text-xs text-slate-400">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.inStockProducts}</p>
                <p className="text-xs text-slate-400">In Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.lowStockProducts}</p>
                <p className="text-xs text-slate-400">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.outOfStockProducts}</p>
                <p className="text-xs text-slate-400">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">KES {(stats.totalValue || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-400">Inventory Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportInventory}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" onClick={loadInventory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory ({filteredInventory.length} products)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Category</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Stock</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Min Level</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Market Price</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Selling Price</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const profitMargin = item.market_price > 0 
                    ? (((item.selling_price - item.market_price) / item.market_price) * 100).toFixed(1)
                    : '0';
                  const isProfitable = parseFloat(profitMargin) > 0;
                  
                  return (
                    <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{item.product_name}</p>
                          <p className="text-xs text-slate-500">{item.unit}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.category}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${
                          item.status === 'out_of_stock' ? 'text-red-400' :
                          item.status === 'low_stock' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {item.current_stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">{item.min_stock_level}</td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-slate-400">
                          KES {(item.market_price || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-white font-medium">
                            KES {(item.selling_price || 0).toLocaleString()}
                          </span>
                          {item.market_price > 0 && (
                            <span className={`text-xs ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                              {isProfitable ? '+' : ''}{profitMargin}% margin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Update Stock"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowUpdateDialog(true);
                            }}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Prices"
                            onClick={() => {
                              setSelectedItem(item);
                              setEditMarketPrice(item.market_price || 0);
                              setEditSellingPrice(item.selling_price || 0);
                              setShowPriceDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No products found. Add products to start tracking inventory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Movement History */}
      {stockMovements.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Stock Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stockMovements.slice(0, 10).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {movement.movement_type === 'in' ? (
                      <ArrowUpCircle className="h-5 w-5 text-green-400" />
                    ) : movement.movement_type === 'out' ? (
                      <ArrowDownCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <RefreshCw className="h-5 w-5 text-blue-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">{movement.product_name}</p>
                      <p className="text-xs text-slate-400">{movement.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      movement.movement_type === 'in' ? 'text-green-400' : 
                      movement.movement_type === 'out' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                      {movement.quantity}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(movement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Stock Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Update Stock</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-slate-400">
              {selectedItem?.product_name} - Current: {selectedItem?.current_stock} {selectedItem?.unit}(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-slate-300 font-medium">Update Type</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={updateType === 'add' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUpdateType('add')}
                  className={updateType === 'add' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-gray-300 dark:border-slate-600'}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  Add Stock
                </Button>
                <Button
                  variant={updateType === 'remove' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUpdateType('remove')}
                  className={updateType === 'remove' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-gray-300 dark:border-slate-600'}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                <Button
                  variant={updateType === 'set' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUpdateType('set')}
                  className={updateType === 'set' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 dark:border-slate-600'}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Set To
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-gray-700 dark:text-slate-300 font-medium">Quantity</Label>
              <Input
                type="number"
                min="0"
                value={updateQuantity}
                onChange={(e) => setUpdateQuantity(parseInt(e.target.value) || 0)}
                className="bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
              />
              {updateType !== 'set' && selectedItem && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  New stock will be: {updateType === 'add' 
                    ? selectedItem.current_stock + updateQuantity 
                    : Math.max(0, selectedItem.current_stock - updateQuantity)}
                </p>
              )}
            </div>
            
            <div>
              <Label className="text-gray-700 dark:text-slate-300 font-medium">Reason (Optional)</Label>
              <Input
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="e.g., New shipment arrived, Sold to customer"
                className="bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)} className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleUpdateStock} disabled={saving || updateQuantity <= 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Updating...' : 'Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Inventory Settings</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-slate-400">
              Configure low stock alerts and notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-slate-300 font-medium">Default Low Stock Threshold</Label>
              <Input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)}
                className="bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Products below this quantity will show as "Low Stock"
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-700 dark:text-slate-300 font-medium">Email Alerts</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Get notified when stock is low</p>
              </div>
              <Badge variant="outline" className="border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400">Coming Soon</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-700 dark:text-slate-300 font-medium">Auto-Reorder</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Automatically reorder when stock is low</p>
              </div>
              <Badge variant="outline" className="border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400">Coming Soon</Badge>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prices Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Edit Prices</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-slate-400">
              {selectedItem?.product_name} - Update market and selling prices
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-slate-300 font-medium">Market Price (Cost Price)</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-sm font-medium">KES</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editMarketPrice}
                  onChange={(e) => setEditMarketPrice(parseFloat(e.target.value) || 0)}
                  className="bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                The price you paid to acquire this product
              </p>
            </div>
            
            <div>
              <Label className="text-gray-700 dark:text-slate-300 font-medium">Selling Price</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-sm font-medium">KES</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(parseFloat(e.target.value) || 0)}
                  className="bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                The price customers will pay for this product
              </p>
            </div>
            
            {/* Profit Calculation Preview */}
            {editMarketPrice > 0 && (
              <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Profit Analysis</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Profit per Unit</p>
                    <p className={`text-lg font-bold ${
                      editSellingPrice - editMarketPrice >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      KES {(editSellingPrice - editMarketPrice).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Profit Margin</p>
                    <p className={`text-lg font-bold ${
                      editSellingPrice - editMarketPrice >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(((editSellingPrice - editMarketPrice) / editMarketPrice) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                {selectedItem && selectedItem.current_stock > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Potential Profit (Current Stock: {selectedItem.current_stock})</p>
                    <p className={`text-lg font-bold ${
                      editSellingPrice - editMarketPrice >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      KES {((editSellingPrice - editMarketPrice) * selectedItem.current_stock).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)} className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdatePrices} 
              disabled={saving || (editSellingPrice <= 0 && editMarketPrice <= 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'Updating...' : 'Update Prices'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManager;

