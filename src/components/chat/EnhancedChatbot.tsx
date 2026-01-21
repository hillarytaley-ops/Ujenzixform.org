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
  FileText,
  Star,
  Mail,
  Download,
  Zap,
  Package,
  Truck,
  Camera,
  UserPlus,
  ShoppingCart,
  Search
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
  role: 'user' | 'bot' | 'system' | 'staff';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  feedback?: 'positive' | 'negative' | null;
  isLoading?: boolean;
  sources?: string[];
  staffName?: string;
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
  mentionedCategories: string[];
  userPreferences: {
    language: 'en' | 'sw';
    priceRange?: 'budget' | 'mid' | 'premium';
  };
}

interface ProductInfo {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description?: string;
  supplier_name?: string;
  image_url?: string;
}

interface EnhancedChatbotProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  position?: 'bottom-right' | 'bottom-left';
}

type ChatMode = 'ai' | 'live' | 'waiting';

// Quick reply templates - expanded
const QUICK_REPLIES = [
  { icon: '🛒', label: 'Products', query: 'What products do you sell?' },
  { icon: '🚚', label: 'Delivery', query: 'How does delivery work?' },
  { icon: '📹', label: 'Monitoring', query: 'Tell me about monitoring service' },
  { icon: '📝', label: 'Register', query: 'How do I register?' },
  { icon: '💬', label: 'Live Chat', query: 'Connect me to staff' },
];

// Comprehensive knowledge base
const UJENZIXFORM_KB = {
  // Product categories sold on the platform
  productCategories: [
    'Cement', 'Steel & Iron', 'Sand & Aggregates', 'Blocks & Bricks', 
    'Roofing Materials', 'Paint & Finishes', 'Plumbing', 'Electrical',
    'Timber & Wood', 'Tiles & Flooring', 'Hardware & Tools', 'Glass & Windows'
  ],
  
  // Material pricing (fallback)
  materials: {
    cement: {
      brands: ['Bamburi', 'Savannah', 'Mombasa Cement', 'Simba Cement', 'Nguvu Cement'],
      unit: '50kg bag',
      priceRange: { min: 750, max: 950 },
      description: 'Portland cement for construction'
    },
    steel: {
      brands: ['Devki Steel', 'Tononoka', 'Mabati Rolling Mills'],
      sizes: ['Y8', 'Y10', 'Y12', 'Y16', 'Y20'],
      priceRange: { min: 85000, max: 95000 },
      unit: 'per ton'
    },
    sand: {
      types: ['River Sand', 'Machine Sand', 'Plaster Sand'],
      priceRange: { min: 1800, max: 2500 },
      unit: 'per ton'
    },
    ballast: {
      sizes: ['3/4 inch', '1/2 inch', 'Dust'],
      priceRange: { min: 2800, max: 3500 },
      unit: 'per ton'
    },
    blocks: {
      sizes: ['4 inch', '6 inch', '8 inch'],
      priceRange: { min: 35, max: 80 },
      unit: 'per piece'
    },
    roofing: {
      types: ['Iron Sheets (Gauge 28-32)', 'Roofing Tiles', 'Polycarbonate'],
      priceRange: { min: 550, max: 1200 },
      unit: 'per sheet/piece'
    },
    paint: {
      brands: ['Crown Paints', 'Galaxy', 'Basco', 'Sadolin'],
      types: ['Emulsion', 'Gloss', 'Weathercoat'],
      priceRange: { min: 3800, max: 8500 },
      unit: 'per 20L'
    },
    timber: {
      types: ['Cypress', 'Pine', 'Mahogany', 'Treated Poles'],
      priceRange: { min: 80, max: 350 },
      unit: 'per foot/piece'
    },
    tiles: {
      types: ['Ceramic', 'Porcelain', 'Granite'],
      priceRange: { min: 800, max: 3500 },
      unit: 'per sqm'
    }
  },
  
  // Delivery information
  delivery: {
    coverage: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu', 'Machakos', 'Kajiado', 'Naivasha'],
    features: [
      'Real-time GPS tracking',
      'QR code verification at delivery',
      'Delivery confirmation with photos',
      'Insurance coverage available',
      'Same-day delivery in Nairobi'
    ],
    costs: {
      'Within Nairobi': 'KES 3,000 - 8,000',
      'Kiambu/Thika': 'KES 5,000 - 12,000',
      'Machakos/Kajiado': 'KES 8,000 - 15,000',
      'Nakuru/Naivasha': 'KES 15,000 - 25,000',
      'Mombasa': 'KES 35,000 - 50,000',
      'Kisumu': 'KES 40,000 - 60,000'
    },
    process: [
      '1. Add items to cart and checkout',
      '2. Select delivery option',
      '3. Enter delivery address',
      '4. Choose delivery date',
      '5. Track your order in real-time',
      '6. Receive and verify with QR code'
    ]
  },
  
  // Monitoring service information
  monitoring: {
    description: 'Professional construction site monitoring with CCTV cameras',
    features: [
      '24/7 live camera feeds',
      'Motion detection alerts',
      'Cloud recording storage',
      'Mobile app access',
      'Multiple camera support',
      'Night vision capability'
    ],
    packages: [
      { name: 'Basic', cameras: '1-2', price: 'KES 5,000/month', storage: '7 days' },
      { name: 'Standard', cameras: '3-5', price: 'KES 12,000/month', storage: '14 days' },
      { name: 'Premium', cameras: '6-10', price: 'KES 25,000/month', storage: '30 days' },
      { name: 'Enterprise', cameras: '10+', price: 'Custom quote', storage: '90 days' }
    ],
    process: [
      '1. Request monitoring service from your dashboard',
      '2. Receive a quote from our team',
      '3. Accept the quote to proceed',
      '4. Our team installs cameras at your site',
      '5. Access live feeds from your dashboard'
    ]
  },
  
  // Registration information
  registration: {
    userTypes: [
      {
        type: 'Private Client',
        description: 'Individual homeowners building their own property',
        benefits: ['Direct purchase from suppliers', 'Delivery tracking', 'Order history'],
        howTo: 'Click "Register as Builder" → Select "Private Client" → Fill details → Verify email'
      },
      {
        type: 'Professional Builder',
        description: 'Contractors and construction companies',
        benefits: ['Request quotes for bulk orders', 'Project management', 'Client management', 'Monitoring service'],
        howTo: 'Click "Register as Builder" → Select "Professional Builder" → Provide company details → Verify'
      },
      {
        type: 'Supplier',
        description: 'Material suppliers and hardware stores',
        benefits: ['List products', 'Receive orders', 'Manage inventory', 'Analytics dashboard'],
        howTo: 'Click "Register as Supplier" → Provide business details → Upload documents → Await verification'
      },
      {
        type: 'Delivery Provider',
        description: 'Logistics and transport companies',
        benefits: ['Receive delivery requests', 'Route optimization', 'Payment tracking'],
        howTo: 'Click "Register as Delivery" → Provide vehicle details → Upload license → Await verification'
      }
    ]
  },
  
  // Locations
  locations: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu', 'Machakos', 'Kajiado', 'Naivasha', 'Nyeri', 'Meru'],
  
  // Contact information
  contact: {
    phone: '+254 700 000 000',
    whatsapp: '+254 700 000 000',
    email: 'support@ujenzixform.co.ke',
    hours: 'Monday - Saturday: 8:00 AM - 6:00 PM',
    address: 'Nairobi, Kenya'
  },
  
  // Payment options
  payment: {
    methods: [
      { name: 'M-Pesa', description: 'Pay via Safaricom M-Pesa (Paybill/Till)', popular: true },
      { name: 'Bank Transfer', description: 'Direct bank deposit/transfer', popular: false },
      { name: 'Card Payment', description: 'Visa/Mastercard via secure gateway', popular: false },
      { name: 'Cash on Delivery', description: 'Pay when materials arrive (select areas)', popular: true }
    ],
    process: [
      '1. Add items to cart',
      '2. Proceed to checkout',
      '3. Select payment method',
      '4. Complete payment',
      '5. Receive confirmation via SMS/Email'
    ],
    security: 'All payments are secured with SSL encryption'
  },
  
  // Returns & Refunds
  returns: {
    policy: '7-day return policy for unused items in original packaging',
    conditions: [
      'Item must be unused and in original packaging',
      'Return request within 7 days of delivery',
      'Original receipt/order confirmation required',
      'Some items (cement, mixed materials) non-returnable'
    ],
    process: [
      '1. Contact support within 7 days',
      '2. Provide order number and reason',
      '3. Get return authorization',
      '4. Arrange pickup or drop-off',
      '5. Refund processed within 5-7 business days'
    ],
    refundMethods: ['M-Pesa reversal', 'Bank transfer', 'Store credit']
  },
  
  // Quality & Warranty
  quality: {
    standards: [
      'All materials meet KEBS (Kenya Bureau of Standards) requirements',
      'Verified suppliers only',
      'Quality inspection before dispatch',
      'Supplier ratings and reviews available'
    ],
    warranty: {
      cement: 'Use within 3 months of purchase for best results',
      steel: 'Manufacturer warranty applies (typically 1 year)',
      paint: '5-year warranty on premium brands',
      roofing: '10-25 year warranty depending on brand',
      tiles: 'Replacement for manufacturing defects'
    }
  },
  
  // FAQs
  faqs: [
    {
      question: 'How do I place an order?',
      answer: 'Browse products, add to cart, checkout, select delivery, and pay. You\'ll receive confirmation via SMS/email.'
    },
    {
      question: 'What areas do you deliver to?',
      answer: 'We deliver across Kenya including Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, and more. Delivery costs vary by location.'
    },
    {
      question: 'How long does delivery take?',
      answer: 'Same-day delivery available in Nairobi. Other areas typically 1-3 days depending on location and stock availability.'
    },
    {
      question: 'Can I track my delivery?',
      answer: 'Yes! All deliveries have real-time GPS tracking. You\'ll receive a tracking link via SMS.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'M-Pesa, bank transfer, card payments (Visa/Mastercard), and cash on delivery in select areas.'
    },
    {
      question: 'Are your materials genuine?',
      answer: 'Yes! We only work with verified suppliers. All materials meet KEBS standards and come with proper documentation.'
    },
    {
      question: 'Can I return items?',
      answer: 'Yes, unused items in original packaging can be returned within 7 days. Some items like cement are non-returnable.'
    },
    {
      question: 'Do you offer bulk discounts?',
      answer: 'Yes! Professional builders can request quotes for bulk orders with special pricing.'
    },
    {
      question: 'How does the monitoring service work?',
      answer: 'We install CCTV cameras at your site. You can view live feeds 24/7 from your dashboard or mobile app.'
    },
    {
      question: 'Is my payment secure?',
      answer: 'Absolutely! All payments are encrypted with SSL. M-Pesa transactions go through Safaricom\'s secure gateway.'
    }
  ],
  
  // Safety tips
  safetyTips: [
    'Always verify materials upon delivery using the QR code',
    'Check expiry dates on cement bags (use within 3 months)',
    'Store materials in dry, covered areas',
    'Ensure steel bars are rust-free before use',
    'Keep paint in cool, dry storage',
    'Wear protective gear when handling materials'
  ],
  
  // Construction tips
  constructionTips: {
    cement: [
      'Use clean water for mixing',
      'Mix ratio: 1 cement : 2 sand : 4 ballast for concrete',
      'Cure concrete for at least 7 days',
      'Don\'t use cement older than 3 months'
    ],
    steel: [
      'Minimum cover: 25mm for columns, 40mm for foundation',
      'Overlap length: 40 times the bar diameter',
      'Use binding wire to secure joints',
      'Store off the ground to prevent rust'
    ],
    blocks: [
      'Wet blocks before laying',
      'Use level and plumb line for straight walls',
      'Allow mortar to cure before next course',
      'Leave openings for doors and windows'
    ],
    roofing: [
      'Minimum roof pitch: 15 degrees for iron sheets',
      'Overlap sheets by at least 150mm',
      'Use proper fasteners with rubber washers',
      'Ensure proper ventilation'
    ]
  },
  
  // Promotions (example)
  promotions: {
    current: [
      { name: 'Bulk Cement Deal', description: '10% off on 100+ bags', validUntil: 'End of month' },
      { name: 'Free Delivery', description: 'Orders above KES 50,000 in Nairobi', validUntil: 'Ongoing' },
      { name: 'New User Discount', description: '5% off first order', validUntil: 'Ongoing' }
    ]
  },
  
  // Business hours by service
  businessHours: {
    customerSupport: 'Mon-Sat: 8:00 AM - 6:00 PM',
    deliveries: 'Mon-Sat: 7:00 AM - 7:00 PM',
    liveChat: 'Mon-Sat: 8:00 AM - 6:00 PM',
    emergencyLine: '24/7 for urgent delivery issues'
  }
};

