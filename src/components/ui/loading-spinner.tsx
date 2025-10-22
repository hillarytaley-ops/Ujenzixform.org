import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({ 
  className, 
  message = "Loading...", 
  size = "md" 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
      <div 
        className={cn(
          "animate-spin rounded-full border-2 border-muted border-t-primary",
          sizeClasses[size]
        )}
      />
      {message && (
        <p className="text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  );
};