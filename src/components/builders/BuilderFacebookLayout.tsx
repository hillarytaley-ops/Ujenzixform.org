import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import { PROFILE_SELF_COLUMNS, PROFILE_DIRECTORY_COLUMNS, PROFILE_PARTNER_COLUMNS, SUPPLIER_SELF_COLUMNS, DELIVERY_PROVIDER_SELF_COLUMNS, PURCHASE_ORDER_LIST_COLUMNS, PURCHASE_ORDER_SEARCH_COLUMNS, PAYMENT_LIST_COLUMNS, SUPPLIER_PRODUCT_PRICE_COLUMNS } from '@/lib/restColumnSets';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  ChevronDown, 
  ChevronUp,
  Star,
  MapPin,
  Phone,
  Mail,
  Building2,
  Users,
  CheckCircle2,
  MessageCircle,
  Calendar,
  Briefcase,
  X,
  ArrowLeft,
  Loader2,
  Truck
} from 'lucide-react';
import { BuilderVideoGallery } from './BuilderVideoGallery';
import { SupplierMarketingFeed } from './SupplierMarketingFeed';
import { BuilderGrid } from './BuilderGrid';
import { BuilderVideoGallery } from './BuilderVideoGallery';
import { MobileBottomNav, MobileHeader } from './MobileBottomNav';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  fetchPublicSupplierDirectory,
  type PublicSupplierDirectoryRow,
} from '@/utils/fetchPublicSupplierDirectory';

// Builder type for registered builders
interface RegisteredBuilder {
  id: string;
  user_id: string;
  full_name: string;
  company_name?: string;
  role: 'builder';
  user_type: 'company' | 'individual';
  is_professional: boolean;
  phone?: string;
  email?: string;
  location?: string;
  rating: number;
  total_projects: number;
  total_reviews?: number;
  specialties: string[];
  description?: string;
  verified?: boolean;
  avatar_url?: string;
}

interface BuilderFacebookLayoutProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserRole?: string;
  isBuilder?: boolean;
  isSupplier?: boolean;
  directoryTimelinePostCount: number;
  directoryShowcaseVideoCount: number;
  directoryStatsLoading: boolean;
  seedTimelinePosts: Record<string, unknown>[] | null;
  onBuilderContact?: (builder: any) => void;
  onBuilderProfile?: (builder: any) => void;
  onSupplierContact?: (supplier: PublicSupplierDirectoryRow) => void;
  onSupplierProfile?: (supplier: PublicSupplierDirectoryRow) => void;
  onEditProfile?: () => void;
}

