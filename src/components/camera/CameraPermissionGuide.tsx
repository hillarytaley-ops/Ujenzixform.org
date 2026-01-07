import { useState } from "react";
import { 
  Camera, 
  Monitor, 
  Chrome, 
  Globe, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CameraPermissionGuideProps {
  onRetry?: () => void;
  errorType?: 'denied' | 'not_found' | 'in_use' | 'not_supported' | 'unknown';
  compact?: boolean;
}

export function CameraPermissionGuide({ onRetry, errorType = 'unknown', compact = false }: CameraPermissionGuideProps) {
  const [expandedBrowser, setExpandedBrowser] = useState<string | null>(null);
  
  const browserInstructions = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      icon: Chrome,
      color: 'text-green-400',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Click "Site settings"',
        'Find "Camera" in the permissions list',
        'Change from "Block" to "Allow"',
        'Refresh the page and try again'
      ]
    },
    {
      id: 'edge',
      name: 'Microsoft Edge',
      icon: Globe,
      color: 'text-blue-400',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Click "Permissions for this site"',
        'Find "Camera" permission',
        'Toggle it to "Allow"',
        'Refresh the page and try again'
      ]
    },
    {
      id: 'firefox',
      name: 'Mozilla Firefox',
      icon: Globe,
      color: 'text-orange-400',
      steps: [
        'Click the 🔒 lock icon in the address bar',
        'Click "Connection secure" or site info',
        'Click "More information"',
        'Go to "Permissions" tab',
        'Find "Use the Camera" and select "Allow"'
      ]
    },
    {
      id: 'safari',
      name: 'Safari',
      icon: Globe,
      color: 'text-cyan-400',
      steps: [
        'Go to Safari → Preferences → Websites',
        'Click "Camera" in the sidebar',
        'Find this website in the list',
        'Change permission to "Allow"',
        'Refresh the page and try again'
      ]
    }
  ];

  const errorMessages = {
    denied: {
      title: 'Camera Permission Denied',
      description: 'You need to allow camera access to use this feature. Follow the instructions below for your browser.',
      icon: Shield,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30'
    },
    not_found: {
      title: 'No Camera Detected',
      description: 'Make sure your camera is properly connected and recognized by your computer.',
      icon: Camera,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/30'
    },
    in_use: {
      title: 'Camera Already In Use',
      description: 'Another application is using the camera. Close other apps (Zoom, Teams, etc.) and try again.',
      icon: AlertCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30'
    },
    not_supported: {
      title: 'Camera Not Supported',
      description: 'Your browser doesn\'t support camera access. Try using Chrome, Edge, or Firefox.',
      icon: Monitor,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/30'
    },
    unknown: {
      title: 'Camera Setup Required',
      description: 'Follow these steps to enable your camera for live streaming.',
      icon: Settings,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/30'
    }
  };

  const currentError = errorMessages[errorType];
  const ErrorIcon = currentError.icon;

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 ${currentError.bgColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <ErrorIcon className={`h-4 w-4 ${currentError.color}`} />
          <span className={`text-sm font-medium ${currentError.color}`}>{currentError.title}</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">{currentError.description}</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Header */}
      <div className={`rounded-lg border p-4 ${currentError.bgColor}`}>
        <div className="flex items-start gap-3">
          <ErrorIcon className={`h-6 w-6 ${currentError.color}`} />
          <div>
            <h3 className={`font-semibold ${currentError.color}`}>{currentError.title}</h3>
            <p className="text-sm text-gray-300 mt-1">{currentError.description}</p>
          </div>
        </div>
      </div>

      {/* Quick Checklist */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          Quick Checklist
        </h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-600 flex items-center justify-center text-xs">1</div>
            Camera is connected via USB or built-in
          </li>
          <li className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-600 flex items-center justify-center text-xs">2</div>
            Camera drivers are installed (check Device Manager)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-600 flex items-center justify-center text-xs">3</div>
            No other apps are using the camera
          </li>
          <li className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-600 flex items-center justify-center text-xs">4</div>
            Browser has permission to access camera
          </li>
        </ul>
      </div>

      {/* Browser Instructions */}
      {errorType === 'denied' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
          <h4 className="text-sm font-medium text-white p-4 border-b border-slate-700/50 flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-400" />
            Browser Permission Settings
          </h4>
          <div className="divide-y divide-slate-700/50">
            {browserInstructions.map((browser) => {
              const BrowserIcon = browser.icon;
              const isExpanded = expandedBrowser === browser.id;
              
              return (
                <div key={browser.id}>
                  <button
                    onClick={() => setExpandedBrowser(isExpanded ? null : browser.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BrowserIcon className={`h-4 w-4 ${browser.color}`} />
                      <span className="text-sm text-gray-200">{browser.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-slate-900/30">
                      <ol className="space-y-2 text-sm text-gray-400">
                        {browser.steps.map((step, index) => (
                          <li key={index} className="flex gap-2">
                            <Badge variant="outline" className="h-5 w-5 p-0 justify-center shrink-0 text-xs">
                              {index + 1}
                            </Badge>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* USB Camera Tips */}
      {(errorType === 'not_found' || errorType === 'unknown') && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-cyan-400" />
            USB Camera Tips
          </h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Try unplugging and reconnecting the USB cable</li>
            <li>• Use a different USB port (preferably USB 3.0)</li>
            <li>• Check if the camera has a power indicator light</li>
            <li>• Test the camera in another app (like Camera app on Windows)</li>
            <li>• Install the latest camera drivers from the manufacturer</li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} className="flex-1 bg-green-600 hover:bg-green-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        <Button 
          variant="outline" 
          className="border-slate-600"
          onClick={() => window.open('https://support.google.com/chrome/answer/2693767', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Help Center
        </Button>
      </div>
    </div>
  );
}

// First-time setup banner
export function CameraSetupBanner({ onDismiss }: { onDismiss?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Camera className="h-5 w-5 text-cyan-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-cyan-400">First Time Using Cameras?</h4>
            <p className="text-xs text-gray-400 mt-1">
              When you click "Start Live Feed", your browser will ask for camera permission. 
              Click <strong className="text-white">Allow</strong> to enable the live video stream.
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
}























