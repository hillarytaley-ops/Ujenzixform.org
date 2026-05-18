import React, { useEffect, useState } from 'react';
import { SupplierMarketingFeed } from '@/components/builders/SupplierMarketingFeed';
import {
  fetchPublicSupplierDirectory,
  type PublicSupplierDirectoryRow,
} from '@/utils/fetchPublicSupplierDirectory';

type Props = {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserRole?: string | null;
  isSupplier: boolean;
};

export function SupplierMarketHubDashboardPanel({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole,
  isSupplier,
}: Props) {
  const [supplierByUserId, setSupplierByUserId] = useState(
    () => new Map<string, PublicSupplierDirectoryRow>()
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchPublicSupplierDirectory();
      if (cancelled) return;
      const m = new Map<string, PublicSupplierDirectoryRow>();
      rows.forEach((r) => {
        if (r.user_id) m.set(r.user_id, r);
      });
      setSupplierByUserId(m);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SupplierMarketingFeed
      omitOuterCard
      showComposer
      includeAuthorPendingVideos
      authorUserIdOnly={currentUserId}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserAvatar={currentUserAvatar}
      currentUserRole={currentUserRole ?? undefined}
      isSupplier={isSupplier}
      supplierByUserId={supplierByUserId}
    />
  );
}
