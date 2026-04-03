import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { captureError } from '@/utils/errorTracking';
import {
  DashboardStats,
  UserRecord,
  RegistrationRecord,
  FeedbackRecord,
  DocumentRecord,
  CameraRecord,
  CameraFormData,
  DeliveryApplication,
  BuilderDeliveryRequest,
  PaginationState,
} from '../types';

// Hook for fetching dashboard statistics
export const useAdminStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBuilders: 0,
    totalSuppliers: 0,
    totalDelivery: 0,
    pendingRegistrations: 0,
    activeToday: 0,
    totalFeedback: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const client = supabase;

      // Fetch counts in parallel using correct table names
      const [
        { count: usersCount },
        { count: buildersCount },
        { count: suppliersCount },
        { count: deliveryCount },
        { count: pendingCount },
        { count: feedbackCount },
      ] = await Promise.all([
        client.from('profiles').select('*', { count: 'exact', head: true }),
        client.from('user_roles').select('*', { count: 'exact', head: true }).in('role', ['professional_builder', 'private_client']),
        client.from('suppliers').select('*', { count: 'exact', head: true }),
        client.from('delivery_providers').select('*', { count: 'exact', head: true }),
        client.from('supplier_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        client.from('feedback').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersCount || 0,
        totalBuilders: buildersCount || 0,
        totalSuppliers: suppliersCount || 0,
        totalDelivery: deliveryCount || 0,
        pendingRegistrations: pendingCount || 0,
        activeToday: 0, // Would need session tracking
        totalFeedback: feedbackCount || 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};

// Hook for fetching users with pagination
export const useUsers = (pagination?: PaginationState) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const client = supabase;

      let query = client
        .from('profiles')
        .select('id, email, role, status, created_at, last_sign_in_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (pagination) {
        const { page, pageSize } = pagination;
        query = query.range((page - 1) * pageSize, page * pageSize - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedUsers: UserRecord[] = (data || []).map((user: Record<string, unknown>) => ({
        id: user.id as string,
        email: (user.email as string) || 'N/A',
        role: (user.role as string) || 'user',
        status: (user.status as string) || 'active',
        created_at: user.created_at as string,
        last_sign_in: user.last_sign_in_at as string | null,
      }));

      setUsers(formattedUsers);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, total, refetch: fetchUsers };
};

// Hook for fetching registrations
export const useRegistrations = () => {
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const client = supabase;

      const [
        suppliersRes,
        buildersRes,
        deliveryRegsRes,
        deliveryProvidersRes,
      ] = await Promise.all([
        client.from('supplier_applications').select('*').order('created_at', { ascending: false }),
        client.from('builder_registrations').select('*').order('created_at', { ascending: false }),
        client.from('delivery_provider_registrations').select('*').order('created_at', { ascending: false }),
        client.from('delivery_providers').select('*').order('created_at', { ascending: false }),
      ]);

      const allRegistrations: RegistrationRecord[] = [];

      if (suppliersRes.data) {
        suppliersRes.data.forEach((s: Record<string, unknown>) => {
          allRegistrations.push({
            id: s.id as string,
            type: 'supplier',
            name: (s.company_name as string) || (s.contact_person as string) || 'N/A',
            email: (s.email as string) || 'N/A',
            phone: s.phone as string | undefined,
            company_name: s.company_name as string | undefined,
            county: s.address as string | undefined,
            material_categories: s.materials_offered as string[] | undefined,
            status: (s.status as string) || 'pending',
            created_at: s.created_at as string,
          });
        });
      }

      if (buildersRes.data) {
        buildersRes.data.forEach((b: Record<string, unknown>) => {
          allRegistrations.push({
            id: b.id as string,
            type: 'builder',
            name: (b.full_name as string) || 'N/A',
            email: (b.email as string) || 'N/A',
            phone: b.phone as string | undefined,
            company_name: b.company_name as string | undefined,
            county: (b.county as string) || undefined,
            builder_category: (b.builder_category as string) || (b.builder_type as string) || undefined,
            status: (b.status as string) || 'pending',
            created_at: b.created_at as string,
          });
        });
      }

      const regRows = (deliveryRegsRes.data || []) as Record<string, unknown>[];
      const provRows = (deliveryProvidersRes.data || []) as Record<string, unknown>[];
      const regEmails = new Set(
        regRows.map((r) => String(r.email || '').toLowerCase()).filter(Boolean)
      );
      const regAuthIds = new Set(
        regRows.map((r) => r.auth_user_id as string | undefined).filter(Boolean) as string[]
      );

      regRows.forEach((d) => {
        allRegistrations.push({
          id: d.id as string,
          type: 'delivery',
          name: (d.full_name as string) || (d.provider_name as string) || 'N/A',
          email: (d.email as string) || 'N/A',
          phone: d.phone as string | undefined,
          company_name: (d.company_name as string) || (d.provider_name as string) || undefined,
          county:
            (d.county as string) ||
            (d.address as string) ||
            (Array.isArray(d.service_counties) ? (d.service_counties as string[])[0] : undefined),
          vehicle_type: d.vehicle_type as string | undefined,
          service_areas: (d.service_areas as string[]) || (d.service_counties as string[]) || undefined,
          status: (d.status as string) || 'pending',
          created_at: d.created_at as string,
        });
      });

      provRows.forEach((d) => {
        const email = String(d.email || '').toLowerCase();
        const uid = d.user_id as string | undefined;
        if (email && regEmails.has(email)) return;
        if (uid && regAuthIds.has(uid)) return;
        allRegistrations.push({
          id: d.id as string,
          type: 'delivery',
          name: (d.full_name as string) || (d.provider_name as string) || 'N/A',
          email: (d.email as string) || 'N/A',
          phone: d.phone as string | undefined,
          company_name: (d.company_name as string) || (d.provider_name as string) || undefined,
          county:
            (d.county as string) ||
            (d.address as string) ||
            (Array.isArray(d.service_counties) ? (d.service_counties as string[])[0] : undefined),
          vehicle_type: d.vehicle_type as string | undefined,
          service_areas: (d.service_areas as string[]) || (d.service_counties as string[]) || undefined,
          status:
            (d.status as string) ||
            ((d.is_verified as boolean) ? 'approved' : 'pending'),
          created_at: d.created_at as string,
        });
      });

      allRegistrations.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRegistrations(allRegistrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      void captureError(error, { component: 'useRegistrations', action: 'fetchRegistrations' });
      toast({
        title: 'Error',
        description: 'Failed to load registrations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update registration status
  const updateStatus = useCallback(async (
    id: string, 
    type: 'builder' | 'supplier' | 'delivery', 
    newStatus: string
  ) => {
    try {
      const client = supabase;
      
      // Use correct table names
      if (type === 'supplier') {
        const { error } = await client
          .from('supplier_applications')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else if (type === 'delivery') {
        const now = new Date().toISOString();
        const { data: regRows, error: regErr } = await client
          .from('delivery_provider_registrations')
          .update({ status: newStatus, updated_at: now })
          .eq('id', id)
          .select('id');
        if (regErr) throw regErr;
        if (!regRows?.length) {
          const { error: provErr } = await client
            .from('delivery_providers')
            .update({
              is_verified: newStatus === 'approved',
              updated_at: now,
            })
            .eq('id', id);
          if (provErr) throw provErr;
        }
      } else if (type === 'builder') {
        const { error } = await client
          .from('builder_registrations')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await client
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }

      toast({
        title: 'Status Updated',
        description: `Registration status changed to ${newStatus}`,
      });

      fetchRegistrations();
    } catch (error) {
      console.error('Error updating status:', error);
      void captureError(error, { component: 'useRegistrations', action: 'updateStatus' });
      toast({
        title: 'Error',
        description: 'Failed to update registration status',
        variant: 'destructive',
      });
    }
  }, [toast, fetchRegistrations]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  return { registrations, loading, refetch: fetchRegistrations, updateStatus };
};

// Hook for fetching feedback
export const useFeedback = () => {
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  // Start with loading=false to show empty table immediately instead of skeleton
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const fetchFeedback = useCallback(async () => {
    // Only show loading skeleton on manual refresh, not initial load
    if (isInitialized) {
      setLoading(true);
    }
    
    try {
      console.log('📝 Fetching feedback via Supabase client...');

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      console.log('📝 Feedback loaded:', data?.length || 0);

      const formattedFeedback: FeedbackRecord[] = (data ?? []).map((f: Record<string, unknown>) => ({
        id: f.id as string,
        user_email: (f.email as string) || (f.user_email as string) || 'Anonymous',
        message: (f.message as string) || (f.comment as string) || '',
        rating: (f.rating as number) || 0,
        category: (f.category as string) || (f.feedback_category as string) || 'General',
        created_at: f.created_at as string,
        status: (f.status as string) || 'pending',
        name: f.name as string | null,
        subject: f.subject as string | null,
        user_type: f.user_type as string | null,
        // Reply fields
        admin_reply: f.admin_reply as string | null,
        admin_reply_at: f.admin_reply_at as string | null,
        replied_by: f.replied_by as string | null,
        replied_by_name: f.replied_by_name as string | null,
      }));

      setFeedback(formattedFeedback);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error fetching feedback:', error);
        toast({
          title: 'Error',
          description: 'Failed to load feedback',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [toast, isInitialized]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return { feedback, loading, refetch: fetchFeedback };
};

// Hook for fetching cameras
export const useCameras = () => {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      const client = supabase;

      const { data, error } = await client
        .from('cameras')
        .select(`
          id,
          name,
          location,
          project_id,
          stream_url,
          is_active,
          supports_ptz,
          supports_two_way_audio,
          created_at,
          updated_at,
          projects:project_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCameras: CameraRecord[] = (data || []).map((cam: Record<string, unknown>) => ({
        id: cam.id as string,
        name: (cam.name as string) || 'Unnamed Camera',
        location: cam.location as string | null,
        project_id: cam.project_id as string | null,
        project_name: (cam.projects as { name: string } | null)?.name || undefined,
        stream_url: cam.stream_url as string | null,
        is_active: (cam.is_active as boolean) ?? true,
        camera_type: 'ip', // Default value - column doesn't exist in DB yet
        connection_type: 'url', // Default value - column doesn't exist in DB yet
        ip_address: null,
        credentials: null,
        embed_code: null,
        resolution: null,
        fps: null,
        recording_enabled: false,
        motion_detection: false,
        supports_ptz: (cam.supports_ptz as boolean) ?? false,
        supports_two_way_audio: (cam.supports_two_way_audio as boolean) ?? false,
        status: (cam.is_active as boolean) ? 'online' : 'offline',
        last_connected: null,
        created_at: cam.created_at as string,
        updated_at: cam.updated_at as string,
      }));

      setCameras(formattedCameras);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cameras',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Add camera - uses only columns that exist in the database
  const addCamera = useCallback(async (cameraData: CameraFormData) => {
    try {
      const client = supabase;

      const { error } = await client
        .from('cameras')
        .insert({
          name: cameraData.name,
          location: cameraData.location || null,
          stream_url: cameraData.stream_url || null,
          is_active: cameraData.is_active ?? true,
          supports_ptz: cameraData.supports_ptz ?? false,
          supports_two_way_audio: cameraData.supports_two_way_audio ?? false,
        });

      if (error) throw error;

      toast({
        title: 'Camera Added',
        description: `Camera "${cameraData.name}" has been added successfully.`,
      });

      fetchCameras();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add camera';
      console.error('Error adding camera:', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchCameras]);

  // Update camera - uses only columns that exist in the database
  const updateCamera = useCallback(async (id: string, cameraData: Partial<CameraFormData>) => {
    try {
      const client = supabase;

      const updateData: Record<string, unknown> = {};
      
      // Only include columns that exist in the database
      if (cameraData.name !== undefined) updateData.name = cameraData.name;
      if (cameraData.location !== undefined) updateData.location = cameraData.location || null;
      if (cameraData.stream_url !== undefined) updateData.stream_url = cameraData.stream_url || null;
      if (cameraData.is_active !== undefined) updateData.is_active = cameraData.is_active;
      if (cameraData.supports_ptz !== undefined) updateData.supports_ptz = cameraData.supports_ptz;
      if (cameraData.supports_two_way_audio !== undefined)
        updateData.supports_two_way_audio = cameraData.supports_two_way_audio;

      const { error } = await client
        .from('cameras')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Camera Updated',
        description: 'Camera settings have been updated successfully.',
      });

      fetchCameras();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update camera';
      console.error('Error updating camera:', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchCameras]);

  // Delete camera
  const deleteCamera = useCallback(async (id: string) => {
    try {
      const client = supabase;

      const { error } = await client
        .from('cameras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Camera Deleted',
        description: 'Camera has been deleted successfully.',
      });

      fetchCameras();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete camera';
      console.error('Error deleting camera:', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchCameras]);

  // Toggle camera status
  const toggleStatus = useCallback(async (id: string, currentStatus: boolean) => {
    return updateCamera(id, { is_active: !currentStatus });
  }, [updateCamera]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  return { 
    cameras, 
    loading, 
    refetch: fetchCameras, 
    addCamera, 
    updateCamera, 
    deleteCamera, 
    toggleStatus 
  };
};

// Hook for fetching delivery applications
export const useDeliveryApplications = () => {
  const [applications, setApplications] = useState<DeliveryApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const client = supabase;

      const { data, error } = await client
        .from('delivery_provider_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedApps: DeliveryApplication[] = (data || []).map((app: Record<string, unknown>) => ({
        id: app.id as string,
        full_name: (app.full_name as string) || 'N/A',
        email: (app.email as string) || 'N/A',
        phone: (app.phone as string) || 'N/A',
        county: (app.county as string) || 'N/A',
        physical_address: (app.physical_address as string) || 'N/A',
        vehicle_type: (app.vehicle_type as string) || 'N/A',
        vehicle_registration: (app.vehicle_registration as string) || 'N/A',
        driving_license_number: (app.driving_license_number as string) || 'N/A',
        years_experience: (app.years_driving_experience as number) || 0,
        service_areas: (app.service_areas as string[]) || [],
        availability: (app.available_days as string[])?.length > 5 ? 'full_time' : 'part_time',
        has_smartphone: true,
        background_check_consent: (app.background_check_consent as boolean) ?? false,
        status: (app.status as string) || 'pending',
        created_at: app.created_at as string,
        reviewed_at: app.reviewed_at as string | undefined,
        reviewed_by: app.reviewed_by as string | undefined,
      }));

      setApplications(formattedApps);
    } catch (error) {
      console.error('Error fetching delivery applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return { applications, loading, refetch: fetchApplications };
};

// Hook for fetching builder delivery requests
export const useBuilderDeliveryRequests = () => {
  const [requests, setRequests] = useState<BuilderDeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const client = supabase;

      const { data, error } = await client
        .from('delivery_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRequests: BuilderDeliveryRequest[] = (data || []).map((req: Record<string, unknown>) => ({
        id: req.id as string,
        builder_id: req.builder_id as string,
        builder_email: req.builder_email as string | undefined,
        builder_name: req.builder_name as string | undefined,
        pickup_location: req.pickup_location as string | undefined,
        pickup_address: req.pickup_address as string | undefined,
        dropoff_location: req.dropoff_location as string | undefined,
        dropoff_address: req.dropoff_address as string | undefined,
        item_description: req.item_description as string | undefined,
        estimated_weight: req.estimated_weight as string | undefined,
        preferred_date: req.preferred_date as string | undefined,
        preferred_time: req.preferred_time as string | undefined,
        urgency: req.urgency as string | undefined,
        special_instructions: req.special_instructions as string | undefined,
        status: (req.status as string) || 'pending',
        driver_id: req.driver_id as string | undefined,
        driver_name: req.driver_name as string | undefined,
        driver_phone: req.driver_phone as string | undefined,
        vehicle_info: req.vehicle_info as string | undefined,
        assigned_at: req.assigned_at as string | undefined,
        picked_up_at: req.picked_up_at as string | undefined,
        delivered_at: req.delivered_at as string | undefined,
        cancelled_at: req.cancelled_at as string | undefined,
        cancellation_reason: req.cancellation_reason as string | undefined,
        estimated_cost: req.estimated_cost as number | undefined,
        final_cost: req.final_cost as number | undefined,
        current_location: req.current_location as string | undefined,
        tracking_updates: req.tracking_updates as unknown[] | undefined,
        created_at: req.created_at as string,
        updated_at: req.updated_at as string,
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching delivery requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, loading, refetch: fetchRequests };
};

