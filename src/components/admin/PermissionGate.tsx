/**
 * ============================================================================
 * PermissionGate Component
 * ============================================================================
 * 
 * Wraps content that requires specific staff permissions.
 * Shows a blocked message if the staff member doesn't have access.
 * 
 * @author MradiPro Team
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Shield, ArrowLeft } from 'lucide-react';
import { AdminTab, TAB_METADATA, getStaffRole } from '@/config/staffPermissions';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredTab: AdminTab;
  staffRole: string | null;
  accessibleTabs: AdminTab[];
  isAdmin?: boolean;
  onNavigateBack?: () => void;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredTab,
  staffRole,
  accessibleTabs,
  isAdmin = false,
  onNavigateBack
}) => {
  // Admins and super admins have full access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if staff has access to this tab
  const hasAccess = accessibleTabs.includes(requiredTab);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied - show blocked message
  const tabMeta = TAB_METADATA[requiredTab];
  const role = staffRole ? getStaffRole(staffRole) : null;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-lg w-full bg-slate-900/80 border-red-800/50">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4 border border-red-700/50">
            <Lock className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-white text-xl">Access Restricted</CardTitle>
          <CardDescription className="text-gray-400">
            You don't have permission to access this section
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* What they're trying to access */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400 text-sm">Requested:</span>
              <Badge variant="outline" className="text-red-400 border-red-600">
                {tabMeta?.name || requiredTab}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">
              {tabMeta?.description || 'This section requires additional permissions.'}
            </p>
          </div>

          {/* Their current role */}
          {role && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400 text-sm">Your Role:</span>
                <Badge className={role.color}>{role.name}</Badge>
              </div>
              <p className="text-gray-500 text-sm">{role.description}</p>
            </div>
          )}

          {/* What they CAN access */}
          {accessibleTabs.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-gray-400 text-sm mb-2">You have access to:</p>
              <div className="flex flex-wrap gap-1">
                {accessibleTabs.slice(0, 8).map((tab) => (
                  <Badge 
                    key={tab} 
                    variant="outline" 
                    className="text-xs bg-green-900/30 border-green-700 text-green-400"
                  >
                    {TAB_METADATA[tab]?.name || tab}
                  </Badge>
                ))}
                {accessibleTabs.length > 8 && (
                  <Badge variant="outline" className="text-xs border-slate-600 text-gray-400">
                    +{accessibleTabs.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action */}
          <div className="pt-2">
            {onNavigateBack ? (
              <Button 
                variant="outline" 
                className="w-full border-slate-600 hover:bg-slate-800"
                onClick={onNavigateBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back to Overview
              </Button>
            ) : (
              <p className="text-center text-gray-500 text-sm">
                Contact your administrator if you need access to this section.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Higher-order component to wrap tab content with permission checking
 */
export function withPermissionGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredTab: AdminTab
) {
  return function PermissionGatedComponent(props: P & {
    staffRole: string | null;
    accessibleTabs: AdminTab[];
    isAdmin?: boolean;
    onNavigateBack?: () => void;
  }) {
    const { staffRole, accessibleTabs, isAdmin, onNavigateBack, ...rest } = props;
    
    return (
      <PermissionGate
        requiredTab={requiredTab}
        staffRole={staffRole}
        accessibleTabs={accessibleTabs}
        isAdmin={isAdmin}
        onNavigateBack={onNavigateBack}
      >
        <WrappedComponent {...(rest as P)} />
      </PermissionGate>
    );
  };
}

export default PermissionGate;









