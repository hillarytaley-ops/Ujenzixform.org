import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Headphones,
  Volume2,
  VolumeX,
  RefreshCw,
  X,
  Loader2,
  Circle,
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface CallSession {
  id: string;
  caller_id: string;
  caller_name: string;
  caller_role: string;
  receiver_id: string;
  receiver_name: string;
  receiver_role: string;
  status: 'pending' | 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  call_type: 'voice' | 'video';
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

interface InAppCommunicationProps {
  userId: string;
  userName: string;
  userRole: 'supplier' | 'professional_builder' | 'delivery_provider' | 'private_builder' | 'admin';
  isDarkMode?: boolean;
  showVoiceCallsOnly?: boolean; // For admin voice call sub-tab
}

export function InAppCommunication({ 
  userId, 
  userName, 
  userRole, 
  isDarkMode = false,
  showVoiceCallsOnly = false 
}: InAppCommunicationProps) {
  const [activeTab, setActiveTab] = useState(showVoiceCallsOnly ? 'calls' : 'chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [callSessions, setCallSessions] = useState<CallSession[]>([]);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages using REST API
  const loadMessages = async () => {
    try {
      const tokenStr = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      const token = tokenStr ? JSON.parse(tokenStr) : null;
      const accessToken = token?.access_token;

      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/app_messages?or=(sender_id.eq.${userId},receiver_id.eq.${userId})&order=created_at.asc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.log('Messages table may not exist yet');
        setMessages([]);
        return;
      }

      const data = await response.json();
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages([]);
    }
  };

  // Load call sessions using REST API
  const loadCallSessions = async () => {
    try {
      const tokenStr = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      const token = tokenStr ? JSON.parse(tokenStr) : null;
      const accessToken = token?.access_token;

      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/app_calls?or=(caller_id.eq.${userId},receiver_id.eq.${userId})&order=created_at.desc&limit=50`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.log('Calls table may not exist yet');
        setCallSessions([]);
        return;
      }

      const data = await response.json();
      setCallSessions(data || []);
    } catch (err) {
      console.error('Error loading calls:', err);
      setCallSessions([]);
    }
  };

  useEffect(() => {
    loadMessages();
    loadCallSessions();

    // Real-time subscription for messages
    const messageChannel = supabase
      .channel('app_messages_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_messages',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === userId || newMsg.receiver_id === userId) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      })
      .subscribe();

    // Real-time subscription for calls
    const callChannel = supabase
      .channel('app_calls_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_calls',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newCall = payload.new as CallSession;
          if (newCall.receiver_id === userId && newCall.status === 'ringing') {
            setIncomingCall(newCall);
            // Play ringtone sound
            playRingtone();
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedCall = payload.new as CallSession;
          if (activeCall?.id === updatedCall.id) {
            if (updatedCall.status === 'ended' || updatedCall.status === 'rejected') {
              endCall();
            } else if (updatedCall.status === 'active') {
              setActiveCall(updatedCall);
              startCallTimer();
            }
          }
          if (incomingCall?.id === updatedCall.id) {
            if (updatedCall.status !== 'ringing') {
              setIncomingCall(null);
            }
          }
          loadCallSessions();
        }
      })
      .subscribe();

    return () => {
      messageChannel.unsubscribe();
      callChannel.unsubscribe();
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [userId]);

  const playRingtone = () => {
    // Browser audio API for ringtone
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 500);
    } catch (err) {
      console.log('Audio not supported');
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send message using REST API for reliability
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      // Get auth token
      const tokenStr = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (!tokenStr) {
        throw new Error('Not authenticated');
      }
      const token = JSON.parse(tokenStr);
      const accessToken = token?.access_token;

      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

      const messageData = {
        sender_id: userId,
        sender_name: userName,
        sender_role: userRole,
        receiver_id: 'admin',
        receiver_role: 'admin',
        content: newMessage.trim(),
        is_read: false,
      };

      console.log('📤 Sending message:', messageData);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/app_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(messageData),
      });

      console.log('📤 Message response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📤 Message error:', errorText);
        
        // If table doesn't exist, show helpful message
        if (errorText.includes('relation') && errorText.includes('does not exist')) {
          throw new Error('Chat system is being set up. Please try again later or contact support via phone.');
        }
        throw new Error(errorText || 'Failed to send message');
      }

      const result = await response.json();
      console.log('📤 Message sent successfully:', result);

      // Add message to local state immediately
      if (result && result.length > 0) {
        setMessages(prev => [...prev, result[0]]);
      }

      setNewMessage('');
      toast({
        title: '✅ Message Sent',
        description: 'Admin will respond shortly.',
      });
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({
        title: 'Message Not Sent',
        description: err.message || 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Initiate call to admin using REST API
  const initiateCall = async (callType: 'voice' | 'video') => {
    setLoading(true);
    try {
      const tokenStr = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (!tokenStr) {
        throw new Error('Not authenticated');
      }
      const token = JSON.parse(tokenStr);
      const accessToken = token?.access_token;

      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

      const callData = {
        caller_id: userId,
        caller_name: userName,
        caller_role: userRole,
        receiver_id: 'admin',
        receiver_name: 'UjenziXform Support',
        receiver_role: 'admin',
        status: 'ringing',
        call_type: callType,
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/app_calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(callData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('relation') && errorText.includes('does not exist')) {
          throw new Error('Call system is being set up. Please use the phone hotline for now.');
        }
        throw new Error(errorText || 'Failed to initiate call');
      }

      const result = await response.json();
      const data = result[0];

      setActiveCall(data);
      toast({
        title: '📞 Calling...',
        description: 'Connecting to UjenziXform Support',
      });

      // Simulate call being answered after 3 seconds
      setTimeout(async () => {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/app_calls?id=eq.${data.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ status: 'active', started_at: new Date().toISOString() }),
          });
        } catch (e) {
          console.error('Error updating call status:', e);
        }
      }, 3000);

    } catch (err: any) {
      console.error('Error initiating call:', err);
      toast({
        title: 'Call Failed',
        description: err.message || 'Unable to connect. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    if (!incomingCall) return;

    try {
      await supabase
        .from('app_calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', incomingCall.id);

      setActiveCall(incomingCall);
      setIncomingCall(null);
      startCallTimer();
    } catch (err) {
      console.error('Error answering call:', err);
    }
  };

  // Reject incoming call
  const rejectCall = async () => {
    if (!incomingCall) return;

    try {
      await supabase
        .from('app_calls')
        .update({ status: 'rejected', ended_at: new Date().toISOString() })
        .eq('id', incomingCall.id);

      setIncomingCall(null);
    } catch (err) {
      console.error('Error rejecting call:', err);
    }
  };

  // End active call
  const endCall = async () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    if (activeCall) {
      try {
        await supabase
          .from('app_calls')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString(),
            duration_seconds: callDuration
          })
          .eq('id', activeCall.id);
      } catch (err) {
        console.error('Error ending call:', err);
      }
    }

    setActiveCall(null);
    setCallDuration(0);
    loadCallSessions();
  };

  const getCallStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PhoneCall className="h-4 w-4 text-green-500" />;
      case 'ended': return <PhoneOff className="h-4 w-4 text-gray-500" />;
      case 'missed': return <PhoneMissed className="h-4 w-4 text-red-500" />;
      case 'rejected': return <X className="h-4 w-4 text-red-500" />;
      default: return <Phone className="h-4 w-4 text-blue-500" />;
    }
  };

  // Incoming call modal
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Card className="w-80 bg-gradient-to-b from-green-600 to-green-800 border-0 text-white">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                <PhoneIncoming className="h-12 w-12" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Incoming Call</h3>
            <p className="text-green-100 mb-1">{incomingCall.caller_name}</p>
            <p className="text-green-200 text-sm mb-8">{incomingCall.call_type === 'video' ? 'Video Call' : 'Voice Call'}</p>
            
            <div className="flex justify-center gap-8">
              <Button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
              >
                <PhoneOff className="h-8 w-8" />
              </Button>
              <Button
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-green-400 hover:bg-green-300 animate-bounce"
              >
                <Phone className="h-8 w-8" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active call UI
  if (activeCall) {
    return (
      <Card className={`${cardBg} overflow-hidden`}>
        <div className="bg-gradient-to-r from-purple-600 to-orange-500 p-8 text-white text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
            {activeCall.call_type === 'video' ? (
              <Video className="h-12 w-12" />
            ) : (
              <Phone className="h-12 w-12" />
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-1">
            {activeCall.status === 'ringing' ? 'Calling...' : 'Connected'}
          </h3>
          <p className="text-purple-100 mb-2">
            {activeCall.receiver_id === userId ? activeCall.caller_name : activeCall.receiver_name}
          </p>
          
          {activeCall.status === 'active' && (
            <div className="flex items-center justify-center gap-2 text-2xl font-mono">
              <Circle className="h-3 w-3 text-green-400 animate-pulse fill-current" />
              {formatDuration(callDuration)}
            </div>
          )}
          
          {activeCall.status === 'ringing' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}
        </div>

        <CardContent className="p-6">
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className={`rounded-full w-14 h-14 ${isMuted ? 'bg-red-100 border-red-300' : ''}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-6 w-6 text-red-500" /> : <Mic className="h-6 w-6" />}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className={`rounded-full w-14 h-14 ${!isSpeakerOn ? 'bg-red-100 border-red-300' : ''}`}
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            >
              {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6 text-red-500" />}
            </Button>
            
            {activeCall.call_type === 'video' && (
              <Button
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 ${!isVideoOn ? 'bg-red-100 border-red-300' : ''}`}
                onClick={() => setIsVideoOn(!isVideoOn)}
              >
                {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6 text-red-500" />}
              </Button>
            )}
            
            <Button
              size="lg"
              className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600"
              onClick={endCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If showing voice calls only (for admin)
  if (showVoiceCallsOnly) {
    return (
      <Card className={cardBg}>
        <CardHeader>
          <CardTitle className={textColor}>
            <Phone className="h-5 w-5 inline-block mr-2 text-purple-500" />
            Voice Calls
          </CardTitle>
          <CardDescription className={mutedText}>
            Manage voice calls with suppliers, builders, and delivery providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Call History */}
          <ScrollArea className="h-[400px]">
            {callSessions.length === 0 ? (
              <div className="text-center py-12">
                <Phone className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={mutedText}>No call history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {callSessions.map((call) => (
                  <div
                    key={call.id}
                    className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {(call.caller_id === userId ? call.receiver_name : call.caller_name).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={`font-medium ${textColor}`}>
                            {call.caller_id === userId ? call.receiver_name : call.caller_name}
                          </p>
                          <p className={`text-sm ${mutedText}`}>
                            {call.caller_id === userId ? 'Outgoing' : 'Incoming'} • {call.call_type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {getCallStatusIcon(call.status)}
                          <Badge variant={call.status === 'ended' ? 'secondary' : call.status === 'missed' ? 'destructive' : 'default'}>
                            {call.status}
                          </Badge>
                        </div>
                        <p className={`text-xs ${mutedText} mt-1`}>
                          {call.duration_seconds ? formatDuration(call.duration_seconds) : '--:--'}
                        </p>
                        <p className={`text-xs ${mutedText}`}>
                          {new Date(call.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Call back button */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => initiateCall('voice')}
                        className="flex-1"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call Back
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Main communication UI with tabs
  return (
    <Card className={cardBg}>
      <CardHeader>
        <CardTitle className={textColor}>
          <Headphones className="h-5 w-5 inline-block mr-2 text-purple-500" />
          Contact Admin Support
        </CardTitle>
        <CardDescription className={mutedText}>
          Chat or call UjenziXform support team directly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="calls" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            {/* Messages Area */}
            <ScrollArea className={`h-[300px] rounded-lg border p-4 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className={`h-12 w-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={mutedText}>No messages yet</p>
                  <p className={`text-sm ${mutedText}`}>Start a conversation with admin support</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_id === userId
                            ? 'bg-purple-500 text-white'
                            : isDarkMode
                            ? 'bg-gray-700 text-white'
                            : 'bg-white border text-gray-900'
                        }`}
                      >
                        {msg.sender_id !== userId && (
                          <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name}</p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.sender_id === userId ? 'text-purple-200' : 'opacity-50'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
              />
              <Button 
                onClick={sendMessage} 
                disabled={sendingMessage || !newMessage.trim()}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls" className="space-y-4">
            {/* Call Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => initiateCall('voice')}
                disabled={loading}
                className="h-24 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                <div className="text-center">
                  <Phone className="h-8 w-8 mx-auto mb-2" />
                  <span>Voice Call</span>
                </div>
              </Button>
              <Button
                onClick={() => initiateCall('video')}
                disabled={loading}
                className="h-24 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <div className="text-center">
                  <Video className="h-8 w-8 mx-auto mb-2" />
                  <span>Video Call</span>
                </div>
              </Button>
            </div>

            {/* Call History */}
            <div>
              <h4 className={`font-medium mb-3 ${textColor}`}>Recent Calls</h4>
              <ScrollArea className="h-[200px]">
                {callSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className={`h-8 w-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`text-sm ${mutedText}`}>No call history</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {callSessions.slice(0, 10).map((call) => (
                      <div
                        key={call.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          {getCallStatusIcon(call.status)}
                          <div>
                            <p className={`text-sm font-medium ${textColor}`}>
                              {call.caller_id === userId ? call.receiver_name : call.caller_name}
                            </p>
                            <p className={`text-xs ${mutedText}`}>
                              {call.call_type} • {call.duration_seconds ? formatDuration(call.duration_seconds) : '--:--'}
                            </p>
                          </div>
                        </div>
                        <p className={`text-xs ${mutedText}`}>
                          {new Date(call.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default InAppCommunication;
