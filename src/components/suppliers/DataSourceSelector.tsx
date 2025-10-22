import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Users, Info, Wifi, WifiOff, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SupplierSource = "registered" | "sample";

interface DataSourceSelectorProps {
  currentSource: SupplierSource;
  onSourceChange: (source: SupplierSource) => void;
  registeredCount: number;
  sampleCount: number;
  isLoading: boolean;
  hasError: boolean;
  showingFallback: boolean;
}

export const DataSourceSelector = ({
  currentSource,
  onSourceChange,
  registeredCount,
  sampleCount,
  isLoading,
  hasError,
  showingFallback,
}: DataSourceSelectorProps) => {
  return (
    <Card className="border-muted">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Supplier Directory
            </CardTitle>
            <CardDescription>
              Ultra-secure suppliers directory with maximum protection protocols
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {currentSource === "registered" && !hasError && (
              <Badge variant="default" className="gap-1">
                <Wifi className="h-3 w-3" />
                Live Data
              </Badge>
            )}
            {showingFallback && (
              <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                <WifiOff className="h-3 w-3" />
                Fallback Mode
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* Ultra-Secure Suppliers Directory */}
          <Card 
            className="border-primary shadow-sm bg-primary/5"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Ultra-Secure Suppliers Directory</span>
                </div>
                <Badge variant="secondary">
                  {isLoading ? "Loading..." : registeredCount}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Ultra-secure suppliers directory with maximum protection protocols
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Ultra-secure access</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Maximum protection</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Admin restricted</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Messages */}
        {hasError && currentSource === "registered" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Unable to load registered suppliers. You can still browse sample data to explore the platform.
            </AlertDescription>
          </Alert>
        )}
        
        {showingFallback && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Automatically switched to sample data due to connection issues. 
              Real supplier data will be available when the connection is restored.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};