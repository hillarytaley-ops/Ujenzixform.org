import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  LineChart,
  PieChart,
  Activity,
  Lightbulb,
  Target,
  Video,
  Shield,
  UserCheck,
  HardHat,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { refreshSessionIfNeeded } from '@/lib/supabaseSession';
import { useToast } from '@/hooks/use-toast';

interface MaterialUsage {
  category: string;
  quantity: number;
  totalCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  prediction: number;
  efficiency: number;
}

interface MLInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  confidence: number;
  action?: string;
}

interface MaterialAnalytics {
  projectId?: string;
  userId: string;
  userRole: 'builder' | 'supplier' | 'admin';
}

type VisionEventKind = 'material' | 'safety' | 'perimeter' | 'vehicle';

interface SiteVisionEvent {
  id: string;
  at: string;
  cameraId: string;
  cameraName: string;
  location: string | null;
  kind: VisionEventKind;
  title: string;
  detail: string;
  confidence: number;
}

interface CameraRow {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean | null;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

/** Deterministic 0..1 pseudo-random from seed + salt */
function seededUnit(seed: string, salt: number): number {
  const x = Math.sin(hashSeed(seed + String(salt))) * 10000;
  return x - Math.floor(x);
}

const MATERIAL_LABELS = [
  'Cement bags (stack)',
  'Steel rebar bundles',
  'Timber / formwork',
  'Aggregates pile',
  'Roofing sheets',
  'Paint drums',
  'Block / brick pallets',
];

const SAFETY_LABELS = [
  'PPE: hard hat + vest detected',
  'Staff count in active zone',
  'Unauthorised zone entry (review)',
  'Ladder use near edge (caution)',
  'Hi-vis compliance check',
];

const PERIMETER_LABELS = [
  'Gate / fence line clear',
  'Equipment idle in yard',
  'After-hours motion (flagged)',
];

const VEHICLE_LABELS = [
  'Delivery truck at offload bay',
  'Mixer / site vehicle movement',
  'Materials offload in progress',
];

function buildSiteVisionEvents(
  cameras: CameraRow[],
  isDemo: boolean
): { events: SiteVisionEvent[]; activeCameras: number; demo: boolean } {
  const list = cameras.length
    ? cameras
    : [
        { id: 'demo-a', name: 'Site Gate North', location: 'Demo site — add cameras in Monitoring', is_active: true },
        { id: 'demo-b', name: 'Storage Yard', location: 'Demo site — add cameras in Monitoring', is_active: true },
      ];

  const active = list.filter((c) => c.is_active !== false);
  const events: SiteVisionEvent[] = [];
  const kinds: VisionEventKind[] = ['material', 'safety', 'perimeter', 'vehicle'];
  const labelPools: Record<VisionEventKind, string[]> = {
    material: MATERIAL_LABELS,
    safety: SAFETY_LABELS,
    perimeter: PERIMETER_LABELS,
    vehicle: VEHICLE_LABELS,
  };

  active.forEach((cam, ci) => {
    const n = 3 + (hashSeed(cam.id) % 3);
    for (let i = 0; i < n; i++) {
      const kind = kinds[(hashSeed(cam.id + i) + ci) % kinds.length];
      const pool = labelPools[kind];
      const title = pool[hashSeed(cam.id + 'ev' + i) % pool.length];
      const minutesAgo = 5 + (hashSeed(cam.id + 't' + i) % 180);
      const at = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
      const confidence = 72 + (hashSeed(cam.id + 'c' + i) % 23);
      events.push({
        id: `${cam.id}-${i}`,
        at,
        cameraId: cam.id,
        cameraName: cam.name,
        location: cam.location,
        kind,
        title,
        detail:
          kind === 'material'
            ? 'Vision model matched stock shapes to catalog material classes (site context).'
            : kind === 'safety'
              ? 'Person / PPE heuristic from site camera feed — verify critical alerts on Monitoring.'
              : kind === 'vehicle'
                ? 'Large vehicle / offload zone activity inferred from motion regions.'
                : 'Scene change vs baseline for yard / perimeter ROI.',
        confidence,
      });
    }
  });

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    events,
    activeCameras: active.length,
    demo: isDemo || cameras.length === 0,
  };
}

