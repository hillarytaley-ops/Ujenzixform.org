import React from 'react';
import { UserGuide } from '@/components/ui/tooltip-guide';
import { 
  ShoppingCart, 
  FileText, 
  Scan, 
  Truck, 
  CheckCircle, 
  Building2,
  QrCode,
  Camera,
  Smartphone,
  Monitor
} from 'lucide-react';

// QR System Workflow Guide
export const qrSystemGuide: UserGuide = {
  id: 'qr-system-workflow',
  title: 'QR Code System Workflow',
  description: 'Complete guide to using the QR code tracking system for material dispatch and receiving',
  category: 'qr-system',
  difficulty: 'intermediate',
  estimatedTime: '10-15 minutes',
  prerequisites: [
    'Have a purchase order with materials',
    'Access to camera or QR scanner device',
    'Basic understanding of material tracking'
  ],
  steps: [
    {
      id: 'qr-overview',
      title: 'QR System Overview',
      description: 'Understanding how the QR tracking system works',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">📱 What is the QR System?</h4>
            <p className="text-blue-700 text-sm">
              Every material item gets a unique QR code for complete tracking from supplier to construction site. 
              This ensures accountability, quality control, and real-time visibility.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <QrCode className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h5 className="font-medium">Auto-Generated</h5>
              <p className="text-xs text-muted-foreground">Unique QR per item</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Truck className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <h5 className="font-medium">Dispatch Tracking</h5>
              <p className="text-xs text-muted-foreground">Supplier scans when shipping</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h5 className="font-medium">Receiving Verification</h5>
              <p className="text-xs text-muted-foreground">Site staff confirms arrival</p>
            </div>
          </div>
        </div>
      ),
      tips: [
        'Each material item gets its own unique QR code automatically',
        'QR codes follow format: UJP-CATEGORY-PO-ITEM001-DATE-RAND',
        'Both camera scanning and physical scanners are supported'
      ]
    },
    {
      id: 'qr-generation',
      title: 'Automatic QR Generation',
      description: 'How QR codes are created when purchase orders are confirmed',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">⚡ Automatic Process</h4>
            <p className="text-green-700 text-sm mb-3">
              QR codes are automatically generated when a purchase order is confirmed. No manual action needed!
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                <span>Purchase order confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                <span>System generates unique QR for each item</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                <span>QR codes stored in database</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                <span>Supplier can download QR codes</span>
              </div>
            </div>
          </div>
          
          <div className="border p-3 rounded-lg">
            <h5 className="font-medium mb-2">QR Code Format Example:</h5>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              UJP-CEMENT-PO2024001-ITEM001-20250106-4523
            </code>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>• UJP = UjenziPro prefix</li>
              <li>• CEMENT = Material category</li>
              <li>• PO2024001 = Purchase order number</li>
              <li>• ITEM001 = Item sequence</li>
              <li>• 20250106 = Date</li>
              <li>• 4523 = Random identifier</li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        'QR generation happens automatically - no manual intervention needed',
        'Each item gets a unique code even if multiple items of same material',
        'QR codes are immediately available for download after PO confirmation'
      ]
    },
    {
      id: 'supplier-download',
      title: 'Supplier: Download QR Codes',
      description: 'How suppliers access and download QR codes for their materials',
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">📥 Download Process</h4>
            <p className="text-orange-700 text-sm mb-3">
              Suppliers can download QR codes from the Enhanced QR Code Manager to print and attach to materials.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-medium text-sm">Access QR Manager</p>
                  <p className="text-xs text-muted-foreground">Navigate to Enhanced QR Code Manager in your dashboard</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-medium text-sm">Select Purchase Order</p>
                  <p className="text-xs text-muted-foreground">Choose the PO containing materials to download</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-medium text-sm">Download Options</p>
                  <p className="text-xs text-muted-foreground">Download individual QR codes or bulk download all</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                <div>
                  <p className="font-medium text-sm">Print & Attach</p>
                  <p className="text-xs text-muted-foreground">Print QR codes and physically attach to each material item</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border border-amber-200 bg-amber-50 p-3 rounded-lg">
            <h5 className="font-medium text-amber-800 mb-2">⚠️ Important Notes:</h5>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Each QR code includes material name and item number</li>
              <li>• Ensure QR codes are clearly visible and scannable</li>
              <li>• Use waterproof labels for outdoor materials</li>
              <li>• Keep QR codes clean and undamaged during transport</li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        'Download QR codes as PNG images for easy printing',
        'Use bulk download for large orders to save time',
        'Attach QR codes securely but accessibly for scanning'
      ]
    },
    {
      id: 'dispatch-scanning',
      title: 'Dispatch Scanning Process',
      description: 'How suppliers scan materials when dispatching to construction sites',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🚛 Dispatch Workflow</h4>
            <p className="text-blue-700 text-sm mb-3">
              Use the Dispatch Scanner to record when materials leave your facility and are on their way to the construction site.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-5 w-5 text-primary" />
                <h5 className="font-medium">Camera Scanning</h5>
              </div>
              <ul className="text-sm space-y-1">
                <li>• Open Dispatch Scanner</li>
                <li>• Click "Start Camera"</li>
                <li>• Point camera at QR code</li>
                <li>• Auto-detects and processes</li>
              </ul>
            </div>
            
            <div className="border p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Scan className="h-5 w-5 text-primary" />
                <h5 className="font-medium">Physical Scanner</h5>
              </div>
              <ul className="text-sm space-y-1">
                <li>• Connect USB/Bluetooth scanner</li>
                <li>• Focus on QR input field</li>
                <li>• Scan physical QR code</li>
                <li>• Press Enter to process</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium mb-2">Required Information:</h5>
            <ul className="text-sm space-y-1">
              <li>• <strong>Material Condition:</strong> Good, Damaged, or Other</li>
              <li>• <strong>Dispatch Notes:</strong> Optional notes about the shipment</li>
              <li>• <strong>Scanner Type:</strong> Automatically detected</li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        'Scan materials just before loading onto delivery vehicle',
        'Record any damage or issues in the notes field',
        'Ensure good lighting for camera scanning'
      ]
    },
    {
      id: 'receiving-scanning',
      title: 'Receiving & Verification',
      description: 'How UjenziPro staff scan and verify materials upon arrival at construction sites',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">📦 Receiving Process</h4>
            <p className="text-green-700 text-sm mb-3">
              UjenziPro staff and builders use the Receiving Scanner to confirm material arrival and verify quality.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-medium text-sm">Material Arrival</p>
                <p className="text-xs text-muted-foreground">Materials arrive at construction site</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-medium text-sm">Open Receiving Scanner</p>
                <p className="text-xs text-muted-foreground">Access from dashboard or QR menu</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-medium text-sm">Scan Each Item</p>
                <p className="text-xs text-muted-foreground">Scan QR codes on individual material items</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
              <div>
                <p className="font-medium text-sm">Verify Condition</p>
                <p className="text-xs text-muted-foreground">Check material quality and record condition</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">5</span>
              <div>
                <p className="font-medium text-sm">Optional Final Verification</p>
                <p className="text-xs text-muted-foreground">Additional quality check and quantity verification</p>
              </div>
            </div>
          </div>
          
          <div className="border border-red-200 bg-red-50 p-3 rounded-lg">
            <h5 className="font-medium text-red-800 mb-2">🔍 Quality Control:</h5>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Inspect each item for damage during transport</li>
              <li>• Verify quantities match the purchase order</li>
              <li>• Check material specifications and quality</li>
              <li>• Report any discrepancies immediately</li>
            </ul>
          </div>
        </div>
      ),
      tips: [
        'Scan items as soon as they arrive for accurate timing',
        'Take photos of any damaged materials for documentation',
        'Use the notes field to record specific observations'
      ]
    },
    {
      id: 'admin-analytics',
      title: 'Admin Analytics Dashboard',
      description: 'How administrators monitor and analyze QR system performance',
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-2">📊 Admin-Only Access</h4>
            <p className="text-purple-700 text-sm mb-3">
              The Admin Scan Dashboard provides comprehensive analytics and monitoring of the entire QR tracking system.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-3 rounded-lg">
              <h5 className="font-medium mb-2">📈 Key Metrics</h5>
              <ul className="text-sm space-y-1">
                <li>• Total items tracked</li>
                <li>• Items by status</li>
                <li>• Total scans performed</li>
                <li>• Average transit times</li>
                <li>• Completion percentages</li>
              </ul>
            </div>
            
            <div className="border p-3 rounded-lg">
              <h5 className="font-medium mb-2">🔍 Monitoring Features</h5>
              <ul className="text-sm space-y-1">
                <li>• Real-time scan activity</li>
                <li>• Scanner type tracking</li>
                <li>• Material condition reports</li>
                <li>• Audit trail access</li>
                <li>• Export capabilities</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium mb-2">Status Lifecycle:</h5>
            <div className="flex items-center justify-between text-sm">
              <span className="bg-gray-200 px-2 py-1 rounded">pending</span>
              <span>→</span>
              <span className="bg-orange-200 px-2 py-1 rounded">dispatched</span>
              <span>→</span>
              <span className="bg-green-200 px-2 py-1 rounded">received</span>
              <span>→</span>
              <span className="bg-blue-200 px-2 py-1 rounded">verified</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Materials can also be marked as "damaged" at any stage
            </p>
          </div>
        </div>
      ),
      tips: [
        'Use filters to analyze specific time periods or suppliers',
        'Export data for external reporting and compliance',
        'Monitor average transit times to optimize logistics'
      ]
    }
  ]
};

