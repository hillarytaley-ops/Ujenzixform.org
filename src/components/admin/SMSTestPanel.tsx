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
  messagingEnv?: 'sandbox' | 'live';
  deliveryHint?: string;
  timestamp: Date;
}

function supabaseProjectDashboardSecretsUrl(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const host = new URL(raw.trim()).hostname;
    const m = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    const ref = m?.[1];
    return ref ? `https://supabase.com/dashboard/project/${ref}/settings/functions` : null;
  } catch {
    return null;
  }
}

export const SMSTestPanel: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+254798441351');
  const [selectedTemplate, setSelectedTemplate] = useState('WELCOME');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const edgeSmsEnabled = notificationService.isConfigured();
  const secretsDashboardUrl = supabaseProjectDashboardSecretsUrl();

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
          message: customMessage || 'Test message from UjenziXform/UjenziXform!'
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
        messagingEnv: result.messagingEnv,
        deliveryHint: result.deliveryHint,
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev].slice(0, 10));

      if (result.success) {
        const sandbox = result.messagingEnv === 'sandbox';
        toast({
          title: sandbox ? "✅ Accepted by Africa's Talking (sandbox)" : '✅ SMS Sent!',
          description:
            sandbox && result.deliveryHint
              ? `${result.deliveryHint.slice(0, 220)}${result.deliveryHint.length > 220 ? '…' : ''}`
              : result.messageId
                ? `Message ID: ${result.messageId}`
                : 'Delivered via send-sms edge function.',
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
      <Card
        className={
          edgeSmsEnabled
            ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
            : 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20'
        }
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className={`h-5 w-5 ${edgeSmsEnabled ? 'text-green-600' : 'text-blue-500'}`} />
              <div>
                <p className="font-medium">
                  {edgeSmsEnabled
                    ? 'SMS via Supabase Edge (send-sms)'
                    : 'SMS simulation (VITE_SMS_SIMULATE_ONLY)'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {edgeSmsEnabled ? (
                    <>
                      <strong>Edge</strong> only means the request runs on Supabase — it is not &quot;going live&quot; with
                      Africa&apos;s Talking. Whether AT uses <strong>sandbox</strong> or <strong>their production API</strong>{' '}
                      is controlled by one secret:{' '}
                      <code className="text-xs">AFRICASTALKING_USERNAME</code>. Set it to exactly{' '}
                      <code className="text-xs">sandbox</code> until you are ready for real SMS; any other value calls
                      AT&apos;s live endpoint. Also set <code className="text-xs">AFRICASTALKING_API_KEY</code> (sandbox key
                      matches <code className="text-xs">sandbox</code>). Optional{' '}
                      <code className="text-xs">AFRICASTALKING_SENDER_ID</code> — only if AT approved that ID;
                      if you see <strong>InvalidSenderId</strong>, leave it unset for sandbox (default sender)
                      or set the exact short code / sender from your AT dashboard.
                    </>
                  ) : (
                    <>
                      Console-only. Remove <code className="text-xs">VITE_SMS_SIMULATE_ONLY</code> to invoke
                      the edge function.
                    </>
                  )}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className={edgeSmsEnabled ? 'bg-green-100 text-green-900' : 'bg-blue-100 text-blue-800'}>
              {edgeSmsEnabled ? 'Edge function' : 'Simulation'}
            </Badge>
          </div>
          {edgeSmsEnabled && (
            <div className="mt-4 p-3 rounded-md border border-amber-200 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 text-sm text-amber-950 dark:text-amber-100">
              <p className="font-medium">If the error says Edge is using the LIVE Africa&apos;s Talking endpoint</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                You have not &quot;gone live&quot; on our side — your Supabase secret{' '}
                <code className="text-xs">AFRICASTALKING_USERNAME</code> is set to something other than the word{' '}
                <code className="text-xs">sandbox</code> (e.g. your app name). Change it to exactly{' '}
                <code className="text-xs">sandbox</code> and use your <strong>Sandbox</strong> API key from Africa&apos;s
                Talking. No code deploy needed after saving secrets.
              </p>
              <p className="font-medium mt-3">If you see &quot;authentication is invalid&quot; (401)</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-amber-900/90 dark:text-amber-100/90">
                <li>
                  Update secrets only in{' '}
                  <strong>Supabase</strong> (Edge Function runtime), not Vercel and not <code className="text-xs">.env.local</code>.
                  {secretsDashboardUrl ? (
                    <>
                      {' '}
                      <a
                        href={secretsDashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        Open Edge Function settings for this project
                      </a>
                      .
                    </>
                  ) : null}
                </li>
                <li>
                  <code className="text-xs">AFRICASTALKING_USERNAME=sandbox</code> requires the API key from Africa&apos;s Talking{' '}
                  <strong>Sandbox</strong> dashboard — not the key from your live app.
                </li>
                <li>
                  Live SMS needs your <strong>production</strong> username + <strong>production</strong> key (separate from sandbox).
                </li>
                <li>
                  After generating a new key in AT, wait about <strong>5 minutes</strong> before testing (
                  <a
                    href="https://help.africastalking.com/en/articles/1036048-why-am-i-getting-the-error-supplied-authentication-is-invalid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Africa&apos;s Talking help
                  </a>
                  ).
                </li>
              </ul>
            </div>
          )}
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
                  {result.success && result.messagingEnv === 'sandbox' && (
                    <p className="text-xs text-amber-800 dark:text-amber-200 mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <strong>Sandbox:</strong> AT returned Success. Sandbox flows are meant for the Africa&apos;s Talking{' '}
                      <strong>Simulator</strong> (<a className="underline" href="https://simulator.africastalking.com:1517/" target="_blank" rel="noopener noreferrer">simulator</a>) — register numbers there; do not expect a normal handset SMS. For real phones, set Supabase secrets to your{' '}
                      <strong>live</strong> username + API key (and approved sender ID).
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
          <CardTitle>📱 How SMS Simulation Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">1.</span>
            <span>Click <strong>"Send Test SMS"</strong> above</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">2.</span>
            <span>Open <strong>Browser DevTools</strong> (Press F12)</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">3.</span>
            <span>Go to the <strong>"Console"</strong> tab</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-500">4.</span>
            <span>You'll see the SMS details logged there with 📱 icon</span>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Real delivery checklist</p>
            <ul className="text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside space-y-1">
              <li>
                Deploy <code className="text-xs">send-sms</code> and set Supabase secrets{' '}
                <code className="text-xs">AFRICASTALKING_API_KEY</code>,{' '}
                <code className="text-xs">AFRICASTALKING_USERNAME</code>.
              </li>
              <li>
                If username is <code className="text-xs">sandbox</code>, use the Africa&apos;s Talking{' '}
                <a className="underline" href="https://simulator.africastalking.com:1517/" target="_blank" rel="noopener noreferrer">Simulator</a>{' '}
                for sandbox traffic (see{' '}
                <a className="underline" href="https://help.africastalking.com/en/articles/1170660-how-do-i-get-started-on-the-africa-s-talking-sandbox" target="_blank" rel="noopener noreferrer">AT sandbox help</a>
                ). Otherwise you may see Success + a message ID but <strong>no SMS on a real device</strong>.
              </li>
              <li>
                For production, use your <strong>live</strong> AT username and key, plus an approved{' '}
                <code className="text-xs">AFRICASTALKING_SENDER_ID</code> when required.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMSTestPanel;

