import { useState, useEffect } from 'react';

interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
}

interface ABTestConfig {
  testId: string;
  variants: ABTestVariant[];
  defaultVariant: string;
}

export const useABTest = (config: ABTestConfig) => {
  const [variant, setVariant] = useState<string>(config.defaultVariant);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user already has a variant assigned
    const storageKey = `ab_test_${config.testId}`;
    const existingVariant = localStorage.getItem(storageKey);

    if (existingVariant && config.variants.some(v => v.id === existingVariant)) {
      setVariant(existingVariant);
      setIsLoading(false);
      return;
    }

    // Assign new variant based on weights
    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    let selectedVariant = config.defaultVariant;

    for (const variantOption of config.variants) {
      currentWeight += variantOption.weight;
      if (random <= currentWeight) {
        selectedVariant = variantOption.id;
        break;
      }
    }

    // Store the variant
    localStorage.setItem(storageKey, selectedVariant);
    setVariant(selectedVariant);
    setIsLoading(false);

    // Track the assignment (in a real app, you'd send this to your analytics)
    console.log(`AB Test ${config.testId}: User assigned to variant ${selectedVariant}`);
  }, [config]);

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    // In a real app, you'd send this to your analytics service
    console.log(`AB Test Event: ${eventName}`, {
      testId: config.testId,
      variant,
      ...properties
    });
  };

  return { variant, isLoading, trackEvent };
};