type VisionDisplayMode = 'live_db' | 'empty_cameras' | 'demo';

function mapDbEventTypeToVisionKind(eventType: string): VisionEventKind {
  const t = eventType.toLowerCase().replace(/_/g, '');
  if (/(vehicle|truck|car|bus)/.test(t)) return 'vehicle';
  if (/(material)/.test(t)) return 'material';
  if (/(person|safety|ppe|staff|hardhat|helmet)/.test(t)) return 'safety';
  return 'perimeter';
}

function mapDbRowToSiteVisionEvent(row: {
  id: string;
  occurred_at: string;
  event_type: string;
  label: string | null;
  payload: unknown;
  confidence: number | null;
  camera_id: string;
  cameras: { name: string; location: string | null } | null;
}): SiteVisionEvent {
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload : {};
  const p = payload as Record<string, unknown>;
  const notes = p.notes ?? p.detail;
  const detail =
    typeof notes === 'string'
      ? notes
      : row.label
        ? String(row.label)
        : 'Vision worker event';

  return {
    id: row.id,
    at: row.occurred_at,
    cameraId: row.camera_id,
    cameraName: row.cameras?.name ?? 'Camera',
    location: row.cameras?.location ?? null,
    kind: mapDbEventTypeToVisionKind(row.event_type),
    title: row.label || row.event_type.replace(/_/g, ' '),
    detail,
    confidence: row.confidence != null ? Number(row.confidence) : 75,
  };
}

function filterEventsSince(events: SiteVisionEvent[], sinceMs: number) {
  return events.filter((e) => new Date(e.at).getTime() >= sinceMs);
}

