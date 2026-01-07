import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Building2, Store, Home, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LoginPortalProps {
  type?: 'builder' | 'supplier' | 'general';
  title?: string;
  description?: string;
  className?: string;
  redirectTo?: string;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ 
  type = 'general',
  title,
  description,
  className = '',
  redirectTo
}) => {
  // Determine if redirect is to a dashboard or marketplace
  const isDashboardRedirect = redirectTo?.includes('dashboard');
  const isMarketplaceRedirect = redirectTo?.includes('marketplace') || redirectTo?.includes('supplier');

  const getPortalConfig = () => {
    switch (type) {
      case 'builder':
        return {
          icon: isDashboardRedirect ? Building2 : ShoppingCart,
          defaultTitle: isDashboardRedirect ? 'Builder Dashboard Portal' : 'Builder Purchase Portal',
          defaultDescription: isDashboardRedirect 
            ? 'Access your builder dashboard, manage projects, track materials, and monitor construction sites.'
            : 'Sign in to browse and purchase quality construction materials from verified suppliers.',
          loginText: isDashboardRedirect ? 'Sign In to Dashboard' : 'Sign In to Purchase',
          registerText: 'Register as Builder',
          loginLink: redirectTo ? `/builder-signin?redirect=${encodeURIComponent(redirectTo)}` : '/builder-signin',
          registerLink: '/builder-registration',
          iconColor: 'text-blue-600',
          gradientFrom: 'from-blue-600',
          gradientTo: 'to-blue-700'
        };
      case 'supplier':
        return {
          icon: Store,
          defaultTitle: 'Supplier Portal',
          defaultDescription: 'Manage your inventory, process orders, track deliveries, and grow your supplier business.',
          loginText: 'Login as Supplier',
          registerText: 'Register as Supplier',
          loginLink: '/auth',
          registerLink: '/supplier-registration',
          iconColor: 'text-orange-600',
          gradientFrom: 'from-orange-600',
          gradientTo: 'to-orange-700'
        };
      default:
        return {
          icon: Home,
          defaultTitle: 'Access Your Account',
          defaultDescription: 'Login to access your personalized dashboard, manage projects, and connect with Kenya\'s construction community.',
          loginText: 'Login',
          registerText: 'Create Account',
          loginLink: '/auth',
          registerLink: '/auth',
          iconColor: 'text-primary',
          gradientFrom: 'from-primary',
          gradientTo: 'to-primary/80'
        };
    }
  };

  const config = getPortalConfig();
  const Icon = config.icon;

  return (
    <Card className={`max-w-md mx-auto shadow-xl border-2 hover:shadow-2xl transition-all duration-300 ${className}`}>
      <CardHeader className="text-center">
        <div className={`mx-auto mb-4 p-4 bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} rounded-full w-fit`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold">
          {title || config.defaultTitle}
        </CardTitle>
        <CardDescription className="text-base">
          {description || config.defaultDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link to={config.loginLink} className="block">
          <Button 
            className={`w-full bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} hover:opacity-90 text-white font-semibold py-6 text-lg`}
            size="lg"
          >
            <LogIn className="h-5 w-5 mr-2" />
            {config.loginText}
          </Button>
        </Link>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">or</span>
          </div>
        </div>

        <Link to={config.registerLink} className="block">
          <Button 
            variant="outline"
            className="w-full border-2 font-semibold py-6 text-lg hover:bg-gray-50"
            size="lg"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            {config.registerText}
          </Button>
        </Link>
        
        {/* Show redirect info if applicable */}
        {redirectTo && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            You'll be redirected to {isMarketplaceRedirect ? 'Supplier Marketplace' : 'your Dashboard'} after signing in
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginPortal;
