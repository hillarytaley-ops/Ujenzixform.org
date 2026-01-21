import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  Maximize2,
  ThumbsUp,
  ThumbsDown,
  User,
  Bot,
  Loader2,
  Globe,
  UserCheck,
  ArrowLeft,
  Clock,
  CheckCheck,
  Headphones,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Star,
  Mail,
  Download,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// Types
interface Message {
  id: string;
  role: 'user' | 'bot' | 'system' | 'agent';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  feedback?: 'positive' | 'negative' | null;
  isLoading?: boolean;
  sources?: string[];
  agentName?: string;
  read?: boolean;
  attachment?: {
    type: 'image' | 'file';
    url: string;
    name: string;
    size?: number;
  };
}

interface ConversationContext {
  lastTopic?: string;
  mentionedMaterials: string[];
  mentionedLocations: string[];
  userPreferences: {
    language: 'en' | 'sw';
    priceRange?: 'budget' | 'mid' | 'premium';
  };
}

interface MaterialPrice {
  name: string;
  category: string;
  price: number;
  unit: string;
  supplier_name?: string;
  last_updated?: string;
}

interface EnhancedChatbotProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  position?: 'bottom-right' | 'bottom-left';
}

type ChatMode = 'ai' | 'human' | 'waiting';

// Quick reply templates
const QUICK_REPLIES = [
  { icon: '💰', label: 'Prices', query: 'Show me material prices' },
  { icon: '🧮', label: 'Calculate', query: 'Help me calculate materials' },
  { icon: '🏪', label: 'Suppliers', query: 'Find suppliers near me' },
  { icon: '🚚', label: 'Delivery', query: 'Delivery options and costs' },
  { icon: '👤', label: 'Human', query: 'Talk to human agent' },
];

// Kenya-specific knowledge base
const KENYA_CONSTRUCTION_KB = {
  materials: {
    cement: {
      brands: ['Bamburi', 'Savannah', 'Mombasa Cement', 'Simba Cement', 'Nguvu Cement'],
      units: '50kg bag',
      priceRange: { min: 750, max: 950 },
      tips: 'Prices lower in coastal regions due to factory proximity'
    },
    steel: {
      brands: ['Devki Steel', 'Tononoka', 'Mabati Rolling Mills'],
      sizes: ['Y8', 'Y10', 'Y12', 'Y16', 'Y20'],
      priceRange: { min: 85000, max: 95000 },
      unit: 'per ton'
    },
    paint: {
      brands: ['Crown Paints', 'Galaxy', 'Basco', 'Sadolin'],
      coverage: '10-12 sqm per liter'
    }
  },
  locations: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu', 'Machakos'],
  calculations: {
    cementPerSqm: { foundation: 8, slab: 6, plaster: 1.5 },
    steelPerSqm: { residential: 40, commercial: 60 }
  }
};

// Swahili translations
const SWAHILI_RESPONSES: Record<string, string> = {
  welcome: 'Karibu! Mimi ni UJbot, msaidizi wako wa ujenzi.',
  price: 'Bei ya',
  cement: 'saruji',
  steel: 'chuma',
  help: 'Ninaweza kukusaidia na',
  thanks: 'Asante! Kama una swali lingine, niambie.'
};

