import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, TrendingUp, Users, Package, MapPin, Clock, AlertCircle } from "lucide-react";
import { useSupplierStats } from "@/hooks/useSupplierStats";
import { Button } from "@/components/ui/button";

export const RealTimeStats = () => {
  const { 
    totalSuppliers, 
    verifiedSuppliers, 
    totalProducts, 
    countiesServed, 
    loading, 
    error, 
    refetch 
  } = useSupplierStats();

  if (loading) {
    return (
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 text-center">
                  <Skeleton className="h-8 w-20 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-muted/50 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-3xl font-bold">Platform Statistics</h2>
            <div className="flex items-center gap-2">
              {!error && (
                <Badge variant="default" className="gap-1 bg-green-100 text-green-800 border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live Data
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                className="p-1 h-auto"
                title="Refresh statistics"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            Real-time insights into Kenya's largest construction marketplace
          </p>
        </div>

        {error && (
          <Alert className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Users className="h-8 w-8 text-primary" />
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">
                {totalSuppliers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Total Suppliers</div>
              <Badge variant="secondary" className="text-xs">
                {verifiedSuppliers} verified
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Package className="h-8 w-8 text-green-600" />
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {totalProducts.toLocaleString()}+
              </div>
              <div className="text-sm text-muted-foreground mb-2">Products Listed</div>
              <Badge variant="secondary" className="text-xs">
                Across all categories
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <MapPin className="h-8 w-8 text-red-600" />
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {countiesServed}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Counties Served</div>
              <Badge variant="secondary" className="text-xs">
                Nationwide coverage
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="h-8 w-8 text-primary" />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-3xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground mb-2">Customer Support</div>
              <Badge variant="secondary" className="text-xs">
                Always available
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Additional Insights */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground bg-background rounded-lg px-4 py-2 border">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              <span>Auto-refreshes on data changes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};