import React from 'react';
import { SecurityMonitoringDashboard } from '@/components/security/SecurityMonitoringDashboard';
import { AdminAccessGuard } from '@/components/security/AdminAccessGuard';

const SecurityDashboard: React.FC = () => {
  return (
    <AdminAccessGuard requiredRole="admin" fallbackMessage="Access denied. Admin privileges required to view security dashboard.">
      <div className="container mx-auto px-4 py-8">
        <SecurityMonitoringDashboard />
      </div>
    </AdminAccessGuard>
  );
};

export default SecurityDashboard;

