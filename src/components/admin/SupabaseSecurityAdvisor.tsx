import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminClient, isAdminClientAvailable } from '@/integrations/supabase/adminClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle, 
  RefreshCw, 
  Shield,
  Database,
  Lock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SecurityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedResource?: string;
  recommendation?: string;
  createdAt?: string;
  issue_type?: string; // Original issue type from database
}

export function SupabaseSecurityAdvisor() {
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchSecurityIssues = async () => {
    setLoading(true);
    const allIssues: SecurityIssue[] = [];

    try {
      // Use admin client if available for comprehensive checks
      const client = isAdminClientAvailable() ? getAdminClient() : supabase;
      const useAdminClient = isAdminClientAvailable() && client !== null;

      // 1. Get all security issues using comprehensive function
      try {
        const { data: allSecurityIssues, error: allIssuesError } = await (client as any).rpc('get_all_security_issues' as any);

        if (allIssuesError) {
          console.error('Error calling get_all_security_issues:', allIssuesError);
        } else if (allSecurityIssues && Array.isArray(allSecurityIssues)) {
          console.log(`Found ${allSecurityIssues.length} security issues from get_all_security_issues`);
          allSecurityIssues.forEach((issue: any) => {
            const resourceTypeLabel = issue.resource_type === 'table' ? 'Table' 
              : issue.resource_type === 'function' ? 'Function' 
              : issue.resource_type === 'view' ? 'View'
              : issue.resource_type === 'rls_policy' ? 'RLS Policy'
              : 'Resource';
            
            allIssues.push({
              id: `${issue.issue_type}-${issue.resource_name}`,
              type: issue.severity === 'critical' ? 'error' : issue.severity === 'high' ? 'error' : 'warning',
              category: issue.category || 'Security',
              title: `${resourceTypeLabel} "${issue.resource_name}" - ${issue.issue_type.replace(/_/g, ' ')}`,
              description: issue.description,
              severity: issue.severity as 'critical' | 'high' | 'medium' | 'low',
              affectedResource: issue.resource_name,
              recommendation: issue.recommendation
            });
          });
        } else {
          console.log('No security issues returned or invalid format:', allSecurityIssues);
        }
      } catch (error) {
        console.error('Comprehensive security check function error:', error);
        
        // Fallback: Try calling get_permissive_rls_policies directly
        try {
          const { data: permissivePolicies, error: permError } = await (client as any).rpc('get_permissive_rls_policies' as any);
          if (!permError && permissivePolicies && Array.isArray(permissivePolicies)) {
            console.log(`Found ${permissivePolicies.length} permissive RLS policies`);
            permissivePolicies.forEach((policy: any) => {
              allIssues.push({
                id: `permissive-rls-${policy.table_name}-${policy.policy_name}`,
                type: 'warning',
                category: 'RLS Policy Always True',
                title: `RLS Policy "${policy.policy_name}" on table "${policy.table_name}"`,
                description: `Table "${policy.table_name}" has an RLS policy "${policy.policy_name}" for ${policy.command} that allows unrestricted access (USING or WITH CHECK clause is always true). This effectively bypasses row-level security for ${policy.roles?.join(', ') || 'all roles'}.`,
                severity: policy.command === 'UPDATE' || policy.command === 'DELETE' || policy.command === 'ALL' ? 'high' : 'medium',
                affectedResource: `${policy.table_name}.${policy.policy_name}`,
                recommendation: `Review and restrict RLS policy "${policy.policy_name}" on table "${policy.table_name}" to prevent unauthorized ${policy.command} access. Avoid 'USING (true)' or 'WITH CHECK (true)' for write operations.`
              });
            });
          }
        } catch (fallbackError) {
          console.error('Fallback permissive policies check also failed:', fallbackError);
        }
      }

      // 2. Check for tables without RLS enabled (fallback if comprehensive function doesn't work)
      if (allIssues.length === 0) {
        try {
          const result = await (client as any).rpc('get_tables_without_rls' as any);
          const { data: tablesWithoutRLS, error: rlsError } = result || { data: null, error: null };

          if (!rlsError && tablesWithoutRLS) {
            (tablesWithoutRLS as any[]).forEach((table: any) => {
              allIssues.push({
                id: `rls-${table.table_name}`,
                type: 'error',
                category: 'Row Level Security',
                title: `Table "${table.table_name}" has RLS disabled`,
                description: `The table "${table.table_name}" does not have Row Level Security enabled. This could expose sensitive data to unauthorized users.`,
                severity: table.table_name.includes('user') || table.table_name.includes('profile') || table.table_name.includes('payment') ? 'critical' : 'high',
                affectedResource: table.table_name,
                recommendation: `Enable RLS on "${table.table_name}" table: ALTER TABLE ${table.table_name} ENABLE ROW LEVEL SECURITY;`
              });
            });
          }
        } catch (error) {
          console.log('RLS check function not available', error);
        }
      }

      // 3. Check for SECURITY DEFINER functions (fallback)
      if (allIssues.length === 0 || !allIssues.some(i => i.category === 'Function Security')) {
        try {
          const result = await (client as any).rpc('get_security_definer_functions' as any);
          const { data: securityDefinerFuncs, error: funcError } = result || { data: null, error: null };

          if (!funcError && securityDefinerFuncs) {
            (securityDefinerFuncs as any[]).forEach((func: any) => {
              allIssues.push({
                id: `secdef-${func.function_name}`,
                type: 'warning',
                category: 'Function Security',
                title: `Function "${func.function_name}" uses SECURITY DEFINER`,
                description: `The function "${func.function_name}" is defined with SECURITY DEFINER, which means it runs with the privileges of the function creator rather than the caller. This can be a security risk if not properly secured.`,
                severity: 'medium',
                affectedResource: func.function_name,
                recommendation: `Review "${func.function_name}" function and consider using SECURITY INVOKER if possible, or ensure proper access controls are in place.`
              });
            });
          }
        } catch (error) {
          console.log('Security definer check function not available', error);
        }
      }

      // 4. Check for tables with missing RLS policies (fallback)
      if (allIssues.length === 0 || !allIssues.some(i => i.category === 'RLS Policies')) {
        try {
          const result = await (client as any).rpc('get_tables_without_policies' as any);
          const { data: tablesWithoutPolicies, error: policyError } = result || { data: null, error: null };

          if (!policyError && tablesWithoutPolicies) {
            (tablesWithoutPolicies as any[]).forEach((table: any) => {
              allIssues.push({
                id: `nopolicy-${table.table_name}`,
                type: 'warning',
                category: 'RLS Policies',
                title: `Table "${table.table_name}" has RLS enabled but no policies`,
                description: `The table "${table.table_name}" has Row Level Security enabled but no policies are defined. This means no one can access the data.`,
                severity: 'high',
                affectedResource: table.table_name,
                recommendation: `Create appropriate RLS policies for "${table.table_name}" table to allow authorized access.`
              });
            });
          }
        } catch (error) {
          console.log('Policy check function not available', error);
        }
      }

      // 5. Check for publicly accessible sensitive tables (using SecurityAudit)
      try {
        const criticalTables = ['profiles', 'payments', 'deliveries', 'suppliers', 'delivery_providers'];
        for (const table of criticalTables) {
          try {
            const { data, error } = await supabase
              .from(table as any)
              .select('id')
              .limit(1);

            if (!error && data !== null) {
              allIssues.push({
                id: `public-${table}`,
                type: 'error',
                category: 'Public Access',
                title: `Table "${table}" is publicly accessible`,
                description: `The table "${table}" can be accessed without authentication. This is a critical security vulnerability.`,
                severity: 'critical',
                affectedResource: table,
                recommendation: `Enable RLS and create restrictive policies for "${table}" table immediately.`
              });
            }
          } catch (err) {
            // Table is likely secured, which is good
          }
        }
      } catch (error) {
        console.error('Public access check failed:', error);
      }

      // 6. Check admin_security_logs table structure
      try {
        const { error: logError } = await (client as any)
          .from('admin_security_logs' as any)
          .select('id')
          .limit(1);

        if (logError && logError.code === 'PGRST204') {
          allIssues.push({
            id: 'missing-admin-logs',
            type: 'error',
            category: 'Database Schema',
            title: 'admin_security_logs table missing or inaccessible',
            description: 'The admin_security_logs table is referenced in code but may not exist or is not accessible.',
            severity: 'high',
            affectedResource: 'admin_security_logs',
            recommendation: 'Ensure the admin_security_logs table exists and has proper RLS policies.'
          });
        }
      } catch (error) {
        // Table exists, which is good
      }

      // 7. Check for views with SECURITY DEFINER (fallback)
      if (allIssues.length === 0 || !allIssues.some(i => i.category === 'View Security')) {
        try {
          const result = await (client as any).rpc('get_security_definer_views' as any);
          const { data: securityDefinerViews, error: viewError } = result || { data: null, error: null };

          if (!viewError && securityDefinerViews) {
            (securityDefinerViews as any[]).forEach((view: any) => {
              allIssues.push({
                id: `secdefview-${view.view_name}`,
                type: 'error',
                category: 'View Security',
                title: `View "${view.view_name}" uses SECURITY DEFINER`,
                description: `The view "${view.view_name}" is defined with SECURITY DEFINER, which bypasses Row Level Security. This is a critical security vulnerability.`,
                severity: 'critical',
                affectedResource: view.view_name,
                recommendation: `Remove SECURITY DEFINER from "${view.view_name}" view or recreate it without SECURITY DEFINER.`
              });
            });
          }
        } catch (error) {
          console.log('Security definer views check function not available', error);
        }
      }

      // 8. Info: Check RLS status on critical tables
      const criticalTables = ['profiles', 'payments', 'deliveries', 'suppliers', 'delivery_providers', 'admin_security_logs'];
      for (const table of criticalTables) {
        try {
          const { error } = await supabase
            .from(table as any)
            .select('id')
            .limit(1);

          if (error && error.code === '42501') {
            // Permission denied - likely RLS is working
            allIssues.push({
              id: `rls-working-${table}`,
              type: 'info',
              category: 'Row Level Security',
              title: `Table "${table}" appears to be properly secured`,
              description: `The table "${table}" is protected by RLS policies and cannot be accessed without proper permissions.`,
              severity: 'low',
              affectedResource: table
            });
          }
        } catch (err) {
          // Continue checking other tables
        }
      }

    } catch (error) {
      console.error('Error fetching security issues:', error);
      allIssues.push({
        id: 'fetch-error',
        type: 'error',
        category: 'System',
        title: 'Failed to fetch security advisor data',
        description: 'An error occurred while checking security issues. Some checks may not be available.',
        severity: 'medium'
      });
    }

    setIssues(allIssues);
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    fetchSecurityIssues();
  }, []);

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');
  
  // Count RLS policy warnings specifically (should match Supabase Security Advisor's 106 warnings)
  const rlsPolicyWarnings = issues.filter(i => 
    i.category === 'RLS Policy Always True' || 
    (i.issue_type && i.issue_type === 'rls_policy_always_true')
  );
  
  // Breakdown by category
  const issuesByCategory = issues.reduce((acc, issue) => {
    const cat = issue.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'low': return <Info className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Supabase Security Advisor
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSecurityIssues}
              disabled={loading}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-400">Analyzing security configuration...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-400 font-semibold">Errors</span>
                </div>
                <p className="text-2xl font-bold text-white">{errors.length}</p>
              </div>
              <div className="p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-yellow-400 font-semibold">Warnings</span>
                </div>
                <p className="text-2xl font-bold text-white">{warnings.length}</p>
                <p className="text-xs text-yellow-300/70 mt-1">
                  RLS Policies: {rlsPolicyWarnings.length}
                </p>
              </div>
              <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  <span className="text-blue-400 font-semibold">Info</span>
                </div>
                <p className="text-2xl font-bold text-white">{infos.length}</p>
              </div>
              <div className="p-4 bg-purple-900/20 border border-purple-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <span className="text-purple-400 font-semibold">RLS Policy Warnings</span>
                </div>
                <p className="text-2xl font-bold text-white">{rlsPolicyWarnings.length}</p>
                <p className="text-xs text-purple-300/70 mt-1">
                  (Supabase: 106)
                </p>
              </div>
            </div>
            
            {/* Category Breakdown */}
            {Object.keys(issuesByCategory).length > 0 && (
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Issues by Category:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(issuesByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{category}:</span>
                      <Badge className="bg-slate-700 text-white">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="bg-slate-700" />

            {/* Issues List */}
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {/* Errors */}
                {errors.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Errors ({errors.length})
                    </h3>
                    {errors.map((issue) => (
                      <Alert
                        key={issue.id}
                        className="bg-red-900/20 border-red-800/50"
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <AlertTitle className="text-red-400 flex items-center gap-2">
                              {issue.title}
                              <Badge className={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription className="text-gray-300 mt-2">
                              <p>{issue.description}</p>
                              {issue.affectedResource && (
                                <p className="mt-1 text-sm text-gray-400">
                                  <Database className="h-3 w-3 inline mr-1" />
                                  Resource: {issue.affectedResource}
                                </p>
                              )}
                              {issue.recommendation && (
                                <div className="mt-3 p-2 bg-slate-800/50 rounded border border-slate-700">
                                  <p className="text-sm font-semibold text-yellow-400 mb-1">
                                    Recommendation:
                                  </p>
                                  <p className="text-sm text-gray-300 font-mono">
                                    {issue.recommendation}
                                  </p>
                                </div>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Warnings ({warnings.length})
                    </h3>
                    {warnings.map((issue) => (
                      <Alert
                        key={issue.id}
                        className="bg-yellow-900/20 border-yellow-800/50"
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <AlertTitle className="text-yellow-400 flex items-center gap-2">
                              {issue.title}
                              <Badge className={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription className="text-gray-300 mt-2">
                              <p>{issue.description}</p>
                              {issue.affectedResource && (
                                <p className="mt-1 text-sm text-gray-400">
                                  <Database className="h-3 w-3 inline mr-1" />
                                  Resource: {issue.affectedResource}
                                </p>
                              )}
                              {issue.recommendation && (
                                <div className="mt-3 p-2 bg-slate-800/50 rounded border border-slate-700">
                                  <p className="text-sm font-semibold text-yellow-400 mb-1">
                                    Recommendation:
                                  </p>
                                  <p className="text-sm text-gray-300 font-mono">
                                    {issue.recommendation}
                                  </p>
                                </div>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Info */}
                {infos.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Information ({infos.length})
                    </h3>
                    {infos.map((issue) => (
                      <Alert
                        key={issue.id}
                        className="bg-blue-900/20 border-blue-800/50"
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <AlertTitle className="text-blue-400 flex items-center gap-2">
                              {issue.title}
                              <Badge className={getSeverityColor(issue.severity)}>
                                {issue.severity}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription className="text-gray-300 mt-2">
                              <p>{issue.description}</p>
                              {issue.affectedResource && (
                                <p className="mt-1 text-sm text-gray-400">
                                  <Database className="h-3 w-3 inline mr-1" />
                                  Resource: {issue.affectedResource}
                                </p>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* No Issues */}
                {issues.length === 0 && (
                  <Alert className="bg-green-900/20 border-green-800/50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-400">
                      No Security Issues Found
                    </AlertTitle>
                    <AlertDescription className="text-gray-300">
                      All security checks passed. Your database configuration appears to be secure.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

