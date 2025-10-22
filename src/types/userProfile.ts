export interface UserProfile {
  id: string;
  user_id: string;
  user_type: 'individual' | 'company' | null;
  is_professional: boolean;
  builder_category: 'professional' | 'private' | null;
  email?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'builder' | 'delivery_provider' | 'admin' | 'supplier';

export type BuilderCategory = 'professional' | 'private';
export type UserType = 'individual' | 'company' | 'client';

export interface BuilderState {
  isProfessionalBuilder: boolean;
  isPrivateBuilder: boolean; // Now means private client, not private builder
  isContractor: boolean;
  isDeliveryProvider: boolean;
  isClient: boolean;
  builderCategory: BuilderCategory | null;
}

export const getUserBuilderState = (userProfile: UserProfile, userRole: UserRole | null): BuilderState => {
  const isContractor = userRole === 'builder' && userProfile.builder_category === 'professional';
  const isPrivateClient = userProfile.builder_category === 'private' && userProfile.user_type === 'client';
  const isDeliveryProvider = userRole === 'delivery_provider';
  const isClient = userProfile.user_type === 'client';
  
  const builderCategory: BuilderCategory | null = userProfile.builder_category;

  return {
    isProfessionalBuilder: isContractor, // Keep for backward compatibility
    isPrivateBuilder: isPrivateClient, // Now means private client
    isContractor,
    isDeliveryProvider,
    isClient,
    builderCategory
  };
};