import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getPostgrestAuthorizationHeaderSync } from '@/utils/supabaseAccessToken';
import {
  buildMaterialsCsvBlob,
  fetchApprovedMaterialsList,
  materialsListCsvFilename,
  triggerFileDownload,
} from '@/lib/materialsListExport';

/** Downloads a CSV of all approved materials/products in the catalog. */
export function MaterialsListDownloadButton() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const onDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const auth = getPostgrestAuthorizationHeaderSync();
      const rows = await fetchApprovedMaterialsList(auth);
      if (rows.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No materials yet',
          description: 'There are no approved products in the catalog to export.',
        });
        return;
      }
      const blob = buildMaterialsCsvBlob(rows);
      const name = materialsListCsvFilename();
      triggerFileDownload(blob, name);
      toast({
        title: 'List downloaded',
        description: `${rows.length} materials saved as ${name}. Open in Excel or Sheets.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ variant: 'destructive', title: 'Could not download list', description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 shrink-0"
      disabled={busy}
      onClick={() => void onDownload()}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" aria-hidden />
      ) : (
        <Download className="h-4 w-4 mr-2 shrink-0" aria-hidden />
      )}
      Download materials list
    </Button>
  );
}
