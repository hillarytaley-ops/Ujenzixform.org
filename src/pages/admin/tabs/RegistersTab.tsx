import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Store, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhoneDigits } from '@/utils/phoneNormalize';
import { useToast } from '@/hooks/use-toast';
import { SuppliersRegister } from '../components/SuppliersRegister';
import { BuildersRegister } from '../components/BuildersRegister';
import type { SupplierEditPatch } from '../types';

// Type definitions for the raw database records
interface RawSupplierRecord {
  /** supplier_applications.id, or synthetic `role-{userId}` for supplier role without application */
  id: string;
  auth_user_id?: string;
  applicant_user_id?: string;
  user_id?: string;
  profile_id?: string;
  contact_person: string;
  email: string;
  phone: string;
  company_name: string;
  business_registration_number?: string;
  kra_pin?: string;
  business_type?: string;
  years_in_business?: number;
  county: string;
  town?: string;
  physical_address?: string;
  address?: string;
  delivery_areas?: string[];
  material_categories: string[];
  materials_offered?: string[];
  specialties?: string[];
  materials_list?: string;
  price_list?: string;
  minimum_order_value?: number;
  accepts_bulk_orders?: boolean;
  offers_delivery?: boolean;
  delivery_fee_structure?: string;
  opening_hours?: string;
  weekend_availability?: boolean;
  business_certificate_url?: string;
  kra_certificate_url?: string;
  company_logo_url?: string;
  product_catalog_url?: string;
  is_verified?: boolean;
  rating?: number;
  status: string;
  source?: 'registration' | 'active';
  created_at: string;
  updated_at?: string;
  bank_name?: string | null;
  bank_account_holder_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
}

interface RawBuilderRecord {
  id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  business_registration_number?: string;
  nca_license_number?: string;
  kra_pin?: string;
  county: string;
  town?: string;
  physical_address?: string;
  builder_type: string;
  builder_category: string;
  years_experience?: number;
  specialties?: string[];
  portfolio_url?: string;
  insurance_details?: string;
  project_types?: string[];
  project_timeline?: string;
  budget_range?: string;
  project_description?: string;
  property_type?: string;
  id_document_url?: string;
  business_certificate_url?: string;
  nca_certificate_url?: string;
  profile_photo_url?: string;
  status: string;
  reviewed_by?: string;
  created_at: string;
  updated_at?: string;
}

