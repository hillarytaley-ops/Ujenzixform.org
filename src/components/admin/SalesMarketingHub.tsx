import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Megaphone,
  Target,
  Users,
  TrendingUp,
  ClipboardCheck,
  Link2,
  Briefcase,
  Plus,
  Download,
  Upload,
  ExternalLink,
  Star,
  CheckCircle,
  AlertCircle,
  Copy,
  Trash2,
  Pencil,
  Send,
  BarChart3,
  MessageSquare,
  QrCode,
} from 'lucide-react';
import { useHomePagePublicStats } from '@/hooks/useHomePagePublicStats';
import {
  useMarketingHubStorage,
  type CampaignChannel,
  type CampaignStatus,
  type LeadStage,
  type MarketingReport,
  type ReportMarkStatus,
} from '@/hooks/useMarketingHubStorage';
import { JobPositionsManager } from '@/components/admin/JobPositionsManager';
import { useToast } from '@/hooks/use-toast';

const SUB_TABS = [
  { value: 'overview', label: 'Overview', icon: BarChart3 },
  { value: 'leads', label: 'Leads', icon: Users },
  { value: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { value: 'report-marking', label: 'Report Marking', icon: ClipboardCheck },
  { value: 'assets', label: 'Links & Assets', icon: Link2 },
  { value: 'careers', label: 'Job Posts', icon: Briefcase },
] as const;

type SubTab = (typeof SUB_TABS)[number]['value'];

const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const REPORT_STATUS_LABEL: Record<ReportMarkStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  needs_revision: 'Needs revision',
};

const REPORT_STATUS_CLASS: Record<ReportMarkStatus, string> = {
  draft: 'bg-slate-700 text-slate-200',
  submitted: 'bg-amber-600/80 text-white',
  reviewed: 'bg-green-600/80 text-white',
  needs_revision: 'bg-red-600/80 text-white',
};

const PUBLIC_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Builder registration', path: '/builder-registration' },
  { label: 'Supplier registration', path: '/supplier-registration' },
  { label: 'Delivery registration', path: '/delivery-registration' },
  { label: 'Careers', path: '/careers' },
  { label: 'Contact / feedback', path: '/contact' },
];

interface SalesMarketingHubProps {
  staffEmail?: string | null;
  staffName?: string | null;
  staffRole?: string | null;
  pendingRegistrations?: number;
  onNavigateTab: (tab: string) => void;
}

function canMarkReports(role?: string | null): boolean {
  return ['super_admin', 'admin', 'marketing_officer'].includes(role ?? '');
}

