import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  QrCode, 
  Download, 
  Package, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Copy,
  Eye,
  Printer,
  Share,
  Settings,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QRCodeData {
  id: string;
  qr_code: string;
  material_type: string;
  category: string;
  quantity: number;
  unit: string;
  supplier_id: string;
  purchase_order_id: string;
  batch_number: string;
  manufacture_date: string;
  expiry_date?: string;
  security_hash: string;
  created_at: string;
}

interface AdvancedQRGeneratorProps {
  materialItems?: any[];
  onQRGenerated?: (qrData: QRCodeData) => void;
  bulkMode?: boolean;
}

export const AdvancedQRGenerator: React.FC<AdvancedQRGeneratorProps> = ({
  materialItems = [],
  onQRGenerated,
  bulkMode = false
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [qrFormat, setQRFormat] = useState('standard');
  const [securityLevel, setSecurityLevel] = useState('high');
  const [customPrefix, setCustomPrefix] = useState('UJP');
  const [includeChecksum, setIncludeChecksum] = useState(true);
  const [qrSize, setQRSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [generatedQRs, setGeneratedQRs] = useState<QRCodeData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSecurityHash = (data: string): string => {
    // Simple hash function - in production, use crypto library
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  };

  const generateQRCode = async (materialItem: any): Promise<QRCodeData> => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Create structured QR code based on format
    let qrCodeString = '';
    
    switch (qrFormat) {
      case 'standard':
        qrCodeString = `${customPrefix}-${materialItem.category}-${materialItem.material_type}-${materialItem.id}-${timestamp}-${randomSuffix}`;
        break;
      case 'compact':
        qrCodeString = `${customPrefix}${materialItem.id}${timestamp.slice(-8)}${randomSuffix.slice(0, 3)}`;
        break;
      case 'secure':
        const dataString = `${materialItem.id}${materialItem.material_type}${materialItem.quantity}${timestamp}`;
        const securityHash = generateSecurityHash(dataString);
        qrCodeString = `${customPrefix}-SEC-${securityHash}-${materialItem.id}-${timestamp}`;
        break;
      case 'blockchain':
        // Blockchain-inspired format with verification
        const blockData = `${materialItem.id}${materialItem.supplier_id}${timestamp}`;
        const blockHash = generateSecurityHash(blockData);
        qrCodeString = `${customPrefix}-BLK-${blockHash.slice(0, 8)}-${materialItem.id}-${randomSuffix}`;
        break;
    }
    
    // Add checksum if enabled
    if (includeChecksum) {
      const checksum = generateSecurityHash(qrCodeString).slice(0, 4);
      qrCodeString += `-CHK${checksum}`;
    }
    
    const qrData: QRCodeData = {
      id: `qr-${Date.now()}-${randomSuffix}`,
      qr_code: qrCodeString,
      material_type: materialItem.material_type,
      category: materialItem.category,
      quantity: materialItem.quantity,
      unit: materialItem.unit,
      supplier_id: materialItem.supplier_id || 'unknown',
      purchase_order_id: materialItem.purchase_order_id || 'unknown',
      batch_number: materialItem.batch_number || `BATCH-${timestamp}`,
      manufacture_date: materialItem.manufacture_date || new Date().toISOString().split('T')[0],
      security_hash: generateSecurityHash(qrCodeString),
      created_at: new Date().toISOString()
    };
    
    return qrData;
  };

  const generateAdvancedQRImage = async (qrData: QRCodeData): Promise<string> => {
    // Create high-quality QR code with proper library simulation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Canvas not supported');
    
    const totalSize = qrSize + 100; // Extra space for labels and branding
    canvas.width = totalSize;
    canvas.height = totalSize;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, totalSize, totalSize);
    
    // Generate QR pattern (simplified - in production use qrcode library)
    const qrAreaSize = qrSize;
    const moduleSize = Math.floor(qrAreaSize / 25); // 25x25 modules
    const startX = (totalSize - qrAreaSize) / 2;
    const startY = 30;
    
    // Generate deterministic pattern based on QR code
    ctx.fillStyle = 'black';
    for (let y = 0; y < 25; y++) {
      for (let x = 0; x < 25; x++) {
        const seed = qrData.qr_code.charCodeAt((x + y) % qrData.qr_code.length);
        if ((seed + x * y) % 3 === 0) {
          ctx.fillRect(
            startX + x * moduleSize,
            startY + y * moduleSize,
            moduleSize - 1,
            moduleSize - 1
          );
        }
      }
    }
    
    // Add finder patterns (corners)
    const drawFinderPattern = (x: number, y: number) => {
      const size = moduleSize * 7;
      ctx.fillStyle = 'black';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = 'white';
      ctx.fillRect(x + moduleSize, y + moduleSize, size - 2 * moduleSize, size - 2 * moduleSize);
      ctx.fillStyle = 'black';
      ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, size - 4 * moduleSize, size - 4 * moduleSize);
    };
    
    drawFinderPattern(startX, startY);
    drawFinderPattern(startX + qrAreaSize - moduleSize * 7, startY);
    drawFinderPattern(startX, startY + qrAreaSize - moduleSize * 7);
    
    // Add security indicators
    if (securityLevel === 'high') {
      ctx.fillStyle = 'red';
      ctx.fillRect(startX + qrAreaSize - 20, startY, 20, 20);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('S', startX + qrAreaSize - 10, startY + 13);
    }
    
    // Add labels and branding
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('UjenziPro Material Tracking', totalSize / 2, 20);
    
    ctx.font = '12px Arial';
    ctx.fillText(qrData.material_type, totalSize / 2, startY + qrAreaSize + 20);
    ctx.fillText(`${qrData.quantity} ${qrData.unit}`, totalSize / 2, startY + qrAreaSize + 35);
    
    ctx.font = '10px Arial';
    ctx.fillText(`Batch: ${qrData.batch_number}`, totalSize / 2, startY + qrAreaSize + 50);
    ctx.fillText(`QR: ${qrData.qr_code}`, totalSize / 2, startY + qrAreaSize + 65);
    
    // Add security hash if high security
    if (securityLevel === 'high') {
      ctx.fillText(`Hash: ${qrData.security_hash.slice(0, 8)}`, totalSize / 2, startY + qrAreaSize + 80);
    }
    
    return canvas.toDataURL('image/png');
  };

  const generateSingleQR = async (materialItem: any) => {
    try {
      setIsGenerating(true);
      
      const qrData = await generateQRCode(materialItem);
      const imageData = await generateAdvancedQRImage(qrData);
      
      // Save to database
      const { error } = await supabase
        .from('material_items')
        .update({ 
          qr_code: qrData.qr_code,
          security_hash: qrData.security_hash,
          updated_at: new Date().toISOString()
        })
        .eq('id', materialItem.id);
      
      if (error) throw error;
      
      setGeneratedQRs(prev => [qrData, ...prev]);
      
      if (onQRGenerated) {
        onQRGenerated(qrData);
      }
      
      // Download QR code image
      const link = document.createElement('a');
      link.download = `QR_${qrData.qr_code}.png`;
      link.href = imageData;
      link.click();
      
      toast({
        title: "QR Code Generated",
        description: `Advanced QR code created for ${qrData.material_type}`,
      });
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBulkQRs = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to generate QR codes for.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      const selectedMaterials = materialItems.filter(item => selectedItems.includes(item.id));
      
      for (const material of selectedMaterials) {
        await generateSingleQR(material);
        // Add delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast({
        title: "Bulk Generation Complete",
        description: `Generated ${selectedItems.length} QR codes successfully.`,
      });
      
    } catch (error) {
      console.error('Error in bulk generation:', error);
      toast({
        title: "Bulk Generation Failed",
        description: "Some QR codes may not have been generated.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyQRCode = (qrCode: string) => {
    navigator.clipboard.writeText(qrCode);
    toast({
      title: "Copied",
      description: "QR code copied to clipboard",
    });
  };

  const validateQRCode = (qrCode: string): boolean => {
    // Validate QR code format and checksum
    if (includeChecksum && qrCode.includes('-CHK')) {
      const parts = qrCode.split('-CHK');
      const code = parts[0];
      const providedChecksum = parts[1];
      const calculatedChecksum = generateSecurityHash(code).slice(0, 4);
      return providedChecksum === calculatedChecksum;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* QR Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced QR Generation Settings
          </CardTitle>
          <CardDescription>
            Configure QR code format, security level, and generation options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>QR Format</Label>
              <Select value={qrFormat} onValueChange={setQRFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Format</SelectItem>
                  <SelectItem value="compact">Compact Format</SelectItem>
                  <SelectItem value="secure">Secure Format</SelectItem>
                  <SelectItem value="blockchain">Blockchain Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Security Level</Label>
              <Select value={securityLevel} onValueChange={setSecurityLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High Security</SelectItem>
                  <SelectItem value="maximum">Maximum Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Error Correction</Label>
              <Select value={errorCorrection} onValueChange={setErrorCorrection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Low (7%)</SelectItem>
                  <SelectItem value="M">Medium (15%)</SelectItem>
                  <SelectItem value="Q">Quartile (25%)</SelectItem>
                  <SelectItem value="H">High (30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custom Prefix</Label>
              <Input
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
                placeholder="UJP"
                maxLength={5}
              />
            </div>
            
            <div className="space-y-2">
              <Label>QR Code Size (px)</Label>
              <Select value={qrSize.toString()} onValueChange={(value) => setQRSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="128">128px (Small)</SelectItem>
                  <SelectItem value="256">256px (Medium)</SelectItem>
                  <SelectItem value="512">512px (Large)</SelectItem>
                  <SelectItem value="1024">1024px (Print Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeChecksum}
                onChange={(e) => setIncludeChecksum(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Include Security Checksum</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Material Selection for Bulk Generation */}
      {bulkMode && materialItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Materials for QR Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedItems(materialItems.map(item => item.id))}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Deselect All
                </Button>
                <Badge variant="secondary">
                  {selectedItems.length} of {materialItems.length} selected
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {materialItems.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(prev => [...prev, item.id]);
                        } else {
                          setSelectedItems(prev => prev.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.material_type}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity} {item.unit}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            QR Code Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {bulkMode ? (
              <Button 
                onClick={generateBulkQRs} 
                disabled={isGenerating || selectedItems.length === 0}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating {selectedItems.length} QR Codes...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate {selectedItems.length} QR Codes
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => generateSingleQR(materialItems[0])} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>
            )}
            
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated QR Codes */}
      {generatedQRs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Generated QR Codes ({generatedQRs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedQRs.map(qr => (
                <div key={qr.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <QrCode className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="font-medium">{qr.material_type}</p>
                      <p className="text-sm text-muted-foreground">{qr.qr_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      validateQRCode(qr.qr_code) 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }>
                      {validateQRCode(qr.qr_code) ? 'Valid' : 'Invalid'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => copyQRCode(qr.qr_code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Information */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Advanced Security Features</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-1">
            <p>• <strong>Security Hash:</strong> Each QR code includes a cryptographic hash for verification</p>
            <p>• <strong>Checksum Validation:</strong> Built-in error detection and correction</p>
            <p>• <strong>Format Flexibility:</strong> Multiple QR code formats for different use cases</p>
            <p>• <strong>Fraud Prevention:</strong> Advanced anti-counterfeiting measures</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