export const BuilderFacebookLayout: React.FC<BuilderFacebookLayoutProps> = ({
  currentUserId,
  currentUserName = 'Guest',
  currentUserAvatar,
  currentUserRole,
  isBuilder = false,
  isSupplier = false,
  directoryTimelinePostCount,
  directoryShowcaseVideoCount,
  directoryStatsLoading,
  seedTimelinePosts,
  onBuilderContact,
  onBuilderProfile,
  onSupplierContact,
  onSupplierProfile,
  onEditProfile
}) => {
  const [marketAudience, setMarketAudience] = useState<'contractors' | 'suppliers'>('contractors');
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [expandedBuilder, setExpandedBuilder] = useState<string | null>(null);
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
  const [showAllBuilders, setShowAllBuilders] = useState(false);
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);
  const [registeredBuilders, setRegisteredBuilders] = useState<RegisteredBuilder[]>([]);
  const [loadingBuilders, setLoadingBuilders] = useState(true);
  const [supplierRows, setSupplierRows] = useState<PublicSupplierDirectoryRow[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const supplierByUserId = useMemo(() => {
    const m = new Map<string, PublicSupplierDirectoryRow>();
    supplierRows.forEach((r) => {
      if (r.user_id) m.set(r.user_id, r);
    });
    return m;
  }, [supplierRows]);
  
  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState<'showcase' | 'builders' | 'create' | 'notifications' | 'menu'>('showcase');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const builderMarketHubMainRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBuilderMarketHubTop = () => {
    requestAnimationFrame(() => {
      builderMarketHubMainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const scrollToProjectShowcase = () => {
    document.getElementById('builder-project-showcase-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const scrollToShowcaseTop = () => {
    document.getElementById('builder-feed-showcase-tabs')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const openSiteMobileMenu = () => {
    const toggle = document.getElementById('site-mobile-nav-toggle');
    if (toggle && toggle instanceof HTMLButtonElement) {
      toggle.click();
      return;
    }
    toast({
      title: 'Menu',
      description: 'Use the menu (☰) in the top bar to browse the site.',
    });
  };

  // Fetch registered COs/contractors from database
  useEffect(() => {
    const mapProfileToBuilder = (profile: any): RegisteredBuilder => ({
      id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name || 'Builder',
      company_name: profile.company_name,
      role: 'builder' as const,
      user_type: profile.company_name ? 'company' as const : 'individual' as const,
      is_professional: true,
      phone: profile.phone,
      email: profile.email,
      location: profile.location,
      rating: profile.rating || 4.5,
      total_projects: profile.total_projects || 0,
      total_reviews: profile.total_reviews || 0,
      specialties: profile.specialties || [],
      description: profile.bio || '',
      verified: profile.is_verified,
      avatar_url: profile.avatar_url,
    });

    const fetchRegisteredBuilders = async () => {
      setLoadingBuilders(true);
      try {
        let accessToken = '';
        try {
          const storedSession = readPersistedAuthRawStringSync();
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed.access_token || '';
          }
        } catch (e) {}

        const authHeader = `Bearer ${accessToken || SUPABASE_ANON_KEY}`;
        const jsonHeaders = {
          apikey: SUPABASE_ANON_KEY,
          Authorization: authHeader,
          'Content-Type': 'application/json',
        } as const;

        // Prefer SECURITY DEFINER RPC: anon cannot read user_roles; profiles.role may not exist.
        try {
          const dirRpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_builder_directory`, {
            method: 'POST',
            headers: jsonHeaders,
            body: '{}',
          });
          if (dirRpc.ok) {
            const dirRows = await dirRpc.json();
            if (Array.isArray(dirRows)) {
              setRegisteredBuilders(dirRows.map(mapProfileToBuilder));
              return;
            }
          } else {
            const errText = await dirRpc.text().catch(() => '');
            console.warn('🏗️ get_public_builder_directory failed:', dirRpc.status, errText?.slice(0, 200));
          }
        } catch (e) {
          console.warn('🏗️ get_public_builder_directory error:', e);
        }

        let builderUserIds: string[] = [];

        try {
          const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_professional_builder_user_ids`, {
            method: 'POST',
            headers: jsonHeaders,
            body: '{}',
          });
          if (rpcRes.ok) {
            const ids = await rpcRes.json();
            if (Array.isArray(ids)) {
              builderUserIds = ids.filter(Boolean) as string[];
            }
          }
        } catch (e) {
          console.log('🏗️ RPC get_professional_builder_user_ids unavailable:', e);
        }

        if (builderUserIds.length === 0) {
          const rolesRes = await fetch(
            `${SUPABASE_URL}/rest/v1/user_roles?role=eq.professional_builder&select=user_id`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader } }
          );
          const roleData = await rolesRes.json();
          if (rolesRes.ok && Array.isArray(roleData) && roleData.length > 0) {
            builderUserIds = roleData.map((r: { user_id: string }) => r.user_id).filter(Boolean);
          }
        }

        if (builderUserIds.length === 0) {
          const profilesRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?role=eq.professional_builder&select=${PROFILE_DIRECTORY_COLUMNS}`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader } }
          );
          const profilesData = await profilesRes.json();
          if (profilesRes.ok && Array.isArray(profilesData) && profilesData.length > 0) {
            setRegisteredBuilders(profilesData.map(mapProfileToBuilder));
            return;
          }
          setRegisteredBuilders([]);
          return;
        }

        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${builderUserIds.join(',')})&select=${PROFILE_PARTNER_COLUMNS}`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader } }
        );
        const profilesData = await profilesRes.json();

        if (!profilesRes.ok || profilesData?.error) {
          console.error('🏗️ Error fetching builder profiles:', profilesData?.message || profilesData?.error);
          setRegisteredBuilders([]);
          return;
        }

        setRegisteredBuilders((profilesData || []).map(mapProfileToBuilder));
      } catch (error) {
        console.error('🏗️ Error fetching registered builders:', error);
        setRegisteredBuilders([]);
      } finally {
        setLoadingBuilders(false);
      }
    };

    fetchRegisteredBuilders();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSuppliers(true);
      const rows = await fetchPublicSupplierDirectory();
      if (!cancelled) {
        setSupplierRows(rows);
        setLoadingSuppliers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Only show real registered builders - no demo data
  const allBuilders = registeredBuilders;
  
  // Filter builders based on search
  const filteredBuilders = allBuilders.filter(builder => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      builder.full_name?.toLowerCase().includes(query) ||
      builder.company_name?.toLowerCase().includes(query) ||
      builder.location?.toLowerCase().includes(query) ||
      builder.specialties?.some(s => s.toLowerCase().includes(query))
    );
  });

  const displayedBuilders = showAllBuilders ? filteredBuilders : filteredBuilders.slice(0, 8);

  const filteredSuppliers = supplierRows.filter((s) => {
    if (!supplierSearchQuery) return true;
    const q = supplierSearchQuery.toLowerCase();
    return (
      (s.company_name || '').toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    );
  });
  const displayedSuppliers = showAllSuppliers
    ? filteredSuppliers
    : filteredSuppliers.slice(0, 8);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const telHref = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned ? `tel:${cleaned}` : undefined;
  };

  const toggleBuilderExpand = (builderId: string) => {
    setExpandedBuilder(expandedBuilder === builderId ? null : builderId);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title={marketAudience === 'contractors' ? 'CO/Contractors' : 'Suppliers'}
          onSearch={() => setShowMobileSearch(true)}
          onMessages={() => console.log('Open messages')}
          messageCount={3}
        />
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 lg:hidden">
          <div className="flex items-center gap-3 p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => setShowMobileSearch(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={
                  marketAudience === 'contractors'
                    ? 'Search CO/contractors...'
                    : 'Search suppliers...'
                }
                value={marketAudience === 'contractors' ? searchQuery : supplierSearchQuery}
                onChange={(e) =>
                  marketAudience === 'contractors'
                    ? setSearchQuery(e.target.value)
                    : setSupplierSearchQuery(e.target.value)
                }
                className="pl-9 bg-gray-100 dark:bg-gray-800 border-0 rounded-full"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-2">
              {marketAudience === 'contractors'
                ? filteredBuilders.map((builder) => (
                    <div
                      key={builder.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        onBuilderProfile?.(builder);
                        setShowMobileSearch(false);
                      }}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                          {getInitials(builder.company_name || builder.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">
                            {builder.company_name || builder.full_name}
                          </span>
                          {(builder as any).verified && (
                            <CheckCircle2 className="h-4 w-4 text-blue-500" fill="currentColor" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {builder.rating?.toFixed(1)} • {builder.location}
                        </div>
                      </div>
                    </div>
                  ))
                : filteredSuppliers.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        onSupplierProfile?.(s);
                        setShowMobileSearch(false);
                      }}
                    >
                      <Avatar className="h-12 w-12">
                        {s.logo_url ? <AvatarImage src={s.logo_url} alt="" /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-600 text-white font-semibold">
                          {getInitials(s.company_name || 'S')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold truncate">{s.company_name || 'Supplier'}</span>
                          {s.is_verified && (
                            <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" fill="currentColor" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{s.location || 'Kenya'}</div>
                      </div>
                    </div>
                  ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Single frame: directory + feed / showcase (+ featured on xl) */}
      <div className="w-full max-w-[1280px] mx-auto pb-28 lg:pb-6 px-2 sm:px-3">
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          <Button
            type="button"
            size="sm"
            variant={marketAudience === 'contractors' ? 'default' : 'outline'}
            onClick={() => {
              setMarketAudience('contractors');
              setExpandedSupplierId(null);
            }}
            className={marketAudience === 'contractors' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <Users className="h-3.5 w-3.5 mr-1" />
            CO/Contractors
          </Button>
          <Button
            type="button"
            size="sm"
            variant={marketAudience === 'suppliers' ? 'default' : 'outline'}
            onClick={() => {
              setMarketAudience('suppliers');
              setExpandedBuilder(null);
            }}
            className={
              marketAudience === 'suppliers'
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                : ''
            }
          >
            <Truck className="h-3.5 w-3.5 mr-1" />
            Suppliers
          </Button>
        </div>

        <Card className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-sm flex flex-col lg:flex-row items-stretch">
        {marketAudience === 'contractors' ? (
        <aside className="hidden lg:block w-56 xl:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
          <div className="lg:sticky lg:top-20 p-3 space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                CO/Contractors
            </h3>
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search CO/contractors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-100 dark:bg-gray-800 border-0 rounded-full"
                />
              </div>

              {/* Builder List */}
              <ScrollArea className="h-[calc(100vh-280px)] min-h-[200px] pr-2">
                <div className="space-y-2">
                  {displayedBuilders.map((builder) => (
                    <div key={builder.id} className="rounded-lg overflow-hidden">
                      {/* Collapsed Builder Card */}
                      <div
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          expandedBuilder === builder.id 
                            ? 'bg-blue-50 dark:bg-blue-900/30' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => toggleBuilderExpand(builder.id)}
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-offset-1 ring-blue-500/50">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold">
                            {getInitials(builder.company_name || builder.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {builder.company_name || builder.full_name}
                            </span>
                            {(builder as any).verified && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" fill="currentColor" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {builder.rating?.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span className="truncate">{builder.location}</span>
                          </div>
                        </div>
                        {expandedBuilder === builder.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>

                      {/* Expanded Builder Details */}
                      {expandedBuilder === builder.id && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 space-y-3 border-t border-gray-100 dark:border-gray-700">
                          {/* Description */}
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {builder.description}
                          </p>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                              <div className="text-lg font-bold text-blue-600">{builder.total_projects}</div>
                              <div className="text-xs text-gray-500">Projects</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                              <div className="text-lg font-bold text-green-600">{builder.total_reviews || 0}</div>
                              <div className="text-xs text-gray-500">Reviews</div>
                            </div>
                          </div>

                          {/* Specialties */}
                          <div className="flex flex-wrap gap-1">
                            {builder.specialties?.slice(0, 3).map((specialty, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                                {specialty}
                              </Badge>
                            ))}
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            {builder.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 shrink-0" />
                                {telHref(builder.phone) ? (
                                  <a
                                    href={telHref(builder.phone)}
                                    className="text-blue-600 hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {builder.phone}
                                  </a>
                                ) : (
                                  <span>{builder.phone}</span>
                                )}
                              </div>
                            )}
                            {builder.email && (
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail className="h-3 w-3 shrink-0" />
                                <a
                                  href={`mailto:${builder.email}`}
                                  className="text-blue-600 hover:underline truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {builder.email}
                                </a>
                              </div>
                            )}
                            {builder.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{builder.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 flex-1 min-w-[5.5rem] text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBuilderContact?.(builder);
                                }}
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Inbox
                              </Button>
                              {builder.email && (
                                <Button size="sm" variant="outline" className="h-8 flex-1 min-w-[5.5rem] text-xs" asChild>
                                  <a
                                    href={`mailto:${builder.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Mail className="h-3 w-3 mr-1" />
                                    Email
                                  </a>
                                </Button>
                              )}
                              {builder.phone && telHref(builder.phone) && (
                                <Button size="sm" variant="outline" className="h-8 flex-1 min-w-[5.5rem] text-xs" asChild>
                                  <a href={telHref(builder.phone)} onClick={(e) => e.stopPropagation()}>
                                    <Phone className="h-3 w-3 mr-1" />
                                    Call
                                  </a>
                                </Button>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="h-8 w-full text-xs bg-blue-600 hover:bg-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                onBuilderProfile?.(builder);
                              }}
                            >
                              View Profile
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Show More/Less */}
                {filteredBuilders.length > 8 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => setShowAllBuilders(!showAllBuilders)}
                  >
                    {showAllBuilders ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        See All ({filteredBuilders.length})
                      </>
                    )}
                  </Button>
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-3 shadow-inner">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Builder Network
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-lg font-bold">{allBuilders.length}+</div>
                  <div className="text-xs opacity-90">CO/Contractors</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-lg font-bold">47</div>
                  <div className="text-xs opacity-90">Counties</div>
                </div>
              </div>
          </div>
        </div>
        </aside>
        ) : (
        <aside className="hidden lg:block w-56 xl:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-slate-900/30">
          <div className="lg:sticky lg:top-20 p-3 space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white mb-2">
                <Truck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                Suppliers
              </h3>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search suppliers..."
                  value={supplierSearchQuery}
                  onChange={(e) => setSupplierSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-100 dark:bg-gray-800 border-0 rounded-full"
                />
              </div>
              <ScrollArea className="h-[calc(100vh-280px)] min-h-[200px] pr-2">
                <div className="space-y-2">
                  {loadingSuppliers ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading suppliers…
                    </div>
                  ) : (
                    displayedSuppliers.map((s) => (
                      <div key={s.id} className="rounded-lg overflow-hidden">
                        <div
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            expandedSupplierId === s.id
                              ? 'bg-amber-100/80 dark:bg-amber-900/25'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          onClick={() =>
                            setExpandedSupplierId(expandedSupplierId === s.id ? null : s.id)
                          }
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-offset-1 ring-amber-600/40">
                            {s.logo_url ? <AvatarImage src={s.logo_url} alt="" /> : null}
                            <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-600 text-white text-sm font-semibold">
                              {getInitials(s.company_name || 'S')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {s.company_name || 'Supplier'}
                              </span>
                              {s.is_verified && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" fill="currentColor" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{s.location || 'Kenya'}</div>
                          </div>
                          {expandedSupplierId === s.id ? (
                            <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                        </div>
                        {expandedSupplierId === s.id && (
                          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                            {s.description ? <p className="leading-snug">{s.description}</p> : null}
                            {s.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 shrink-0" />
                                {telHref(s.phone) ? (
                                  <a
                                    href={telHref(s.phone)}
                                    className="text-amber-700 hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {s.phone}
                                  </a>
                                ) : (
                                  <span>{s.phone}</span>
                                )}
                              </div>
                            )}
                            {s.email && (
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail className="h-3 w-3 shrink-0" />
                                <a
                                  href={`mailto:${s.email}`}
                                  className="text-amber-700 hover:underline truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {s.email}
                                </a>
                              </div>
                            )}
                            <div className="flex flex-col gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSupplierContact?.(s);
                                }}
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Contact
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-amber-600 hover:bg-amber-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSupplierProfile?.(s);
                                }}
                              >
                                View details
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {filteredSuppliers.length > 8 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                    onClick={() => setShowAllSuppliers(!showAllSuppliers)}
                  >
                    {showAllSuppliers ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        See All ({filteredSuppliers.length})
                      </>
                    )}
                  </Button>
                )}
              </ScrollArea>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 text-white p-3 shadow-inner">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Supply network
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-lg font-bold">{supplierRows.length}+</div>
                  <div className="text-xs opacity-90">Suppliers</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-lg font-bold">47</div>
                  <div className="text-xs opacity-90">Counties</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        )}

      <div className="flex-1 min-w-0 flex flex-col order-1 lg:order-2">
        {marketAudience === 'contractors' ? (
        <div
          ref={builderMarketHubMainRef}
          id="builder-feed-showcase-tabs"
          className="w-full flex flex-col min-h-0 flex-1 scroll-mt-20"
        >
          <section
            id="builder-project-showcase-section"
            className="flex-1 min-h-0"
            aria-labelledby="builder-project-showcase-heading"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 px-3 py-2.5 sm:px-4">
              <h2
                id="builder-project-showcase-heading"
                className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
              >
                Project showcase
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
                Completed projects from COs and contractors across Kenya — browse portfolios, not social posts.
              </p>
            </div>
            <div className="p-2 sm:p-3 min-h-0">
              <BuilderVideoGallery browseOnly />
            </div>
          </section>
        </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-amber-50/60 dark:bg-slate-800/40 px-3 py-2.5">
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-100">Supplier marketing</h2>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Products, photos, and videos from suppliers — visitors can react and comment.
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
              <SupplierMarketingFeed
                omitOuterCard
                showComposer={false}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserAvatar={currentUserAvatar}
                currentUserRole={currentUserRole}
                isSupplier={isSupplier}
                supplierByUserId={supplierByUserId}
              />
            </div>
          </div>
        )}
      </div>

      <aside className="hidden xl:block w-56 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/25 order-3">
        <div className="xl:sticky xl:top-20 p-3 space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {marketAudience === 'contractors' ? 'Featured CO/Contractors' : 'Featured suppliers'}
            </h3>
            <div className="space-y-2">
              {marketAudience === 'contractors' ? (
                loadingBuilders ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    <span className="ml-2 text-sm text-gray-500">Loading directory...</span>
                  </div>
                ) : allBuilders.length > 0 ? (
                  allBuilders.slice(0, 3).map((builder) => (
                    <div
                      key={builder.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => onBuilderProfile?.(builder)}
                    >
                      <Avatar className="h-12 w-12">
                        {builder.avatar_url ? (
                          <AvatarImage src={builder.avatar_url} alt={builder.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold">
                          {getInitials(builder.company_name || builder.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {builder.company_name || builder.full_name}
                          </span>
                          {builder.verified && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" fill="currentColor" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {builder.specialties?.[0] || 'CO/Contractor'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {builder.rating?.toFixed(1)} • {builder.location || 'Kenya'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No builders registered yet</p>
                    <p className="text-xs mt-1">Be the first to join!</p>
                  </div>
                )
              ) : loadingSuppliers ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  Loading suppliers…
                </div>
              ) : supplierRows.length > 0 ? (
                supplierRows.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => onSupplierProfile?.(s)}
                  >
                    <Avatar className="h-12 w-12">
                      {s.logo_url ? <AvatarImage src={s.logo_url} alt="" /> : null}
                      <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-600 text-white font-semibold">
                        {getInitials(s.company_name || 'S')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {s.company_name || 'Supplier'}
                        </span>
                        {s.is_verified && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" fill="currentColor" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{s.location || 'Kenya'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-gray-500">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No suppliers listed yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Activity</h3>
            <div className="space-y-3">
              {marketAudience === 'contractors' ? (
                allBuilders.length > 0 ? (
                  <>
                    {allBuilders.slice(0, 2).map((builder, idx) => (
                      <div key={builder.id} className="flex items-start gap-2 text-sm">
                        <div
                          className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-green-500' : 'bg-blue-500'} mt-1.5 flex-shrink-0`}
                        />
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {builder.company_name || builder.full_name}
                          </span>{' '}
                          {idx === 0
                            ? 'posted a new project update'
                            : `is available in ${builder.location || 'Kenya'}`}
                        </p>
                      </div>
                    ))}
                    <div className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {allBuilders.length} CO/contractor{allBuilders.length !== 1 ? 's' : ''}
                        </span>{' '}
                        registered
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-white">Be the first</span> CO/contractor
                      to register!
                    </p>
                  </div>
                )
              ) : supplierRows.length > 0 ? (
                <>
                  {supplierRows.slice(0, 2).map((s, idx) => (
                    <div key={s.id} className="flex items-start gap-2 text-sm">
                      <div
                        className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-amber-500' : 'bg-orange-500'} mt-1.5 flex-shrink-0`}
                      />
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {s.company_name || 'Supplier'}
                        </span>{' '}
                        {idx === 0 ? 'can be reached from the directory' : `based in ${s.location || 'Kenya'}`}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {supplierRows.length} supplier{supplierRows.length !== 1 ? 's' : ''}
                      </span>{' '}
                      on the hub
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-white">Supplier listings</span> will appear
                    here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-xs text-gray-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <a href="#" className="hover:underline">About</a>
              <span>•</span>
              <a href="#" className="hover:underline">Help</a>
              <span>•</span>
              <a href="#" className="hover:underline">Terms</a>
              <span>•</span>
              <a href="#" className="hover:underline">Privacy</a>
            </div>
            <p className="mt-2">© 2026 UjenziXform Kenya</p>
          </div>
        </div>
      </aside>

        </Card>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={mobileTab}
        peopleTabLabel={marketAudience === 'contractors' ? 'COs' : 'Suppliers'}
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === 'showcase') {
            scrollToShowcaseTop();
          } else if (tab === 'builders') {
            setShowMobileSearch(true);
          } else if (tab === 'create') {
            if (isBuilder) {
              scrollToShowcaseTop();
              toast({
                title: 'Upload showcase video',
                description: 'Open your builder dashboard → Portfolio to add a project video.',
              });
            } else {
              window.location.href = '/builder-registration';
            }
          } else if (tab === 'notifications') {
            toast({
              title: 'Alerts',
              description: 'You have no critical alerts. Check back later for updates.',
            });
          } else if (tab === 'menu') {
            openSiteMobileMenu();
          }
        }}
        notificationCount={5}
        messageCount={3}
      />
    </>
  );
};

export default BuilderFacebookLayout;
