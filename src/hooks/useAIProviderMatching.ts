import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryProvider, ProviderMatchCriteria, ProviderMatch } from '@/types/delivery';
import { useToast } from '@/hooks/use-toast';

interface UseAIProviderMatchingResult {
  findBestProviders: (criteria: ProviderMatchCriteria) => Promise<ProviderMatch[]>;
  loading: boolean;
  error: string | null;
}

export const useAIProviderMatching = (): UseAIProviderMatchingResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const calculateMatchScore = (provider: DeliveryProvider, criteria: ProviderMatchCriteria): number => {
    let score = 0;
    const maxScore = 100;

    // Rating score (30% weight)
    if (provider.rating) {
      score += (provider.rating / 5.0) * 30;
    }

    // Distance score (25% weight) - closer is better
    const distanceFromPickup = calculateDistance(
      criteria.pickup_location.latitude,
      criteria.pickup_location.longitude,
      provider.base_location_lat || 0,
      provider.base_location_lng || 0
    );
    
    if (distanceFromPickup <= 10) score += 25;
    else if (distanceFromPickup <= 25) score += 20;
    else if (distanceFromPickup <= 50) score += 15;
    else if (distanceFromPickup <= 100) score += 10;

    // Capacity match (20% weight)
    if (criteria.material_weight && provider.vehicle_capacity_kg) {
      if (provider.vehicle_capacity_kg >= criteria.material_weight) {
        score += 20;
      } else {
        score += 10; // Partial credit for some capacity
      }
    } else {
      score += 15; // Default if no weight specified
    }

    // Availability and performance (15% weight)
    if (provider.availability_status === 'available') score += 8;
    if (provider.on_time_delivery_rate && provider.on_time_delivery_rate >= 90) score += 7;

    // Experience and reliability (10% weight)
    if (provider.total_deliveries && provider.total_deliveries >= 100) score += 5;
    if (provider.is_verified) score += 3;
    if (provider.insurance_coverage) score += 2;

    return Math.min(score, maxScore);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateEstimatedCost = (provider: DeliveryProvider, criteria: ProviderMatchCriteria): number => {
    const deliveryDistance = calculateDistance(
      criteria.pickup_location.latitude,
      criteria.pickup_location.longitude,
      criteria.delivery_location.latitude,
      criteria.delivery_location.longitude
    );

    let cost = provider.minimum_charge || 500;
    cost += (provider.pricing_per_km || 50) * deliveryDistance;
    
    if (criteria.material_weight) {
      cost += (provider.pricing_per_kg || 10) * criteria.material_weight;
    }

    // Apply urgency multiplier
    const urgencyMultipliers = {
      'normal': 1.0,
      'urgent': 1.5,
      'emergency': 2.0
    };
    cost *= urgencyMultipliers[criteria.urgency as keyof typeof urgencyMultipliers] || 1.0;

    return Math.round(cost);
  };

  const calculateEstimatedTime = (provider: DeliveryProvider, criteria: ProviderMatchCriteria): number => {
    const pickupDistance = calculateDistance(
      criteria.pickup_location.latitude,
      criteria.pickup_location.longitude,
      provider.base_location_lat || 0,
      provider.base_location_lng || 0
    );

    const deliveryDistance = calculateDistance(
      criteria.pickup_location.latitude,
      criteria.pickup_location.longitude,
      criteria.delivery_location.latitude,
      criteria.delivery_location.longitude
    );

    // Assume average speeds based on vehicle type
    const vehicleSpeeds = {
      'motorcycle': 45,
      'van': 40,
      'pickup': 35,
      'truck': 30,
      'trailer': 25
    };

    const avgSpeed = vehicleSpeeds[provider.vehicle_type as keyof typeof vehicleSpeeds] || 35;
    
    // Time to reach pickup + delivery time + 30 minutes for loading/unloading
    return (pickupDistance / avgSpeed) + (deliveryDistance / avgSpeed) + 0.5;
  };

  const generateMatchReasons = (provider: DeliveryProvider, score: number): string[] => {
    const reasons: string[] = [];

    if (provider.rating && provider.rating >= 4.5) {
      reasons.push(`Highly rated (${provider.rating}/5.0)`);
    }

    if (provider.on_time_delivery_rate && provider.on_time_delivery_rate >= 95) {
      reasons.push(`Excellent on-time delivery (${provider.on_time_delivery_rate}%)`);
    }

    if (provider.total_deliveries && provider.total_deliveries >= 100) {
      reasons.push(`Experienced (${provider.total_deliveries}+ deliveries)`);
    }

    if (provider.is_verified) {
      reasons.push('Verified provider');
    }

    if (provider.insurance_coverage) {
      reasons.push('Insurance coverage included');
    }

    if (provider.emergency_available) {
      reasons.push('Emergency delivery available');
    }

    if (score >= 90) {
      reasons.push('Perfect match for your requirements');
    } else if (score >= 80) {
      reasons.push('Excellent match for your needs');
    } else if (score >= 70) {
      reasons.push('Good match with reliable service');
    }

    return reasons;
  };

  const findBestProviders = async (criteria: ProviderMatchCriteria): Promise<ProviderMatch[]> => {
    try {
      setLoading(true);
      setError(null);

      // Use the database function to find available providers
      const { data, error: fetchError } = await supabase
        .rpc('find_available_providers', {
          pickup_lat: criteria.pickup_location.latitude,
          pickup_lng: criteria.pickup_location.longitude,
          delivery_lat: criteria.delivery_location.latitude,
          delivery_lng: criteria.delivery_location.longitude,
          material_weight_kg: criteria.material_weight,
          urgency: criteria.urgency
        });

      if (fetchError) {
        throw fetchError;
      }

      // Get full provider details
      const providerIds = data?.map(p => p.id) || [];
      const { data: providers, error: providersError } = await supabase
        .from('delivery_providers')
        .select('*')
        .in('id', providerIds);

      if (providersError) {
        throw providersError;
      }

      // Calculate AI matching scores and create matches
      const matches: ProviderMatch[] = (providers || []).map(provider => {
        const matchScore = calculateMatchScore(provider, criteria);
        const estimatedCost = calculateEstimatedCost(provider, criteria);
        const estimatedTime = calculateEstimatedTime(provider, criteria);
        const distanceFromPickup = calculateDistance(
          criteria.pickup_location.latitude,
          criteria.pickup_location.longitude,
          provider.base_location_lat || 0,
          provider.base_location_lng || 0
        );

        return {
          provider,
          match_score: matchScore,
          estimated_cost: estimatedCost,
          estimated_time_hours: estimatedTime,
          distance_from_pickup_km: distanceFromPickup,
          availability_confidence: provider.availability_status === 'available' ? 95 : 70,
          reasons: generateMatchReasons(provider, matchScore)
        };
      });

      // Sort by match score (highest first)
      matches.sort((a, b) => b.match_score - a.match_score);

      // Apply additional filters
      let filteredMatches = matches;

      if (criteria.max_cost) {
        filteredMatches = filteredMatches.filter(m => m.estimated_cost <= criteria.max_cost!);
      }

      if (criteria.required_rating) {
        filteredMatches = filteredMatches.filter(m => (m.provider.rating || 0) >= criteria.required_rating!);
      }

      if (criteria.preferred_vehicle_type) {
        filteredMatches = filteredMatches.filter(m => m.provider.vehicle_type === criteria.preferred_vehicle_type);
      }

      return filteredMatches.slice(0, 10); // Return top 10 matches

    } catch (err) {
      console.error('Error finding providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to find providers');
      toast({
        title: "Error",
        description: "Failed to find available providers. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    findBestProviders,
    loading,
    error
  };
};
