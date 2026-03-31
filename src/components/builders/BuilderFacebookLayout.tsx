import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
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

      {/* Main Content */}
      <div className="flex gap-4 lg:gap-6 max-w-[1400px] mx-auto pb-20 lg:pb-0 px-2 sm:px-4 lg:px-0">
        {/* Left Sidebar - Builder Profiles (Facebook Style) - Desktop Only */}
        <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Search Builders */}
          <Card className="bg-white dark:bg-gray-900 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Builders
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search builders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-100 dark:bg-gray-800 border-0 rounded-full"
                />
              </div>

              {/* Builder List */}
              <ScrollArea className="h-[calc(100vh-350px)] pr-2">
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
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Builder Network
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-xl font-bold">{allBuilders.length}+</div>
                  <div className="text-xs opacity-90">Builders</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <div className="text-xl font-bold">47</div>
                  <div className="text-xs opacity-90">Counties</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content - Feed & Portfolio */}
      <div className="flex-1 min-w-0">
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="w-full bg-white dark:bg-gray-900 shadow-sm mb-4 p-1 rounded-xl">
            <TabsTrigger 
              value="feed" 
              className="flex-1 data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Social Feed
            </TabsTrigger>
            <TabsTrigger 
              value="portfolio" 
              className="flex-1 data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg"
            >
              <Video className="h-4 w-4 mr-2" />
              Project Showcase
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="mt-0">
            <BuilderFeed
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
          
          <TabsContent value="portfolio" className="mt-0">
            <Card className="bg-white dark:bg-gray-900 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  🎬 Builder Project Showcase
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Watch professional builders showcase their completed construction projects across Kenya
                </p>
              </CardHeader>
              <CardContent>
                <BuilderVideoGallery />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar - Suggestions (Facebook Style) */}
      <div className="hidden xl:block w-72 flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Sponsored / Featured Builders */}
          <Card className="bg-white dark:bg-gray-900 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-medium">Featured Builders</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
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
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white dark:bg-gray-900 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
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
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="text-xs text-gray-400 px-2">
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
      </div>
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