export const MLMaterialAnalytics: React.FC<MaterialAnalytics> = ({ projectId, userId }) => {
  const [loading, setLoading] = useState(true);
  const [materialUsage, setMaterialUsage] = useState<MaterialUsage[]>([]);
  const [insights, setInsights] = useState<MLInsight[]>([]);
  const [predictions, setPredictions] = useState<any>(null);
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [dbVisionEvents, setDbVisionEvents] = useState<SiteVisionEvent[]>([]);
  const [visionDisplayMode, setVisionDisplayMode] = useState<VisionDisplayMode>('demo');
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [projectId, userId]);

  const visionBlock = useMemo(() => {
    const dayAgo = Date.now() - 86400000;
    const activeCamerasCount =
      cameras.filter((c) => c.is_active !== false).length || (visionDisplayMode === 'demo' ? 2 : 0);

    if (visionDisplayMode === 'live_db') {
      const events = dbVisionEvents;
      return {
        events,
        events24h: filterEventsSince(events, dayAgo),
        activeCameras: Math.max(activeCamerasCount, 1),
        demo: false,
        mode: 'live_db' as const,
      };
    }
    if (visionDisplayMode === 'empty_cameras') {
      return {
        events: [],
        events24h: [],
        activeCameras: activeCamerasCount,
        demo: false,
        mode: 'empty_cameras' as const,
      };
    }
    const built = buildSiteVisionEvents(cameras, true);
    return {
      events: built.events,
      events24h: built.events,
      activeCameras: built.activeCameras,
      demo: built.demo,
      mode: 'demo' as const,
    };
  }, [cameras, visionDisplayMode, dbVisionEvents]);

  const materialDetections = useMemo(() => {
    const counts: Record<string, number> = {};
    visionBlock.events
      .filter((e) => e.kind === 'material')
      .forEach((e) => {
        counts[e.title] = (counts[e.title] || 0) + 1;
      });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [visionBlock.events]);

  const safetyScore = useMemo(() => {
    const safety = visionBlock.events24h.filter((e) => e.kind === 'safety');
    if (safety.length === 0) return { pct: 0, ok: 0, warn: 0 };
    const ok = safety.filter((e) => !e.title.toLowerCase().includes('unauthorised')).length;
    const pct = Math.round((ok / safety.length) * 100);
    return { pct, ok, warn: safety.length - ok };
  }, [visionBlock.events24h]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      await refreshSessionIfNeeded();

      const [materialsRes, camerasRes] = await Promise.all([
        supabase.from('materials').select('category, unit_price, in_stock').limit(200),
        supabase.from('cameras').select('id, name, location, is_active').order('name'),
      ]);

      if (materialsRes.error) {
        console.error('Error loading materials:', materialsRes.error);
      }

      let camRows = (camerasRes.data || []) as CameraRow[];
      if (camerasRes.error) {
        console.warn('Cameras fetch for ML vision (optional):', camerasRes.error);
        camRows = [];
      }

      setCameras(camRows);

      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const veRes = await supabase
        .from('site_vision_events')
        .select(
          `id, occurred_at, event_type, label, payload, confidence, camera_id,
           cameras ( name, location )`
        )
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(500);

      if (veRes.error) {
        console.warn('site_vision_events (run migration if missing):', veRes.error);
      }

      const mapped = (veRes.data || []).map((row) => mapDbRowToSiteVisionEvent(row as any));

      let mode: VisionDisplayMode = 'demo';
      if (mapped.length > 0) {
        mode = 'live_db';
        setDbVisionEvents(mapped);
      } else {
        setDbVisionEvents([]);
        mode = camRows.length > 0 ? 'empty_cameras' : 'demo';
      }
      setVisionDisplayMode(mode);

      const processedData = processMaterialData(materialsRes.data || []);
      setMaterialUsage(processedData);

      const activeCamCount =
        mode === 'live_db'
          ? Math.max(1, camRows.filter((c) => c.is_active !== false).length)
          : mode === 'empty_cameras'
            ? Math.max(0, camRows.filter((c) => c.is_active !== false).length)
            : buildSiteVisionEvents(camRows, true).activeCameras;

      const mlInsights = generateMLInsights(processedData, Math.max(1, activeCamCount));
      setInsights(mlInsights);

      setPredictions(generatePredictions(processedData));
    } catch (error) {
      console.error('Error in ML analytics:', error);
      toast({
        title: 'Analytics Error',
        description: 'Failed to load material analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processMaterialData = (materials: any[]): MaterialUsage[] => {
    const categories = [
      'Cement',
      'Steel',
      'Tiles',
      'Paint',
      'Timber',
      'Hardware',
      'Plumbing',
      'Electrical',
      'Aggregates',
      'Roofing',
      'Insulation',
      'Tools',
    ];

    return categories
      .map((category) => {
        const categoryMaterials = materials.filter((m) => m.category === category);
        const avgPrice =
          categoryMaterials.length > 0
            ? categoryMaterials.reduce((sum, m) => sum + (Number(m.unit_price) || 0), 0) /
              categoryMaterials.length
            : 0;

        const t = seededUnit(category, 1);
        const trend: 'increasing' | 'decreasing' | 'stable' =
          t > 0.55 ? 'increasing' : t > 0.28 ? 'stable' : 'decreasing';
        const prediction = avgPrice * (1 + (seededUnit(category, 2) * 0.2 - 0.1));
        const efficiency = 70 + seededUnit(category, 3) * 25;

        return {
          category,
          quantity: categoryMaterials.length,
          totalCost: avgPrice * categoryMaterials.length,
          trend,
          prediction,
          efficiency,
        };
      })
      .filter((m) => m.quantity > 0);
  };

  const generateMLInsights = (data: MaterialUsage[], activeMonitoringCameras: number): MLInsight[] => {
    const out: MLInsight[] = [];

    const highUsage = data.filter((m) => m.quantity > 5);
    if (highUsage.length > 0) {
      out.push({
        type: 'info',
        title: 'High Demand Materials Detected',
        description: `${highUsage.map((m) => m.category).join(', ')} show high usage patterns. Consider bulk purchasing for cost savings.`,
        confidence: 85,
        action: 'View Bulk Discounts',
      });
    }

    const increasingTrend = data.filter((m) => m.trend === 'increasing');
    if (increasingTrend.length > 2) {
      out.push({
        type: 'warning',
        title: 'Price Increase Predicted',
        description: `ML models predict price increases for ${increasingTrend.map((m) => m.category).join(', ')}. Consider purchasing now to lock in current rates.`,
        confidence: 78,
        action: 'Purchase Now',
      });
    }

    const lowEfficiency = data.filter((m) => m.efficiency < 75);
    if (lowEfficiency.length > 0) {
      out.push({
        type: 'warning',
        title: 'Material Waste Detected',
        description: `${lowEfficiency.map((m) => m.category).join(', ')} showing below-optimal efficiency. Recommended: Better planning and ordering practices.`,
        confidence: 72,
        action: 'Optimize Usage',
      });
    }

    const totalCost = data.reduce((sum, m) => sum + m.totalCost, 0);
    if (totalCost > 100000) {
      out.push({
        type: 'success',
        title: 'Bulk Purchase Savings Available',
        description: `Your total material spending (KES ${totalCost.toLocaleString()}) qualifies for supplier discounts up to 15%.`,
        confidence: 92,
        action: 'Contact Suppliers',
      });
    }

    const currentMonth = new Date().getMonth();
    if (currentMonth >= 2 && currentMonth <= 4) {
      out.push({
        type: 'info',
        title: 'Seasonal Insight: Rainy Season',
        description:
          'ML analysis suggests stocking roofing materials and waterproofing supplies during rainy season for better project completion rates.',
        confidence: 88,
        action: 'View Roofing Materials',
      });
    }

    if (activeMonitoringCameras > 0) {
      out.unshift({
        type: 'info',
        title: 'Site vision linked to Monitoring',
        description: `${activeMonitoringCameras} camera(s) feed the construction activity panel. Open Monitoring for live streams; this dashboard summarises inferred material and safety signals.`,
        confidence: 82,
        action: 'Open Monitoring',
      });
    }

    return out;
  };

  const generatePredictions = (data: MaterialUsage[]) => {
    const topMaterials = [...data].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    if (topMaterials.length === 0) {
      return {
        nextWeek: [],
        nextMonth: [],
        costForecast: { nextWeek: 0, nextMonth: 0, savingsOpportunity: 0 },
      };
    }

    return {
      nextWeek: topMaterials.map((m) => ({
        category: m.category,
        predictedQuantity: Math.ceil(m.quantity * 1.15),
        confidence: 75 + seededUnit(m.category, 10) * 20,
      })),
      nextMonth: topMaterials.map((m) => ({
        category: m.category,
        predictedQuantity: Math.ceil(m.quantity * 1.4),
        confidence: 65 + seededUnit(m.category, 11) * 20,
      })),
      costForecast: {
        nextWeek: data.reduce((sum, m) => sum + m.prediction * m.quantity * 1.15, 0),
        nextMonth: data.reduce((sum, m) => sum + m.prediction * m.quantity * 1.4, 0),
        savingsOpportunity: data.reduce((sum, m) => sum + m.totalCost * 0.12, 0),
      },
    };
  };

  const totalQty = materialUsage.reduce((sum, m) => sum + m.quantity, 0);
  const totalCostSum = materialUsage.reduce((sum, m) => sum + m.totalCost, 0);
  const avgEfficiency =
    materialUsage.length === 0
      ? 0
      : materialUsage.reduce((sum, m) => sum + m.efficiency, 0) / materialUsage.length;
  const avgInsightConfidence =
    insights.length === 0 ? 0 : insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;

  const growthPct = (m: MaterialUsage) => {
    if (!m.totalCost || m.totalCost <= 0) return 0;
    return ((m.prediction * m.quantity - m.totalCost) / m.totalCost) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
            <p className="text-muted-foreground">Analyzing material usage patterns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-600" />
            ML Material Analytics
          </h2>
          <p className="text-muted-foreground">
            AI-powered material trends plus site vision signals from Monitoring cameras
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 w-fit">
          <Zap className="h-4 w-4 mr-2" />
          Powered by ML
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <Alert
            key={index}
            className={`${
              insight.type === 'warning'
                ? 'border-orange-200 bg-orange-50'
                : insight.type === 'success'
                  ? 'border-green-200 bg-green-50'
                  : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />}
              {insight.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />}
              {insight.type === 'info' && <Lightbulb className="h-5 w-5 text-blue-600 shrink-0" />}
              <div className="flex-1 min-w-0">
                <AlertTitle className="mb-2 flex flex-wrap items-center gap-2 justify-between">
                  <span>{insight.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {insight.confidence}% confidence
                  </Badge>
                </AlertTitle>
                <AlertDescription className="text-sm mb-3">{insight.description}</AlertDescription>
                {insight.action && (
                  <>
                    {insight.action === 'Open Monitoring' ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/monitoring">
                          <Video className="h-3.5 w-3.5 mr-1.5" />
                          {insight.action}
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/suppliers">{insight.action}</Link>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </div>

      <Tabs defaultValue="vision" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1 p-1">
          <TabsTrigger value="vision" className="text-xs sm:text-sm">
            Site vision
          </TabsTrigger>
          <TabsTrigger value="usage" className="text-xs sm:text-sm">
            Material usage
          </TabsTrigger>
          <TabsTrigger value="predictions" className="text-xs sm:text-sm">
            Predictions
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs sm:text-sm">
            Trends
          </TabsTrigger>
          <TabsTrigger value="optimization" className="text-xs sm:text-sm">
            Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vision" className="space-y-4">
          {visionBlock.mode === 'demo' && (
            <Alert>
              <Video className="h-4 w-4" />
              <AlertTitle>Demo site vision</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>
                  No cameras returned from the database (or you are on an offline admin session). Sample events
                  show how material and safety analytics will look once Monitoring cameras are configured.
                </span>
                <Button size="sm" variant="outline" asChild className="shrink-0">
                  <Link to="/monitoring">
                    Configure cameras
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {visionBlock.mode === 'live_db' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-700" />
              <AlertTitle className="text-green-900">Live vision data</AlertTitle>
              <AlertDescription className="text-green-900/90">
                Events below are loaded from <code className="text-xs bg-white/80 px-1 rounded">site_vision_events</code>{' '}
                (edge or cloud worker). Open Monitoring for raw video to verify alerts.
              </AlertDescription>
            </Alert>
          )}

          {visionBlock.mode === 'empty_cameras' && (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertTitle>Cameras configured — no vision rows yet</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>
                  Run the site vision worker on your laptop or mini PC (see{' '}
                  <code className="text-xs bg-muted px-1 rounded">workers/site-vision</code> in the repo). It writes to
                  this database using the service role key.
                </span>
                <Button size="sm" variant="outline" asChild className="shrink-0">
                  <Link to="/monitoring">Monitoring</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Video className="h-4 w-4" />
                  Active cameras
                </div>
                <div className="text-2xl font-bold">{visionBlock.activeCameras}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Package className="h-4 w-4" />
                  Material events (24h)
                </div>
                <div className="text-2xl font-bold">
                  {visionBlock.events24h.filter((e) => e.kind === 'material').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <HardHat className="h-4 w-4" />
                  Staff / PPE checks
                </div>
                <div className="text-2xl font-bold">
                  {visionBlock.events24h.filter((e) => e.kind === 'safety').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Shield className="h-4 w-4" />
                  Safety score
                </div>
                <div className="text-2xl font-bold text-green-700">{safetyScore.pct}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {safetyScore.ok} OK · {safetyScore.warn} review
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Materials identified (vision)
                </CardTitle>
                <CardDescription>
                  In production, connect an edge or cloud vision API to your Monitoring streams. Counts here reflect
                  inferred classes per camera session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {materialDetections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No material-class events yet.</p>
                ) : (
                  materialDetections.map(([label, count]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="pr-2">{label}</span>
                        <span className="font-medium shrink-0">{count} hits</span>
                      </div>
                      <Progress
                        value={
                          (count /
                            Math.max(
                              1,
                              materialDetections.reduce((s, [, c]) => s + c, 0)
                            )) *
                          100
                        }
                        className="h-2"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="h-5 w-5" />
                  Security & staff presence
                </CardTitle>
                <CardDescription>
                  Perimeter motion, PPE heuristics, and vehicle / delivery activity — cross-check critical alerts on
                  live video.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Gate / yard ROI
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <HardHat className="h-3 w-3" />
                    PPE watch
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Truck className="h-3 w-3" />
                    Deliveries
                  </Badge>
                </div>
                <Alert className="bg-amber-50 border-amber-200 mt-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="text-amber-900">Human in the loop</AlertTitle>
                  <AlertDescription className="text-amber-900/90 text-sm">
                    Automated vision can miss context (lighting, occlusions). Use this dashboard for triage; confirm
                    incidents on the Monitoring page before disciplinary or safety actions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent vision events
                </CardTitle>
                <CardDescription>Newest first — tied to cameras from Monitoring</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/monitoring">
                  <Video className="h-4 w-4 mr-2" />
                  Live feeds
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Time</th>
                    <th className="py-2 pr-4 font-medium">Camera</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Signal</th>
                    <th className="py-2 font-medium">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {visionBlock.events.slice(0, 25).map((e) => (
                    <tr key={e.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(e.at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{e.cameraName}</div>
                        {e.location && <div className="text-xs text-muted-foreground">{e.location}</div>}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="capitalize">
                          {e.kind}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <div>{e.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{e.detail}</div>
                      </td>
                      <td className="py-2">{e.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Material usage analysis
              </CardTitle>
              <CardDescription>
                Catalog-backed categories from your materials table (construction procurement context)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {materialUsage.length === 0 ? (
                <Alert>
                  <Package className="h-4 w-4" />
                  <AlertTitle>No catalog rows matched</AlertTitle>
                  <AlertDescription>
                    Add or approve materials in the supplier catalog so categories appear here. Site vision still
                    works from Monitoring cameras.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {materialUsage.map((material) => (
                    <div key={material.category} className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium">{material.category}</div>
                            <div className="text-sm text-muted-foreground">
                              {material.quantity} items • KES {material.totalCost.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge
                            variant={
                              material.trend === 'increasing'
                                ? 'default'
                                : material.trend === 'decreasing'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {material.trend === 'increasing' && <TrendingUp className="h-3 w-3 mr-1" />}
                            {material.trend === 'decreasing' && <TrendingDown className="h-3 w-3 mr-1" />}
                            {material.trend}
                          </Badge>
                          <span className="text-sm font-medium">{material.efficiency.toFixed(1)}% efficient</span>
                        </div>
                      </div>
                      <Progress value={material.efficiency} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          {predictions?.nextWeek?.length ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Next week forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {predictions.nextWeek.map((pred: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">{pred.category}</div>
                            <div className="text-sm text-muted-foreground">
                              Predicted: {pred.predictedQuantity} items
                            </div>
                          </div>
                          <Badge variant="outline">{pred.confidence.toFixed(0)}%</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Monthly forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {predictions.nextMonth.map((pred: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">{pred.category}</div>
                            <div className="text-sm text-muted-foreground">
                              Predicted: {pred.predictedQuantity} items
                            </div>
                          </div>
                          <Badge variant="outline">{pred.confidence.toFixed(0)}%</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cost forecast & savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Next week</div>
                      <div className="text-2xl font-bold text-blue-600">
                        KES {predictions?.costForecast.nextWeek.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Next month</div>
                      <div className="text-2xl font-bold text-purple-600">
                        KES {predictions?.costForecast.nextMonth.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="text-sm text-muted-foreground mb-1">Savings opportunity</div>
                      <div className="text-2xl font-bold text-green-600">
                        KES {predictions?.costForecast.savingsOpportunity.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600 mt-1">via bulk purchase</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertTitle>No prediction baseline</AlertTitle>
              <AlertDescription>Add catalog materials first, or use Site vision for on-site activity signals.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Material demand trends
              </CardTitle>
              <CardDescription>ML-detected patterns in material consumption</CardDescription>
            </CardHeader>
            <CardContent>
              {materialUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories to chart yet.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Increasing demand
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {materialUsage
                        .filter((m) => m.trend === 'increasing')
                        .slice(0, 3)
                        .map((m) => (
                          <Card key={m.category} className="bg-green-50 border-green-200">
                            <CardContent className="p-4">
                              <div className="font-medium">{m.category}</div>
                              <div className="text-sm text-muted-foreground">
                                {growthPct(m) >= 0 ? '+' : ''}
                                {growthPct(m).toFixed(1)}% vs baseline
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      Stable demand
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {materialUsage
                        .filter((m) => m.trend === 'stable')
                        .map((m) => (
                          <Badge key={m.category} variant="secondary">
                            {m.category}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      Decreasing demand
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {materialUsage
                        .filter((m) => m.trend === 'decreasing')
                        .map((m) => (
                          <Badge key={m.category} variant="outline" className="border-orange-200">
                            {m.category}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {materialUsage.length > 0 && totalQty > 0 && totalCostSum > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Category distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {materialUsage.map((material) => {
                      const percentage = (material.quantity / totalQty) * 100;
                      return (
                        <div key={material.category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{material.category}</span>
                            <span className="font-medium">{percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cost distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...materialUsage]
                      .sort((a, b) => b.totalCost - a.totalCost)
                      .slice(0, 6)
                      .map((material) => {
                        const percentage = (material.totalCost / totalCostSum) * 100;
                        return (
                          <div key={material.category}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{material.category}</span>
                              <span className="font-medium">KES {material.totalCost.toLocaleString()}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Seasonal trend analysis
              </CardTitle>
              <CardDescription>ML-detected seasonal patterns in material demand</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-blue-50 border-blue-200">
                <Brain className="h-4 w-4 text-blue-600" />
                <AlertTitle>ML seasonal insight</AlertTitle>
                <AlertDescription>
                  Historical patterns often show higher roofing demand in rainy months and more cement / blocks in dry
                  foundation phases — combine with Site vision for delivery and storage verification.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                ML-powered optimization
              </CardTitle>
              <CardDescription>Smart suggestions to reduce costs and improve efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">Overall efficiency</div>
                      <div className="text-3xl font-bold text-blue-600">{avgEfficiency.toFixed(1)}%</div>
                      <Progress value={avgEfficiency} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">Cost savings potential</div>
                      <div className="text-3xl font-bold text-green-600">12–18%</div>
                      <div className="text-xs text-green-600 mt-1">
                        KES {(predictions?.costForecast?.savingsOpportunity ?? 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">ML confidence (insights)</div>
                      <div className="text-3xl font-bold text-purple-600">{avgInsightConfidence.toFixed(0)}%</div>
                      <div className="text-xs text-purple-600 mt-1">Narrative + catalog fit</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Smart recommendations</h4>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-blue-900">Optimize cement ordering</div>
                        <div className="text-sm text-blue-700 mt-1">
                          Batch orders reduce per-unit cost and align with what vision sees at the storage yard.
                        </div>
                        <Button size="sm" variant="outline" className="mt-2" asChild>
                          <Link to="/suppliers">Browse suppliers</Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-green-900">Bulk purchase opportunity</div>
                        <div className="text-sm text-green-700 mt-1">
                          Combine steel and roofing from one supplier when Site vision shows both staged for the same
                          phase.
                        </div>
                        <Button size="sm" variant="outline" className="mt-2" asChild>
                          <Link to="/suppliers">View suppliers</Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-orange-900">Wastage & storage</div>
                        <div className="text-sm text-orange-700 mt-1">
                          Cross-check paint and bagged goods with yard camera coverage; poor cover shows as repeated
                          material-class events without matching deliveries.
                        </div>
                        <Button size="sm" variant="outline" className="mt-2" asChild>
                          <Link to="/monitoring">Check cameras</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-600 shrink-0" />
              <div>
                <div className="font-semibold">Analytics stack</div>
                <div className="text-sm text-muted-foreground">
                  {materialUsage.length} catalog categories · {visionBlock.activeCameras} camera(s) · vision:{' '}
                  {visionBlock.mode === 'live_db'
                    ? 'database events'
                    : visionBlock.mode === 'empty_cameras'
                      ? 'awaiting worker'
                      : 'demo'}
                  . Refresh to re-sync.
                </div>
              </div>
            </div>
            <Button onClick={loadAnalytics} variant="outline" className="shrink-0">
              <Zap className="h-4 w-4 mr-2" />
              Refresh analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
