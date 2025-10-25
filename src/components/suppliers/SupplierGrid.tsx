import { useState, useEffect } from "react";
import { SecureSupplierCard } from "./SecureSupplierCard";
import { AdvancedFilters } from "./AdvancedFilters";
import { DataSourceSelector } from "./DataSourceSelector";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Supplier, SupplierFilters as SupplierFiltersType } from "@/types/supplier";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types/userProfile";
import { SupplierReviewModal, SupplierReviewData } from "./SupplierReviewModal";
import { useToast } from "@/hooks/use-toast";

const SUPPLIERS_PER_PAGE = 12;

// Sample/Demo suppliers data
const DEMO_SUPPLIERS: Supplier[] = [
  {
    id: "demo-1",
    company_name: "Bamburi Cement",
    address: "Mombasa Road, Nairobi",
    county: "Nairobi",
    latitude: -1.3194,
    longitude: 36.8441,
    rating: 4.8,
    total_reviews: 156,
    average_rating: 4.8,
    recommendation_rate: 94.2,
    delivery_performance: 4.7,
    order_accuracy_rate: 96.5,
    response_time_hours: 2,
    specialties: ["Cement", "Concrete", "Building Solutions"],
    materials_offered: ["Cement", "Lime", "Concrete Blocks"],
    is_verified: true,
    business_type: "Manufacturer",
    business_registration: "C.123456/2010",
    years_in_business: 14,
    employee_count: 250,
    delivery_radius_km: 100,
    operational_status: "Active",
    website_url: "https://bamburi.co.ke",
    certifications: ["ISO 9001:2015", "KEBS Certified", "Environmental Compliance"],
    payment_terms: "Net 30",
    minimum_order_value: 50000,
    lead_time_days: 2,
    bulk_discount_available: true,
    credit_terms_available: true,
    insurance_coverage: true,
    services_offered: ["Delivery", "Technical Support", "Bulk Orders", "Custom Mix"],
    delivery_methods: ["Standard Delivery", "Express Delivery", "Bulk Transport"],
    payment_methods: ["Bank Transfer", "Mobile Money", "Cash", "Credit Terms"],
    warranty_offered: true,
    warranty_period_months: 6,
    established_year: 2010,
    annual_revenue_range: "Over 100M",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "demo-user-1"
  },
  {
    id: "demo-2", 
    company_name: "Devki Steel Mills",
    address: "Ruiru Industrial Area, Kiambu",
    county: "Kiambu",
    latitude: -1.1432,
    longitude: 36.9605,
    rating: 4.9,
    total_reviews: 89,
    average_rating: 4.9,
    recommendation_rate: 97.8,
    delivery_performance: 4.8,
    order_accuracy_rate: 98.2,
    response_time_hours: 1,
    specialties: ["Steel", "Iron Sheets", "Wire Products"],
    materials_offered: ["Steel Bars", "Iron Sheets", "Wire Mesh"],
    is_verified: true,
    business_type: "Manufacturer",
    business_registration: "M.789012/2008",
    years_in_business: 16,
    employee_count: 180,
    delivery_radius_km: 150,
    operational_status: "Active",
    website_url: "https://devkisteel.com",
    certifications: ["ISO 14001:2015", "KEBS Steel Standards", "Quality Assurance Certified"],
    payment_terms: "Net 15",
    minimum_order_value: 25000,
    lead_time_days: 1,
    bulk_discount_available: true,
    credit_terms_available: true,
    insurance_coverage: true,
    services_offered: ["Same-day Delivery", "Technical Consultation", "Custom Fabrication"],
    delivery_methods: ["Express Delivery", "Standard Delivery", "Heavy Transport"],
    payment_methods: ["Bank Transfer", "Mobile Money", "Credit Terms"],
    warranty_offered: true,
    warranty_period_months: 12,
    established_year: 2008,
    annual_revenue_range: "50M-100M",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "demo-user-2"
  },
  {
    id: "demo-3",
    company_name: "Crown Paints Kenya", 
    address: "Nairobi",
    rating: 4.7,
    total_reviews: 67,
    specialties: ["Paint", "Coatings", "Construction Chemicals"],
    materials_offered: ["Emulsion Paint", "Primer", "Wood Stain"],
    is_verified: true,
    business_type: "Distributor",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "demo-user-3"
  },
  {
    id: "demo-4",
    company_name: "Tile & Carpet Centre",
    address: "Nairobi",
    rating: 4.6,
    specialties: ["Tiles", "Carpets", "Flooring Solutions"],
    materials_offered: ["Ceramic Tiles", "Porcelain Tiles", "Carpets"],
    is_verified: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "demo-user-4"
  },
  {
    id: "demo-5",
    company_name: "Mabati Rolling Mills",
    address: "Nakuru", 
    rating: 4.8,
    specialties: ["Iron Sheets", "Roofing", "Steel Products"],
    materials_offered: ["Roofing Sheets", "Gutters", "Ridge Caps"],
    is_verified: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "demo-user-5"
  },
  {
    id: "demo-6",
    company_name: "Homa Lime Company",
    address: "Homa Bay",
    rating: 4.4,
    specialties: ["Lime", "Aggregates", "Mining Products"],
    materials_offered: ["Lime", "Sand", "Ballast"],
    is_verified: false,
    created_at: "2024-01-01T00:00:00Z", 
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "demo-user-6"
  }
];

