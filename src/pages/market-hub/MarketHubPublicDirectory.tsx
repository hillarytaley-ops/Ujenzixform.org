import React from 'react';
import { BuilderFacebookLayout } from '@/components/builders/BuilderFacebookLayout';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserProfile } from '@/types/userProfile';
import { getPublicVisitorDisplayName } from '@/utils/publicVisitorDisplayName';
import type { PublicSupplierDirectoryRow } from '@/utils/fetchPublicSupplierDirectory';

export interface MarketHubPublicDirectoryProps {
  userProfile: UserProfile | null;
  userRoleState: string | null;
  isBuilder: boolean;
  isSupplier: boolean;
  onBuilderContact: (builder: any) => void;
  onBuilderProfile: (builder: any) => void;
  onSupplierContact: (supplier: PublicSupplierDirectoryRow) => void;
  onSupplierProfile: (supplier: PublicSupplierDirectoryRow) => void;
  onEditProfile: () => void;
  /** Same counts as hero stats — used so empty feed copy matches live public stats */
  directoryTimelinePostCount: number;
  directoryShowcaseVideoCount: number;
  directoryStatsLoading: boolean;
  seedTimelinePosts: Record<string, unknown>[] | null;
}

export default function MarketHubPublicDirectory({
  userProfile,
  userRoleState,
  isBuilder,
  isSupplier,
  onBuilderContact,
  onBuilderProfile,
  onSupplierContact,
  onSupplierProfile,
  onEditProfile,
  directoryTimelinePostCount,
  directoryShowcaseVideoCount,
  directoryStatsLoading,
  seedTimelinePosts,
}: MarketHubPublicDirectoryProps) {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-muted-foreground px-2 sm:hidden max-w-md mx-auto leading-snug">
        Switch between CO/contractors and suppliers below. Use the bottom bar for projects, directory search, and site menu.
      </p>

      {userProfile &&
        userRoleState &&
        userRoleState !== 'professional_builder' &&
        userRoleState !== 'supplier' &&
        userRoleState !== 'private_client' &&
        userRoleState !== 'admin' && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center max-w-2xl mx-auto">
            <p className="text-amber-800 font-medium text-sm">
              You&apos;re viewing the construction market hub as a{' '}
              <strong className="capitalize">{userRoleState?.replace('_', ' ')}</strong>.
            </p>
          </div>
        )}

      <ErrorBoundary
        fallback={
          <div className="p-8 border-2 border-red-200 rounded-xl bg-red-50/90 backdrop-blur-sm shadow-lg max-w-2xl mx-auto">
            <h3 className="text-red-800 font-bold mb-2 text-xl">Error Loading Content</h3>
            <p className="text-red-700 text-lg">
              There was an error loading this section. Please try again.
            </p>
          </div>
        }
      >
        <BuilderFacebookLayout
          currentUserId={userProfile?.user_id}
          currentUserName={
            userProfile?.full_name?.trim() ||
            getPublicVisitorDisplayName() ||
            'Guest'
          }
          currentUserAvatar={userProfile?.avatar_url}
          currentUserRole={userRoleState}
          isBuilder={isBuilder}
          isSupplier={isSupplier}
          directoryTimelinePostCount={directoryTimelinePostCount}
          directoryShowcaseVideoCount={directoryShowcaseVideoCount}
          directoryStatsLoading={directoryStatsLoading}
          seedTimelinePosts={seedTimelinePosts}
          onBuilderContact={onBuilderContact}
          onBuilderProfile={onBuilderProfile}
          onSupplierContact={onSupplierContact}
          onSupplierProfile={onSupplierProfile}
          onEditProfile={onEditProfile}
        />
      </ErrorBoundary>
    </div>
  );
}
