import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Key, Search, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export const AdminPasswordResetTool = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFound, setUserFound] = useState<any>(null);
  const { toast } = useToast();

  const searchUser = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Enter an email to search',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Search in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${searchEmail}%`)
        .limit(1)
        .single();

      if (data) {
        setUserFound(data);
        toast({
          title: 'User found',
          description: `Found: ${data.full_name || 'User'}`,
        });
      } else {
        toast({
          title: 'User not found',
          description: 'No user with that email. They can sign up as new user instead.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Could not search for user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords don\'t match',
        description: 'Please make sure both passwords are the same',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: '❌ Cannot Reset Password',
      description: 'Password reset requires email verification. User must create a new account or use password reset email.',
      variant: 'destructive',
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-red-500">
      <CardHeader className="bg-red-50">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-full">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-red-900">⚠️ Admin Password Reset Tool</CardTitle>
            <CardDescription className="text-red-700">
              Admin only - Use with caution
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ PASSWORD RESET NOT WORKING</strong><br/>
            Supabase email is not configured. User must create a new account instead.
          </AlertDescription>
        </Alert>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-blue-900">✅ WORKING SOLUTION:</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li><strong>User creates NEW account</strong> at /auth (takes 30 seconds)</li>
              <li><strong>Use different email</strong> if old one is locked</li>
              <li><strong>Or delete old account</strong> in Supabase Dashboard → Users</li>
              <li><strong>Then re-register</strong> with same email</li>
            </ol>
          </CardContent>
        </Card>

        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm text-green-800">
            <strong>QUICKEST FIX:</strong><br/>
            1. Go to: <code className="bg-white px-2 py-1 rounded">/auth</code><br/>
            2. Click "Sign Up"<br/>
            3. Email: <code className="bg-white px-2 py-1 rounded">newemail@example.com</code><br/>
            4. Password: <code className="bg-white px-2 py-1 rounded">anything</code><br/>
            5. ✅ Instant access - no email needed!
          </AlertDescription>
        </Alert>

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-3">Delete User Account (So They Can Re-Register):</h4>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>In Supabase Dashboard:</strong><br/>
              1. Go to: Authentication → Users<br/>
              2. Find user by email<br/>
              3. Click 3 dots → Delete user<br/>
              4. User can now sign up again with same email
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

