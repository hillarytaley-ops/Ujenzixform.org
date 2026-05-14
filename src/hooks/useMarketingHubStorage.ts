import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ujenzixform_marketing_hub_v1';

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

export type MarketingLead = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source: string;
  stage: LeadStage;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignChannel = 'sms' | 'email' | 'social' | 'events' | 'field' | 'other';
export type CampaignStatus = 'planned' | 'active' | 'paused' | 'completed';

export type MarketingCampaign = {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  startDate: string;
  endDate?: string;
  budgetKes?: number;
  targetAudience?: string;
  utmCampaign?: string;
  notes?: string;
  createdAt: string;
};

export type ReportMarkStatus = 'draft' | 'submitted' | 'reviewed' | 'needs_revision';

export type MarketingReport = {
  id: string;
  authorEmail: string;
  authorName: string;
  weekEnding: string;
  title: string;
  summary: string;
  activities: string;
  leadsGenerated: number;
  meetingsHeld: number;
  outreachCount: number;
  status: ReportMarkStatus;
  reviewerEmail?: string;
  reviewerNotes?: string;
  score?: number;
  markedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketingHubData = {
  leads: MarketingLead[];
  campaigns: MarketingCampaign[];
  reports: MarketingReport[];
};

const EMPTY: MarketingHubData = { leads: [], campaigns: [], reports: [] };

function readStorage(): MarketingHubData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<MarketingHubData>;
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeStorage(data: MarketingHubData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return crypto.randomUUID();
}

export function useMarketingHubStorage() {
  const [data, setData] = useState<MarketingHubData>(EMPTY);

  useEffect(() => {
    setData(readStorage());
  }, []);

  const persist = useCallback((next: MarketingHubData) => {
    setData(next);
    writeStorage(next);
  }, []);

  const addLead = useCallback(
    (lead: Omit<MarketingLead, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const entry: MarketingLead = { ...lead, id: uid(), createdAt: now, updatedAt: now };
      persist({ ...data, leads: [entry, ...data.leads] });
      return entry;
    },
    [data, persist],
  );

  const updateLead = useCallback(
    (id: string, patch: Partial<MarketingLead>) => {
      const leads = data.leads.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l,
      );
      persist({ ...data, leads });
    },
    [data, persist],
  );

  const deleteLead = useCallback(
    (id: string) => {
      persist({ ...data, leads: data.leads.filter((l) => l.id !== id) });
    },
    [data, persist],
  );

  const addCampaign = useCallback(
    (campaign: Omit<MarketingCampaign, 'id' | 'createdAt'>) => {
      const entry: MarketingCampaign = { ...campaign, id: uid(), createdAt: new Date().toISOString() };
      persist({ ...data, campaigns: [entry, ...data.campaigns] });
      return entry;
    },
    [data, persist],
  );

  const updateCampaign = useCallback(
    (id: string, patch: Partial<MarketingCampaign>) => {
      const campaigns = data.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c));
      persist({ ...data, campaigns });
    },
    [data, persist],
  );

  const deleteCampaign = useCallback(
    (id: string) => {
      persist({ ...data, campaigns: data.campaigns.filter((c) => c.id !== id) });
    },
    [data, persist],
  );

  const addReport = useCallback(
    (report: Omit<MarketingReport, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const entry: MarketingReport = { ...report, id: uid(), createdAt: now, updatedAt: now };
      persist({ ...data, reports: [entry, ...data.reports] });
      return entry;
    },
    [data, persist],
  );

  const updateReport = useCallback(
    (id: string, patch: Partial<MarketingReport>) => {
      const reports = data.reports.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
      );
      persist({ ...data, reports });
    },
    [data, persist],
  );

  const deleteReport = useCallback(
    (id: string) => {
      persist({ ...data, reports: data.reports.filter((r) => r.id !== id) });
    },
    [data, persist],
  );

  const exportJson = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importJson = useCallback(
    (json: string) => {
      const parsed = JSON.parse(json) as Partial<MarketingHubData>;
      const next: MarketingHubData = {
        leads: Array.isArray(parsed.leads) ? parsed.leads : [],
        campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      };
      persist(next);
    },
    [persist],
  );

  return {
    data,
    addLead,
    updateLead,
    deleteLead,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addReport,
    updateReport,
    deleteReport,
    exportJson,
    importJson,
  };
}