type SupplierSource = "registered" | "sample";

interface SupplierGridProps {
  onSupplierSelect?: (supplier: Supplier) => void;
  onQuoteRequest?: (supplier: Supplier) => void;
}

export const SupplierGrid = ({ onSupplierSelect, onQuoteRequest }: SupplierGridProps) => {
  const [filters, setFilters] = useState<SupplierFiltersType & {
    deliveryRadius?: number;
    priceRange?: [number, number];
    hasDelivery?: boolean;
  }>({
    search: "",
    category: "All Categories",
    location: "",
    rating: 0,
    verified: null,
    deliveryRadius: 50,
    priceRange: [0, 10000],
    hasDelivery: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [supplierSource, setSupplierSource] = useState<SupplierSource>("sample");
  const [retryCount, setRetryCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSupplierForReview, setSelectedSupplierForReview] = useState<any>(null);
  const { toast } = useToast();

  // Check user authentication and role
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          
          setUserRole((roleData?.role as UserRole) || 'builder');
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };
    
    checkUserStatus();
  }, []);

  const { suppliers: dbSuppliers, loading, error, totalCount, refetch } = useSuppliers(
    filters,
    supplierSource === "registered" ? currentPage : 1,
    SUPPLIERS_PER_PAGE
  );

  // Enhanced fallback and error handling for better supplier coverage
  const [showingFallback, setShowingFallback] = useState(false);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);
  
  useEffect(() => {
    // For non-admin users, always show demo data as they can't access registered suppliers
    if (supplierSource === "registered") {
      if (userRole !== 'admin') {
        // Non-admin users should use sample data only
        setShowingFallback(true);
      } else if (!loading && dbSuppliers.length === 0) {
        // Admin users with no registered suppliers found, show demo data as fallback
        setShowingFallback(true);
      } else if (dbSuppliers.length > 0) {
        setLastSuccessfulFetch(new Date());
        setShowingFallback(false);
      }
    }
  }, [loading, dbSuppliers.length, supplierSource, userRole]);

  // Filter demo suppliers based on current filters
  const getFilteredDemoSuppliers = () => {
    let filtered = DEMO_SUPPLIERS;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(supplier => 
        supplier.company_name.toLowerCase().includes(searchLower) ||
        supplier.specialties.some(s => s.toLowerCase().includes(searchLower)) ||
        supplier.materials_offered.some(m => m.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.category && filters.category !== "All Categories") {
      filtered = filtered.filter(supplier =>
        supplier.specialties.includes(filters.category)
      );
    }
    
    if (filters.rating > 0) {
      filtered = filtered.filter(supplier => supplier.rating >= filters.rating);
    }
    
    if (filters.verified !== null) {
      filtered = filtered.filter(supplier => supplier.is_verified === filters.verified);
    }
    
    return filtered;
  };

  const demoSuppliers = getFilteredDemoSuppliers();
  const demoTotalPages = Math.ceil(demoSuppliers.length / SUPPLIERS_PER_PAGE);
  const paginatedDemoSuppliers = demoSuppliers.slice(
    (currentPage - 1) * SUPPLIERS_PER_PAGE,
    currentPage * SUPPLIERS_PER_PAGE
  );

  // Only admin users can access the ultra-secure suppliers directory
  const suppliers = userRole === 'admin' && dbSuppliers.length > 0 ? dbSuppliers : [];
    
  const currentTotalCount = userRole === 'admin' ? totalCount : 0;
    
  const totalPages = userRole === 'admin' && totalCount > 0 
    ? Math.ceil(totalCount / SUPPLIERS_PER_PAGE) 
    : 1;
    
  const isLoading = userRole === 'admin' ? loading : false;

  const handleViewCatalog = (supplier: Supplier) => {
    console.log("View catalog for:", supplier.company_name);
    onSupplierSelect?.(supplier);
  };

  const handleRequestQuote = (supplier: Supplier) => {
    console.log("Request quote from:", supplier.company_name);
    onQuoteRequest?.(supplier);
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSourceChange = (source: SupplierSource) => {
    // Only allow admin users to access the ultra-secure suppliers directory
    if (!isAuthenticated || userRole !== 'admin') {
      console.log('SECURITY: Ultra-secure suppliers directory access restricted to administrators only');
      return;
    }
    setSupplierSource(source);
    setCurrentPage(1);
    setShowingFallback(false);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  const handleReviewSupplier = (supplier: any) => {
    setSelectedSupplierForReview(supplier);
    setShowReviewModal(true);
  };

  const handleSubmitReview = (reviewData: SupplierReviewData) => {
    // In a real app, this would save to the database
    console.log('Submitting supplier review:', reviewData, 'for supplier:', selectedSupplierForReview?.id);
    
    toast({
      title: "Review Submitted Successfully!",
      description: `Thank you for reviewing ${selectedSupplierForReview?.company_name}. Your feedback helps other builders make informed purchasing decisions.`,
    });
    
    setShowReviewModal(false);
    setSelectedSupplierForReview(null);
  };

  if (error && supplierSource === "registered") {
    // Show specific message for admin access restriction
    if (error.includes('restricted to administrators') || error.includes('Authentication required')) {
      return (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">🔒 Suppliers Directory Access Restricted</p>
              <p className="text-sm mt-1">
                Access to the registered suppliers directory is restricted to administrators only for security purposes.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
              Sign In for Access
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-medium">Unable to load registered suppliers</p>
            <p className="text-sm mt-1">
              {error} {lastSuccessfulFetch && `(Last successful fetch: ${lastSuccessfulFetch.toLocaleTimeString()})`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
              Sign In for Access
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
      <div className="space-y-6">
        {/* Enhanced Data Source Selection */}
        <DataSourceSelector
          currentSource={supplierSource}
          onSourceChange={handleSourceChange}
          registeredCount={totalCount}
          sampleCount={DEMO_SUPPLIERS.length}
          isLoading={isLoading}
          hasError={!!error}
          showingFallback={showingFallback}
        />

        <AdvancedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          resultCount={supplierSource === "sample" ? demoSuppliers.length : currentTotalCount}
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Loading suppliers..." />
          </div>
        ) : supplierSource === "sample" ? (
          <>
            {/* Demo Suppliers Display */}
            {paginatedDemoSuppliers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No suppliers found matching your criteria.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedDemoSuppliers.map((supplier) => (
                    <SecureSupplierCard
                      key={supplier.id}
                      supplier={supplier}
                      onViewCatalog={handleViewCatalog}
                      onRequestQuote={handleRequestQuote}
                      onReviewSupplier={handleReviewSupplier}
                      isAuthenticated={isAuthenticated}
                      userRole={userRole}
                    />
                  ))}
                </div>

                {demoTotalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <CustomPagination
                      currentPage={currentPage}
                      totalPages={demoTotalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12">
            <div className="space-y-4">
              <p className="text-muted-foreground text-lg">
                🏗️ Building our supplier network...
              </p>
              <p className="text-sm text-muted-foreground">
                We're working to bring you the best construction suppliers across Kenya. 
                Check back soon for more options!
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/auth'}
                className="mt-4"
              >
                Sign In for Access
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Ultra-Secure Suppliers Directory Notice - ADMIN ACCESS REQUIRED */}
            <Alert className="border-red-200 bg-red-50 mb-6">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>🔒 Ultra-Secure Suppliers Directory Access:</strong> 
                {userRole === 'admin' 
                  ? " Admin access granted. Ultra-secure directory with maximum protection protocols active."
                  : " Ultra-secure suppliers directory access is restricted to administrators only. Maximum security protocols enforced."
                }
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suppliers.map((supplier) => (
                <SecureSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onViewCatalog={handleViewCatalog}
                  onRequestQuote={handleRequestQuote}
                  onReviewSupplier={handleReviewSupplier}
                  isAuthenticated={isAuthenticated}
                  userRole={userRole}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <CustomPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}

        {/* Supplier Review Modal */}
        {selectedSupplierForReview && (
          <SupplierReviewModal
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setSelectedSupplierForReview(null);
            }}
            supplierName={selectedSupplierForReview.company_name}
            supplierId={selectedSupplierForReview.id}
            onSubmitReview={handleSubmitReview}
          />
        )}
      </div>
  );
};