export const RegistersTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<RawSupplierRecord[]>([]);
  const [builders, setBuilders] = useState<RawBuilderRecord[]>([]);
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try admin client first, fall back to regular supabase client
      const client = supabase;
      
      console.log('📊 Fetching user registrations...');

      // Fetch from multiple sources:
      // 1. supplier_applications - for supplier registration forms
      // 2. builder_registrations - for builder registration forms  
      // 3. get_users_with_roles() - database function that gets users from auth.users with roles
      const [suppliersRes, buildersRes, usersWithRolesRes] = await Promise.all([
        client.from('supplier_applications').select('*').order('created_at', { ascending: false }),
        client.from('builder_registrations').select('*').order('created_at', { ascending: false }),
        client.rpc('get_users_with_roles'),
      ]);

      // Log any errors
      if (suppliersRes.error) {
        console.error('Error fetching supplier applications:', suppliersRes.error);
      }
      if (buildersRes.error) {
        console.error('Error fetching builder registrations:', buildersRes.error);
      }
      if (usersWithRolesRes.error) {
        console.error('Error fetching users with roles:', usersWithRolesRes.error);
      }

      // Get data from registration tables
      let suppliersData = ((suppliersRes.data || []) as Record<string, unknown>[]).map((row) => ({
        ...(row as unknown as RawSupplierRecord),
        auth_user_id: (row.applicant_user_id as string) || (row as RawSupplierRecord).auth_user_id,
        applicant_user_id: row.applicant_user_id as string | undefined,
      })) as RawSupplierRecord[];
      let buildersData = (buildersRes.data || []) as RawBuilderRecord[];

      // Get users with roles from database function
      const usersWithRoles = usersWithRolesRes.data || [];
      console.log('📊 Users with roles from DB:', usersWithRoles.length);
      
      // Get existing emails to avoid duplicates
      const existingSupplierEmails = new Set(suppliersData.map(s => s.email?.toLowerCase()));
      const existingBuilderEmails = new Set(buildersData.map(b => b.email?.toLowerCase()));

      // Add users from auth.users who have relevant roles
      usersWithRoles.forEach((user: any) => {
        const email = user.email?.toLowerCase();
        const role = user.role;
        
        if (!email || !role) return;
        
        if (role === 'supplier' && !existingSupplierEmails.has(email)) {
          const created =
            typeof user.created_at === 'string' && user.created_at
              ? user.created_at
              : new Date().toISOString();
          suppliersData.push({
            id: `role-${user.user_id}`,
            auth_user_id: user.user_id,
            applicant_user_id: user.user_id,
            contact_person: email.split('@')[0] || 'Unknown',
            email: user.email || '',
            phone: '',
            company_name: 'Not specified',
            county: 'Not specified',
            material_categories: [],
            status: 'active',
            created_at: created,
          });
          existingSupplierEmails.add(email);
        }
        
        if (['builder', 'professional_builder', 'private_builder'].includes(role) && !existingBuilderEmails.has(email)) {
          buildersData.push({
            id: user.user_id,
            auth_user_id: user.user_id,
            full_name: user.full_name || email.split('@')[0] || 'Unknown',
            email: user.email || '',
            phone: '',
            county: 'Not specified',
            builder_type: role === 'professional_builder' ? 'professional' : 'private',
            builder_category: role === 'professional_builder' ? 'professional' : 'private',
            status: 'active',
            created_at: user.role_created_at || user.user_created_at,
          });
          existingBuilderEmails.add(email);
        }
      });

      console.log('📊 User registrations loaded:', {
        suppliers: suppliersData.length,
        builders: buildersData.length,
        fromAuthUsers: usersWithRoles.length
      });

      setSuppliers(suppliersData);
      setBuilders(buildersData);

      // Show warning if any fetch failed but others succeeded
      const hasErrors = suppliersRes.error || buildersRes.error;
      const hasData = suppliersData.length > 0 || buildersData.length > 0;
      
      if (hasErrors && !hasData) {
        toast({
          title: 'Error',
          description: 'Failed to load registration data. Please check permissions.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching register data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registration data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Update status handlers
  const supplierTargetUserId = (s: RawSupplierRecord) =>
    s.auth_user_id || s.applicant_user_id || s.user_id || '';

  const isSyntheticSupplierRow = (s: RawSupplierRecord) => s.id.startsWith('role-');

  const updateSupplierStatus = useCallback(async (id: string, status: string) => {
    try {
      const client = supabase;
      const { error } = await client
        .from('supplier_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      toast({
        title: 'Status Updated',
        description: `Supplier application status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating supplier status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update supplier status',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const saveSupplierEdit = useCallback(
    async (s: RawSupplierRecord, patch: SupplierEditPatch) => {
      const uid = supplierTargetUserId(s);
      if (!uid) {
        toast({ title: 'Error', description: 'Missing user id for this row.', variant: 'destructive' });
        return;
      }
      try {
        if (!isSyntheticSupplierRow(s)) {
          const phoneDb = normalizePhoneDigits(patch.phone);
          if (phoneDb.length < 10 || phoneDb.length > 15) {
            toast({
              variant: 'destructive',
              title: 'Invalid phone',
              description: 'Enter 10–15 digits (e.g. 0712345678 or +254712345678).',
            });
            return;
          }
          const { error } = await supabase
            .from('supplier_applications')
            .update({
              company_name: patch.company_name.trim(),
              contact_person: patch.contact_person.trim(),
              email: patch.email.trim().toLowerCase(),
              phone: phoneDb,
              address: patch.address.trim() || null,
              ...(patch.status ? { status: patch.status, updated_at: new Date().toISOString() } : { updated_at: new Date().toISOString() }),
            })
            .eq('id', s.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('suppliers')
            .update({
              company_name: patch.company_name.trim(),
              contact_person: patch.contact_person.trim(),
              email: patch.email.trim().toLowerCase(),
              phone: patch.phone.trim(),
              address: patch.address.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', uid);
          if (error) throw error;
        }
        toast({ title: 'Saved', description: 'Supplier record updated.' });
        await fetchAllData();
      } catch (error: unknown) {
        console.error('saveSupplierEdit', error);
        toast({
          title: 'Save failed',
          description: error instanceof Error ? error.message : 'Could not update supplier',
          variant: 'destructive',
        });
      }
    },
    [fetchAllData, toast]
  );

  const demoteSupplier = useCallback(
    async (s: RawSupplierRecord) => {
      const uid = supplierTargetUserId(s);
      if (!uid) {
        toast({ title: 'Error', description: 'Missing user id.', variant: 'destructive' });
        return;
      }
      try {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', uid).eq('role', 'supplier');
        if (error) throw error;
        toast({
          title: 'Supplier demoted',
          description: 'The supplier role was removed. The user account still exists.',
        });
        await fetchAllData();
      } catch (error: unknown) {
        console.error('demoteSupplier', error);
        toast({
          title: 'Demote failed',
          description: error instanceof Error ? error.message : 'Could not remove supplier role',
          variant: 'destructive',
        });
      }
    },
    [fetchAllData, toast]
  );

  const deleteSupplierRegistration = useCallback(
    async (s: RawSupplierRecord) => {
      const uid = supplierTargetUserId(s);
      if (!uid) {
        toast({ title: 'Error', description: 'Missing user id.', variant: 'destructive' });
        return;
      }
      try {
        if (!isSyntheticSupplierRow(s)) {
          const { error: appErr } = await supabase.from('supplier_applications').delete().eq('id', s.id);
          if (appErr) throw appErr;
        }
        const { error: roleErr } = await supabase.from('user_roles').delete().eq('user_id', uid).eq('role', 'supplier');
        if (roleErr) throw roleErr;
        await supabase.from('suppliers').delete().eq('user_id', uid);
        toast({
          title: 'Removed',
          description: 'Supplier application (if any), supplier role, and supplier profile row were removed where present.',
        });
        await fetchAllData();
      } catch (error: unknown) {
        console.error('deleteSupplierRegistration', error);
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Could not delete supplier data',
          variant: 'destructive',
        });
      }
    },
    [fetchAllData, toast]
  );

  const updateBuilderStatus = useCallback(async (id: string, status: string) => {
    try {
      const client = supabase;
      const { error } = await client
        .from('builder_registrations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setBuilders(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast({
        title: 'Status Updated',
        description: `Builder status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating builder status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update builder status',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Calculate totals for tab badges
  // Separate builders into Professional and Private
  const professionalBuilders = builders.filter(b => 
    b.builder_type === 'professional' || b.builder_category === 'professional'
  );
  const privateBuilders = builders.filter(b => 
    b.builder_type === 'private' || b.builder_category === 'private' || 
    (!b.builder_type && !b.builder_category) // Default to private if not specified
  );

  const totals = {
    suppliers: suppliers.length,
    professionalBuilders: professionalBuilders.length,
    privateBuilders: privateBuilders.length,
    pending: {
      suppliers: suppliers.filter(s => s.status === 'pending').length,
      professionalBuilders: professionalBuilders.filter(b => b.status === 'pending').length,
      privateBuilders: privateBuilders.filter(b => b.status === 'pending').length,
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            User Registrations
          </h2>
          <p className="text-gray-400 mt-1">
            Manage Suppliers, Professional Builders, and Private Builders
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchAllData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card
          className={`bg-slate-900/50 border-slate-800 cursor-pointer transition-all ${activeTab === 'suppliers' ? 'border-green-500 ring-1 ring-green-500/50' : 'hover:border-green-500/50'}`}
          onClick={() => setActiveTab('suppliers')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <Store className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Suppliers</p>
                  <p className="text-xs text-gray-400">
                    {totals.pending.suppliers} pending review
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-400">{totals.suppliers}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-slate-900/50 border-slate-800 cursor-pointer transition-all ${activeTab === 'professional-builders' ? 'border-blue-500 ring-1 ring-blue-500/50' : 'hover:border-blue-500/50'}`}
          onClick={() => setActiveTab('professional-builders')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Professional Builders</p>
                  <p className="text-xs text-gray-400">
                    {totals.pending.professionalBuilders} pending review
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-400">{totals.professionalBuilders}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-slate-900/50 border-slate-800 cursor-pointer transition-all ${activeTab === 'private-builders' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'hover:border-purple-500/50'}`}
          onClick={() => setActiveTab('private-builders')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Private Builders</p>
                  <p className="text-xs text-gray-400">
                    {totals.pending.privateBuilders} pending review
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-400">{totals.privateBuilders}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Register Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger 
            value="suppliers" 
            className="data-[state=active]:bg-green-600 flex items-center gap-2"
          >
            <Store className="h-4 w-4" />
            Suppliers ({totals.suppliers})
          </TabsTrigger>
          <TabsTrigger 
            value="professional-builders" 
            className="data-[state=active]:bg-blue-600 flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Professional ({totals.professionalBuilders})
          </TabsTrigger>
          <TabsTrigger 
            value="private-builders" 
            className="data-[state=active]:bg-purple-600 flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Private ({totals.privateBuilders})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-6">
          <SuppliersRegister
            suppliers={suppliers}
            loading={loading}
            onRefresh={fetchAllData}
            onUpdateStatus={updateSupplierStatus}
            onSaveSupplierEdit={saveSupplierEdit}
            onDemoteSupplier={demoteSupplier}
            onDeleteSupplier={deleteSupplierRegistration}
          />
        </TabsContent>

        <TabsContent value="professional-builders" className="mt-6">
          <BuildersRegister
            builders={professionalBuilders}
            loading={loading}
            onRefresh={fetchAllData}
            onUpdateStatus={updateBuilderStatus}
          />
        </TabsContent>

        <TabsContent value="private-builders" className="mt-6">
          <BuildersRegister
            builders={privateBuilders}
            loading={loading}
            onRefresh={fetchAllData}
            onUpdateStatus={updateBuilderStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegistersTab;




















