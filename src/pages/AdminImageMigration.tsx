import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SupplierRow = { id: string; company_name?: string; company_logo_url?: string };
type ProfileRow = { id: string; user_id: string; full_name?: string; avatar_url?: string; company_logo_url?: string };

const isExternal = (u?: string) => !!u && /^(https?:|data:|blob:)/i.test(u) && !/^\//.test(u);

const uploadToBucket = async (bucket: string, path: string, blob: Blob, contentType?: string) => {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType });
  if (error) throw error;
  return `${bucket}/${path}`;
};

const fetchBlob = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch_failed');
  const ct = res.headers.get('content-type') || undefined;
  const blob = await res.blob();
  return { blob, contentType: ct };
};

const AdminImageMigration: React.FC = () => {
  const [running, setRunning] = React.useState(false);
  const [suppliersProcessed, setSuppliersProcessed] = React.useState(0);
  const [profilesProcessed, setProfilesProcessed] = React.useState(0);
  const [errors, setErrors] = React.useState<number>(0);
  const [summary, setSummary] = React.useState<string>('');

  const migrate = async () => {
    setRunning(true);
    setErrors(0);
    setSuppliersProcessed(0);
    setProfilesProcessed(0);
    const supplierBucket = 'supplier-logos';
    const avatarBucket = 'avatars';
    let updatedSuppliers = 0;
    let updatedProfiles = 0;

    try {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, company_name, company_logo_url')
        .limit(1000);
      for (const s of (suppliers || []) as SupplierRow[]) {
        if (isExternal(s.company_logo_url)) {
          try {
            const { blob, contentType } = await fetchBlob(s.company_logo_url as string);
            const ext = contentType?.includes('png') ? 'png' : contentType?.includes('webp') ? 'webp' : 'jpg';
            const path = `${s.id}-${Date.now()}.${ext}`;
            const storedPath = await uploadToBucket(supplierBucket, path, blob, contentType);
            await supabase.from('suppliers').update({ company_logo_url: storedPath }).eq('id', s.id);
            updatedSuppliers++;
          } catch {
            setErrors(e => e + 1);
          }
        }
        setSuppliersProcessed(p => p + 1);
      }
    } catch {
      setErrors(e => e + 1);
    }

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, company_logo_url')
        .limit(1000);
      for (const p of (profiles || []) as ProfileRow[]) {
        const candidates = [p.avatar_url, p.company_logo_url].filter(Boolean) as string[];
        for (const url of candidates) {
          if (isExternal(url)) {
            try {
              const { blob, contentType } = await fetchBlob(url);
              const ext = contentType?.includes('png') ? 'png' : contentType?.includes('webp') ? 'webp' : 'jpg';
              const path = `${p.user_id}-${Date.now()}.${ext}`;
              const storedPath = await uploadToBucket(avatarBucket, path, blob, contentType);
              const field = url === p.avatar_url ? { avatar_url: storedPath } : { company_logo_url: storedPath };
              await supabase.from('profiles').update(field).eq('id', p.id);
              updatedProfiles++;
            } catch {
              setErrors(e => e + 1);
            }
          }
        }
        setProfilesProcessed(x => x + 1);
      }
    } catch {
      setErrors(e => e + 1);
    }

    setSummary(`Suppliers updated: ${updatedSuppliers}, Profiles updated: ${updatedProfiles}`);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin Image Migration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">Migrate external supplier and builder images to Supabase Storage and update records to path format.</div>
            <div className="flex items-center gap-4">
              <Button onClick={migrate} disabled={running} className="bg-blue-600 hover:bg-blue-700 text-white">{running ? 'Running...' : 'Start Migration'}</Button>
              <div className="text-sm">Suppliers processed: {suppliersProcessed} • Profiles processed: {profilesProcessed} • Errors: {errors}</div>
            </div>
            {summary && <div className="text-sm font-medium">{summary}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminImageMigration;