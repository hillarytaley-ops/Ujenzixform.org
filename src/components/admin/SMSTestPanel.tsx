/**
 * SMS Test Panel Component
 * Allows admins to test SMS/WhatsApp notifications
 */

import React, { useState } from 'react';
import { Send, MessageSquare, Phone, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { notificationService, NOTIFICATION_TEMPLATES } from '@/services/NotificationService';

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export const SMSTestPanel: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+254798441351');
  const [selectedTemplate, setSelectedTemplate] = useState('WELCOME');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  // Check if API is configured
  const isConfigured = notificationService.isConfigured();

  const handleSendTestSMS = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Phone Required',
        description: 'Please enter a phone number',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      let result;

      if (selectedTemplate === 'CUSTOM') {
        // Send custom message
        result = await notificationService.sendSMS({
          to: phoneNumber,
          message: customMessage || 'Test message from MradiPro/UjenziXform!'
        });
      } else {
        // Send template message with sample data
        const templateData: Record<string, Record<string, string>> = {
          WELCOME: { name: 'Test User', appUrl: 'https://ujenzi-pro.vercel.app' },
          ORDER_CONFIRMED: { orderNumber: 'TEST-001', amount: '15,000', trackingUrl: 'https://ujenzi-pro.vercel.app/tracking' },
          QUOTE_RECEIVED: { supplierName: 'Test Supplier', amount: '25,000', reviewUrl: 'https://ujenzi-pro.vercel.app' },
          DELIVERY_UPDATE: { trackingNumber: 'DEL-12345', status: 'In Transit', message: 'Your package is on the way!' },
          DELIVERY_ASSIGNED: { driverName: 'John Kamau', driverPhone: '+254712345678', eta: '30 minutes', trackingUrl: 'https://ujenzi-pro.vercel.app/tracking' },
          QUOTE_REQUEST: { builderName: 'Test Builder', itemCount: '5', responseUrl: 'https://ujenzi-pro.vercel.app' },
          PAYMENT_RECEIVED: { amount: '10,000', orderNumber: 'ORD-789' },
          OTP: { otp: '123456' }
        };

        result = await notificationService.sendTemplateNotification(
          selectedTemplate,
          phoneNumber,
          templateData[selectedTemplate] || {}
        );
      }

      const testResult: TestResult = {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev].slice(0, 10));

      if (result.success) {
        toast({
          title: '✅ SMS Sent!',
          description: result.error?.includes('simulated') 
            ? 'Message simulated (check Africa\'s Talking Simulator)'
            : `Message ID: ${result.messageId}`
        });
      } else {
        toast({
          title: '❌ SMS Failed',
          description: result.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('SMS test error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test SMS',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card className={isConfigured ? 'border-green-500/50' : 'border-yellow-500/50'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">
                  {isConfigured ? 'SMS API Configured' : 'SMS API Not Configured'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConfigured 
                    ? 'Africa\'s Talking credentials are set up'
                    : 'Messages will be simulated (check console logs)'}
                </p>
              </div>
            </div>
            <Badge variant={isConfigured ? 'default' : 'secondary'}>
              {isConfigured ? 'Live' : 'Simulation Mode'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            Send Test SMS
          </CardTitle>
          <CardDescription>
            Test SMS notifications with different templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Phone className="h-5 w-5 text-muted-foreground mt-2" />
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+254712345678"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Format: +254XXXXXXXXX (Kenyan number)
            </p>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Message Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WELCOME">👋 Welcome Message</SelectItem>
                <SelectItem value="ORDER_CONFIRMED">🎉 Order Confirmed</SelectItem>
                <SelectItem value="QUOTE_RECEIVED">📋 Quote Received</SelectItem>
                <SelectItem value="DELIVERY_UPDATE">🚚 Delivery Update</SelectItem>
                <SelectItem value="DELIVERY_ASSIGNED">🚛 Delivery Assigned</SelectItem>
                <SelectItem value="QUOTE_REQUEST">📩 Quote Request (for Suppliers)</SelectItem>
                <SelectItem value="PAYMENT_RECEIVED">✅ Payment Received</SelectItem>
                <SelectItem value="OTP">🔐 OTP Verification</SelectItem>
                <SelectItem value="CUSTOM">✏️ Custom Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Preview */}
          {selectedTemplate !== 'CUSTOM' && NOTIFICATION_TEMPLATES[selectedTemplate] && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Preview:</p>
              <p className="text-sm font-mono">
                {NOTIFICATION_TEMPLATES[selectedTemplate].smsTemplate}
              </p>
            </div>
          )}

          {/* Custom Message */}
          {selectedTemplate === 'CUSTOM' && (
            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message..."
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground text-right">
                {customMessage.length}/160 characters
              </p>
            </div>
          )}

          {/* Send Button */}
          <Button 
            onClick={handleSendTestSMS} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test SMS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setTestResults([])}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.success ? 'Sent' : 'Failed'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {result.messageId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {result.messageId}
                    </p>
                  )}
                  {result.error && (
                    <p className="text-xs text-red-600 mt-1">
                      {result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">1.</span>
            <span>Open <strong>Africa's Talking Dashboard</strong></span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">2.</span>
            <span>Click <strong>"Launch Simulator"</strong> in the sidebar</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">3.</span>
            <span>Enter the phone number: <code className="bg-muted px-1 rounded">+254798441351</code></span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">4.</span>
            <span>Click <strong>"Connect"</strong> to start the simulator</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">5.</span>
            <span>Come back here and click <strong>"Send Test SMS"</strong></span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">6.</span>
            <span>Check the simulator - the SMS should appear there!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSTestPanel;