export const SalesMarketingHub: React.FC<SalesMarketingHubProps> = ({
  staffEmail,
  staffName,
  staffRole,
  pendingRegistrations = 0,
  onNavigateTab,
}) => {
  const { toast } = useToast();
  const publicStats = useHomePagePublicStats();
  const hub = useMarketingHubStorage();
  const [searchParams, setSearchParams] = useSearchParams();
  const smParam = searchParams.get('sm') as SubTab | null;
  const [subTab, setSubTab] = useState<SubTab>(
    SUB_TABS.some((t) => t.value === smParam) ? (smParam as SubTab) : 'overview',
  );

  useEffect(() => {
    if (smParam && SUB_TABS.some((t) => t.value === smParam)) {
      setSubTab(smParam as SubTab);
    }
  }, [smParam]);

  const handleSubTabChange = (value: string) => {
    const next = value as SubTab;
    setSubTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'sales-marketing');
    params.set('sm', next);
    setSearchParams(params, { replace: true });
  };

  const pendingReports = hub.data.reports.filter((r) => r.status === 'submitted').length;
  const activeCampaigns = hub.data.campaigns.filter((c) => c.status === 'active').length;

  const overviewCards = useMemo(
    () => [
      {
        label: 'Registered network',
        value: publicStats.registeredNetwork,
        sub: 'Live platform users',
        icon: Users,
        color: 'text-blue-400',
      },
      {
        label: 'QR scan events',
        value: publicStats.qrScanEventsTotal,
        sub: 'Field / QR engagement',
        icon: QrCode,
        color: 'text-cyan-400',
      },
      {
        label: 'Active campaigns',
        value: activeCampaigns,
        sub: `${hub.data.campaigns.length} total`,
        icon: Megaphone,
        color: 'text-rose-400',
      },
      {
        label: 'Pipeline leads',
        value: hub.data.leads.length,
        sub: `${hub.data.leads.filter((l) => l.stage === 'won').length} won`,
        icon: Target,
        color: 'text-green-400',
      },
      {
        label: 'Reports to mark',
        value: pendingReports,
        sub: `${hub.data.reports.length} total reports`,
        icon: ClipboardCheck,
        color: 'text-amber-400',
      },
      {
        label: 'Pending registrations',
        value: pendingRegistrations,
        sub: 'Warm inbound leads',
        icon: TrendingUp,
        color: 'text-purple-400',
      },
    ],
    [publicStats, activeCampaigns, hub.data, pendingReports, pendingRegistrations],
  );

  const copyLink = (path: string) => {
    const url = `${window.location.origin}${path}`;
    void navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: url });
  };

  const handleExport = () => {
    const blob = new Blob([hub.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-hub-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        hub.importJson(text);
        toast({ title: 'Import complete', description: 'Marketing hub data restored.' });
      } catch {
        toast({ title: 'Import failed', description: 'Invalid JSON file.', variant: 'destructive' });
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-rose-400" />
            Sales &amp; Marketing
          </CardTitle>
          <CardDescription className="text-gray-400">
            Leads, campaigns, weekly report marking, and go-to-market assets for the UjenziXform team.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="border-slate-700" onClick={() => onNavigateTab('analytics')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Platform analytics
          </Button>
          <Button size="sm" variant="outline" className="border-slate-700" onClick={() => onNavigateTab('registrations')}>
            <Users className="h-4 w-4 mr-2" />
            Registrations
            {pendingRegistrations > 0 && (
              <Badge className="ml-2 bg-amber-600">{pendingRegistrations}</Badge>
            )}
          </Button>
          <Button size="sm" variant="outline" className="border-slate-700" onClick={() => onNavigateTab('feedback')}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </Button>
          <Button size="sm" variant="outline" className="border-slate-700" onClick={() => onNavigateTab('sms-test')}>
            <Send className="h-4 w-4 mr-2" />
            SMS test
          </Button>
          <Button size="sm" variant="outline" className="border-slate-700" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export data
          </Button>
          <Button size="sm" variant="outline" className="border-slate-700" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import data
          </Button>
        </CardContent>
      </Card>

      <Tabs value={subTab} onValueChange={handleSubTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-900/80 border border-slate-800 p-1">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-rose-600 data-[state=active]:text-white"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {t.label}
                {t.value === 'report-marking' && pendingReports > 0 && (
                  <Badge className="ml-1.5 bg-amber-500 text-xs px-1.5">{pendingReports}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {overviewCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-400">{card.label}</p>
                        <p className="text-2xl font-semibold text-white mt-1">
                          {publicStats.loading && card.label === 'Registered network' ? '…' : card.value}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                      </div>
                      <Icon className={`h-8 w-8 ${card.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Marketer workflow</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { step: '1', title: 'Capture leads', desc: 'Log prospects from events, calls, and referrals.', tab: 'leads' as SubTab },
                { step: '2', title: 'Run campaigns', desc: 'Track SMS, social, and field campaigns with UTMs.', tab: 'campaigns' as SubTab },
                { step: '3', title: 'Submit weekly report', desc: 'Document outreach, meetings, and outcomes.', tab: 'report-marking' as SubTab },
                { step: '4', title: 'Get marked', desc: 'Supervisor reviews, scores, and approves reports.', tab: 'report-marking' as SubTab },
              ].map((item) => (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => handleSubTabChange(item.tab)}
                  className="text-left rounded-lg border border-slate-800 bg-slate-950/50 p-4 hover:border-rose-600/50 transition-colors"
                >
                  <span className="text-rose-400 text-xs font-medium">Step {item.step}</span>
                  <p className="text-white font-medium mt-1">{item.title}</p>
                  <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <LeadsPanel hub={hub} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <CampaignsPanel hub={hub} />
        </TabsContent>

        <TabsContent value="report-marking" className="mt-4">
          <ReportMarkingPanel
            hub={hub}
            staffEmail={staffEmail}
            staffName={staffName}
            canMark={canMarkReports(staffRole)}
          />
        </TabsContent>

        <TabsContent value="assets" className="mt-4 space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Public registration links</CardTitle>
              <CardDescription>Copy shareable URLs for campaigns and field marketing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {PUBLIC_LINKS.map((link) => (
                <div
                  key={link.path}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 px-3 py-2"
                >
                  <div>
                    <p className="text-white text-sm">{link.label}</p>
                    <p className="text-gray-500 text-xs font-mono">{link.path}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copyLink(link.path)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={link.path} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <UtmBuilder onCopy={copyLink} />
        </TabsContent>

        <TabsContent value="careers" className="mt-4">
          <JobPositionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Leads ---

function LeadsPanel({ hub }: { hub: ReturnType<typeof useMarketingHubStorage> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: 'Field', stage: 'new' as LeadStage, notes: '' });

  const submit = () => {
    if (!form.name.trim()) return;
    hub.addLead({
      name: form.name.trim(),
      company: form.company || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      source: form.source,
      stage: form.stage,
      notes: form.notes || undefined,
    });
    setForm({ name: '', company: '', email: '', phone: '', source: 'Field', stage: 'new', notes: '' });
    setOpen(false);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Lead pipeline</CardTitle>
          <CardDescription>Track prospects outside the registrations queue.</CardDescription>
        </div>
        <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add lead
        </Button>
      </CardHeader>
      <CardContent>
        {hub.data.leads.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No leads yet. Add your first prospect.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Source</TableHead>
                <TableHead className="text-gray-400">Stage</TableHead>
                <TableHead className="text-gray-400">Contact</TableHead>
                <TableHead className="text-gray-400 w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hub.data.leads.map((lead) => (
                <TableRow key={lead.id} className="border-slate-800">
                  <TableCell className="text-white">
                    <div>{lead.name}</div>
                    {lead.company && <div className="text-xs text-gray-500">{lead.company}</div>}
                  </TableCell>
                  <TableCell className="text-gray-300">{lead.source}</TableCell>
                  <TableCell>
                    <Select value={lead.stage} onValueChange={(v) => hub.updateLead(lead.id, { stage: v as LeadStage })}>
                      <SelectTrigger className="h-8 w-32 bg-slate-950 border-slate-700 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {lead.email || lead.phone || '—'}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => hub.deleteLead(lead.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
            <DialogDescription className="text-gray-400">Add a prospect to the marketing pipeline.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
              <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-slate-950 border-slate-700" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={submit}>Save lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// --- Campaigns ---

function CampaignsPanel({ hub }: { hub: ReturnType<typeof useMarketingHubStorage> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    channel: 'social' as CampaignChannel,
    status: 'planned' as CampaignStatus,
    startDate: new Date().toISOString().slice(0, 10),
    budgetKes: '',
    targetAudience: '',
    utmCampaign: '',
    notes: '',
  });

  const submit = () => {
    if (!form.name.trim()) return;
    hub.addCampaign({
      name: form.name.trim(),
      channel: form.channel,
      status: form.status,
      startDate: form.startDate,
      budgetKes: form.budgetKes ? Number(form.budgetKes) : undefined,
      targetAudience: form.targetAudience || undefined,
      utmCampaign: form.utmCampaign || undefined,
      notes: form.notes || undefined,
    });
    setOpen(false);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Campaigns</CardTitle>
          <CardDescription>Plan and track outreach across channels.</CardDescription>
        </div>
        <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New campaign
        </Button>
      </CardHeader>
      <CardContent>
        {hub.data.campaigns.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No campaigns yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-gray-400">Campaign</TableHead>
                <TableHead className="text-gray-400">Channel</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Start</TableHead>
                <TableHead className="text-gray-400 w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hub.data.campaigns.map((c) => (
                <TableRow key={c.id} className="border-slate-800">
                  <TableCell className="text-white">
                    <div>{c.name}</div>
                    {c.utmCampaign && <div className="text-xs text-gray-500 font-mono">utm={c.utmCampaign}</div>}
                  </TableCell>
                  <TableCell className="text-gray-300 capitalize">{c.channel}</TableCell>
                  <TableCell>
                    <Select value={c.status} onValueChange={(v) => hub.updateCampaign(c.id, { status: v as CampaignStatus })}>
                      <SelectTrigger className="h-8 w-28 bg-slate-950 border-slate-700 text-xs capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['planned', 'active', 'paused', 'completed'] as CampaignStatus[]).map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">{c.startDate}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => hub.deleteCampaign(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as CampaignChannel })}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['sms', 'email', 'social', 'events', 'field', 'other'] as CampaignChannel[]).map((ch) => (
                      <SelectItem key={ch} value={ch} className="capitalize">{ch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CampaignStatus })}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['planned', 'active', 'paused', 'completed'] as CampaignStatus[]).map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
              <div><Label>Budget (KES)</Label><Input type="number" value={form.budgetKes} onChange={(e) => setForm({ ...form, budgetKes: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
            </div>
            <div><Label>UTM campaign</Label><Input value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })} placeholder="e.g. nairobi-builders-may" className="bg-slate-950 border-slate-700" /></div>
            <div><Label>Target audience</Label><Input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-slate-950 border-slate-700" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={submit}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// --- Report marking ---

function ReportMarkingPanel({
  hub,
  staffEmail,
  staffName,
  canMark,
}: {
  hub: ReturnType<typeof useMarketingHubStorage>;
  staffEmail?: string | null;
  staffName?: string | null;
  canMark: boolean;
}) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [selected, setSelected] = useState<MarketingReport | null>(null);
  const [markNotes, setMarkNotes] = useState('');
  const [markScore, setMarkScore] = useState('4');
  const [form, setForm] = useState({
    weekEnding: '',
    title: '',
    summary: '',
    activities: '',
    leadsGenerated: '0',
    meetingsHeld: '0',
    outreachCount: '0',
  });

  const resetForm = () =>
    setForm({ weekEnding: '', title: '', summary: '', activities: '', leadsGenerated: '0', meetingsHeld: '0', outreachCount: '0' });

  const saveDraft = () => {
    if (!form.title.trim() || !staffEmail) return;
    hub.addReport({
      authorEmail: staffEmail,
      authorName: staffName || staffEmail,
      weekEnding: form.weekEnding || new Date().toISOString().slice(0, 10),
      title: form.title.trim(),
      summary: form.summary,
      activities: form.activities,
      leadsGenerated: Number(form.leadsGenerated) || 0,
      meetingsHeld: Number(form.meetingsHeld) || 0,
      outreachCount: Number(form.outreachCount) || 0,
      status: 'draft',
    });
    resetForm();
    setCreateOpen(false);
    toast({ title: 'Draft saved' });
  };

  const submitReport = () => {
    if (!form.title.trim() || !staffEmail) return;
    hub.addReport({
      authorEmail: staffEmail,
      authorName: staffName || staffEmail,
      weekEnding: form.weekEnding || new Date().toISOString().slice(0, 10),
      title: form.title.trim(),
      summary: form.summary,
      activities: form.activities,
      leadsGenerated: Number(form.leadsGenerated) || 0,
      meetingsHeld: Number(form.meetingsHeld) || 0,
      outreachCount: Number(form.outreachCount) || 0,
      status: 'submitted',
    });
    resetForm();
    setCreateOpen(false);
    toast({ title: 'Report submitted', description: 'Awaiting supervisor marking.' });
  };

  const openMark = (report: MarketingReport) => {
    setSelected(report);
    setMarkNotes(report.reviewerNotes || '');
    setMarkScore(String(report.score ?? 4));
    setMarkOpen(true);
  };

  const applyMark = (status: ReportMarkStatus) => {
    if (!selected || !staffEmail) return;
    hub.updateReport(selected.id, {
      status,
      reviewerEmail: staffEmail,
      reviewerNotes: markNotes,
      score: Number(markScore),
      markedAt: new Date().toISOString(),
    });
    setMarkOpen(false);
    toast({ title: status === 'reviewed' ? 'Report marked as reviewed' : 'Sent back for revision' });
  };

  const submitExisting = (report: MarketingReport) => {
    hub.updateReport(report.id, { status: 'submitted' });
    toast({ title: 'Report submitted' });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-400" />
              Report marking
            </CardTitle>
            <CardDescription>
              Marketers submit weekly activity reports. Supervisors review, score (1–5), and mark approved or needs revision.
            </CardDescription>
          </div>
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New report
          </Button>
        </CardHeader>
        <CardContent>
          {hub.data.reports.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No reports yet. Create your first weekly report.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-gray-400">Week / title</TableHead>
                  <TableHead className="text-gray-400">Author</TableHead>
                  <TableHead className="text-gray-400">Metrics</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Score</TableHead>
                  <TableHead className="text-gray-400 w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {hub.data.reports.map((r) => (
                  <TableRow key={r.id} className="border-slate-800">
                    <TableCell className="text-white">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-gray-500">Week ending {r.weekEnding}</div>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">{r.authorName}</TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {r.leadsGenerated} leads · {r.meetingsHeld} meetings · {r.outreachCount} outreach
                    </TableCell>
                    <TableCell>
                      <Badge className={REPORT_STATUS_CLASS[r.status]}>{REPORT_STATUS_LABEL[r.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.score ? (
                        <span className="flex items-center gap-1 text-amber-400 text-sm">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {r.score}/5
                        </span>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === 'draft' && r.authorEmail === staffEmail && (
                          <Button size="sm" variant="outline" className="h-8 border-slate-700" onClick={() => submitExisting(r)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canMark && r.status === 'submitted' && (
                          <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700" onClick={() => openMark(r)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Mark
                          </Button>
                        )}
                        {canMark && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => hub.deleteReport(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!canMark && (
        <Card className="bg-slate-950/50 border-slate-800 border-dashed">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-gray-400">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Only administrators and marketing leads can mark submitted reports.
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Weekly marketing report</DialogTitle>
            <DialogDescription className="text-gray-400">Summarize outreach, events, and outcomes for the week.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Week ending</Label><Input type="date" value={form.weekEnding} onChange={(e) => setForm({ ...form, weekEnding: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
              <div><Label>Report title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Nairobi field week" className="bg-slate-950 border-slate-700" /></div>
            </div>
            <div><Label>Executive summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="bg-slate-950 border-slate-700" rows={2} /></div>
            <div><Label>Activities completed</Label><Textarea value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} placeholder="Site visits, calls, demos…" className="bg-slate-950 border-slate-700" rows={4} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Leads</Label><Input type="number" value={form.leadsGenerated} onChange={(e) => setForm({ ...form, leadsGenerated: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
              <div><Label>Meetings</Label><Input type="number" value={form.meetingsHeld} onChange={(e) => setForm({ ...form, meetingsHeld: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
              <div><Label>Outreach</Label><Input type="number" value={form.outreachCount} onChange={(e) => setForm({ ...form, outreachCount: e.target.value })} className="bg-slate-950 border-slate-700" /></div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-slate-700" onClick={saveDraft}>Save draft</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={submitReport}>
              <Send className="h-4 w-4 mr-1" />
              Submit for marking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark report</DialogTitle>
            {selected && (
              <DialogDescription className="text-gray-400">
                {selected.title} — {selected.authorName}
              </DialogDescription>
            )}
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md bg-slate-950 border border-slate-800 p-3 text-gray-300 whitespace-pre-wrap">{selected.summary || 'No summary.'}</div>
              <div className="rounded-md bg-slate-950 border border-slate-800 p-3 text-gray-400 whitespace-pre-wrap">{selected.activities || 'No activities listed.'}</div>
              <div>
                <Label>Score (1–5)</Label>
                <Select value={markScore} onValueChange={setMarkScore}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reviewer notes</Label>
                <Textarea value={markNotes} onChange={(e) => setMarkNotes(e.target.value)} className="bg-slate-950 border-slate-700" rows={3} placeholder="Feedback for the marketer…" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-red-800 text-red-300" onClick={() => applyMark('needs_revision')}>
              Needs revision
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => applyMark('reviewed')}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UtmBuilder({ onCopy }: { onCopy: (path: string) => void }) {
  const [base, setBase] = useState('/builder-registration');
  const [source, setSource] = useState('facebook');
  const [medium, setMedium] = useState('social');
  const [campaign, setCampaign] = useState('ujenzi-launch');

  const built = `${base}?utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}`;

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white text-base">UTM link builder</CardTitle>
        <CardDescription>Generate tracked links for digital campaigns.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Base path</Label>
            <Select value={base} onValueChange={setBase}>
              <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PUBLIC_LINKS.map((l) => (
                  <SelectItem key={l.path} value={l.path}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>utm_source</Label><Input value={source} onChange={(e) => setSource(e.target.value)} className="bg-slate-950 border-slate-700" /></div>
          <div><Label>utm_medium</Label><Input value={medium} onChange={(e) => setMedium(e.target.value)} className="bg-slate-950 border-slate-700" /></div>
          <div><Label>utm_campaign</Label><Input value={campaign} onChange={(e) => setCampaign(e.target.value)} className="bg-slate-950 border-slate-700" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-950 p-3">
          <code className="text-xs text-gray-300 break-all flex-1">{built}</code>
          <Button size="sm" variant="outline" className="border-slate-700 shrink-0" onClick={() => onCopy(built)}>
            <Copy className="h-4 w-4 mr-1" />
            Copy full URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

