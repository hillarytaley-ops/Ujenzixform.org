import React, { Suspense, useMemo, useEffect, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle2,
  MapPin,
  Store,
  ArrowRight,
  Play,
  Zap,
  BarChart3,
  Smartphone,
  Shield,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { useHomePagePublicStats, formatHomeStatCount } from "@/hooks/useHomePagePublicStats";
import {
  hasMarketplaceLogisticsAccess,
  hasScannerPortalAccess,
} from "@/config/roleRouteAccess";
import {
  getDeliveryHiringApprovalState,
  isDeliveryProviderRole,
} from "@/utils/deliveryProviderHiringApproval";
import { useDeliveryProviderHiringApproval } from "@/hooks/useDeliveryProviderHiringApproval";

const IndexHomeBelowFold = lazy(() => import("./index/IndexHomeBelowFold"));

// Dashboard paths for each role
const DASHBOARDS: Record<string, string> = {
  admin: "/admin-dashboard",
  super_admin: "/admin-dashboard",
  supplier: "/supplier-dashboard",
  delivery: "/delivery-dashboard",
  delivery_provider: "/delivery-dashboard",
  professional_builder: "/professional-builder-dashboard",
  builder: "/professional-builder-dashboard",
  private_client: "/private-client-dashboard",
};

const Index = () => {
  const { userRole, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const skipDashboardRedirect = searchParams.get("browse") === "1";
  const homeStats = useHomePagePublicStats();
  const { canAcceptDeliveryOrders } = useDeliveryProviderHiringApproval();

  const homeToolAccess = useMemo(
    () => ({
      marketplace:
        !loading &&
        !!userRole &&
        hasMarketplaceLogisticsAccess(userRole, {
          deliveryHiringApproved: canAcceptDeliveryOrders,
        }),
      scanner:
        !loading &&
        !!userRole &&
        hasScannerPortalAccess(userRole, {
          deliveryHiringApproved: canAcceptDeliveryOrders,
        }),
      monitoring:
        !loading &&
        !!userRole &&
        hasMarketplaceLogisticsAccess(userRole, {
          deliveryHiringApproved: canAcceptDeliveryOrders,
        }),
    }),
    [loading, userRole, canAcceptDeliveryOrders]
  );

  // AUTO-REDIRECT: Users with roles go to their dashboards (unless explicitly browsing public home)
  useEffect(() => {
    if (skipDashboardRedirect) return;
    if (!loading && user && userRole && DASHBOARDS[userRole]) {
      if (isDeliveryProviderRole(userRole)) {
        void getDeliveryHiringApprovalState(user.id).then((state) => {
          if (state.canAcceptDeliveryOrders) {
            console.log("🏠 Index: Approved delivery provider — redirecting to dashboard");
            window.location.href = DASHBOARDS[userRole];
          }
        });
        return;
      }
      console.log("🏠 Index: User has role", userRole, "- redirecting to dashboard");
      window.location.href = DASHBOARDS[userRole];
    }
  }, [loading, user, userRole, skipDashboardRedirect]);

  const stats = useMemo(
    () => [
      {
        value: formatHomeStatCount(homeStats.professionalBuilders, homeStats.loading),
        label: "CO/Contractors",
        icon: Building2,
      },
      {
        value: formatHomeStatCount(homeStats.supplierCompanies, homeStats.loading),
        label: "Supplier listings",
        icon: Store,
      },
      {
        value: formatHomeStatCount(homeStats.builderProjects, homeStats.loading),
        label: "Projects on platform",
        icon: CheckCircle2,
      },
      { value: "47", label: "Counties (Kenya)", icon: MapPin },
    ],
    [homeStats]
  );

  const techFeatures = [
    { icon: Zap, label: "Real-Time Updates" },
    { icon: Shield, label: "Secure Transactions" },
    { icon: BarChart3, label: "Analytics Dashboard" },
    { icon: Smartphone, label: "Mobile Optimized" },
  ];

  const networkTrustLine = homeStats.loading
    ? "Loading live network stats…"
    : homeStats.registeredNetwork > 0
      ? `${homeStats.registeredNetwork.toLocaleString()}+ accounts across builders, suppliers, and partners`
      : "Growing network of builders, suppliers, and delivery partners";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section — warm construction palette; lighter overlay so the photo reads */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-slate-900 to-blue-950" />
          <img
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=85&auto=format&fit=crop"
            alt="Construction site with workers"
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover scale-105"
            onLoad={(e) => ((e.target as HTMLImageElement).style.opacity = "1")}
            style={{ opacity: 0, transition: "opacity 0.6s ease-in-out" }}
          />
          {/* Warm + cool wash — less opacity than before so the scene feels alive */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-950/55 via-slate-900/45 to-blue-950/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-orange-900/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-blue-900/30" />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-16 left-[8%] w-80 h-80 bg-orange-500/25 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-16 right-[5%] w-[28rem] h-[28rem] bg-amber-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/3 left-1/3 w-72 h-72 bg-orange-400/15 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-orange-600/10 to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-orange-400/30 to-transparent" />
          <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-amber-300/25 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center text-white max-w-4xl mx-auto">
            <AnimatedSection animation="fadeInUp">
              <Badge className="mb-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white border border-white/20 shadow-lg shadow-emerald-900/30 px-4 py-2 text-sm font-semibold">
                🇰🇪 Kenya · Materials, logistics & builders in one place
              </Badge>
            </AnimatedSection>

            <AnimatedSection animation="fadeInUp" delay={100}>
              <h3 className="text-2xl md:text-3xl font-semibold mb-4 text-amber-300 drop-shadow-sm">
                Welcome to UjenziXform
              </h3>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-md">
                <span className="text-white">Building Kenya&apos;s</span>
                <br />
                <span className="bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-300 bg-clip-text text-transparent">
                  Digital Construction
                </span>
                <br />
                <span className="text-white">Future</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection animation="fadeInUp" delay={200}>
              <p className="text-lg md:text-xl text-orange-50/90 mb-8 leading-relaxed max-w-2xl mx-auto drop-shadow-sm">
                The complete construction management platform. Find builders, source materials, track deliveries with GPS, scan QR
                codes, and monitor sites with live cameras — all in one powerful ecosystem.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="fadeInUp" delay={300}>
              <div className="flex flex-wrap gap-4 mb-8 justify-center">
                <Link to="/builders/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-400 hover:via-orange-500 hover:to-red-500 text-white font-semibold px-8 py-6 text-lg shadow-xl shadow-orange-900/40 ring-2 ring-orange-400/30"
                  >
                    <Building2 className="h-5 w-5 mr-2" />
                    Get Started Free
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-2 border-white/50 text-white hover:bg-white/15 hover:border-amber-200/60 font-semibold px-8 py-6 text-lg backdrop-blur-md bg-white/5" asChild>
                  <a href="#platform-demo">
                    <Play className="h-5 w-5 mr-2" />
                    Watch platform demo
                  </a>
                </Button>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fadeInUp" delay={400}>
              <div className="flex flex-wrap gap-3 justify-center">
                {techFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full shadow-lg shadow-black/10"
                  >
                    <feature.icon className="h-4 w-4 text-amber-300" />
                    <span className="text-sm text-white font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fadeInUp" delay={500}>
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="text-center p-4 rounded-xl bg-white/15 backdrop-blur-md border border-white/15 hover:bg-white/20 hover:border-amber-400/30 transition-all shadow-lg shadow-black/10"
                  >
                    <stat.icon className="h-6 w-6 text-amber-300 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-orange-100/80">{stat.label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-orange-100/60 max-w-md mx-auto">
                Figures update from live directory data (builders, supplier listings, and projects on the platform).
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-orange-50/90 text-sm text-center px-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>{networkTrustLine}</span>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="currentColor"
              className="text-background"
            />
          </svg>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
            <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm">Loading page…</span>
          </div>
        }
      >
        <IndexHomeBelowFold userRole={userRole} toolAccess={homeToolAccess} />
      </Suspense>

      <Footer />
    </div>
  );
};

export default Index;