// Builder Workflow Guide
export const builderWorkflowGuide: UserGuide = {
  id: 'builder-workflow',
  title: 'Builder Project Workflow',
  description: 'Complete guide to managing construction projects from planning to completion',
  category: 'workflow',
  difficulty: 'intermediate',
  estimatedTime: '15-20 minutes',
  prerequisites: [
    'Completed builder profile setup',
    'Basic understanding of construction processes',
    'Access to builder dashboard'
  ],
  steps: [
    {
      id: 'project-planning',
      title: 'Project Planning & Setup',
      description: 'How to create and configure a new construction project',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🏗️ Project Initiation</h4>
            <p className="text-blue-700 text-sm">
              Start by creating a comprehensive project plan with all necessary details, permits, and approvals.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="border p-3 rounded-lg">
              <h5 className="font-medium mb-2">Required Information:</h5>
              <ul className="text-sm space-y-1">
                <li>• Project name and description</li>
                <li>• Location and site details</li>
                <li>• Budget and timeline</li>
                <li>• Required permits and approvals</li>
                <li>• Team members and contractors</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      tips: [
        'Gather all permits before starting material procurement',
        'Set realistic timelines with buffer for delays',
        'Define clear project milestones and deliverables'
      ]
    },
    {
      id: 'material-sourcing',
      title: 'Material Sourcing & Procurement',
      description: 'How to find suppliers, request quotes, and procure materials',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">🛒 Procurement Process</h4>
            <p className="text-green-700 text-sm">
              Use the platform to browse materials, compare suppliers, and create purchase orders efficiently.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-3 rounded-lg">
              <h5 className="font-medium mb-2">Browse & Compare</h5>
              <ul className="text-sm space-y-1">
                <li>• Search material catalog</li>
                <li>• Compare supplier prices</li>
                <li>• Check supplier ratings</li>
                <li>• Review delivery options</li>
              </ul>
            </div>
            
            <div className="border p-3 rounded-lg">
              <h5 className="font-medium mb-2">Purchase Orders</h5>
              <ul className="text-sm space-y-1">
                <li>• Create detailed POs</li>
                <li>• Specify delivery dates</li>
                <li>• Include site instructions</li>
                <li>• Track order status</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      tips: [
        'Always get multiple quotes for major purchases',
        'Consider delivery logistics when selecting suppliers',
        'Build relationships with reliable suppliers for future projects'
      ]
    }
  ]
};

