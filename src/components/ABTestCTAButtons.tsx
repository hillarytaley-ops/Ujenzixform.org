import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useABTest } from '@/hooks/useABTest';

const ABTestCTAButtons: React.FC = () => {
  const { variant, trackEvent } = useABTest({
    testId: 'hero_cta_buttons',
    variants: [
      { id: 'original', name: 'Original', weight: 50 },
      { id: 'action_focused', name: 'Action Focused', weight: 25 },
      { id: 'benefit_focused', name: 'Benefit Focused', weight: 25 }
    ],
    defaultVariant: 'original'
  });

  const handleButtonClick = (buttonType: string, destination: string) => {
    trackEvent('cta_button_click', { buttonType, destination, variant });
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'action_focused':
        return {
          professional: 'Start Building Today',
          client: 'Find Builders Now',
          supplier: 'Sell Materials'
        };
      case 'benefit_focused':
        return {
          professional: 'Grow Your Business',
          client: 'Save on Construction',
          supplier: 'Increase Sales'
        };
      default:
        return {
          professional: 'Join as Professional Builder',
          client: 'I Need Construction Services',
          supplier: 'I\'m a Supplier'
        };
    }
  };

  const buttonTexts = getButtonContent();

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
      <Link to="/professional-builder-registration">
        <Button 
          size="lg" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-4 shadow-lg transform hover:scale-105 transition-all duration-200"
          onClick={() => handleButtonClick('professional', '/professional-builder-registration')}
        >
          {buttonTexts.professional}
        </Button>
      </Link>
      <Link to="/private-client-registration">
        <Button 
          size="lg" 
          variant="outline" 
          className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-4 shadow-lg backdrop-blur-sm transform hover:scale-105 transition-all duration-200"
          onClick={() => handleButtonClick('client', '/private-client-registration')}
        >
          {buttonTexts.client}
        </Button>
      </Link>
      <Link to="/suppliers">
        <Button 
          size="lg" 
          variant="outline" 
          className="border-construction-orange text-construction-orange hover:bg-construction-orange hover:text-foreground text-lg px-8 py-4 shadow-lg backdrop-blur-sm transform hover:scale-105 transition-all duration-200"
          onClick={() => handleButtonClick('supplier', '/suppliers')}
        >
          {buttonTexts.supplier}
        </Button>
      </Link>
    </div>
  );
};

export default ABTestCTAButtons;













