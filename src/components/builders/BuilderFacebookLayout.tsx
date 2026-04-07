import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect } from 'react';
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
  Video,
  Calendar,
  Briefcase,
  X,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { BuilderFeed } from './BuilderFeed';
import { BuilderGrid } from './BuilderGrid';
import { BuilderVideoGallery } from './BuilderVideoGallery';
import { MobileBottomNav, MobileHeader } from './MobileBottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';

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
  onBuilderContact?: (builder: any) => void;
  onBuilderProfile?: (builder: any) => void;
  onEditProfile?: () => void;
}

export const BuilderFacebookLayout: React.FC<BuilderFacebookLayoutProps> = ({
  currentUserId,
  currentUserName = 'Guest',
  currentUserAvatar,
  currentUserRole,
  isBuilder = false,
  onBuilderContact,
  onBuilderProfile,
  onEditProfile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuilder, setExpandedBuilder] = useState<string | null>(null);
  const [showAllBuilders, setShowAllBuilders] = useState(false);
  const [registeredBuilders, setRegisteredBuilders] = useState<RegisteredBuilder[]>([]);
  const [loadingBuilders, setLoadingBuilders] = useState(true);
  
  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState<'feed' | 'builders' | 'create' | 'notifications' | 'menu'>('feed');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Fetch registered professional builders from database
  useEffect(() => {
    const fetchRegisteredBuilders = async () => {
      setLoadingBuilders(true);
      try {
        console.log('🏗️ Fetching registered professional builders...');
        
        // Get access token if available
        let accessToken = '';
        try {
          const storedSession = readPersistedAuthRawStringSync();
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed.access_token || '';
          }
        } catch (e) {}
        
        // First get all professional builder user IDs using REST API
        const rolesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/user_roles?role=eq.professional_builder&select=user_id`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            }
          }
        );
        
        const roleData = await rolesRes.json();
        console.log('🏗️ Professional builder roles found:', roleData?.length || 0);

        if (!rolesRes.ok || !roleData || roleData.length === 0) {
          console.log('🏗️ No professional builders found in user_roles');
          
          // Fallback: Try fetching profiles with role = 'professional_builder' directly
          const profilesRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?role=eq.professional_builder&select=*`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              }
            }
          );
          
          const profilesData = await profilesRes.json();
          console.log('🏗️ Profiles with professional_builder role:', profilesData?.length || 0);
          
          if (profilesData && profilesData.length > 0) {
            const transformedBuilders: RegisteredBuilder[] = profilesData.map((profile: any) => ({
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
              avatar_url: profile.avatar_url
            }));
            
            setRegisteredBuilders(transformedBuilders);
            console.log(`🏗️ Loaded ${transformedBuilders.length} builders from profiles`);
          }
          
          setLoadingBuilders(false);
          return;
        }

        const builderUserIds = roleData.map((r: any) => r.user_id);
        console.log('🏗️ Builder user IDs:', builderUserIds);

        // Fetch profiles for these users using REST API
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${builderUserIds.join(',')})&select=*`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            }
          }
        );
        
        const profilesData = await profilesRes.json();
        console.log('🏗️ Builder profiles fetched:', profilesData?.length || 0);

        if (!profilesRes.ok || profilesData?.error) {
          console.error('🏗️ Error fetching builder profiles:', profilesData?.message || profilesData?.error);
          setLoadingBuilders(false);
          return;
        }

        // Transform to match expected format
        const transformedBuilders: RegisteredBuilder[] = (profilesData || []).map((profile: any) => ({
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
          avatar_url: profile.avatar_url
        }));

        setRegisteredBuilders(transformedBuilders);
        console.log(`🏗️ Loaded ${transformedBuilders.length} registered builders`);
      } catch (error) {
        console.error('🏗️ Error fetching registered builders:', error);
      } finally {
        setLoadingBuilders(false);
      }
    };

    fetchRegisteredBuilders();
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleBuilderExpand = (builderId: string) => {
    setExpandedBuilder(expandedBuilder === builderId ? null : builderId);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title="Builders"
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
                placeholder="Search builders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-100 dark:bg-gray-800 border-0 rounded-full"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-2">
              {filteredBuilders.map((builder) => (
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
                      <span className="font-semibold">{builder.company_name || builder.full_name}</span>
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
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Single frame: builders list + social feed / project showcase (+ featured on xl) */}
      <div className="w-full max-w-[1280px] mx-auto pb-12 lg:pb-6 px-2 sm:px-3">
        <Card className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-sm flex flex-col lg:flex-row items-stretch">
        <aside className="hidden lg:block w-56 xl:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
          <div className="lg:sticky lg:top-20 p-3 space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                Builders
            </h3>
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search builders..."
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
                                <Phone className="h-3 w-3" />
                                <span>{builder.phone}</span>
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onBuilderContact?.(builder);
                              }}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Contact
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
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
                  <div className="text-xs opacity-90">Builders</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-lg font-bold">47</div>
                  <div className="text-xs opacity-90">Counties</div>
                </div>
              </div>
          </div>
        </div>
        </aside>

      <div className="flex-1 min-w-0 flex flex-col order-1 lg:order-2">
        <Tabs defaultValue="feed" className="w-full flex flex-col min-h-0">
          <div className="w-full shrink-0 border-b border-slate-200 dark:border-slate-700">
            <TabsList className="flex h-10 w-full items-stretch rounded-none border-0 bg-slate-100/80 p-0 text-muted-foreground shadow-none dark:bg-slate-800/70">
              <TabsTrigger
                value="feed"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-none border-r border-slate-200/90 px-2 py-0 text-xs font-semibold shadow-none data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:text-gray-600 dark:border-slate-600 dark:data-[state=inactive]:text-gray-400"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Social Feed</span>
              </TabsTrigger>
              <TabsTrigger
                value="portfolio"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-none px-2 py-0 text-xs font-semibold shadow-none data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400"
              >
                <Video className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Project Showcase</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="feed" className="mt-0 flex-1 min-h-0">
            <BuilderFeed
              omitOuterCard
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              currentUserRole={currentUserRole}
              isBuilder={isBuilder}
              onContactBuilder={(builderId) => {
                const builder = allBuilders.find(b => b.id === builderId || b.user_id === builderId);
                if (builder) onBuilderContact?.(builder);
              }}
            />
          </TabsContent>
          
          <TabsContent value="portfolio" className="mt-0 flex-1 min-h-0 border-t border-slate-100 dark:border-slate-800">
            <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 px-3 py-2.5 sm:px-4">
                <h3 className="text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Builder Project Showcase
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
                  Completed projects from professional builders across Kenya
                </p>
            </div>
            <div className="p-2 sm:p-3 min-h-0">
                <BuilderVideoGallery />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="hidden xl:block w-56 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/25 order-3">
        <div className="xl:sticky xl:top-20 p-3 space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Featured Builders</h3>
            <div className="space-y-2">
              {loadingBuilders ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading builders...</span>
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
                      <p className="text-xs text-gray-500 truncate">{builder.specialties?.[0] || 'Professional Builder'}</p>
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
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Activity</h3>
            <div className="space-y-3">
              {allBuilders.length > 0 ? (
                <>
                  {allBuilders.slice(0, 2).map((builder, idx) => (
                    <div key={builder.id} className="flex items-start gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-green-500' : 'bg-blue-500'} mt-1.5 flex-shrink-0`}></div>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">{builder.company_name || builder.full_name}</span> {idx === 0 ? 'posted a new project update' : `is available in ${builder.location || 'Kenya'}`}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-white">{allBuilders.length} professional builder{allBuilders.length !== 1 ? 's' : ''}</span> registered
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-white">Be the first</span> professional builder to register!
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
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === 'builders') {
            setShowMobileSearch(true);
          }
        }}
        notificationCount={5}
        messageCount={3}
      />
    </>
  );
};

export default BuilderFacebookLayout;
