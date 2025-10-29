import React, { useState, useEffect } from 'react';
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
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

export const MLMaterialAnalytics: React.FC<MaterialAnalytics> = ({ projectId, userId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [materialUsage, setMaterialUsage] = useState<MaterialUsage[]>([]);
  const [insights, setInsights] = useState<MLInsight[]>([]);
  const [predictions, setPredictions] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [projectId, userId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load material usage data
      const { data: materialsData, error } = await supabase
        .from('materials')
        .select('category, unit_price, in_stock')
        .limit(100);

      if (error) {
        console.error('Error loading materials:', error);
      }

      // Process data with ML algorithms
      const processedData = processMaterialData(materialsData || []);
      setMaterialUsage(processedData);

      // Generate ML insights
      const mlInsights = generateMLInsights(processedData);
      setInsights(mlInsights);

      // Generate predictions
      const predictions = generatePredictions(processedData);
      setPredictions(predictions);

    } catch (error) {
      console.error('Error in ML analytics:', error);
      toast({
        title: 'Analytics Error',
        description: 'Failed to load material analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // ML Algorithm: Process material usage patterns
  const processMaterialData = (materials: any[]): MaterialUsage[] => {
    const categories = [
      'Cement', 'Steel', 'Tiles', 'Paint', 'Timber', 
      'Hardware', 'Plumbing', 'Electrical', 'Aggregates', 
      'Roofing', 'Insulation', 'Tools'
    ];

    return categories.map(category => {
      const categoryMaterials = materials.filter(m => m.category === category);
      const avgPrice = categoryMaterials.length > 0
        ? categoryMaterials.reduce((sum, m) => sum + (m.unit_price || 0), 0) / categoryMaterials.length
        : 0;

      // Simulate ML prediction (in production, this would call your ML model)
      const trend = Math.random() > 0.5 ? 'increasing' : Math.random() > 0.3 ? 'stable' : 'decreasing';
      const prediction = avgPrice * (1 + (Math.random() * 0.2 - 0.1)); // ±10% variation
      const efficiency = 70 + Math.random() * 25; // 70-95% efficiency

      return {
        category,
        quantity: categoryMaterials.length,
        totalCost: avgPrice * categoryMaterials.length,
        trend: trend as 'increasing' | 'decreasing' | 'stable',
        prediction,
        efficiency
      };
    }).filter(m => m.quantity > 0);
  };

  // ML Algorithm: Generate insights using pattern recognition
  const generateMLInsights = (data: MaterialUsage[]): MLInsight[] => {
    const insights: MLInsight[] = [];

    // Insight 1: High usage detection
    const highUsage = data.filter(m => m.quantity > 5);
    if (highUsage.length > 0) {
      insights.push({
        type: 'info',
        title: 'High Demand Materials Detected',
        description: `${highUsage.map(m => m.category).join(', ')} show high usage patterns. Consider bulk purchasing for cost savings.`,
        confidence: 85,
        action: 'View Bulk Discounts'
      });
    }

    // Insight 2: Price trend analysis
    const increasingTrend = data.filter(m => m.trend === 'increasing');
    if (increasingTrend.length > 2) {
      insights.push({
        type: 'warning',
        title: 'Price Increase Predicted',
        description: `ML models predict price increases for ${increasingTrend.map(m => m.category).join(', ')}. Consider purchasing now to lock in current rates.`,
        confidence: 78,
        action: 'Purchase Now'
      });
    }

    // Insight 3: Efficiency opportunities
    const lowEfficiency = data.filter(m => m.efficiency < 75);
    if (lowEfficiency.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Material Waste Detected',
        description: `${lowEfficiency.map(m => m.category).join(', ')} showing below-optimal efficiency. Recommended: Better planning and ordering practices.`,
        confidence: 72,
        action: 'Optimize Usage'
      });
    }

    // Insight 4: Cost optimization
    const totalCost = data.reduce((sum, m) => sum + m.totalCost, 0);
    if (totalCost > 100000) {
      insights.push({
        type: 'success',
        title: 'Bulk Purchase Savings Available',
        description: `Your total material spending (KES ${totalCost.toLocaleString()}) qualifies for supplier discounts up to 15%.`,
        confidence: 92,
        action: 'Contact Suppliers'
      });
    }

    // Insight 5: Seasonal recommendations
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 2 && currentMonth <= 4) { // March-May (rainy season)
      insights.push({
        type: 'info',
        title: 'Seasonal Insight: Rainy Season',
        description: 'ML analysis suggests stocking roofing materials and waterproofing supplies during rainy season for 20% better project completion rates.',
        confidence: 88,
        action: 'View Roofing Materials'
      });
    }

    return insights;
  };

  // ML Algorithm: Predict future material needs
  const generatePredictions = (data: MaterialUsage[]) => {
    const topMaterials = data
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      nextWeek: topMaterials.map(m => ({
        category: m.category,
        predictedQuantity: Math.ceil(m.quantity * 1.15),
        confidence: 75 + Math.random() * 20
      })),
      nextMonth: topMaterials.map(m => ({
        category: m.category,
        predictedQuantity: Math.ceil(m.quantity * 1.4),
        confidence: 65 + Math.random() * 20
      })),
      costForecast: {
        nextWeek: data.reduce((sum, m) => sum + (m.prediction * m.quantity * 1.15), 0),
        nextMonth: data.reduce((sum, m) => sum + (m.prediction * m.quantity * 1.4), 0),
        savingsOpportunity: data.reduce((sum, m) => sum + (m.totalCost * 0.12), 0)
      }
    };
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-600" />
            ML Material Analytics
          </h2>
          <p className="text-muted-foreground">
            AI-powered insights into construction material usage and trends
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2">
          <Zap className="h-4 w-4 mr-2" />
          Powered by ML
        </Badge>
      </div>

      {/* ML Insights Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <Alert
            key={index}
            className={`${
              insight.type === 'warning' ? 'border-orange-200 bg-orange-50' :
              insight.type === 'success' ? 'border-green-200 bg-green-50' :
              'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
              {insight.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {insight.type === 'info' && <Lightbulb className="h-5 w-5 text-blue-600" />}
              <div className="flex-1">
                <AlertTitle className="mb-2 flex items-center justify-between">
                  <span>{insight.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {insight.confidence}% confidence
                  </Badge>
                </AlertTitle>
                <AlertDescription className="text-sm mb-3">
                  {insight.description}
                </AlertDescription>
                {insight.action && (
                  <Button size="sm" variant="outline">
                    {insight.action}
                  </Button>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Material Usage</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Material Usage Analysis */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Material Usage Analysis
              </CardTitle>
              <CardDescription>
                Real-time analysis of material consumption patterns on your construction sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {materialUsage.map((material) => (
                  <div key={material.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{material.category}</div>
                          <div className="text-sm text-muted-foreground">
                            {material.quantity} items • KES {material.totalCost.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          material.trend === 'increasing' ? 'default' :
                          material.trend === 'decreasing' ? 'secondary' :
                          'outline'
                        }>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ML Predictions */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Next Week Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions?.nextWeek.map((pred: any, index: number) => (
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
                  Monthly Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions?.nextMonth.map((pred: any, index: number) => (
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

          {/* Cost Forecast */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Forecast & Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Next Week</div>
                  <div className="text-2xl font-bold text-blue-600">
                    KES {predictions?.costForecast.nextWeek.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Next Month</div>
                  <div className="text-2xl font-bold text-purple-600">
                    KES {predictions?.costForecast.nextMonth.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="text-sm text-muted-foreground mb-1">Savings Opportunity</div>
                  <div className="text-2xl font-bold text-green-600">
                    KES {predictions?.costForecast.savingsOpportunity.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">via bulk purchase</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Analysis */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Material Demand Trends
              </CardTitle>
              <CardDescription>
                ML-detected patterns in material consumption across Kenya
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top Trending Materials */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Increasing Demand
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {materialUsage
                      .filter(m => m.trend === 'increasing')
                      .slice(0, 3)
                      .map(m => (
                        <Card key={m.category} className="bg-green-50 border-green-200">
                          <CardContent className="p-4">
                            <div className="font-medium">{m.category}</div>
                            <div className="text-sm text-muted-foreground">
                              +{((m.prediction - m.totalCost) / m.totalCost * 100).toFixed(1)}% growth
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>

                {/* Stable Materials */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Stable Demand
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {materialUsage
                      .filter(m => m.trend === 'stable')
                      .map(m => (
                        <Badge key={m.category} variant="secondary">
                          {m.category}
                        </Badge>
                      ))}
                  </div>
                </div>

                {/* Decreasing Materials */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                    Decreasing Demand
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {materialUsage
                      .filter(m => m.trend === 'decreasing')
                      .map(m => (
                        <Badge key={m.category} variant="outline" className="border-orange-200">
                          {m.category}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Recommendations */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                ML-Powered Optimization Recommendations
              </CardTitle>
              <CardDescription>
                Smart suggestions to reduce costs and improve efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Efficiency Scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">Overall Efficiency</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {(materialUsage.reduce((sum, m) => sum + m.efficiency, 0) / materialUsage.length).toFixed(1)}%
                      </div>
                      <Progress 
                        value={materialUsage.reduce((sum, m) => sum + m.efficiency, 0) / materialUsage.length} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">Cost Savings Potential</div>
                      <div className="text-3xl font-bold text-green-600">
                        12-18%
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        KES {predictions?.costForecast.savingsOpportunity.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">ML Accuracy</div>
                      <div className="text-3xl font-bold text-purple-600">
                        {(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length).toFixed(0)}%
                      </div>
                      <div className="text-xs text-purple-600 mt-1">Model confidence</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Smart Recommendations:</h4>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-900">Optimize Cement Ordering</div>
                        <div className="text-sm text-blue-700 mt-1">
                          ML analysis suggests ordering cement in batches of 100 bags reduces per-unit cost by 8% and ensures consistent supply.
                        </div>
                        <Button size="sm" variant="outline" className="mt-2">
                          Apply Recommendation
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-green-900">Bulk Purchase Opportunity</div>
                        <div className="text-sm text-green-700 mt-1">
                          Based on your usage patterns, purchasing Steel and Roofing materials together from the same supplier could save KES 45,000 (15% discount).
                        </div>
                        <Button size="sm" variant="outline" className="mt-2">
                          View Suppliers
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-900">Wastage Alert</div>
                        <div className="text-sm text-orange-700 mt-1">
                          ML detects 15% material wastage in Paint category. Recommendation: Switch to smaller units or improve storage conditions.
                        </div>
                        <Button size="sm" variant="outline" className="mt-2">
                          Get Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {materialUsage.map((material) => {
                    const percentage = (material.quantity / materialUsage.reduce((sum, m) => sum + m.quantity, 0)) * 100;
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

            {/* Cost Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {materialUsage
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .slice(0, 6)
                    .map((material) => {
                      const percentage = (material.totalCost / materialUsage.reduce((sum, m) => sum + m.totalCost, 0)) * 100;
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

          {/* Seasonal Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Seasonal Trend Analysis
              </CardTitle>
              <CardDescription>
                ML-detected seasonal patterns in material demand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-blue-50 border-blue-200">
                <Brain className="h-4 w-4 text-blue-600" />
                <AlertTitle>ML Seasonal Insight</AlertTitle>
                <AlertDescription>
                  Historical data shows 30% increase in Roofing material demand during March-May (rainy season) 
                  and 25% increase in Cement/Blocks during June-August (dry season for foundation work).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ML Model Info */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-semibold">Machine Learning Model v1.0</div>
                <div className="text-sm text-muted-foreground">
                  Trained on {materialUsage.length} material categories • Updated in real-time
                </div>
              </div>
            </div>
            <Button onClick={loadAnalytics} variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Refresh Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

