import { AlertCircle, RefreshCw, WifiOff, Database, Lock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FriendlyErrorProps {
  error: string | Error | null;
  onRetry?: () => void;
  context?: 'database' | 'network' | 'permission' | 'camera' | 'general';
  showDetails?: boolean;
}

// Map technical errors to user-friendly messages
const getErrorInfo = (error: string | Error | null, context?: string) => {
  const errorMessage = error instanceof Error ? error.message : error || '';
  const errorLower = errorMessage.toLowerCase();
  
  // Database errors
  if (errorLower.includes('column') && errorLower.includes('does not exist')) {
    return {
      icon: Database,
      title: "Database Update Required",
      message: "The database needs to be updated with new features. Please contact your administrator to run the latest migrations.",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/30"
    };
  }
  
  if (errorLower.includes('permission denied') || errorLower.includes('rls') || errorLower.includes('policy')) {
    return {
      icon: Lock,
      title: "Access Restricted",
      message: "You don't have permission to access this resource. Please check your login status or contact an administrator.",
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/30"
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
    return {
      icon: WifiOff,
      title: "Connection Issue",
      message: "Unable to connect to the server. Please check your internet connection and try again.",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10 border-orange-500/30"
    };
  }
  
  if (errorLower.includes('timeout')) {
    return {
      icon: RefreshCw,
      title: "Request Timed Out",
      message: "The server is taking too long to respond. Please try again in a moment.",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10 border-yellow-500/30"
    };
  }
  
  // Camera-specific errors
  if (context === 'camera') {
    if (errorLower.includes('notallowederror') || errorLower.includes('permission denied')) {
      return {
        icon: Lock,
        title: "Camera Permission Denied",
        message: "Please allow camera access in your browser settings to use this feature.",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10 border-amber-500/30"
      };
    }
    if (errorLower.includes('notfounderror') || errorLower.includes('no camera')) {
      return {
        icon: HelpCircle,
        title: "No Camera Found",
        message: "Please connect a camera to your device and ensure it's properly installed.",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10 border-blue-500/30"
      };
    }
    if (errorLower.includes('notreadableerror') || errorLower.includes('in use')) {
      return {
        icon: AlertCircle,
        title: "Camera In Use",
        message: "The camera is being used by another application. Please close other apps using the camera and try again.",
        color: "text-purple-400",
        bgColor: "bg-purple-500/10 border-purple-500/30"
      };
    }
  }
  
  // Default error
  return {
    icon: AlertCircle,
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again or contact support if the problem persists.",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/30"
  };
};

export function FriendlyError({ error, onRetry, context, showDetails = false }: FriendlyErrorProps) {
  const errorInfo = getErrorInfo(error, context);
  const Icon = errorInfo.icon;
  const errorMessage = error instanceof Error ? error.message : error;
  
  return (
    <div className={`rounded-lg border p-4 ${errorInfo.bgColor}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${errorInfo.color}`} />
        <div className="flex-1 space-y-2">
          <h4 className={`font-medium ${errorInfo.color}`}>{errorInfo.title}</h4>
          <p className="text-sm text-gray-300">{errorInfo.message}</p>
          
          {showDetails && errorMessage && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs text-gray-500 bg-black/20 p-2 rounded overflow-x-auto">
                {errorMessage}
              </pre>
            </details>
          )}
          
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="mt-2 border-slate-600 hover:bg-slate-700"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline error for form fields
export function InlineError({ message }: { message: string }) {
  return (
    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

// Toast-friendly error message generator
export function getToastError(error: string | Error | null, context?: string) {
  const errorInfo = getErrorInfo(error, context);
  return {
    title: errorInfo.title,
    description: errorInfo.message,
    variant: "destructive" as const
  };
}























