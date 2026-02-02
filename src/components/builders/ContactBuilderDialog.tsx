import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Phone,
  Mail,
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Star,
  ExternalLink,
  Copy,
  PhoneCall,
  MessageSquare,
  FileText,
  Building2
} from 'lucide-react';

interface Builder {
  id: string;
  user_id: string;
  full_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  location?: string;
  avatar_url?: string;
  is_verified?: boolean;
  rating?: number;
  allow_calls?: boolean;
  allow_messages?: boolean;
  show_phone?: boolean;
  show_email?: boolean;
}

interface ContactBuilderDialogProps {
  builder: Builder;
  isOpen: boolean;
  onClose: () => void;
}

export const ContactBuilderDialog: React.FC<ContactBuilderDialogProps> = ({
  builder,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('message');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Message form
  const [message, setMessage] = useState('');

  // Inquiry form (for non-logged-in users)
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUser({ ...user, profile });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.rpc('send_builder_message', {
        p_recipient_id: builder.user_id,
        p_content: message,
        p_message_type: 'text'
      });

      if (error) throw error;

      toast({
        title: 'Message Sent!',
        description: `Your message has been sent to ${builder.company_name || builder.full_name}`
      });

      setMessage('');
      onClose();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendInquiry = async () => {
    if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.subject || !inquiryForm.message) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('builder_inquiries')
        .insert({
          builder_id: builder.user_id,
          sender_id: currentUser?.id || null,
          sender_name: inquiryForm.name,
          sender_email: inquiryForm.email,
          sender_phone: inquiryForm.phone || null,
          subject: inquiryForm.subject,
          message: inquiryForm.message,
          inquiry_type: inquiryForm.inquiryType
        });

      if (error) throw error;

      toast({
        title: 'Inquiry Sent!',
        description: `Your inquiry has been sent to ${builder.company_name || builder.full_name}. They will respond via email.`
      });

      setInquiryForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        inquiryType: 'general'
      });
      onClose();
    } catch (error: any) {
      console.error('Error sending inquiry:', error);
      toast({
        title: 'Error',
        description: 'Failed to send inquiry',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handlePhoneCall = () => {
    if (builder.phone) {
      // Log the call attempt
      supabase
        .from('builder_call_logs')
        .insert({
          builder_id: builder.user_id,
          caller_id: currentUser?.id || null,
          caller_name: currentUser?.profile?.full_name || 'Visitor',
          call_type: 'outbound'
        })
        .then(() => {
          // Open phone dialer
          window.location.href = `tel:${builder.phone}`;
        });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-blue-500 ring-offset-2">
              <AvatarImage src={builder.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                {getInitials(builder.company_name || builder.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {builder.company_name || builder.full_name}
                {builder.is_verified && (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" fill="currentColor" />
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {builder.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {builder.location}
                  </span>
                )}
                {builder.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {builder.rating.toFixed(1)}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="message" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Message
            </TabsTrigger>
            <TabsTrigger value="call" className="gap-2">
              <Phone className="h-4 w-4" />
              Call
            </TabsTrigger>
            <TabsTrigger value="inquiry" className="gap-2">
              <FileText className="h-4 w-4" />
              Inquiry
            </TabsTrigger>
          </TabsList>

          {/* Direct Message Tab */}
          <TabsContent value="message" className="space-y-4 mt-4">
            {currentUser ? (
              <>
                {builder.allow_messages !== false ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Your Message</Label>
                      <Textarea
                        placeholder={`Hi ${builder.full_name}, I'm interested in your services...`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? (
                        'Sending...'
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      This builder has disabled direct messages. Please use the inquiry form or call them directly.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Alert>
                <AlertDescription className="space-y-3">
                  <p>Please sign in to send direct messages to builders.</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
                    Sign In
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Phone Call Tab */}
          <TabsContent value="call" className="space-y-4 mt-4">
            {builder.phone && builder.show_phone !== false && builder.allow_calls !== false ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <Phone className="h-12 w-12 mx-auto text-green-600 mb-3" />
                  <p className="text-2xl font-bold mb-1">{builder.phone}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tap to call {builder.company_name || builder.full_name}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handlePhoneCall} className="bg-green-600 hover:bg-green-700">
                      <PhoneCall className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => copyToClipboard(builder.phone!, 'Phone number')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Business hours may vary. Leave a message if they don't answer.
                </p>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Phone contact is not available for this builder. Please send a message or inquiry instead.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Inquiry Form Tab */}
          <TabsContent value="inquiry" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Your Name *</Label>
                  <Input
                    placeholder="John Doe"
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone (Optional)</Label>
                  <Input
                    placeholder="+254 7XX XXX XXX"
                    value={inquiryForm.phone}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Inquiry Type</Label>
                  <Select 
                    value={inquiryForm.inquiryType} 
                    onValueChange={(v) => setInquiryForm({ ...inquiryForm, inquiryType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="quote_request">Quote Request</SelectItem>
                      <SelectItem value="project_inquiry">Project Inquiry</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Subject *</Label>
                <Input
                  placeholder="e.g., Residential Construction Quote"
                  value={inquiryForm.subject}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
                />
              </div>

              <div>
                <Label>Message *</Label>
                <Textarea
                  placeholder="Describe your project or inquiry in detail..."
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                  rows={4}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSendInquiry}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Submit Inquiry'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                The builder will respond to your inquiry via email.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Info Footer */}
        {(builder.email && builder.show_email !== false) && (
          <div className="pt-4 border-t mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {builder.email}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(builder.email!, 'Email')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactBuilderDialog;