// Purchase Order Guide
export const purchaseOrderGuide: UserGuide = {
  id: 'purchase-order-workflow',
  title: 'Purchase Order Management',
  description: 'Step-by-step guide to creating, managing, and tracking purchase orders',
  category: 'workflow',
  difficulty: 'beginner',
  estimatedTime: '8-12 minutes',
  prerequisites: [
    'Builder account with verified profile',
    'Selected materials and suppliers',
    'Project details and delivery address'
  ],
  steps: [
    {
      id: 'po-creation',
      title: 'Creating Purchase Orders',
      description: 'How to create comprehensive purchase orders with all required details',
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">📋 PO Creation Process</h4>
            <p className="text-orange-700 text-sm">
              Create detailed purchase orders that include all specifications, delivery requirements, and terms.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="border p-3 rounded-lg">
              <h5 className="font-medium mb-2">Essential PO Elements:</h5>
              <ul className="text-sm space-y-1">
                <li>• Material specifications and quantities</li>
                <li>• Supplier information and contact details</li>
                <li>• Delivery address and site access instructions</li>
                <li>• Required delivery date and time windows</li>
                <li>• Payment terms and conditions</li>
                <li>• Quality requirements and standards</li>
              </ul>
            </div>
          </div>
        </div>
      ),
      tips: [
        'Double-check all quantities and specifications before submitting',
        'Include clear site access instructions for delivery drivers',
        'Specify preferred delivery time windows to avoid delays'
      ]
    }
  ]
};

export const allUserGuides = [
  qrSystemGuide,
  builderWorkflowGuide,
  purchaseOrderGuide
];



















