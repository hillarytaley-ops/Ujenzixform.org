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
import type { SupplierEditPatch, BuilderEditPatch } from '../types';

/** Admin-only RPC: RLS blocks direct `profiles` updates for other users. */
async function adminSetProfileRegistrationStatus(
  client: typeof supabase,
  userId: string,
  status: string
): Promise<{ count: number; error: Error | null }> {
  const { data, error } = await client.rpc('admin_set_profile_registration_status', {
    p_target_user_id: userId,
    p_status: status,
  });
  if (error) return { count: 0, error: error as Error };
  const count = typeof data === 'number' ? data : 0;
  return { count, error: null };
}

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
  /** user_roles.role for synthetic rows from get_users_with_roles (demote uses this) */
  db_user_role?: string;
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
      let buildersData = ((buildersRes.data || []) as Record<string, unknown>[]).map((row) => ({
        ...(row as unknown as RawBuilderRecord),
        auth_user_id: (row.auth_user_id as string) || (row as RawBuilderRecord).auth_user_id,
      })) as RawBuilderRecord[];

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
          const created =
            typeof user.created_at === 'string' && user.created_at
              ? user.created_at
              : new Date().toISOString();
          buildersData.push({
            id: `role-${user.user_id}`,
            auth_user_id: user.user_id,
            db_user_role: role,
            full_name: email.split('@')[0] || 'Unknown',
            email: user.email || '',
            phone: '',
            county: 'Not specified',
            builder_type: role === 'professional_builder' ? 'professional' : 'private',
            builder_category: role === 'professional_builder' ? 'professional' : 'private',
            status: 'active',
            created_at: created,
          });
          existingBuilderEmails.add(email);
        }
      });

      // Synthetic suppliers: admin status may live on suppliers OR profiles (role-only users may lack a suppliers row).
      const syntheticSupplierUids = suppliersData.filter((s) => s.id.startsWith('role-')).map((s) => s.id.replace(/^role-/, ''));
      if (syntheticSupplierUids.length > 0) {
        const [{ data: supHoldRows }, { data: profForSuppliers }] = await Promise.all([
          client.from('suppliers').select('user_id, registration_admin_status').in('user_id', syntheticSupplierUids),
          client.from('profiles').select('user_id, registration_admin_status').in('user_id', syntheticSupplierUids),
        ]);
        const fromSuppliers = new Map(
          (supHoldRows || []).map((r) => [r.user_id as string, r.registration_admin_status as string | null])
        );
        const fromProfiles = new Map(
          (profForSuppliers || []).map((r) => [r.user_id as string, r.registration_admin_status as string | null])
        );
        suppliersData = suppliersData.map((row) => {
          if (!row.id.startsWith('role-')) return row;
          const u = row.id.replace(/^role-/, '');
          const supV = fromSuppliers.get(u);
          const profV = fromProfiles.get(u);
          const rs =
            (supV && String(supV).trim()) || (profV && String(profV).trim()) || null;
          if (rs) return { ...row, status: rs };
          return row;
        });
      }

      const syntheticBuilderUids = buildersData.filter((b) => b.id.startsWith('role-')).map((b) => b.id.replace(/^role-/, ''));
      if (syntheticBuilderUids.length > 0) {
        const { data: profHoldRows } = await client
          .from('profiles')
          .select('user_id, registration_admin_status')
          .in('user_id', syntheticBuilderUids);
        const bStatusByUid = new Map(
          (profHoldRows || []).map((r) => [r.user_id as string, r.registration_admin_status as string | null])
        );
        buildersData = buildersData.map((row) => {
          if (!row.id.startsWith('role-')) return row;
          const u = row.id.replace(/^role-/, '');
          const rs = bStatusByUid.get(u);
          if (rs && String(rs).trim()) return { ...row, status: rs };
          return row;
        });
      }

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

  const updateSupplierStatus = useCallback(
    async (id: string, status: string, opts?: { rowEmail?: string }) => {
      const ts = new Date().toISOString();
      const rowEmail = opts?.rowEmail?.trim().toLowerCase();
      try {
        const client = supabase;
        if (id.startsWith('role-')) {
          const uid = id.replace(/^role-/, '').trim();
          if (!uid) {
            toast({ variant: 'destructive', title: 'Error', description: 'Missing user id for this row.' });
            return;
          }

          let { data: updated, error } = await client
            .from('supplier_applications')
            .update({ status, updated_at: ts })
            .eq('applicant_user_id', uid)
            .select('id');
          if (error) throw error;
          if (updated && updated.length > 0) {
            setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
            toast({
              title: 'Status Updated',
              description: `Registration status updated to ${status}.`,
            });
            return;
          }

          if (rowEmail) {
            ({ data: updated, error } = await client
              .from('supplier_applications')
              .update({ status, updated_at: ts })
              .eq('email', rowEmail)
              .select('id'));
            if (error) throw error;
            if (updated && updated.length > 0) {
              setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
              toast({
                title: 'Status Updated',
                description: `Registration status updated to ${status}.`,
              });
              return;
            }
          }

          ({ data: updated, error } = await client
            .from('suppliers')
            .update({ registration_admin_status: status, updated_at: ts })
            .eq('user_id', uid)
            .select('id'));
          if (error) throw error;
          if (updated && updated.length > 0) {
            setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
            toast({
              title: 'Status Updated',
              description: `Supplier profile status updated to ${status}.`,
            });
            return;
          }

          const profRpc = await adminSetProfileRegistrationStatus(client, uid, status);
          if (profRpc.error) throw profRpc.error;
          if (profRpc.count > 0) {
            setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
            toast({
              title: 'Status Updated',
              description: `Registration status saved on the user profile (no supplier profile row yet).`,
            });
            return;
          }

          toast({
            variant: 'destructive',
            title: 'Cannot update status',
            description:
              'No matching registration or profile was updated for this user. Use Demote if the role should be removed, or confirm the account has a profile row and migrations (including admin profile status RPC) are applied.',
          });
          return;
        }

        let { data: appUpdated, error: appErr } = await client
          .from('supplier_applications')
          .update({ status, updated_at: ts })
          .eq('id', id)
          .select('id');
        if (appErr) throw appErr;
        if (appUpdated && appUpdated.length > 0) {
          setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
          toast({
            title: 'Status Updated',
            description: `Registration status updated to ${status}.`,
          });
          return;
        }

        const { data: appRow } = await client
          .from('supplier_applications')
          .select('applicant_user_id, email')
          .eq('id', id)
          .maybeSingle();
        const appUid = (appRow?.applicant_user_id as string | undefined)?.trim();
        const appEmail = (appRow?.email as string | undefined)?.trim().toLowerCase();
        if (appUid) {
          let { data: fb, error: fbErr } = await client
            .from('suppliers')
            .update({ registration_admin_status: status, updated_at: ts })
            .eq('user_id', appUid)
            .select('id');
          if (fbErr) throw fbErr;
          if (fb?.length) {
            setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
            toast({
              title: 'Status Updated',
              description: `Supplier profile status updated to ${status}.`,
            });
            return;
          }
          const profRpc = await adminSetProfileRegistrationStatus(client, appUid, status);
          if (profRpc.error) throw profRpc.error;
          if (profRpc.count > 0) {
            setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
            toast({
              title: 'Status Updated',
              description: `Registration status saved on the user profile.`,
            });
            return;
          }
        }
        if (appEmail) {
          const { data: byEmail, error: emErr } = await client
            .from('supplier_applications')
            .update({ status, updated_at: ts })
            .eq('email', appEmail)
            .select('id');
          if (emErr) throw emErr;
          if (byEmail?.length) {
            setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
            toast({
              title: 'Status Updated',
              description: `Registration status updated to ${status}.`,
            });
            return;
          }
        }

        toast({
          variant: 'destructive',
          title: 'Cannot update status',
          description:
            'Could not update this row (application, supplier profile, or user profile). Confirm you are signed in as staff admin and database migrations are applied.',
        });
      } catch (error) {
        console.error('Error updating supplier status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update registration status',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

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

  const builderTargetUserId = (b: RawBuilderRecord) =>
    (b.auth_user_id || (b.id.startsWith('role-') ? b.id.replace(/^role-/, '') : '') || '').trim();

  const isSyntheticBuilderRow = (b: RawBuilderRecord) => b.id.startsWith('role-');

  const updateBuilderStatus = useCallback(
    async (id: string, status: string, opts?: { rowEmail?: string }) => {
      const ts = new Date().toISOString();
      const rowEmail = opts?.rowEmail?.trim().toLowerCase();
      try {
        const client = supabase;
        if (id.startsWith('role-')) {
          const uid = id.replace(/^role-/, '').trim();
          if (!uid) {
            toast({ variant: 'destructive', title: 'Error', description: 'Missing user id for this row.' });
            return;
          }

          let { data: updated, error } = await client
            .from('builder_registrations')
            .update({ status, updated_at: ts })
            .eq('auth_user_id', uid)
            .select('id');
          if (error) throw error;
          if (updated && updated.length > 0) {
            setBuilders((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
            toast({
              title: 'Status Updated',
              description: `Registration status updated to ${status}.`,
            });
            return;
          }

          if (rowEmail) {
            ({ data: updated, error } = await client
              .from('builder_registrations')
              .update({ status, updated_at: ts })
              .eq('email', rowEmail)
              .select('id'));
            if (error) throw error;
            if (updated && updated.length > 0) {
              setBuilders((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
              toast({
                title: 'Status Updated',
                description: `Registration status updated to ${status}.`,
              });
              return;
            }
          }

          const bProfRpc = await adminSetProfileRegistrationStatus(client, uid, status);
          if (bProfRpc.error) throw bProfRpc.error;
          if (bProfRpc.count > 0) {
            setBuilders((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
            toast({
              title: 'Status Updated',
              description: `Registration status saved on the user profile (no builder registration row matched).`,
            });
            return;
          }

          toast({
            variant: 'destructive',
            title: 'Cannot update status',
            description:
              'No matching builder registration or profile was updated. Use Demote if access should be removed, or confirm migrations (admin profile status RPC) are applied.',
          });
          return;
        }

        let { data: brUpdated, error: brErr } = await client
          .from('builder_registrations')
          .update({ status, updated_at: ts })
          .eq('id', id)
          .select('id');
        if (brErr) throw brErr;
        if (brUpdated && brUpdated.length > 0) {
          setBuilders((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
          toast({
            title: 'Status Updated',
            description: `Registration status updated to ${status}.`,
          });
          return;
        }

        const { data: bRow } = await client
          .from('builder_registrations')
          .select('auth_user_id, email')
          .eq('id', id)
          .maybeSingle();
        const bUid = (bRow?.auth_user_id as string | undefined)?.trim();
        const bEmail = (bRow?.email as string | undefined)?.trim().toLowerCase();
        if (bUid) {
          const bProfRpc2 = await adminSetProfileRegistrationStatus(client, bUid, status);
          if (bProfRpc2.error) throw bProfRpc2.error;
          if (bProfRpc2.count > 0) {
            setBuilders((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
            toast({
              title: 'Status Updated',
              description: `Registration status saved on the user profile.`,
            });
            return;
          }
        }
        if (bEmail) {
          const { data: byEmail, error: emErr } = await client
            .from('builder_registrations')
            .update({ status, updated_at: ts })
            .eq('email', bEmail)
            .select('id');
          if (emErr) throw emErr;
          if (byEmail?.length) {
            setBuilders((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
            toast({
              title: 'Status Updated',
              description: `Registration status updated to ${status}.`,
            });
            return;
          }
        }

        toast({
          variant: 'destructive',
          title: 'Cannot update status',
          description:
            'Could not update this row (builder registration or user profile). Confirm staff admin login and migrations are applied.',
        });
      } catch (error) {
        console.error('Error updating builder status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update registration status',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const saveBuilderEdit = useCallback(
    async (b: RawBuilderRecord, patch: BuilderEditPatch) => {
      const uid = builderTargetUserId(b);
      if (!uid) {
        toast({ title: 'Error', description: 'Missing user id for this row.', variant: 'destructive' });
        return;
      }
      try {
        if (!isSyntheticBuilderRow(b)) {
          const phoneDb = normalizePhoneDigits(patch.phone);
          if (phoneDb.length < 9 || phoneDb.length > 15) {
            toast({
              variant: 'destructive',
              title: 'Invalid phone',
              description: 'Enter 9–15 digits for builder registration phone.',
            });
            return;
          }
          const { error } = await supabase
            .from('builder_registrations')
            .update({
              full_name: patch.full_name.trim(),
              email: patch.email.trim().toLowerCase(),
              phone: phoneDb,
              company_name: patch.company_name.trim() || null,
              county: patch.county.trim() || 'Nairobi',
              town: patch.town.trim() || null,
              physical_address: patch.physical_address.trim() || null,
              ...(patch.status
                ? { status: patch.status, updated_at: new Date().toISOString() }
                : { updated_at: new Date().toISOString() }),
            })
            .eq('id', b.id);
          if (error) throw error;
        } else {
          const phoneDb = normalizePhoneDigits(patch.phone);
          const { error } = await supabase
            .from('profiles')
            .update({
              full_name: patch.full_name.trim(),
              phone: phoneDb || null,
              company_name: patch.company_name.trim() || null,
              builder_category: b.builder_category === 'professional' ? 'professional' : 'private',
              is_professional: b.builder_category === 'professional',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', uid);
          if (error) throw error;
        }
        toast({ title: 'Saved', description: 'Builder record updated.' });
        await fetchAllData();
      } catch (error: unknown) {
        console.error('saveBuilderEdit', error);
        toast({
          title: 'Save failed',
          description: error instanceof Error ? error.message : 'Could not update builder',
          variant: 'destructive',
        });
      }
    },
    [fetchAllData, toast]
  );

  const BUILDER_ROLE_KEYS = ['professional_builder', 'private_builder', 'builder'] as const;

  const demoteBuilder = useCallback(
    async (b: RawBuilderRecord) => {
      const uid = builderTargetUserId(b);
      if (!uid) {
        toast({ title: 'Error', description: 'Missing user id.', variant: 'destructive' });
        return;
      }
      try {
        const specific = b.db_user_role;
        if (specific && BUILDER_ROLE_KEYS.includes(specific as (typeof BUILDER_ROLE_KEYS)[number])) {
          const { error } = await supabase.from('user_roles').delete().eq('user_id', uid).eq('role', specific);
          if (error) throw error;
        } else {
          for (const role of BUILDER_ROLE_KEYS) {
            await supabase.from('user_roles').delete().eq('user_id', uid).eq('role', role);
          }
        }
        toast({
          title: 'Builder demoted',
          description: 'Builder role removed. The user account still exists.',
        });
        await fetchAllData();
      } catch (error: unknown) {
        console.error('demoteBuilder', error);
        toast({
          title: 'Demote failed',
          description: error instanceof Error ? error.message : 'Could not remove builder role',
          variant: 'destructive',
        });
      }
    },
    [fetchAllData, toast]
  );

  const deleteBuilderRegistration = useCallback(
    async (b: RawBuilderRecord) => {
      const uid = builderTargetUserId(b);
      if (!uid) {
        toast({ title: 'Error', description: 'Missing user id.', variant: 'destructive' });
        return;
      }
      try {
        if (!isSyntheticBuilderRow(b)) {
          const { error: regErr } = await supabase.from('builder_registrations').delete().eq('id', b.id);
          if (regErr) throw regErr;
        }
        const specific = b.db_user_role;
        if (specific && BUILDER_ROLE_KEYS.includes(specific as (typeof BUILDER_ROLE_KEYS)[number])) {
          await supabase.from('user_roles').delete().eq('user_id', uid).eq('role', specific);
        } else {
          for (const role of BUILDER_ROLE_KEYS) {
            await supabase.from('user_roles').delete().eq('user_id', uid).eq('role', role);
          }
        }
        toast({
          title: 'Removed',
          description: 'Builder registration (if any) and builder roles were removed. Auth user is unchanged.',
        });
        await fetchAllData();
      } catch (error: unknown) {
        console.error('deleteBuilderRegistration', error);
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Could not delete builder data',
          variant: 'destructive',
        });
      }
    },
    [fetchAllData, toast]
  );

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
            onSaveBuilderEdit={saveBuilderEdit}
            onDemoteBuilder={demoteBuilder}
            onDeleteBuilder={deleteBuilderRegistration}
          />
        </TabsContent>

        <TabsContent value="private-builders" className="mt-6">
          <BuildersRegister
            builders={privateBuilders}
            loading={loading}
            onRefresh={fetchAllData}
            onUpdateStatus={updateBuilderStatus}
            onSaveBuilderEdit={saveBuilderEdit}
            onDemoteBuilder={demoteBuilder}
            onDeleteBuilder={deleteBuilderRegistration}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegistersTab;




