// Swahili translations
const SWAHILI_RESPONSES: Record<string, string> = {
  welcome: 'Karibu! Mimi ni UJbot, msaidizi wako wa ujenzi.',
  products: 'Bidhaa',
  delivery: 'Usafirishaji',
  monitoring: 'Ufuatiliaji',
  register: 'Jisajili',
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
    mentionedCategories: [],
    userPreferences: { language: 'en' }
  });
  const [products, setProducts] = useState<ProductInfo[]>([]);
  
  // Live chat state
  const [chatMode, setChatMode] = useState<ChatMode>('ai');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffTyping, setStaffTyping] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [staffOnline, setStaffOnline] = useState(0);
  
  // Feature states
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

  // Fetch products from database
  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_material_images')
        .select('id, name, category, suggested_price, unit, description, image_url')
        .eq('is_approved', true)
        .limit(100);
      
      if (!error && data && data.length > 0) {
        setProducts(data.map(d => ({
          id: d.id,
          name: d.name,
          category: d.category,
          price: d.suggested_price || 0,
          unit: d.unit || 'unit',
          description: d.description,
          image_url: d.image_url
        })));
      }
    } catch (err) {
      console.log('Using default product data');
    }
  }, []);

  // Check staff availability
  const checkStaffAvailability = useCallback(async () => {
    // Default based on business hours
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const isBusinessHours = day >= 1 && day <= 6 && hour >= 8 && hour < 18;
    setStaffOnline(isBusinessHours ? 3 : 0);
    
    try {
      const { data, error } = await supabase
        .from('admin_staff')
        .select('id, name')
        .eq('is_online', true);
      
      if (!error && data && data.length > 0) {
        setStaffOnline(data.length);
      }
    } catch (err) {
      // Keep default
    }
  }, []);

  // Initialize chatbot
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchProducts();
      checkStaffAvailability();
      
      const welcomeMsg = context.userPreferences.language === 'sw' 
        ? SWAHILI_RESPONSES.welcome
        : `🇰🇪 Jambo ${userName}! I'm **UJbot**, your UjenziXform assistant.

I can help you with:
• 🛒 **Products** - Browse materials & prices
• 🚚 **Delivery** - Tracking & costs
• 📹 **Monitoring** - Site camera service
• 📝 **Registration** - How to join

${staffOnline > 0 ? `\n💬 **${staffOnline} staff members online** - Click "Live Chat" to talk to a real person!` : ''}

How can I help you today?`;

      setTimeout(() => {
        addBotMessage(welcomeMsg, [
          'Show me products',
          'How does delivery work?',
          'Monitoring service info',
          'How to register?',
          'Talk to staff'
        ]);
      }, 300);
    }
  }, [isOpen, userName, context.userPreferences.language, staffOnline]);

  // Subscribe to live chat messages
  useEffect(() => {
    if (chatMode !== 'live' || !conversationId) return;

    const channel = supabase
      .channel(`livechat:${conversationId}`)
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
          if (newMsg.sender_type === 'staff' || newMsg.sender_type === 'admin') {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                role: 'staff',
                content: newMsg.content,
                timestamp: new Date(newMsg.created_at),
                staffName: newMsg.sender_name || 'Support Staff',
                attachment: newMsg.file_url ? {
                  type: newMsg.message_type === 'image' ? 'image' : 'file',
                  url: newMsg.file_url,
                  name: newMsg.file_name || 'attachment'
                } : undefined
              }];
            });
            setStaffTyping(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatMode, conversationId]);

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

  // Search products
  const searchProducts = (query: string): ProductInfo[] => {
    const lowerQuery = query.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
  };

  // Get products by category
  const getProductsByCategory = (category: string): ProductInfo[] => {
    return products.filter(p => 
      p.category.toLowerCase().includes(category.toLowerCase())
    ).slice(0, 5);
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Maximum 5MB' });
      return;
    }

    setIsUploading(true);
    const isImage = file.type.startsWith('image/');
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat/${userId || 'guest'}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) {
        const localUrl = URL.createObjectURL(file);
        addUserMessage(isImage ? '📷 Image attached' : `📎 ${file.name}`, {
          type: isImage ? 'image' : 'file',
          url: localUrl,
          name: file.name,
          size: file.size
        });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      addUserMessage(isImage ? '📷 Image attached' : `📎 ${file.name}`, {
        type: isImage ? 'image' : 'file',
        url: urlData.publicUrl,
        name: file.name,
        size: file.size
      });

      if (chatMode === 'live' && conversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          sender_id: userId,
          sender_type: 'client',
          sender_name: userName,
          content: isImage ? 'Image' : file.name,
          message_type: isImage ? 'image' : 'file',
          file_url: urlData.publicUrl,
          file_name: file.name
        }).catch(() => {});
      }

      toast({ title: 'File uploaded' });
    } catch (error) {
      const localUrl = URL.createObjectURL(file);
      addUserMessage(isImage ? '📷 Image' : `📎 ${file.name}`, {
        type: isImage ? 'image' : 'file',
        url: localUrl,
        name: file.name
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Request live chat with staff
  const requestLiveChat = async () => {
    setChatMode('waiting');
    setQueuePosition(1);
    addSystemMessage('🔄 Connecting you to a staff member...');

    console.log('🔄 Creating live chat conversation...', { userId, userName, userEmail });

    try {
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({
          client_id: userId || null,
          client_name: userName || 'Guest',
          client_email: userEmail || null,
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

      if (error) {
        console.error('❌ Error creating conversation:', error);
      } else if (conv) {
        console.log('✅ Conversation created:', conv.id);
        setConversationId(conv.id);
        
        // Save chat history
        for (const msg of messages.slice(-10)) {
          if (msg.role === 'user' || msg.role === 'bot') {
            const { error: msgError } = await supabase.from('chat_messages').insert({
              conversation_id: conv.id,
              sender_id: msg.role === 'user' ? userId : null,
              sender_type: msg.role === 'user' ? 'client' : 'bot',
              sender_name: msg.role === 'user' ? userName : 'UJbot',
              content: msg.content,
              message_type: 'text'
            });
            if (msgError) {
              console.error('❌ Error saving message:', msgError);
            }
          }
        }
        console.log('✅ Chat history saved');
      }
    } catch (err) {
      console.error('❌ Exception creating conversation:', err);
    }

    toast({
      title: '📞 Connecting to staff',
      description: staffOnline > 0 ? 'A staff member will be with you shortly...' : 'Please wait...',
    });

    // Wait for staff to join (or simulate)
    setTimeout(() => {
      setQueuePosition(null);
      setChatMode('live');
      setStaffName('Support Staff');
      addSystemMessage('👤 **Support Staff** has joined the chat. How can I help you?');
    }, 3000);
  };

  // Send message to staff
  const sendToStaff = async (content: string) => {
    console.log('📤 Sending message to staff...', { conversationId, userId, content: content.substring(0, 50) });
    
    if (conversationId) {
      try {
        const { error: msgError } = await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          sender_id: userId || null,
          sender_type: 'client',
          sender_name: userName || 'Guest',
          content: content,
          message_type: 'text'
        });

        if (msgError) {
          console.error('❌ Error inserting message:', msgError);
        } else {
          console.log('✅ Message saved to database');
        }

        const { error: convError } = await supabase
          .from('conversations')
          .update({ 
            last_message: content,
            last_message_at: new Date().toISOString(),
            unread_count: 1
          })
          .eq('id', conversationId);
          
        if (convError) {
          console.error('❌ Error updating conversation:', convError);
        }
      } catch (error) {
        console.error('❌ Exception sending message:', error);
      }
    } else {
      console.warn('⚠️ No conversation ID - message not saved to database');
    }
  };

  // Switch back to AI
  const switchToAI = () => {
    setChatMode('ai');
    setStaffName(null);
    addSystemMessage('🤖 You are now chatting with UJbot. Type "live chat" to talk to staff again.');
  };

  // End chat
  const endChat = () => {
    if (chatMode === 'live') {
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

      await supabase.from('chat_feedback').insert({
        message_id: `rating-${conversationId || Date.now()}`,
        user_id: userId,
        feedback_type: rating >= 4 ? 'positive' : 'negative',
        message_content: ratingComment,
        metadata: { rating, staffName, chatMode }
      }).catch(() => {});

      toast({ title: '⭐ Thank you for your feedback!' });
    } catch (error) {
      console.error('Error submitting rating:', error);
    }

    setShowRatingDialog(false);
    setRating(0);
    setRatingComment('');
    setChatMode('ai');
    setStaffName(null);
    addSystemMessage('Chat ended. Thank you! 🙏');
  };

  // Email transcript
  const emailTranscript = async () => {
    if (!emailAddress) {
      toast({ variant: 'destructive', title: 'Email required' });
      return;
    }

    const transcript = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const sender = m.role === 'user' ? userName : m.role === 'staff' ? (m.staffName || 'Staff') : 'UJbot';
        return `[${m.timestamp.toLocaleString()}] ${sender}: ${m.content}`;
      })
      .join('\n\n');

    await supabase.from('chat_transcripts').insert({
      conversation_id: conversationId,
      user_id: userId,
      user_email: emailAddress,
      transcript: transcript,
      sent_at: new Date().toISOString()
    }).catch(() => {});

    toast({ title: '📧 Transcript saved!', description: `Sent to ${emailAddress}` });
    setShowEmailDialog(false);
  };

  // Update context
  const updateContext = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const newContext = { ...context };

    // Detect materials
    const materials = ['cement', 'steel', 'sand', 'ballast', 'blocks', 'roofing', 'paint', 'timber', 'tiles', 'plumbing', 'electrical'];
    materials.forEach(mat => {
      if (lowerQuery.includes(mat) && !newContext.mentionedMaterials.includes(mat)) {
        newContext.mentionedMaterials.push(mat);
        newContext.lastTopic = mat;
      }
    });

    // Detect categories
    UJENZIXFORM_KB.productCategories.forEach(cat => {
      if (lowerQuery.includes(cat.toLowerCase()) && !newContext.mentionedCategories.includes(cat)) {
        newContext.mentionedCategories.push(cat);
      }
    });

    // Detect locations
    UJENZIXFORM_KB.locations.forEach(loc => {
      if (lowerQuery.includes(loc.toLowerCase()) && !newContext.mentionedLocations.includes(loc)) {
        newContext.mentionedLocations.push(loc);
      }
    });

    // Detect Swahili
    const swahiliWords = ['bei', 'gharama', 'saruji', 'msaada', 'wapi', 'kiasi', 'jisajili'];
    if (swahiliWords.some(w => lowerQuery.includes(w))) {
      newContext.userPreferences.language = 'sw';
    }

    setContext(newContext);
    return newContext;
  };

  // Get material price
  const getMaterialPrice = (material: string): string => {
    // Try from database first
    const dbProduct = products.find(p => 
      p.name.toLowerCase().includes(material) || 
      p.category.toLowerCase().includes(material)
    );
    
    if (dbProduct && dbProduct.price > 0) {
      return `KES ${dbProduct.price.toLocaleString()} per ${dbProduct.unit}`;
    }

    // Fallback to knowledge base
    const kb = UJENZIXFORM_KB.materials[material as keyof typeof UJENZIXFORM_KB.materials];
    if (kb && 'priceRange' in kb) {
      return `KES ${kb.priceRange.min.toLocaleString()} - ${kb.priceRange.max.toLocaleString()} ${kb.unit}`;
    }
    
    return 'Price varies - check our marketplace';
  };

  // AI Response Engine
  const getAIResponse = async (userQuery: string, ctx: ConversationContext): Promise<{
    response: string;
    suggestions?: string[];
    sources?: string[];
  }> => {
    const query = userQuery.toLowerCase();

    // ============ LIVE CHAT REQUEST ============
    if (query.includes('live chat') || query.includes('talk to staff') || query.includes('human') || 
        query.includes('real person') || query.includes('support') || query.includes('agent') ||
        query.includes('connect me') || query.includes('speak to')) {
      return {
        response: `💬 **Connect with Our Team**

${staffOnline > 0 
  ? `✅ **${staffOnline} staff members online now!**\nAverage wait time: ~2 minutes`
  : `⏰ **Staff offline** (Business hours: Mon-Sat 8AM-6PM)\nLeave a message and we'll respond within 24 hours`
}

Our team can help with:
• Complex orders & bulk quotes
• Technical questions
• Account issues
• Custom requests

Click below to start a live chat:`,
        suggestions: ['🔗 Start Live Chat', 'Continue with AI', 'Leave a message']
      };
    }

    // ============ PRODUCTS / ITEMS FOR SALE ============
    if (query.includes('product') || query.includes('sell') || query.includes('item') || 
        query.includes('material') || query.includes('buy') || query.includes('shop') ||
        query.includes('what do you') || query.includes('bidhaa')) {
      
      const categoryList = UJENZIXFORM_KB.productCategories.map(c => `• ${c}`).join('\n');
      
      return {
        response: `🛒 **Products We Sell**

We connect you with verified suppliers for all construction materials:

${categoryList}

**How to Buy:**
1. Browse our marketplace at /suppliers
2. Select materials and add to cart
3. Request quotes or buy directly
4. Choose delivery option
5. Track your order

**Current Highlights:**
• Cement: ${getMaterialPrice('cement')}
• Steel: ${getMaterialPrice('steel')}
• Blocks: ${getMaterialPrice('blocks')}

What category interests you?`,
        suggestions: ['Cement prices', 'Steel prices', 'Roofing options', 'Browse all products', 'Talk to staff'],
        sources: ['UjenziXform Marketplace']
      };
    }

    // ============ SPECIFIC MATERIAL QUERIES ============
    if (query.includes('cement') || query.includes('saruji')) {
      const cementInfo = UJENZIXFORM_KB.materials.cement;
      const matchingProducts = getProductsByCategory('cement');
      
      let productList = '';
      if (matchingProducts.length > 0) {
        productList = '\n\n**Available Now:**\n' + matchingProducts.map(p => 
          `• ${p.name}: KES ${p.price.toLocaleString()}/${p.unit}`
        ).join('\n');
      }
      
      return {
        response: `🧱 **Cement**

**Popular Brands:**
${cementInfo.brands.map(b => `• ${b}`).join('\n')}

**Price Range:** ${getMaterialPrice('cement')}

**Bulk Discounts:**
• 50-100 bags: 5% off
• 100-500 bags: 10% off
• 500+ bags: 15% off

💡 **Tip:** ${cementInfo.description}${productList}`,
        suggestions: ['Calculate cement needed', 'Find cement suppliers', 'Steel prices', 'Request quote'],
        sources: ['UjenziXform Supplier Database']
      };
    }

    if (query.includes('steel') || query.includes('iron') || query.includes('rebar') || query.includes('chuma')) {
      const steelInfo = UJENZIXFORM_KB.materials.steel;
      return {
        response: `🔩 **Steel & Iron**

**Sizes Available:**
${steelInfo.sizes.map(s => `• ${s}`).join('\n')}

**Price per 6m bar:**
| Size | Price Range |
|------|-------------|
| Y8 | KES 380 - 420 |
| Y10 | KES 580 - 620 |
| Y12 | KES 850 - 950 |
| Y16 | KES 1,450 - 1,550 |
| Y20 | KES 2,200 - 2,400 |

**Per Ton:** ${getMaterialPrice('steel')}

**Brands:** ${steelInfo.brands.join(', ')}

✅ All steel meets KEBS standards`,
        suggestions: ['Calculate steel needed', 'Find steel suppliers', 'Cement prices', 'Request bulk quote'],
        sources: ['UjenziXform Supplier Database']
      };
    }

    if (query.includes('paint')) {
      const paintInfo = UJENZIXFORM_KB.materials.paint;
      return {
        response: `🎨 **Paint & Finishes**

**Brands:**
${paintInfo.brands.map(b => `• ${b}`).join('\n')}

**Types:**
${paintInfo.types.map(t => `• ${t}`).join('\n')}

**Price Range:** ${getMaterialPrice('paint')}

**Coverage:** ~10-12 sqm per liter (2 coats)

💡 **Tip:** For exterior walls, use Weathercoat for durability`,
        suggestions: ['Calculate paint needed', 'Find paint suppliers', 'Other materials'],
        sources: ['UjenziXform Marketplace']
      };
    }

    if (query.includes('roofing') || query.includes('iron sheet') || query.includes('mabati')) {
      return {
        response: `🏠 **Roofing Materials**

**Types Available:**
• Iron Sheets (Gauge 28-32)
• Roofing Tiles (Clay, Concrete)
• Polycarbonate Sheets
• Box Profile
• Versatile

**Price Range:** ${getMaterialPrice('roofing')}

**Popular Brands:**
• Mabati Rolling Mills
• Safal Steel
• Insteel

💡 **Tip:** Gauge 30 is most common for residential`,
        suggestions: ['Calculate roofing needed', 'Find roofing suppliers', 'Timber prices'],
        sources: ['UjenziXform Marketplace']
      };
    }

    if (query.includes('block') || query.includes('brick')) {
      return {
        response: `🧱 **Blocks & Bricks**

**Block Sizes:**
• 4 inch: KES 35-45 each
• 6 inch: KES 55-70 each
• 8 inch: KES 70-85 each

**Types:**
• Concrete blocks
• Hollow blocks
• Solid blocks
• Interlocking bricks

💡 **Tip:** 6-inch blocks are standard for external walls`,
        suggestions: ['Calculate blocks needed', 'Find block suppliers', 'Sand prices'],
        sources: ['UjenziXform Marketplace']
      };
    }

    if (query.includes('sand') || query.includes('ballast') || query.includes('aggregate')) {
      return {
        response: `⛰️ **Sand & Aggregates**

**Sand:**
• River Sand: KES 1,800 - 2,200/ton
• Machine Sand: KES 2,000 - 2,500/ton
• Plaster Sand: KES 2,200 - 2,800/ton

**Ballast:**
• 3/4 inch: KES 2,800 - 3,200/ton
• 1/2 inch: KES 3,000 - 3,500/ton
• Dust: KES 1,500 - 2,000/ton

💡 **Tip:** Order sand and ballast together for better delivery rates`,
        suggestions: ['Calculate sand needed', 'Delivery costs', 'Cement prices'],
        sources: ['UjenziXform Marketplace']
      };
    }

    // ============ DELIVERY ============
    if (query.includes('delivery') || query.includes('deliver') || query.includes('transport') || 
        query.includes('shipping') || query.includes('usafirishaji')) {
      const deliveryInfo = UJENZIXFORM_KB.delivery;
      
      return {
        response: `🚚 **Delivery Services**

**Coverage Areas:**
${deliveryInfo.coverage.slice(0, 6).join(', ')} and more!

**Estimated Costs:**
${Object.entries(deliveryInfo.costs).map(([area, cost]) => `• ${area}: ${cost}`).join('\n')}

**Features:**
${deliveryInfo.features.map(f => `✅ ${f}`).join('\n')}

**How It Works:**
${deliveryInfo.process.join('\n')}

Need delivery? Add items to cart and select delivery at checkout!`,
        suggestions: ['Track my order', 'Delivery to Nairobi', 'Delivery to Mombasa', 'Talk to staff'],
        sources: ['UjenziXform Delivery']
      };
    }

    if (query.includes('track') || query.includes('order status') || query.includes('where is my')) {
      return {
        response: `📦 **Track Your Order**

**To track your delivery:**
1. Log in to your account
2. Go to your Dashboard
3. Click "Orders" or "Deliveries"
4. View real-time GPS location

**Tracking Features:**
• Live GPS location
• Estimated arrival time
• Driver contact
• Delivery photos
• QR code verification

Don't have an account? Register to start ordering!`,
        suggestions: ['How to register', 'Contact support', 'Delivery costs'],
        sources: ['UjenziXform Delivery']
      };
    }

    // ============ MONITORING SERVICE ============
    if (query.includes('monitor') || query.includes('camera') || query.includes('cctv') || 
        query.includes('surveillance') || query.includes('ufuatiliaji')) {
      const monitoringInfo = UJENZIXFORM_KB.monitoring;
      
      return {
        response: `📹 **Site Monitoring Service**

${monitoringInfo.description}

**Features:**
${monitoringInfo.features.map(f => `✅ ${f}`).join('\n')}

**Packages:**
${monitoringInfo.packages.map(p => `• **${p.name}**: ${p.cameras} cameras - ${p.price} (${p.storage} storage)`).join('\n')}

**How to Get Started:**
${monitoringInfo.process.join('\n')}

This service is available for Professional Builders. Register as a builder to access!`,
        suggestions: ['Monitoring pricing', 'How to register as builder', 'Talk to staff about monitoring'],
        sources: ['UjenziXform Monitoring']
      };
    }

    // ============ REGISTRATION ============
    if (query.includes('register') || query.includes('sign up') || query.includes('join') || 
        query.includes('account') || query.includes('jisajili') || query.includes('how do i')) {
      const regInfo = UJENZIXFORM_KB.registration;
      
      return {
        response: `📝 **Registration Guide**

**Choose Your Account Type:**

${regInfo.userTypes.map(ut => `**${ut.type}**
${ut.description}
Benefits: ${ut.benefits.slice(0, 2).join(', ')}
→ ${ut.howTo.split('→')[0]}...`).join('\n\n')}

**Quick Links:**
• Go to our home page
• Click the registration card for your type
• Fill in your details
• Verify your email

Which type of account do you need?`,
        suggestions: ['Register as Private Client', 'Register as Professional Builder', 'Register as Supplier', 'Register as Delivery'],
        sources: ['UjenziXform Registration']
      };
    }

    if (query.includes('private client') || query.includes('homeowner')) {
      const info = UJENZIXFORM_KB.registration.userTypes[0];
      return {
        response: `🏠 **Private Client Registration**

${info.description}

**Benefits:**
${info.benefits.map(b => `✅ ${b}`).join('\n')}

**How to Register:**
${info.howTo}

**What You Can Do:**
• Browse and buy materials directly
• Track your deliveries
• View order history
• Rate suppliers

Ready to register? Visit our home page and click "Register as Builder"!`,
        suggestions: ['Go to registration', 'Professional Builder info', 'Browse products'],
        sources: ['UjenziXform Registration']
      };
    }

    if (query.includes('professional builder') || query.includes('contractor')) {
      const info = UJENZIXFORM_KB.registration.userTypes[1];
      return {
        response: `👷 **Professional Builder Registration**

${info.description}

**Benefits:**
${info.benefits.map(b => `✅ ${b}`).join('\n')}

**How to Register:**
${info.howTo}

**What You Can Do:**
• Request quotes for bulk orders
• Manage multiple projects
• Access monitoring service
• Track all deliveries

Ready to register? Visit our home page and click "Register as Builder"!`,
        suggestions: ['Go to registration', 'Monitoring service info', 'Request bulk quote'],
        sources: ['UjenziXform Registration']
      };
    }

    if (query.includes('supplier') || query.includes('sell material')) {
      const info = UJENZIXFORM_KB.registration.userTypes[2];
      return {
        response: `🏪 **Supplier Registration**

${info.description}

**Benefits:**
${info.benefits.map(b => `✅ ${b}`).join('\n')}

**How to Register:**
${info.howTo}

**Requirements:**
• Valid business registration
• KRA PIN certificate
• Business location
• Product catalog

Ready to join? Visit our home page and click "Register as Supplier"!`,
        suggestions: ['Go to registration', 'Talk to staff about supplier account'],
        sources: ['UjenziXform Registration']
      };
    }

    if (query.includes('delivery provider') || query.includes('transport') || query.includes('logistics')) {
      const info = UJENZIXFORM_KB.registration.userTypes[3];
      return {
        response: `🚛 **Delivery Provider Registration**

${info.description}

**Benefits:**
${info.benefits.map(b => `✅ ${b}`).join('\n')}

**How to Register:**
${info.howTo}

**Requirements:**
• Valid driving license
• Vehicle registration (logbook)
• Insurance certificate
• Good conduct certificate

Ready to join? Visit our home page and click "Register as Delivery"!`,
        suggestions: ['Go to registration', 'Talk to staff about delivery partnership'],
        sources: ['UjenziXform Registration']
      };
    }

    // ============ CALCULATIONS ============
    if (query.includes('calculate') || query.includes('how much') || query.includes('how many') || query.includes('kiasi')) {
      if (query.includes('bedroom') || query.includes('house')) {
        const bedrooms = query.match(/(\d+)[\s-]?bedroom/)?.[1] || '3';
        return {
          response: `🏠 **${bedrooms}-Bedroom House Estimate**

**Cement:** 450-600 bags
**Steel:** 8-11 tons
**Sand:** 15-20 tons
**Ballast:** 20-25 tons
**Blocks:** 3,000-4,000 pieces
**Roofing:** 50-70 sheets

**Estimated Materials Cost: KES 1.6M - 2.2M**
*(Labor not included)*

Want a detailed quote from our suppliers?`,
          suggestions: ['Get supplier quotes', 'Delivery cost', 'Talk to staff for exact quote'],
          sources: ['UjenziXform Calculator']
        };
      }
      
      return {
        response: `🧮 **Material Calculator**

I can help you calculate materials for:
• Foundation
• Walls (blocks)
• Slab (concrete)
• Roofing
• Plastering
• Painting

**Tell me:**
• What are you building?
• What are the dimensions?

Example: "Calculate cement for 100 sqm foundation"`,
        suggestions: ['3-bedroom house estimate', 'Calculate for foundation', 'Calculate for plastering'],
        sources: ['UjenziXform Calculator']
      };
    }

    // ============ PRICING OVERVIEW ============
    if (query.includes('price') || query.includes('cost') || query.includes('bei') || query.includes('gharama')) {
      return {
        response: `💰 **Material Prices Overview**

| Material | Price Range |
|----------|-------------|
| Cement (50kg) | KES 750 - 950 |
| Steel (per ton) | KES 85,000 - 95,000 |
| Sand (per ton) | KES 1,800 - 2,500 |
| Ballast (per ton) | KES 2,800 - 3,500 |
| Blocks (6") | KES 55 - 70 each |
| Paint (20L) | KES 3,800 - 5,500 |
| Roofing | KES 550 - 1,200/sheet |

*Prices vary by supplier and location*

Which material do you need pricing for?`,
        suggestions: ['Cement details', 'Steel details', 'Get bulk quote', 'Browse marketplace'],
        sources: ['UjenziXform Marketplace']
      };
    }

    // ============ CONTACT / HELP ============
    if (query.includes('contact') || query.includes('help') || query.includes('phone') || query.includes('email')) {
      const contact = UJENZIXFORM_KB.contact;
      return {
        response: `📞 **Contact Us**

**Phone:** ${contact.phone}
**WhatsApp:** ${contact.whatsapp}
**Email:** ${contact.email}
**Hours:** ${contact.hours}
**Location:** ${contact.address}

**Need Help With:**
• Orders & Deliveries
• Account Issues
• Technical Support
• Partnership Inquiries

${staffOnline > 0 ? `\n💬 **${staffOnline} staff online now** - Start a live chat!` : ''}`,
        suggestions: ['Start live chat', 'Send email', 'Browse FAQs'],
        sources: ['UjenziXform Support']
      };
    }

    // ============ PAYMENT ============
    if (query.includes('pay') || query.includes('mpesa') || query.includes('m-pesa') || query.includes('payment') || 
        query.includes('lipa') || query.includes('card') || query.includes('bank')) {
      const payment = UJENZIXFORM_KB.payment;
      return {
        response: `💳 **Payment Options**

**Accepted Methods:**
${payment.methods.map(m => `• **${m.name}** ${m.popular ? '⭐' : ''}\n  ${m.description}`).join('\n')}

**How to Pay:**
${payment.process.join('\n')}

🔒 **Security:** ${payment.security}

**M-Pesa Instructions:**
1. Go to M-Pesa menu
2. Select Lipa na M-Pesa
3. Enter Paybill/Till number (shown at checkout)
4. Enter your Order ID as reference
5. Complete payment

Payment confirmation is instant for M-Pesa!`,
        suggestions: ['Cash on delivery areas', 'Payment issues', 'Talk to staff'],
        sources: ['UjenziXform Payments']
      };
    }

    // ============ RETURNS & REFUNDS ============
    if (query.includes('return') || query.includes('refund') || query.includes('exchange') || 
        query.includes('money back') || query.includes('cancel')) {
      const returns = UJENZIXFORM_KB.returns;
      return {
        response: `🔄 **Returns & Refunds**

**Policy:** ${returns.policy}

**Conditions:**
${returns.conditions.map(c => `• ${c}`).join('\n')}

**How to Return:**
${returns.process.join('\n')}

**Refund Methods:**
${returns.refundMethods.map(m => `• ${m}`).join('\n')}

⚠️ **Non-Returnable Items:**
• Cement (once delivered)
• Mixed/custom materials
• Items without original packaging

Need to return something? Contact our support team!`,
        suggestions: ['Contact support', 'Return process', 'Talk to staff'],
        sources: ['UjenziXform Returns Policy']
      };
    }

    // ============ QUALITY & WARRANTY ============
    if (query.includes('quality') || query.includes('warranty') || query.includes('genuine') || 
        query.includes('original') || query.includes('fake') || query.includes('kebs')) {
      const quality = UJENZIXFORM_KB.quality;
      return {
        response: `✅ **Quality & Warranty**

**Our Quality Standards:**
${quality.standards.map(s => `• ${s}`).join('\n')}

**Warranty by Product:**
• **Cement:** ${quality.warranty.cement}
• **Steel:** ${quality.warranty.steel}
• **Paint:** ${quality.warranty.paint}
• **Roofing:** ${quality.warranty.roofing}
• **Tiles:** ${quality.warranty.tiles}

**How We Ensure Quality:**
1. Verified suppliers only
2. KEBS certification required
3. Quality checks before dispatch
4. Customer reviews & ratings

All materials come with proper documentation and receipts!`,
        suggestions: ['KEBS standards', 'Report quality issue', 'Talk to staff'],
        sources: ['UjenziXform Quality']
      };
    }

    // ============ FAQs ============
    if (query.includes('faq') || query.includes('question') || query.includes('common')) {
      const faqs = UJENZIXFORM_KB.faqs.slice(0, 5);
      return {
        response: `❓ **Frequently Asked Questions**

${faqs.map((faq, i) => `**${i + 1}. ${faq.question}**\n${faq.answer}`).join('\n\n')}

Want to know more? Ask me anything!`,
        suggestions: ['More FAQs', 'Payment questions', 'Delivery questions', 'Talk to staff'],
        sources: ['UjenziXform FAQs']
      };
    }

    // ============ SAFETY TIPS ============
    if (query.includes('safety') || query.includes('safe') || query.includes('store') || query.includes('storage')) {
      const tips = UJENZIXFORM_KB.safetyTips;
      return {
        response: `🦺 **Safety & Storage Tips**

${tips.map(t => `• ${t}`).join('\n')}

**Material-Specific Storage:**
• **Cement:** Keep dry, off the ground, use within 3 months
• **Steel:** Store off ground, cover to prevent rust
• **Paint:** Cool, dry place, away from sunlight
• **Timber:** Stack properly, protect from rain

Stay safe on your construction site! 🏗️`,
        suggestions: ['Construction tips', 'Quality standards', 'More help'],
        sources: ['UjenziXform Safety']
      };
    }

    // ============ CONSTRUCTION TIPS ============
    if (query.includes('tip') || query.includes('advice') || query.includes('how to build') || 
        query.includes('best practice') || query.includes('recommendation')) {
      const tips = UJENZIXFORM_KB.constructionTips;
      return {
        response: `💡 **Construction Tips**

**Cement & Concrete:**
${tips.cement.map(t => `• ${t}`).join('\n')}

**Steel Work:**
${tips.steel.map(t => `• ${t}`).join('\n')}

**Block Work:**
${tips.blocks.map(t => `• ${t}`).join('\n')}

**Roofing:**
${tips.roofing.map(t => `• ${t}`).join('\n')}

Need specific advice? Ask me or talk to our experts!`,
        suggestions: ['Cement mixing tips', 'Steel placement', 'Talk to expert'],
        sources: ['UjenziXform Construction Guide']
      };
    }

    // ============ PROMOTIONS / OFFERS ============
    if (query.includes('promo') || query.includes('offer') || query.includes('discount') || 
        query.includes('deal') || query.includes('sale') || query.includes('special')) {
      const promos = UJENZIXFORM_KB.promotions.current;
      return {
        response: `🎉 **Current Promotions**

${promos.map(p => `**${p.name}**\n${p.description}\n⏰ Valid: ${p.validUntil}`).join('\n\n')}

**How to Get Discounts:**
• Bulk orders (100+ items)
• First-time user discount
• Refer a friend program
• Seasonal promotions

Check our marketplace for more deals!`,
        suggestions: ['Bulk discounts', 'Browse products', 'Talk to staff for special pricing'],
        sources: ['UjenziXform Promotions']
      };
    }

    // ============ BUSINESS HOURS ============
    if (query.includes('hour') || query.includes('open') || query.includes('close') || 
        query.includes('time') || query.includes('when') || query.includes('available')) {
      const hours = UJENZIXFORM_KB.businessHours;
      return {
        response: `🕐 **Business Hours**

**Customer Support:** ${hours.customerSupport}
**Deliveries:** ${hours.deliveries}
**Live Chat:** ${hours.liveChat}
**Emergency Line:** ${hours.emergencyLine}

**Current Status:**
${staffOnline > 0 ? `✅ We're open! ${staffOnline} staff online` : '⏰ Currently closed - Leave a message'}

**Public Holidays:**
We're closed on public holidays but emergency support is available.`,
        suggestions: ['Contact support', 'Start live chat', 'Leave message'],
        sources: ['UjenziXform Hours']
      };
    }

    // ============ ORDER STATUS ============
    if (query.includes('order') || query.includes('status') || query.includes('where is') || 
        query.includes('my purchase') || query.includes('bought')) {
      return {
        response: `📦 **Check Your Order**

**To view your orders:**
1. Log in to your account
2. Go to Dashboard
3. Click "My Orders"
4. View status and tracking

**Order Statuses:**
• **Pending** - Awaiting payment/confirmation
• **Confirmed** - Order accepted by supplier
• **Processing** - Being prepared
• **Dispatched** - On the way
• **Delivered** - Completed

**Can't find your order?**
Make sure you're logged in with the same account you used to order.

Need help? Talk to our support team!`,
        suggestions: ['Track delivery', 'Payment status', 'Talk to staff'],
        sources: ['UjenziXform Orders']
      };
    }

    // ============ ACCOUNT ISSUES ============
    if (query.includes('account') || query.includes('login') || query.includes('password') || 
        query.includes('forgot') || query.includes('reset') || query.includes('sign in')) {
      return {
        response: `🔐 **Account Help**

**Can't Log In?**
1. Click "Forgot Password" on login page
2. Enter your email
3. Check inbox for reset link
4. Create new password

**Account Issues:**
• **Wrong email?** Contact support to update
• **Locked out?** Wait 15 minutes or contact support
• **Two accounts?** We can merge them

**Security Tips:**
• Use a strong password
• Don't share login details
• Log out on shared devices

Need help? Our support team can assist!`,
        suggestions: ['Reset password', 'Contact support', 'Talk to staff'],
        sources: ['UjenziXform Account']
      };
    }

    // ============ COMPLAINTS ============
    if (query.includes('complaint') || query.includes('problem') || query.includes('issue') || 
        query.includes('wrong') || query.includes('bad') || query.includes('damaged')) {
      return {
        response: `😔 **We're Sorry to Hear That**

**Report an Issue:**
1. Describe what happened
2. Include your order number
3. Add photos if applicable
4. Our team will respond within 24 hours

**Common Issues We Handle:**
• Damaged goods on delivery
• Wrong items received
• Missing items
• Quality concerns
• Delivery delays

**Resolution Options:**
• Replacement
• Refund
• Store credit
• Compensation

Let me connect you with our support team to resolve this quickly!`,
        suggestions: ['🔗 Start Live Chat', 'Report damaged goods', 'Request refund'],
        sources: ['UjenziXform Support']
      };
    }

    // ============ THANK YOU ============
    if (query.includes('thank') || query.includes('asante') || query.includes('great') || query.includes('helpful')) {
      return {
        response: `You're welcome! 😊 Happy to help.

Is there anything else you'd like to know about:
• Products & Prices
• Delivery
• Monitoring Service
• Registration

Just ask away!`,
        suggestions: ['More questions', 'Rate this chat', 'Close chat']
      };
    }

    // ============ DEFAULT / FALLBACK ============
    return {
      response: `I'm **UJbot**, your UjenziXform assistant! 🇰🇪

I can help you with:

🛒 **Products** - Materials, prices, suppliers
🚚 **Delivery** - Costs, tracking, areas
📹 **Monitoring** - Site camera service
📝 **Registration** - How to join as builder/supplier

${staffOnline > 0 ? `\n💬 **${staffOnline} staff online** - Type "live chat" for human support!` : ''}

**Try asking:**
• "What products do you sell?"
• "How much is cement?"
• "How does delivery work?"
• "How do I register?"`,
      suggestions: ['Products', 'Delivery', 'Monitoring', 'Registration', 'Talk to staff']
    };
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addUserMessage(userMessage);

    // If in live mode, send to staff
    if (chatMode === 'live') {
      await sendToStaff(userMessage);
      return;
    }

    // Check for live chat request
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes('start live chat') || lowerMsg === '🔗 start live chat' ||
        (lowerMsg.includes('talk') && (lowerMsg.includes('staff') || lowerMsg.includes('human')))) {
      await requestLiveChat();
      return;
    }

    // Update context
    const updatedContext = updateContext(userMessage);

    // Show typing
    setIsTyping(true);

    setTimeout(async () => {
      try {
        const { response, suggestions, sources } = await getAIResponse(userMessage, updatedContext);
        addBotMessage(response, suggestions, sources);
      } catch (error) {
        addBotMessage(
          "I'm having trouble. Would you like to talk to our staff?",
          ['Talk to staff', 'Try again']
        );
      }
      setIsTyping(false);
    }, 400 + Math.random() * 600);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === '🔗 Start Live Chat' || suggestion === 'Talk to staff' || suggestion === 'Start live chat') {
      requestLiveChat();
      return;
    }
    if (suggestion === 'Continue with AI') {
      addBotMessage('No problem! What would you like to know?', ['Products', 'Delivery', 'Monitoring', 'Registration']);
      return;
    }
    setInputValue(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  // Handle quick reply
  const handleQuickReply = (query: string) => {
    setInputValue(query);
    setTimeout(() => handleSendMessage(), 100);
  };

  // Handle feedback
  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));

    await supabase.from('chat_feedback').insert({
      message_id: messageId,
      user_id: userId,
      feedback_type: feedback
    }).catch(() => {});

    toast({
      title: feedback === 'positive' ? '👍 Thanks!' : '👎 Thanks for the feedback',
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
    toast({ title: newLang === 'sw' ? 'Lugha: Kiswahili' : 'Language: English', duration: 1500 });
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get header info
  const getHeaderInfo = () => {
    switch (chatMode) {
      case 'live':
        return {
          title: staffName || 'Support Staff',
          subtitle: '💬 Live Chat',
          icon: <UserCheck className="h-6 w-6 text-white" />,
          color: 'from-green-600 to-emerald-600'
        };
      case 'waiting':
        return {
          title: 'Connecting...',
          subtitle: queuePosition ? `Queue: ${queuePosition}` : 'Please wait',
          icon: <Loader2 className="h-6 w-6 text-white animate-spin" />,
          color: 'from-amber-600 to-orange-600'
        };
      default:
        return {
          title: 'UJbot',
          subtitle: 'UjenziXform Assistant 🇰🇪',
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
        {staffOnline > 0 && (
          <Badge className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-1.5">
            {staffOnline} online
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

  // Full chat window
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
            <p className="text-gray-400 text-sm">How was your chat with {staffName}?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10", rating >= star ? 'text-yellow-500' : 'text-gray-600')}
                  onClick={() => setRating(star)}
                >
                  <Star className={cn("h-6 w-6", rating >= star && "fill-current")} />
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Comments (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRatingDialog(false)}>Skip</Button>
            <Button onClick={submitRating} className="bg-cyan-600 hover:bg-cyan-700">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-500" />
              Email Transcript
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={emailTranscript} className="bg-cyan-600 hover:bg-cyan-700">
              <Mail className="h-4 w-4 mr-2" />Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Chat */}
      <div className={cn(
        "fixed z-[9999] w-[400px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-100px)] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden",
        position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
      )}>
        {/* Header */}
        <div className={cn("bg-gradient-to-r p-4 flex items-center justify-between", headerInfo.color)}>
          <div className="flex items-center gap-3">
            {chatMode === 'live' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={switchToAI}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {headerInfo.icon}
              </div>
              <span className={cn("absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full",
                chatMode === 'live' ? 'bg-green-400 border-green-600' : 
                chatMode === 'waiting' ? 'bg-amber-400 border-amber-600' : 'bg-green-400 border-cyan-600'
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={toggleLanguage} title="Language">
                  <Globe className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={requestLiveChat} title="Live Chat">
                  <Headphones className="h-4 w-4" />
                </Button>
              </>
            )}
            {chatMode === 'live' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setShowEmailDialog(true)} title="Email">
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setIsMinimized(true)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={endChat}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Staff online banner */}
        {chatMode === 'ai' && staffOnline > 0 && (
          <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/30 cursor-pointer hover:bg-green-500/20" onClick={requestLiveChat}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-300">{staffOnline} staff online</span>
              </div>
              <span className="text-xs text-green-400 font-medium">Start live chat →</span>
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
                <Button key={idx} variant="outline" size="sm" className="text-xs h-8 bg-slate-800/50 border-slate-600 text-gray-300 hover:bg-slate-700" onClick={() => handleQuickReply(qr.query)}>
                  <span className="mr-1">{qr.icon}</span>{qr.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex gap-2", message.role === 'user' ? 'justify-end' : 'justify-start', message.role === 'system' && 'justify-center')}>
                {message.role === 'system' && (
                  <div className="bg-slate-800/50 text-gray-400 text-xs px-3 py-2 rounded-full">{message.content}</div>
                )}

                {(message.role === 'bot' || message.role === 'staff') && (
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", message.role === 'staff' ? 'bg-green-600/20' : 'bg-cyan-600/20')}>
                    {message.role === 'staff' ? <UserCheck className="h-4 w-4 text-green-400" /> : <Bot className="h-4 w-4 text-cyan-400" />}
                  </div>
                )}
                
                {message.role !== 'system' && (
                  <div className={cn("max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === 'user' ? 'bg-cyan-600 text-white rounded-br-md' : 
                    message.role === 'staff' ? 'bg-green-800/50 text-gray-100 rounded-bl-md border border-green-700/50' : 
                    'bg-slate-800 text-gray-100 rounded-bl-md'
                  )}>
                    {message.role === 'staff' && message.staffName && (
                      <p className="text-xs text-green-400 font-medium mb-1">{message.staffName}</p>
                    )}

                    {message.attachment && (
                      <div className="mb-2">
                        {message.attachment.type === 'image' ? (
                          <img src={message.attachment.url} alt={message.attachment.name} className="max-w-full rounded-lg max-h-48 object-cover" />
                        ) : (
                          <a href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700">
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
                          {line.includes('**') ? <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /> : line}
                          {i < message.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-xs text-gray-500">📚 {message.sources.join(', ')}</p>
                      </div>
                    )}

                    {message.role === 'bot' && message.content && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-gray-500">Helpful?</span>
                        <Button variant="ghost" size="icon" className={cn("h-6 w-6", message.feedback === 'positive' ? 'text-green-400 bg-green-400/20' : 'text-gray-500 hover:text-green-400')} onClick={() => handleFeedback(message.id, 'positive')}>
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-6 w-6", message.feedback === 'negative' ? 'text-red-400 bg-red-400/20' : 'text-gray-500 hover:text-red-400')} onClick={() => handleFeedback(message.id, 'negative')}>
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.suggestions.map((suggestion, idx) => (
                          <Button key={idx} variant="outline" size="sm"
                            className={cn("text-xs h-7",
                              suggestion.includes('Live Chat') || suggestion.includes('Talk to staff') || suggestion.includes('Start Live')
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

                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="h-3 w-3 text-gray-600" />
                      <span className="text-xs text-gray-600">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {message.role === 'user' && <CheckCheck className="h-3 w-3 text-cyan-400 ml-1" />}
                    </div>
                  </div>
                )}

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {(isTyping || staffTyping) && (
              <div className="flex gap-2 items-start">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", staffTyping ? 'bg-green-600/20' : 'bg-cyan-600/20')}>
                  {staffTyping ? <UserCheck className="h-4 w-4 text-green-400" /> : <Bot className="h-4 w-4 text-cyan-400" />}
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

        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" className="hidden" />

        {/* Input */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-cyan-400" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </Button>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={chatMode === 'live' ? 'Message staff...' : chatMode === 'waiting' ? 'Connecting...' : 'Ask me anything...'}
              className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-gray-500"
              disabled={isTyping || chatMode === 'waiting'}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping || chatMode === 'waiting'}
              className={cn("text-white", chatMode === 'live' ? 'bg-green-600 hover:bg-green-700' : 'bg-cyan-600 hover:bg-cyan-700')}>
              {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {chatMode === 'live' ? `Chatting with ${staffName}` : chatMode === 'waiting' ? 'Connecting...' : 'Powered by UjenziXform'}
          </p>
        </div>
      </div>
    </>
  );
};

export default EnhancedChatbot;
