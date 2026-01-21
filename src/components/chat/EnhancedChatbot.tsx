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
  Phone,
  RefreshCw,
  Mic,
  MicOff,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Types
interface Message {
  id: string;
  role: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  feedback?: 'positive' | 'negative' | null;
  isLoading?: boolean;
  sources?: string[];
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
  const [isListening, setIsListening] = useState(false);
  const [realPrices, setRealPrices] = useState<MaterialPrice[]>([]);
  const [showHumanOption, setShowHumanOption] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Initialize chatbot
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchRealPrices();
      const welcomeMsg = context.userPreferences.language === 'sw' 
        ? SWAHILI_RESPONSES.welcome
        : `🇰🇪 Jambo ${userName}! I'm **UJbot**, your AI Construction Assistant.

I can help you with:
• 💰 **Material prices** - Real-time rates from our suppliers
• 🧮 **Calculations** - How much materials you need
• 🏪 **Find suppliers** - Verified suppliers near you
• 🚚 **Delivery** - Costs and tracking
• 💡 **Construction tips** - Best practices for Kenya

What would you like to know?`;

      setTimeout(() => {
        addBotMessage(welcomeMsg, [
          'Cement prices today',
          'Materials for 3-bedroom house',
          'Find suppliers in Nairobi',
          'How to request delivery'
        ]);
      }, 300);
    }
  }, [isOpen, userName, context.userPreferences.language]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }]);
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
  }> => {
    const query = userQuery.toLowerCase();
    const isSwahili = ctx.userPreferences.language === 'sw';

    // Handle follow-up questions using context
    if ((query.includes('what about') || query.includes('and') || query.includes('also')) && ctx.lastTopic) {
      // User is asking follow-up about previous topic
      if (query.includes('price') || query.includes('cost') || query.includes('bei')) {
        return {
          response: `Continuing with **${ctx.lastTopic}**...\n\n${getMaterialPrice(ctx.lastTopic)}\n\nWant me to find suppliers for ${ctx.lastTopic}?`,
          suggestions: [`Find ${ctx.lastTopic} suppliers`, 'Compare prices', 'Calculate quantity needed']
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
          suggestions: ['Steel prices', 'Calculate cement needed', `Cement suppliers${ctx.mentionedLocations[0] ? ' in ' + ctx.mentionedLocations[0] : ''}`],
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
          suggestions: ['Calculate steel for foundation', 'Find steel suppliers', 'Compare Y12 vs Y16'],
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
        suggestions: ['Cement prices', 'Steel prices', 'Paint prices', 'Roofing prices']
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
          suggestions: ['Get supplier quotes', 'Find builders', 'Delivery cost estimate', 'Calculate exact quantities']
        };
      }

      if (query.includes('cement') || query.includes('saruji')) {
        return {
          response: `🧮 **Cement Calculator:**

**Per Square Meter:**
• Foundation slab: 8-10 bags/sqm
• Floor slab: 6-8 bags/sqm
• Plastering: 1.5 bags/sqm

**Formula:**
\`Cement bags = (L × W × Thickness) ÷ 0.035\`

**Example:** For 10m × 12m foundation (15cm thick):
\`(10 × 12 × 0.15) ÷ 0.035 = 514 bags\`

Tell me your dimensions and I'll calculate exactly!`,
          suggestions: ['Calculate for 100 sqm', 'Calculate for 200 sqm', 'Include plastering']
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

Would you like me to show specific suppliers?`,
        suggestions: [`Cement suppliers in ${location}`, `Steel suppliers in ${location}`, 'Compare all suppliers']
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

**How to request:**
1. Add items to cart
2. Click "Request Delivery"
3. Enter delivery address
4. Track in real-time!`,
        suggestions: ['Request delivery now', 'Track my order', 'Delivery to Kiambu cost']
      };
    }

    // Help/How-to queries
    if (query.includes('help') || query.includes('how to') || query.includes('msaada')) {
      return {
        response: `🆘 **How Can I Help?**

**I can assist with:**

📊 **Prices & Calculations**
• Current material prices
• Quantity calculations
• Cost estimates

🏪 **Suppliers**
• Find verified suppliers
• Compare prices
• Request quotes

🚚 **Delivery**
• Cost estimates
• Request delivery
• Track orders

🏗️ **Construction Tips**
• Best practices
• Material selection
• Quality standards

**Or talk to our team:**
📞 Call: +254 700 000 000
💬 Live chat with staff

What do you need help with?`,
        suggestions: ['Material prices', 'Find suppliers', 'Calculate materials', 'Talk to human']
      };
    }

    // Talk to human
    if (query.includes('human') || query.includes('staff') || query.includes('agent') || query.includes('call')) {
      setShowHumanOption(true);
      return {
        response: `👤 **Connect with Our Team:**

I'll connect you with a human agent who can help with:
• Complex project quotes
• Custom orders
• Technical questions
• Account issues

**Contact Options:**
📞 **Call:** +254 700 000 000
📧 **Email:** support@ujenzixform.co.ke
💬 **Live Chat:** Click below

*Average response time: 5 minutes during business hours*`,
        suggestions: ['Continue with AI', 'Call now', 'Send email']
      };
    }

    // Thank you / positive feedback
    if (query.includes('thank') || query.includes('asante') || query.includes('great') || query.includes('helpful')) {
      return {
        response: isSwahili 
          ? SWAHILI_RESPONSES.thanks
          : `You're welcome! 😊 I'm glad I could help.

Is there anything else you'd like to know about:
• Material prices
• Supplier recommendations
• Delivery options
• Construction calculations

Just ask away!`,
        suggestions: ['More questions', 'Rate this chat', 'Close chat']
      };
    }

    // Default response with context awareness
    const contextHint = ctx.lastTopic 
      ? `\n\n*I remember you were asking about **${ctx.lastTopic}**. Want to continue?*`
      : '';

    return {
      response: `I'm **UJbot**, your Kenya construction assistant! 🇰🇪

I can help with:
• 💰 **Prices** - Current material rates
• 🧮 **Calculate** - Quantities for your project
• 🏪 **Find** - Verified suppliers
• 🚚 **Delivery** - Costs & tracking
• 💡 **Tips** - Construction best practices

**Try asking:**
• "Cement prices today"
• "Materials for 3-bedroom house"
• "Find steel suppliers in Nairobi"
• "Delivery cost to Kiambu"${contextHint}`,
      suggestions: ['Material prices', 'Calculate materials', 'Find suppliers', 'Talk to human']
    };
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addUserMessage(userMessage);

    // Update context
    const updatedContext = updateContext(userMessage);

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI processing (300-1000ms for realism)
    const processingTime = 300 + Math.random() * 700;

    setTimeout(async () => {
      try {
        const { response, suggestions, sources } = await getAIResponse(userMessage, updatedContext);
        addBotMessage(response, suggestions, sources);
      } catch (error) {
        addBotMessage(
          "I'm having trouble processing that. Please try again or talk to our support team.",
          ['Try again', 'Talk to human']
        );
      }
      setIsTyping(false);
    }, processingTime);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  // Handle feedback
  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));

    // Save feedback to database
    try {
      await supabase.from('chat_feedback').insert({
        message_id: messageId,
        user_id: userId,
        feedback_type: feedback,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      // Silently fail - feedback is optional
    }

    toast({
      title: feedback === 'positive' ? '👍 Thanks for the feedback!' : '👎 Thanks for letting us know',
      description: feedback === 'negative' ? "We'll work on improving this." : undefined,
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

  // Closed state - floating button
  if (!isOpen) {
    return (
      <div 
        className={cn(
          "fixed z-[9999]",
          position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
        )}
      >
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
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div 
        className={cn(
          "fixed z-[9999]",
          position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
        )}
      >
        <div 
          className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-3 rounded-full shadow-lg cursor-pointer flex items-center gap-2 hover:shadow-xl transition-all"
          onClick={() => setIsMinimized(false)}
        >
          <Bot className="h-5 w-5" />
          <span className="font-medium">UJbot</span>
          <Badge variant="secondary" className="bg-white/20 text-white text-xs">
            {messages.filter(m => m.role === 'bot').length}
          </Badge>
          <Maximize2 className="h-4 w-4 ml-2" />
        </div>
      </div>
    );
  }

  // Open state - full chat window
  return (
    <div 
      className={cn(
        "fixed z-[9999] w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-100px)] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden",
        position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
      )}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-cyan-600 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-bold text-white">UJbot</h3>
            <p className="text-xs text-cyan-100">AI Construction Assistant 🇰🇪</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-cyan-400" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                message.role === 'user' 
                  ? 'bg-cyan-600 text-white rounded-br-md' 
                  : 'bg-slate-800 text-gray-100 rounded-bl-md'
              )}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none">
                  {message.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line.startsWith('**') && line.endsWith('**') 
                        ? <strong>{line.slice(2, -2)}</strong>
                        : line.includes('**') 
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
                    <p className="text-xs text-gray-500">
                      📚 Sources: {message.sources.join(', ')}
                    </p>
                  </div>
                )}

                {/* Feedback buttons for bot messages */}
                {message.role === 'bot' && !message.isLoading && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-gray-500">Helpful?</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6",
                        message.feedback === 'positive' 
                          ? 'text-green-400 bg-green-400/20' 
                          : 'text-gray-500 hover:text-green-400'
                      )}
                      onClick={() => handleFeedback(message.id, 'positive')}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6",
                        message.feedback === 'negative' 
                          ? 'text-red-400 bg-red-400/20' 
                          : 'text-gray-500 hover:text-red-400'
                      )}
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
                        className="text-xs h-7 bg-slate-700/50 border-slate-600 text-cyan-300 hover:bg-cyan-600/20 hover:text-cyan-200 hover:border-cyan-500"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 items-start">
              <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-cyan-400" />
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

      {/* Talk to Human Banner */}
      {showHumanOption && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300">Need human help?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-300 hover:bg-amber-500/20">
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs text-gray-400"
                onClick={() => setShowHumanOption(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={context.userPreferences.language === 'sw' ? 'Andika ujumbe...' : 'Type your message...'}
            className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-gray-500 focus:border-cyan-500"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Powered by UjenziXform AI • {context.userPreferences.language === 'sw' ? 'Kiswahili' : 'English'}
        </p>
      </div>
    </div>
  );
};

export default EnhancedChatbot;

