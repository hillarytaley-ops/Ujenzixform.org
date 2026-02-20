/**
 * ProfileViewDialog - Simple profile view popup
 * Shows user details with option to sign out
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  LogOut,
  Edit,
  Calendar,
  Shield
} from 'lucide-react';

interface ProfileViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile?: () => void;
  onSignOut: () => void;
}

export const ProfileViewDialog: React.FC<ProfileViewDialogProps> = ({
  isOpen,
  onClose,
  onEditProfile,
  onSignOut
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    
    try {
      // Get user info from localStorage
      const userRole = localStorage.getItem('user_role');
      const userName = localStorage.getItem('user_name');
      const userEmail = localStorage.getItem('user_email');
      const userId = localStorage.getItem('user_id');
      
      // Try to get from session
      let sessionData: any = null;
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          sessionData = JSON.parse(storedSession);
        }
      } catch (e) {}

      // Fetch profile from API
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      const effectiveUserId = userId || sessionData?.user?.id;
      
      if (effectiveUserId) {
        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${effectiveUserId}&select=*`,
            { headers: { 'apikey': apiKey }, cache: 'no-store' }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              setProfile({
                ...data[0],
                role: userRole,
                email: data[0].email || sessionData?.user?.email || userEmail
              });
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Profile fetch failed');
        }
      }

      // Fallback to cached data
      setProfile({
        full_name: userName || sessionData?.user?.user_metadata?.full_name || 'User',
        email: sessionData?.user?.email || userEmail || 'Not provided',
        phone: sessionData?.user?.phone || 'Not provided',
        role: userRole,
        avatar_url: sessionData?.user?.user_metadata?.avatar_url
      });
      
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'professional_builder':
        return <Badge className="bg-blue-500">Professional Builder</Badge>;
      case 'private_client':
        return <Badge className="bg-green-500">Private Client</Badge>;
      case 'supplier':
        return <Badge className="bg-amber-500">Supplier</Badge>;
      case 'delivery':
      case 'delivery_provider':
        return <Badge className="bg-purple-500">Delivery Provider</Badge>;
      case 'admin':
        return <Badge className="bg-red-500">Administrator</Badge>;
      default:
        return <Badge variant="outline">User</Badge>;
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                  {getInitials(profile.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{profile.full_name || 'User'}</h3>
                {getRoleBadge(profile.role)}
              </div>
            </div>

            <Separator />

            {/* Profile Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{profile.email || 'Not provided'}</span>
              </div>
              
              {profile.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
              
              {profile.location && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              
              {profile.company_name && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{profile.company_name}</span>
                </div>
              )}

              {profile.created_at && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              {onEditProfile && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    onClose();
                    onEditProfile();
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Unable to load profile
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
