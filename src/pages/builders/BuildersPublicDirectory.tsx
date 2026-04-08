import React from 'react';
import { BuilderFacebookLayout } from '@/components/builders/BuilderFacebookLayout';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserProfile } from '@/types/userProfile';

export interface BuildersPublicDirectoryProps {
  userProfile: UserProfile | null;
  userRoleState: string | null;
  isBuilder: boolean;
  onBuilderContact: (builder: any) => void;
  onBuilderProfile: (builder: any) => void;
  onEditProfile: () => void;
}

export default function BuildersPublicDirectory({
  userProfile,
  userRoleState,
  isBuilder,
  onBuilderContact,
  onBuilderProfile,
  onEditProfile,
}: BuildersPublicDirectoryProps) {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-muted-foreground px-2 sm:hidden max-w-md mx-auto leading-snug">
        Feed and project showcase are below. Use the bottom bar for search, create, and site menu.
      </p>

      {userProfile &&
        userRoleState &&
        userRoleState !== 'professional_builder' &&
        userRoleState !== 'private_client' &&
        userRoleState !== 'admin' && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center max-w-2xl mx-auto">
            <p className="text-amber-800 font-medium text-sm">
              You&apos;re viewing the Builders Directory as a{' '}
              <strong className="capitalize">{userRoleState?.replace('_', ' ')}</strong>.
            </p>
          </div>
        )}

      <ErrorBoundary
        fallback={
          <div className="p-8 border-2 border-red-200 rounded-xl bg-red-50/90 backdrop-blur-sm shadow-lg max-w-2xl mx-auto">
            <h3 className="text-red-800 font-bold mb-2 text-xl">Error Loading Content</h3>
            <p className="text-red-700 text-lg">
              There was an error loading the builder feed. Please try again.
            </p>
          </div>
        }
      >
        <BuilderFacebookLayout
          currentUserId={userProfile?.user_id}
          currentUserName={userProfile?.full_name || 'Guest'}
          currentUserAvatar={userProfile?.avatar_url}
          currentUserRole={userRoleState}
          isBuilder={isBuilder}
          onBuilderContact={onBuilderContact}
          onBuilderProfile={onBuilderProfile}
          onEditProfile={onEditProfile}
        />
      </ErrorBoundary>
    </div>
  );
}
