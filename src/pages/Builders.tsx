import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, ShoppingCart, Building2, Lock, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ContactBuilderModal } from "@/components/modals/ContactBuilderModal";
import { BuilderProfileModal } from "@/components/modals/BuilderProfileModal";
import { SecurityAlert } from "@/components/security/SecurityAlert";
import { ContactBuilderDialog } from "@/components/builders/ContactBuilderDialog";
import { BuilderProfileEdit } from "@/components/builders/BuilderProfileEdit";
import { UserProfile } from "@/types/userProfile";
import { useToast } from "@/hooks/use-toast";
import {
  useBuildersPagePublicStats,
  formatBuildersStatCount,
} from "@/hooks/useBuildersPagePublicStats";

const BuildersPublicDirectory = lazy(() => import("@/pages/builders/BuildersPublicDirectory"));

const MAIN_BG = `url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`;
const STATS_BG = `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80')`;

const Builders = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<
    (UserProfile & {
      company_name?: string;
      phone?: string;
      email?: string;
      location?: string;
    }) | null
  >(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userRoleState, setUserRoleState] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [contactBuilder, setContactBuilder] = useState<any>(null);
  const [builderPortalOpen, setBuilderPortalOpen] = useState(false);
  const { toast } = useToast();
  const publicStats = useBuildersPagePublicStats();

  const sharedUpdates =
    publicStats.activePosts + publicStats.publishedVideos;

  const isBuilder = userRoleState === "professional_builder" || userRoleState === "admin";

  useEffect(() => {
    checkUserProfile();
  }, []);

  useEffect(() => {
    const storedRole = localStorage.getItem("user_role");
    if (storedRole) {
      setUserRoleState(storedRole);
    }

    if (userProfile) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userProfile.user_id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.role) {
            setUserRoleState(data.role);
            localStorage.setItem("user_role", data.role);
          }
        })
        .catch(() => {});
    }
  }, [userProfile]);

  const checkUserProfile = async () => {
    setLoading(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return;
      }

      localStorage.setItem("user_id", user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*, user_id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setUserProfile(profile as UserProfile);
        if (profile.full_name) {
          localStorage.setItem("user_name", profile.full_name);
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!roleData);
      }
    } catch (error) {
      console.error("Error checking user profile:", error);
    }
  };

  const handleContactBuilderDialog = (builder: any) => {
    setContactBuilder(builder);
    setShowContactDialog(true);
  };

  const handleBuilderProfile = (
    builder: UserProfile & {
      company_name?: string;
      phone?: string;
      email?: string;
      location?: string;
    }
  ) => {
    setSelectedBuilder(builder);
    setShowProfileModal(true);
  };

  const handleOpenContactFromProfile = () => {
    setShowProfileModal(false);
    setShowContactModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading builders directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)]">
      <Navigation />

      <section
        className="text-white py-4 md:py-5 relative overflow-hidden"
        role="banner"
        aria-labelledby="builders-hero-heading"
      >
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/builders-hero-bg.jpg')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/75 to-gray-900/85" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1
              id="builders-hero-heading"
              className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 leading-tight"
            >
              <span className="text-white">Professional Builders</span>{" "}
              <span className="text-blue-400">Directory</span>
            </h1>

            <p className="text-xs sm:text-sm text-white/80 mb-2 max-w-xl mx-auto leading-snug">
              Browse certified builders, compare quotes, and hire trusted professionals across Kenya.
            </p>

            <div className="flex flex-wrap gap-1.5 justify-center mb-2">
              <Button
                type="button"
                size="sm"
                className="h-8 bg-white text-gray-900 hover:bg-gray-100 font-semibold text-[11px] px-2.5 touch-manipulation"
                onClick={() =>
                  document
                    .getElementById("builder-feed-showcase-tabs")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Building2 className="h-3 w-3 mr-1" />
                Browse
              </Button>

              <Link to="/builder-registration">
                <Button
                  size="sm"
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] px-2.5"
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Register
                </Button>
              </Link>

              {!loading &&
                userProfile &&
                (userRoleState === "professional_builder" || userRoleState === "private_client") && (
                  <Link to="/professional-builder-dashboard">
                    <Button
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-700 text-white font-semibold text-[11px] px-2.5"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Dashboard
                    </Button>
                  </Link>
                )}

              {!loading && !userProfile && (
                <Link to="/builder-signin">
                  <Button
                    size="sm"
                    className="h-8 bg-green-600 hover:bg-green-700 text-white font-semibold text-[11px] px-2.5"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px]">
              <span className="text-white/70">
                <strong className="text-blue-400">
                  {formatBuildersStatCount(publicStats.professionalBuilders, publicStats.loading)}
                </strong>{" "}
                Builders
              </span>
              <span className="text-white/50 hidden sm:inline" aria-hidden>
                ·
              </span>
              <span className="text-white/70">
                <strong className="text-gray-300">
                  {formatBuildersStatCount(sharedUpdates, publicStats.loading)}
                </strong>{" "}
                Feed updates
              </span>
              <span className="text-white/50 hidden sm:inline" aria-hidden>
                ·
              </span>
              <span className="text-white/70">
                <strong className="text-orange-400">47</strong> Counties
              </span>
              <span className="text-white/50 hidden sm:inline" aria-hidden>
                ·
              </span>
              <span className="text-white/70">
                <strong className="text-blue-300">24/7</strong> Support
              </span>
            </div>
            {publicStats.error && (
              <p className="text-[10px] text-amber-200/90 mt-1">
                Some live stats are unavailable; counts may be incomplete.
              </p>
            )}
          </div>
        </div>
      </section>

      <Collapsible open={builderPortalOpen} onOpenChange={setBuilderPortalOpen}>
        <section className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/80">
          <div className="container mx-auto px-4 py-1 sm:py-1.5">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-gray-800 outline-none transition-colors hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-blue-500/40 touch-manipulation"
                aria-expanded={builderPortalOpen}
              >
                <span className="tracking-tight">Choose Your Builder Portal</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-gray-600 transition-transform duration-200",
                    builderPortalOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-w-xl mx-auto pb-2.5 pt-1">
                <Card className="shadow-sm border border-emerald-200/90 bg-white py-0">
                  <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-sm font-bold text-gray-900 leading-none">Private Builder</h3>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 leading-tight">
                        Home projects & purchases
                      </p>
                    </div>
                    <Link to="/private-client-auth" className="flex-shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        Explore
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border border-blue-200/90 bg-white py-0">
                  <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-sm font-bold text-gray-900 leading-none">Professional Builder</h3>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 leading-tight">
                        Contractors & companies
                      </p>
                    </div>
                    <Link to="/professional-builder-auth" className="flex-shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Explore
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </CollapsibleContent>
          </div>
        </section>
      </Collapsible>

      <main className="py-6 sm:py-10 lg:py-14 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat [background-attachment:scroll] md:[background-attachment:fixed]"
          style={{ backgroundImage: MAIN_BG }}
          role="img"
          aria-hidden
        />

        <div className="absolute inset-0 bg-white/92 backdrop-blur-[1px]" />

        <div className="container mx-auto px-4 relative z-10">
          {isAdmin && (
            <div className="mb-8">
              <SecurityAlert />
            </div>
          )}

          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <BuildersPublicDirectory
              userProfile={userProfile}
              userRoleState={userRoleState}
              isBuilder={isBuilder}
              onBuilderContact={handleContactBuilderDialog}
              onBuilderProfile={handleBuilderProfile}
              onEditProfile={() => setShowProfileEdit(true)}
            />
          </Suspense>
        </div>
      </main>

      {selectedBuilder && (
        <ContactBuilderModal
          builder={selectedBuilder}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {selectedBuilder && (
        <BuilderProfileModal
          builder={selectedBuilder}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onContact={handleOpenContactFromProfile}
        />
      )}

      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat [background-attachment:scroll] md:[background-attachment:fixed]"
          style={{ backgroundImage: STATS_BG }}
          role="img"
          aria-label="Kenyan construction materials and professional building supplies"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-black/70 to-gray-800/80" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 text-white drop-shadow-2xl">
              Building Kenya&apos;s Future
            </h2>
            <p className="text-lg sm:text-2xl text-white/90 max-w-4xl mx-auto drop-shadow-lg leading-relaxed">
              Our network of professional builders and contractors is transforming Kenya&apos;s
              construction landscape, one project at a time across all 47 counties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-4xl sm:text-5xl font-bold text-blue-400 mb-3 sm:mb-4 drop-shadow-lg">
                {formatBuildersStatCount(publicStats.professionalBuilders, publicStats.loading)}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-white mb-2">Professional builders</div>
              <div className="text-white/80 text-sm">Registered on the directory</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-4xl sm:text-5xl font-bold text-blue-400 mb-3 sm:mb-4 drop-shadow-lg">
                {formatBuildersStatCount(sharedUpdates, publicStats.loading)}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-white mb-2">Feed &amp; showcase</div>
              <div className="text-white/80 text-sm">Public posts and project videos</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-3 sm:mb-4 drop-shadow-lg">
                47
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-white mb-2">Counties</div>
              <div className="text-white/80 text-sm">Nationwide Kenya coverage</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl">
              <div className="text-4xl sm:text-5xl font-bold text-red-400 mb-3 sm:mb-4 drop-shadow-lg">
                24/7
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-white mb-2">Support</div>
              <div className="text-white/80 text-sm">Platform assistance</div>
            </div>
          </div>

          <div className="mt-12 sm:mt-16 text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/30 max-w-4xl mx-auto">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-white drop-shadow-lg">
                Excellence in Kenyan Construction
              </h3>
              <p className="text-lg sm:text-xl text-white/90 leading-relaxed">
                From the bustling streets of Nairobi to the coastal developments of Mombasa, from the
                agricultural centers of Nakuru to the industrial hubs of Eldoret — our builders are
                creating Kenya&apos;s architectural legacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {contactBuilder && (
        <ContactBuilderDialog
          builder={{
            id: contactBuilder.id,
            user_id: contactBuilder.user_id || contactBuilder.id,
            full_name: contactBuilder.full_name,
            company_name: contactBuilder.company_name,
            phone: contactBuilder.phone,
            email: contactBuilder.email,
            location: contactBuilder.location,
            avatar_url: contactBuilder.avatar_url,
            is_verified: contactBuilder.verified || contactBuilder.is_verified,
            rating: contactBuilder.rating,
            allow_calls: contactBuilder.allow_calls,
            allow_messages: contactBuilder.allow_messages,
            show_phone: contactBuilder.show_phone,
            show_email: contactBuilder.show_email,
          }}
          isOpen={showContactDialog}
          onClose={() => {
            setShowContactDialog(false);
            setContactBuilder(null);
          }}
        />
      )}

      <BuilderProfileEdit
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={() => {
          checkUserProfile();
          toast({
            title: "Profile Updated",
            description: "Your profile has been updated successfully",
          });
        }}
      />

      <Footer />
    </div>
  );
};

export default Builders;
