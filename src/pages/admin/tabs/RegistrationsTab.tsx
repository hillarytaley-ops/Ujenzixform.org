import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Store,
  Truck,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Eye,
} from 'lucide-react';
import { RegistrationRecord } from '../types';
import { StatsCard, StatsGrid } from '../components/StatsCard';
import { DataTable, StatusBadge, Column, RowAction } from '../components/DataTable';
import { useConfirmDialog } from '../components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface RegistrationsTabProps {
  registrations: RegistrationRecord[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (id: string, type: 'builder' | 'supplier' | 'delivery', status: string) => void;
}

export const RegistrationsTab: React.FC<RegistrationsTabProps> = ({
  registrations,
  loading,
  onRefresh,
  onUpdateStatus,
}) => {
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [detailReg, setDetailReg] = useState<RegistrationRecord | null>(null);
  const { openDialog, DialogComponent } = useConfirmDialog();

  const formatList = (items?: string[]) =>
    items && items.length > 0 ? items.join(', ') : '—';

  // Filter registrations by type
  const builders = useMemo(
    () => registrations.filter((r) => r.type === 'builder'),
    [registrations]
  );
  const suppliers = useMemo(
    () => registrations.filter((r) => r.type === 'supplier'),
    [registrations]
  );
  const deliveryProviders = useMemo(
    () => registrations.filter((r) => r.type === 'delivery'),
    [registrations]
  );

  // Stats
  const stats = useMemo(() => ({
    total: registrations.length,
    pending: registrations.filter((r) => r.status === 'pending').length,
    approved: registrations.filter((r) => r.status === 'approved').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length,
    builders: builders.length,
    suppliers: suppliers.length,
    delivery: deliveryProviders.length,
  }), [registrations, builders, suppliers, deliveryProviders]);

  // Handle approve
  const handleApprove = (reg: RegistrationRecord) => {
    openDialog({
      title: 'Approve Registration',
      description: `Are you sure you want to approve ${reg.name}'s ${reg.type} registration?`,
      variant: 'success',
      confirmLabel: 'Approve',
      onConfirm: async () => {
        onUpdateStatus(reg.id, reg.type, 'approved');
      },
    });
  };

  // Handle reject
  const handleReject = (reg: RegistrationRecord) => {
    openDialog({
      title: 'Reject Registration',
      description: `Are you sure you want to reject ${reg.name}'s ${reg.type} registration?`,
      variant: 'danger',
      confirmLabel: 'Reject',
      onConfirm: async () => {
        onUpdateStatus(reg.id, reg.type, 'rejected');
      },
    });
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeSubTab) {
      case 'builders':
        return builders;
      case 'suppliers':
        return suppliers;
      case 'delivery':
        return deliveryProviders;
      default:
        return registrations;
    }
  };

  // Table columns
  const columns: Column<RegistrationRecord>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.type === 'builder' && <Building2 className="h-4 w-4 text-blue-400" />}
          {row.type === 'supplier' && <Store className="h-4 w-4 text-green-400" />}
          {row.type === 'delivery' && <Truck className="h-4 w-4 text-orange-400" />}
          <div>
            <p className="text-white font-medium">{row.name}</p>
            {row.company_name && row.company_name !== row.name && (
              <p className="text-xs text-gray-400">{row.company_name}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (v) => (
        <Badge
          className={
            v === 'builder'
              ? 'bg-blue-600'
              : v === 'supplier'
              ? 'bg-green-600'
              : 'bg-orange-600'
          }
        >
          {String(v).charAt(0).toUpperCase() + String(v).slice(1)}
        </Badge>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      render: (_, row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <Mail className="h-3 w-3 text-gray-500" />
            <span>{row.email}</span>
          </div>
          {row.phone && (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Phone className="h-3 w-3" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'county',
      label: 'Location',
      render: (_, row) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-gray-500" />
          <span>{row.county || 'Not specified'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => <StatusBadge status={v as string} />,
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (v) => new Date(v as string).toLocaleDateString(),
    },
  ];

  // Table actions
  const actions: RowAction<RegistrationRecord>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (row) => setDetailReg(row),
    },
    {
      label: 'Approve',
      icon: CheckCircle,
      onClick: handleApprove,
      show: (row) => row.status === 'pending',
    },
    {
      label: 'Reject',
      icon: XCircle,
      variant: 'danger',
      onClick: handleReject,
      show: (row) => row.status === 'pending',
    },
  ];

  return (
    <div className="space-y-6">
      {DialogComponent}

      <Dialog open={detailReg != null} onOpenChange={(open) => !open && setDetailReg(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-slate-700 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white">Registration details</DialogTitle>
            <DialogDescription className="text-slate-400">
              {detailReg?.name} · {detailReg?.type}
            </DialogDescription>
          </DialogHeader>
          {detailReg && (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-0.5">
                  <StatusBadge status={detailReg.status} />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="mt-0.5 text-white">{detailReg.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="mt-0.5 text-white">{detailReg.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Company</dt>
                <dd className="mt-0.5 text-white">{detailReg.company_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">County</dt>
                <dd className="mt-0.5 text-white">{detailReg.county || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Submitted</dt>
                <dd className="mt-0.5 text-white">
                  {new Date(detailReg.created_at).toLocaleString()}
                </dd>
              </div>
              {detailReg.type === 'builder' && (
                <div>
                  <dt className="text-slate-500">Builder category</dt>
                  <dd className="mt-0.5 text-white">{detailReg.builder_category || '—'}</dd>
                </div>
              )}
              {detailReg.type === 'supplier' && (
                <div>
                  <dt className="text-slate-500">Material categories</dt>
                  <dd className="mt-0.5 text-white">{formatList(detailReg.material_categories)}</dd>
                </div>
              )}
              {detailReg.type === 'delivery' && (
                <>
                  <div>
                    <dt className="text-slate-500">Vehicle type</dt>
                    <dd className="mt-0.5 text-white">{detailReg.vehicle_type || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Service areas</dt>
                    <dd className="mt-0.5 text-white">{formatList(detailReg.service_areas)}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-slate-500">Record ID</dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-300 break-all">{detailReg.id}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Overview */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Registrations"
          value={stats.total}
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          iconColor="text-yellow-500"
        />
        <StatsCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          iconColor="text-green-500"
        />
        <StatsCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          iconColor="text-red-500"
        />
      </StatsGrid>

      {/* Registration Type Breakdown */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card
          className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => setActiveSubTab('builders')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Builders</p>
                  <p className="text-xs text-gray-400">
                    {builders.filter((b) => b.status === 'pending').length} pending
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-400">{stats.builders}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-green-500/50 transition-colors"
          onClick={() => setActiveSubTab('suppliers')}
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
                    {suppliers.filter((s) => s.status === 'pending').length} pending
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.suppliers}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-slate-900/50 border-slate-800 cursor-pointer hover:border-orange-500/50 transition-colors"
          onClick={() => setActiveSubTab('delivery')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-600/20 rounded-lg">
                  <Truck className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Delivery Providers</p>
                  <p className="text-xs text-gray-400">
                    {deliveryProviders.filter((d) => d.status === 'pending').length} pending
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-orange-400">{stats.delivery}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registrations Table with Sub-tabs */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Registration Management
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                Review and manage all registration applications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="bg-slate-800 border border-slate-700 mb-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
                All ({registrations.length})
              </TabsTrigger>
              <TabsTrigger value="builders" className="data-[state=active]:bg-blue-600">
                <Building2 className="h-4 w-4 mr-1" />
                Builders ({builders.length})
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="data-[state=active]:bg-green-600">
                <Store className="h-4 w-4 mr-1" />
                Suppliers ({suppliers.length})
              </TabsTrigger>
              <TabsTrigger value="delivery" className="data-[state=active]:bg-orange-600">
                <Truck className="h-4 w-4 mr-1" />
                Delivery ({deliveryProviders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeSubTab} className="mt-0">
              <DataTable
                data={getCurrentData()}
                columns={columns}
                actions={actions}
                loading={loading}
                searchPlaceholder="Search registrations..."
                emptyState={{
                  icon: Users,
                  title: 'No Registrations',
                  description: 'No registration applications found',
                }}
                onRefresh={onRefresh}
                pageSize={10}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};