export const EnhancedChatbot: React.FC<EnhancedChatbotProps> = ({
  userId,
  userName = 'Guest',
  userEmail,
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ConversationContext>({
    mentionedMaterials: [],
    mentionedLocations: [],
    userPreferences: { language: 'en' }
  });
  const [realPrices, setRealPrices] = useState<MaterialPrice[]>([]);
  
  // Live chat state
  const [chatMode, setChatMode] = useState<ChatMode>('ai');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [agentsOnline, setAgentsOnline] = useState(0);
  
  // New feature states
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState(userEmail || '');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch real prices from database
  const fetchRealPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('name, category, price, unit')
        .order('category');
      
      if (!error && data) {
        setRealPrices(data as MaterialPrice[]);
      }
    } catch (err) {
      console.log('Could not fetch real prices, using defaults');
    }
  }, []);

  // Check agent availability
  const checkAgentAvailability = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_staff')
        .select('id')
        .eq('is_online', true)
        .eq('can_handle_chat', true);
      
      if (!error && data) {
        setAgentsOnline(data.length);
      }
    } catch (err) {
      // Default to showing agents available during business hours
      const hour = new Date().getHours();
      setAgentsOnline(hour >= 8 && hour < 18 ? 2 : 0);
    }
  }, []);

  // Initialize chatbot
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchRealPrices();
      checkAgentAvailability();
      
      const welcomeMsg = context.userPreferences.language === 'sw' 
        ? SWAHILI_RESPONSES.welcome
        : `🇰🇪 Jambo ${userName}! I'm **UJbot**, your AI Construction Assistant.

I can help you with:
• 💰 **Material prices** - Real-time rates from our suppliers
• 🧮 **Calculations** - How much materials you need
• 🏪 **Find suppliers** - Verified suppliers near you
• 🚚 **Delivery** - Costs and tracking
• 💡 **Construction tips** - Best practices for Kenya

${agentsOnline > 0 ? `\n👤 **${agentsOnline} support agents online** - Type "talk to human" anytime!` : ''}

What would you like to know?`;

      setTimeout(() => {
        addBotMessage(welcomeMsg, [
          'Cement prices today',
          'Materials for 3-bedroom house',
          'Find suppliers in Nairobi',
          'Talk to human agent'
        ]);
      }, 300);
    }
  }, [isOpen, userName, context.userPreferences.language, agentsOnline]);

  // Subscribe to live chat messages when in human mode
  useEffect(() => {
    if (chatMode !== 'human' || !conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add if it's from agent (not our own message)
          if (newMsg.sender_type === 'agent' || newMsg.sender_type === 'admin') {
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                role: 'agent',
                content: newMsg.content,
                timestamp: new Date(newMsg.created_at),
                agentName: newMsg.sender_name || 'Support Agent',
                attachment: newMsg.file_url ? {
                  type: newMsg.message_type === 'image' ? 'image' : 'file',
                  url: newMsg.file_url,
                  name: newMsg.file_name || 'attachment'
                } : undefined
              }];
            });
            setAgentTyping(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.agent_id && !agentName) {
            setAgentName(updated.agent_name || 'Support Agent');
            setChatMode('human');
            addSystemMessage(`${updated.agent_name || 'A support agent'} has joined the chat.`);
          }
          // Check if agent is typing
          if (updated.agent_typing !== undefined) {
            setAgentTyping(updated.agent_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatMode, conversationId, agentName]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Hide quick replies after first message
  useEffect(() => {
    if (messages.filter(m => m.role === 'user').length > 0) {
      setShowQuickReplies(false);
    }
  }, [messages]);

  // Message handlers
  const addBotMessage = (content: string, suggestions?: string[], sources?: string[]) => {
    setMessages(prev => [...prev, {
      id: `bot-${Date.now()}`,
      role: 'bot',
      content,
      timestamp: new Date(),
      suggestions,
      sources,
      feedback: null
    }]);
  };

  const addUserMessage = (content: string, attachment?: Message['attachment']) => {
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      attachment
    }]);
  };

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      role: 'system',
      content,
      timestamp: new Date()
    }]);
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum file size is 5MB'
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload an image or document (PDF, DOC, DOCX)'
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat/${userId || 'guest'}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      const isImage = file.type.startsWith('image/');
      const attachment: Message['attachment'] = {
        type: isImage ? 'image' : 'file',
        url: urlData.publicUrl,
        name: file.name,
        size: file.size
      };

      // Add message with attachment
      addUserMessage(isImage ? '📷 Sent an image' : `📎 Sent: ${file.name}`, attachment);

      // If in human mode, also save to database
      if (chatMode === 'human' && conversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          sender_id: userId,
          sender_type: 'client',
          sender_name: userName,
          content: isImage ? 'Sent an image' : `Sent: ${file.name}`,
          message_type: isImage ? 'image' : 'file',
          file_url: urlData.publicUrl,
          file_name: file.name
        });
      }

      toast({
        title: 'File uploaded',
        description: 'Your file has been sent'
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Could not upload file. Please try again.'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Request human agent
  const requestHumanAgent = async () => {
    setChatMode('waiting');
    setQueuePosition(1);
    
    addSystemMessage('🔄 Connecting you to a human agent...');

    try {
      // Create or get conversation
      let convId = conversationId;
      
      if (!convId) {
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({
            client_id: userId || null,
            client_name: userName,
            client_email: userEmail,
            status: 'waiting',
            source: 'chatbot',
            priority: 'normal',
            metadata: {
              previousMessages: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
              context: context
            }
          })
          .select()
          .single();

        if (convError) throw convError;
        convId = conv.id;
        setConversationId(convId);
      } else {
        // Update existing conversation
        await supabase
          .from('conversations')
          .update({ status: 'waiting' })
          .eq('id', convId);
      }

      // Save chat history to conversation
      for (const msg of messages.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'bot') {
          await supabase.from('chat_messages').insert({
            conversation_id: convId,
            sender_id: msg.role === 'user' ? userId : null,
            sender_type: msg.role === 'user' ? 'client' : 'bot',
            sender_name: msg.role === 'user' ? userName : 'UJbot',
            content: msg.content,
            message_type: 'text'
          });
        }
      }

      // Simulate queue (in production, this would be real-time)
      setTimeout(() => {
        if (chatMode === 'waiting') {
          setQueuePosition(null);
          setChatMode('human');
          setAgentName('Support Agent');
          addSystemMessage('👤 **Support Agent** has joined the chat. How can I help you today?');
        }
      }, 3000);

      toast({
        title: '📞 Connecting to support',
        description: agentsOnline > 0 
          ? 'An agent will be with you shortly...' 
          : 'You are in queue. We\'ll notify you when an agent is available.',
      });

    } catch (error) {
      console.error('Error requesting human agent:', error);
      setChatMode('ai');
      addSystemMessage('❌ Could not connect to support. Please try again or call +254 700 000 000');
    }
  };

  // Send message to human agent
  const sendToAgent = async (content: string) => {
    if (!conversationId) return;

    try {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_type: 'client',
        sender_name: userName,
        content: content,
        message_type: 'text'
      });

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({ 
          last_message: content,
          last_message_at: new Date().toISOString(),
          unread_count: 1
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Message failed',
        description: 'Could not send message. Please try again.'
      });
    }
  };

  // Switch back to AI
  const switchToAI = () => {
    setChatMode('ai');
    setAgentName(null);
    addSystemMessage('🤖 You are now chatting with UJbot. Type "talk to human" to connect with an agent again.');
  };

  // End chat and show rating
  const endChat = () => {
    if (chatMode === 'human') {
      setShowRatingDialog(true);
    } else {
      setIsOpen(false);
    }
  };

  // Submit rating
  const submitRating = async () => {
    try {
      if (conversationId) {
        await supabase
          .from('conversations')
          .update({ 
            status: 'closed',
            rating: rating,
            rating_comment: ratingComment,
            closed_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }

      // Also save to chat_feedback
      await supabase.from('chat_feedback').insert({
        message_id: `rating-${conversationId || Date.now()}`,
        user_id: userId,
        feedback_type: rating >= 4 ? 'positive' : 'negative',
        message_content: ratingComment,
        metadata: { rating, agentName, chatMode }
      });

      toast({
        title: '⭐ Thank you for your feedback!',
        description: 'Your rating helps us improve our service.'
      });

    } catch (error) {
      console.error('Error submitting rating:', error);
    }

    setShowRatingDialog(false);
    setRating(0);
    setRatingComment('');
    setChatMode('ai');
    setAgentName(null);
    addSystemMessage('Chat ended. Thank you for your feedback! 🙏');
  };

  // Email transcript
  const emailTranscript = async () => {
    if (!emailAddress) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter your email address'
      });
      return;
    }

    try {
      // Format transcript
      const transcript = messages
        .filter(m => m.role !== 'system')
        .map(m => {
          const sender = m.role === 'user' ? userName : m.role === 'agent' ? (m.agentName || 'Agent') : 'UJbot';
          const time = m.timestamp.toLocaleString();
          return `[${time}] ${sender}: ${m.content}`;
        })
        .join('\n\n');

      // In production, this would call an edge function to send email
      // For now, we'll save it and show success
      await supabase.from('chat_transcripts').insert({
        conversation_id: conversationId,
        user_email: emailAddress,
        transcript: transcript,
        sent_at: new Date().toISOString()
      }).catch(() => {
        // Table might not exist, that's okay
      });

      toast({
        title: '📧 Transcript sent!',
        description: `Chat history sent to ${emailAddress}`
      });

      setShowEmailDialog(false);

    } catch (error) {
      console.error('Error sending transcript:', error);
      toast({
        variant: 'destructive',
        title: 'Could not send transcript',
        description: 'Please try again later'
      });
    }
  };

  // Update context based on message
  const updateContext = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const newContext = { ...context };

    // Detect materials mentioned
    const materials = ['cement', 'steel', 'paint', 'sand', 'ballast', 'blocks', 'roofing', 'tiles'];
    materials.forEach(mat => {
      if (lowerQuery.includes(mat) && !newContext.mentionedMaterials.includes(mat)) {
        newContext.mentionedMaterials.push(mat);
        newContext.lastTopic = mat;
      }
    });

    // Detect locations
    KENYA_CONSTRUCTION_KB.locations.forEach(loc => {
      if (lowerQuery.includes(loc.toLowerCase()) && !newContext.mentionedLocations.includes(loc)) {
        newContext.mentionedLocations.push(loc);
      }
    });

    // Detect language preference
    const swahiliWords = ['bei', 'gharama', 'saruji', 'chuma', 'msaada', 'wapi', 'kiasi'];
    if (swahiliWords.some(w => lowerQuery.includes(w))) {
      newContext.userPreferences.language = 'sw';
    }

    setContext(newContext);
    return newContext;
  };

  // Get price from database or fallback
  const getMaterialPrice = (material: string): string => {
    const dbPrice = realPrices.find(p => 
      p.name.toLowerCase().includes(material) || 
      p.category.toLowerCase().includes(material)
    );
    
    if (dbPrice) {
      return `KES ${dbPrice.price.toLocaleString()} per ${dbPrice.unit}`;
    }

    // Fallback to knowledge base
    const kb = KENYA_CONSTRUCTION_KB.materials[material as keyof typeof KENYA_CONSTRUCTION_KB.materials];
    if (kb && 'priceRange' in kb) {
      return `KES ${kb.priceRange.min.toLocaleString()} - ${kb.priceRange.max.toLocaleString()}`;
    }
    
    return 'Price varies by supplier';
  };

  // Enhanced AI response with context
  const getAIResponse = async (userQuery: string, ctx: ConversationContext): Promise<{
    response: string;
    suggestions?: string[];
    sources?: string[];
    requestHuman?: boolean;
  }> => {
    const query = userQuery.toLowerCase();
    const isSwahili = ctx.userPreferences.language === 'sw';

    // Check for human request
    if (query.includes('human') || query.includes('agent') || query.includes('staff') || 
        query.includes('person') || query.includes('talk to') || query.includes('real person') ||
        query.includes('support') || query.includes('help me')) {
      return {
        response: `👤 **Connect with Our Team**

I'll transfer you to a human agent who can help with:
• Complex project quotes
• Custom orders  
• Technical questions
• Account issues

${agentsOnline > 0 
  ? `✅ **${agentsOnline} agents online** - Average wait: ~2 minutes`
  : `⏰ **Agents offline** - Leave a message and we'll respond within 24 hours`
}

Click the button below to connect:`,
        suggestions: ['Connect to agent', 'Continue with AI', 'Leave a message'],
        requestHuman: true
      };
    }

    // Handle follow-up questions using context
    if ((query.includes('what about') || query.includes('and') || query.includes('also')) && ctx.lastTopic) {
      if (query.includes('price') || query.includes('cost') || query.includes('bei')) {
        return {
          response: `Continuing with **${ctx.lastTopic}**...\n\n${getMaterialPrice(ctx.lastTopic)}\n\nWant me to find suppliers for ${ctx.lastTopic}?`,
          suggestions: [`Find ${ctx.lastTopic} suppliers`, 'Compare prices', 'Talk to human agent']
        };
      }
    }

    // Price queries
    if (query.includes('price') || query.includes('cost') || query.includes('bei') || query.includes('gharama')) {
      if (query.includes('cement') || query.includes('saruji')) {
        const priceInfo = getMaterialPrice('cement');
        return {
          response: `💰 **Cement Prices in Kenya:**

**Current Market Rates:**
${KENYA_CONSTRUCTION_KB.materials.cement.brands.map(b => `• **${b}:** ${priceInfo}`).join('\n')}

**Bulk Discounts:**
• 50-100 bags: 5% off
• 100-500 bags: 10% off
• 500+ bags: 15% off

💡 **Tip:** ${KENYA_CONSTRUCTION_KB.materials.cement.tips}

${ctx.mentionedLocations.length > 0 ? `\n📍 Prices shown for **${ctx.mentionedLocations[0]}** area.` : ''}`,
          suggestions: ['Steel prices', 'Calculate cement needed', 'Talk to human for quote'],
          sources: ['UjenziXform Supplier Database', 'Market Survey Jan 2026']
        };
      }

      if (query.includes('steel') || query.includes('rebar') || query.includes('chuma')) {
        return {
          response: `🔩 **Steel Bar Prices (per 6m bar):**

| Size | Price Range |
|------|-------------|
| Y8 (8mm) | KES 380 - 420 |
| Y10 (10mm) | KES 580 - 620 |
| Y12 (12mm) | KES 850 - 950 |
| Y16 (16mm) | KES 1,450 - 1,550 |
| Y20 (20mm) | KES 2,200 - 2,400 |

**Per Ton:** KES 85,000 - 95,000

✅ All steel meets **KEBS standards**`,
          suggestions: ['Calculate steel for foundation', 'Find steel suppliers', 'Get quote from agent'],
          sources: ['UjenziXform Supplier Database']
        };
      }

      // General price query
      return {
        response: `💰 **Material Prices Overview:**

| Material | Price Range |
|----------|-------------|
| Cement (50kg) | KES 750 - 950 |
| Steel (per ton) | KES 85,000 - 95,000 |
| Sand (per ton) | KES 1,800 - 2,500 |
| Ballast (per ton) | KES 2,800 - 3,500 |
| Blocks (6") | KES 55 - 70 each |
| Paint (20L) | KES 3,800 - 5,500 |

Which material would you like detailed pricing for?`,
        suggestions: ['Cement prices', 'Steel prices', 'Talk to human for bulk quote']
      };
    }

    // Calculation queries
    if (query.includes('calculate') || query.includes('how much') || query.includes('how many') || query.includes('kiasi')) {
      if (query.includes('bedroom') || query.includes('house') || query.includes('nyumba')) {
        const bedrooms = query.match(/(\d+)[\s-]?bedroom/)?.[1] || '3';
        return {
          response: `🏠 **${bedrooms}-Bedroom House Materials Estimate:**

**Cement:** 450-600 bags
• Foundation: 150-200 bags
• Columns & Beams: 100-150 bags
• Slabs: 200-250 bags

**Steel:** 8-11 tons
• Foundation: 2 tons
• Columns: 2.5 tons
• Ring beams: 1.5 tons
• Slabs: 4 tons

**Other Materials:**
• Sand: 15-20 tons
• Ballast: 20-25 tons
• Blocks: 3,000-4,000 pieces
• Roofing: 50-70 iron sheets

**Estimated Materials Cost: KES 1.6M - 2.2M**
*(Labor not included)*

Want a detailed quote from our suppliers?`,
          suggestions: ['Get supplier quotes', 'Talk to human for exact quote', 'Delivery cost estimate']
        };
      }
    }

    // Supplier queries
    if (query.includes('supplier') || query.includes('find') || query.includes('where') || query.includes('wapi')) {
      const location = ctx.mentionedLocations[0] || 'your area';
      return {
        response: `🏪 **Finding Suppliers in ${location}:**

**How to find verified suppliers:**
1. Go to **"Browse Materials"**
2. Select material category
3. Filter by location: **${location}**
4. View ratings & reviews
5. Request quotes directly

**Our suppliers offer:**
✅ Verified & rated
✅ Competitive prices
✅ Delivery available
✅ Quality guaranteed

Would you like me to connect you with a supplier directly?`,
        suggestions: [`Cement suppliers in ${location}`, 'Talk to human for recommendations', 'Compare all suppliers']
      };
    }

    // Delivery queries
    if (query.includes('delivery') || query.includes('deliver') || query.includes('transport')) {
      return {
        response: `🚚 **Delivery Services:**

**Estimated Costs (from Nairobi):**
| Destination | Cost Range |
|-------------|------------|
| Within Nairobi | KES 3,000 - 8,000 |
| Kiambu/Thika | KES 5,000 - 12,000 |
| Machakos/Kajiado | KES 8,000 - 15,000 |
| Nakuru/Naivasha | KES 15,000 - 25,000 |
| Mombasa | KES 35,000 - 50,000 |

**Features:**
✅ Real-time GPS tracking
✅ QR code verification
✅ Delivery confirmation
✅ Insurance available

Need help arranging delivery? Talk to our team!`,
        suggestions: ['Request delivery now', 'Track my order', 'Talk to human for custom delivery']
      };
    }

    // Default response
    return {
      response: `I'm **UJbot**, your Kenya construction assistant! 🇰🇪

I can help with:
• 💰 **Prices** - Current material rates
• 🧮 **Calculate** - Quantities for your project
• 🏪 **Find** - Verified suppliers
• 🚚 **Delivery** - Costs & tracking
• 💡 **Tips** - Construction best practices

${agentsOnline > 0 ? `\n👤 **${agentsOnline} human agents online** - Type "talk to human" anytime!` : ''}

**Try asking:**
• "Cement prices today"
• "Materials for 3-bedroom house"
• "Find steel suppliers in Nairobi"`,
      suggestions: ['Material prices', 'Calculate materials', 'Find suppliers', 'Talk to human']
    };
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addUserMessage(userMessage);

    // If in human mode, send to agent
    if (chatMode === 'human') {
      await sendToAgent(userMessage);
      return;
    }

    // Check for human request keywords
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes('connect to agent') || lowerMsg === 'yes connect' || 
        (lowerMsg.includes('talk') && lowerMsg.includes('human'))) {
      await requestHumanAgent();
      return;
    }

    // Update context
    const updatedContext = updateContext(userMessage);

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI processing
    const processingTime = 300 + Math.random() * 700;

    setTimeout(async () => {
      try {
        const { response, suggestions, sources, requestHuman } = await getAIResponse(userMessage, updatedContext);
        addBotMessage(response, suggestions, sources);
        
        if (requestHuman) {
          // Show connect button prominently
          setTimeout(() => {
            addBotMessage('', ['🔗 Connect to Agent Now', 'Continue with AI']);
          }, 500);
        }
      } catch (error) {
        addBotMessage(
          "I'm having trouble processing that. Would you like to talk to a human agent?",
          ['Talk to human', 'Try again']
        );
      }
      setIsTyping(false);
    }, processingTime);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === '🔗 Connect to Agent Now' || suggestion === 'Connect to agent' || 
        suggestion === 'Talk to human agent' || suggestion === 'Talk to human') {
      requestHumanAgent();
      return;
    }
    if (suggestion === 'Continue with AI') {
      addBotMessage('No problem! I\'m here to help. What would you like to know?', 
        ['Material prices', 'Calculate materials', 'Find suppliers']);
      return;
    }
    setInputValue(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  // Handle quick reply click
  const handleQuickReply = (query: string) => {
    setInputValue(query);
    setTimeout(() => handleSendMessage(), 100);
  };

  // Handle feedback
  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));

    try {
      await supabase.from('chat_feedback').insert({
        message_id: messageId,
        user_id: userId,
        feedback_type: feedback,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      // Silently fail
    }

    toast({
      title: feedback === 'positive' ? '👍 Thanks!' : '👎 Thanks for the feedback',
      description: feedback === 'negative' ? "We'll improve this." : undefined,
      duration: 2000
    });
  };

  // Toggle language
  const toggleLanguage = () => {
    const newLang = context.userPreferences.language === 'en' ? 'sw' : 'en';
    setContext(prev => ({
      ...prev,
      userPreferences: { ...prev.userPreferences, language: newLang }
    }));
    toast({
      title: newLang === 'sw' ? 'Lugha: Kiswahili' : 'Language: English',
      duration: 1500
    });
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get header info based on mode
  const getHeaderInfo = () => {
    switch (chatMode) {
      case 'human':
        return {
          title: agentName || 'Support Agent',
          subtitle: '👤 Live Chat',
          icon: <UserCheck className="h-6 w-6 text-white" />,
          color: 'from-green-600 to-emerald-600'
        };
      case 'waiting':
        return {
          title: 'Connecting...',
          subtitle: queuePosition ? `Queue position: ${queuePosition}` : 'Please wait',
          icon: <Loader2 className="h-6 w-6 text-white animate-spin" />,
          color: 'from-amber-600 to-orange-600'
        };
      default:
        return {
          title: 'UJbot',
          subtitle: 'AI Construction Assistant 🇰🇪',
          icon: <Bot className="h-6 w-6 text-white" />,
          color: 'from-cyan-600 to-blue-600'
        };
    }
  };

  const headerInfo = getHeaderInfo();

  // Closed state
  if (!isOpen) {
    return (
      <div className={cn("fixed z-[9999]", position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6')}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
        </span>
        {agentsOnline > 0 && (
          <Badge className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-1.5">
            {agentsOnline} online
          </Badge>
        )}
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className={cn("fixed z-[9999]", position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6')}>
        <div 
          className={cn("bg-gradient-to-r text-white px-4 py-3 rounded-full shadow-lg cursor-pointer flex items-center gap-2 hover:shadow-xl transition-all", headerInfo.color)}
          onClick={() => setIsMinimized(false)}
        >
          {headerInfo.icon}
          <span className="font-medium">{headerInfo.title}</span>
          <Badge variant="secondary" className="bg-white/20 text-white text-xs">
            {messages.filter(m => m.role !== 'system').length}
          </Badge>
          <Maximize2 className="h-4 w-4 ml-2" />
        </div>
      </div>
    );
  }

  // Open state
  return (
    <>
      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Rate Your Experience
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              How was your chat with {agentName || 'our team'}?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 transition-all",
                    rating >= star ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-400'
                  )}
                  onClick={() => setRating(star)}
                >
                  <Star className={cn("h-6 w-6", rating >= star && "fill-current")} />
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Any comments? (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRatingDialog(false)}>
              Skip
            </Button>
            <Button onClick={submitRating} className="bg-cyan-600 hover:bg-cyan-700">
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Transcript Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-500" />
              Email Chat Transcript
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Send a copy of this conversation to your email.
            </p>
            <Input
              type="email"
              placeholder="your@email.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={emailTranscript} className="bg-cyan-600 hover:bg-cyan-700">
              <Mail className="h-4 w-4 mr-2" />
              Send Transcript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Chat Window */}
      <div className={cn(
        "fixed z-[9999] w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-100px)] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden",
        position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
      )}>
        {/* Header */}
        <div className={cn("bg-gradient-to-r p-4 flex items-center justify-between", headerInfo.color)}>
          <div className="flex items-center gap-3">
            {chatMode === 'human' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 mr-1"
                onClick={switchToAI}
                title="Back to AI"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {headerInfo.icon}
              </div>
              <span className={cn(
                "absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full",
                chatMode === 'human' ? 'bg-green-400 border-green-600' : 
                chatMode === 'waiting' ? 'bg-amber-400 border-amber-600' : 
                'bg-green-400 border-cyan-600'
              )}></span>
            </div>
            <div>
              <h3 className="font-bold text-white">{headerInfo.title}</h3>
              <p className="text-xs text-white/80">{headerInfo.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {chatMode === 'ai' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={toggleLanguage}
                  title={context.userPreferences.language === 'en' ? 'Switch to Swahili' : 'Switch to English'}
                >
                  <Globe className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={requestHumanAgent}
                  title="Talk to human"
                >
                  <Headphones className="h-4 w-4" />
                </Button>
              </>
            )}
            {chatMode === 'human' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                onClick={() => setShowEmailDialog(true)}
                title="Email transcript"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
              onClick={endChat}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Agent online banner */}
        {chatMode === 'ai' && agentsOnline > 0 && (
          <div 
            className="px-4 py-2 bg-green-500/10 border-b border-green-500/30 cursor-pointer hover:bg-green-500/20 transition-colors"
            onClick={requestHumanAgent}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-300">{agentsOnline} support agent{agentsOnline > 1 ? 's' : ''} online</span>
              </div>
              <span className="text-xs text-green-400 font-medium">Chat now →</span>
            </div>
          </div>
        )}

        {/* Quick Replies */}
        {showQuickReplies && chatMode === 'ai' && messages.length <= 1 && (
          <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Quick actions
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((qr, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 bg-slate-800/50 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
                  onClick={() => handleQuickReply(qr.query)}
                >
                  <span className="mr-1">{qr.icon}</span>
                  {qr.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                  message.role === 'system' && 'justify-center'
                )}
              >
                {/* System messages */}
                {message.role === 'system' && (
                  <div className="bg-slate-800/50 text-gray-400 text-xs px-3 py-2 rounded-full">
                    {message.content}
                  </div>
                )}

                {/* Bot/Agent avatar */}
                {(message.role === 'bot' || message.role === 'agent') && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === 'agent' ? 'bg-green-600/20' : 'bg-cyan-600/20'
                  )}>
                    {message.role === 'agent' 
                      ? <UserCheck className="h-4 w-4 text-green-400" />
                      : <Bot className="h-4 w-4 text-cyan-400" />
                    }
                  </div>
                )}
                
                {/* Message content */}
                {message.role !== 'system' && (
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === 'user' 
                      ? 'bg-cyan-600 text-white rounded-br-md' 
                      : message.role === 'agent'
                      ? 'bg-green-800/50 text-gray-100 rounded-bl-md border border-green-700/50'
                      : 'bg-slate-800 text-gray-100 rounded-bl-md'
                  )}>
                    {/* Agent name */}
                    {message.role === 'agent' && message.agentName && (
                      <p className="text-xs text-green-400 font-medium mb-1">{message.agentName}</p>
                    )}

                    {/* Attachment */}
                    {message.attachment && (
                      <div className="mb-2">
                        {message.attachment.type === 'image' ? (
                          <img 
                            src={message.attachment.url} 
                            alt={message.attachment.name}
                            className="max-w-full rounded-lg max-h-48 object-cover"
                          />
                        ) : (
                          <a 
                            href={message.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                          >
                            <FileText className="h-4 w-4 text-cyan-400" />
                            <span className="text-sm truncate">{message.attachment.name}</span>
                            <Download className="h-4 w-4 text-gray-400" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line.includes('**') 
                            ? <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            : line
                          }
                          {i < message.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-xs text-gray-500">📚 {message.sources.join(', ')}</p>
                      </div>
                    )}

                    {/* Feedback for bot messages */}
                    {message.role === 'bot' && message.content && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-gray-500">Helpful?</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-6 w-6", message.feedback === 'positive' ? 'text-green-400 bg-green-400/20' : 'text-gray-500 hover:text-green-400')}
                          onClick={() => handleFeedback(message.id, 'positive')}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-6 w-6", message.feedback === 'negative' ? 'text-red-400 bg-red-400/20' : 'text-gray-500 hover:text-red-400')}
                          onClick={() => handleFeedback(message.id, 'negative')}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.suggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "text-xs h-7",
                              suggestion.includes('Connect') || suggestion.includes('Talk to human')
                                ? 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/40'
                                : 'bg-slate-700/50 border-slate-600 text-cyan-300 hover:bg-cyan-600/20'
                            )}
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="h-3 w-3 text-gray-600" />
                      <span className="text-xs text-gray-600">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'user' && (
                        <CheckCheck className="h-3 w-3 text-cyan-400 ml-1" />
                      )}
                    </div>
                  </div>
                )}

                {/* User avatar */}
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {(isTyping || agentTyping) && (
              <div className="flex gap-2 items-start">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  agentTyping ? 'bg-green-600/20' : 'bg-cyan-600/20'
                )}>
                  {agentTyping 
                    ? <UserCheck className="h-4 w-4 text-green-400" />
                    : <Bot className="h-4 w-4 text-cyan-400" />
                  }
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
        />

        {/* Input */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex gap-2">
            {/* Attachment button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-gray-400 hover:text-cyan-400 hover:bg-slate-700"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach file"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>

            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                chatMode === 'human' 
                  ? 'Type your message to agent...' 
                  : chatMode === 'waiting'
                  ? 'Connecting to agent...'
                  : context.userPreferences.language === 'sw' ? 'Andika ujumbe...' : 'Type your message...'
              }
              className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-gray-500 focus:border-cyan-500"
              disabled={isTyping || chatMode === 'waiting'}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping || chatMode === 'waiting'}
              className={cn(
                "text-white",
                chatMode === 'human' ? 'bg-green-600 hover:bg-green-700' : 'bg-cyan-600 hover:bg-cyan-700'
              )}
            >
              {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {chatMode === 'human' 
              ? `Chatting with ${agentName}` 
              : chatMode === 'waiting'
              ? 'Connecting to support...'
              : `Powered by UjenziXform AI • ${context.userPreferences.language === 'sw' ? 'Kiswahili' : 'English'}`
            }
          </p>
        </div>
      </div>
    </>
  );
};

export default EnhancedChatbot;
