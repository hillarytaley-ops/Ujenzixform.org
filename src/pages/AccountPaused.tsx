import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PauseCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AccountPaused() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="max-w-md w-full border-amber-500/30 bg-slate-900 text-slate-100">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
            <PauseCircle className="h-8 w-8 text-amber-400" />
          </div>
          <CardTitle>Account paused</CardTitle>
          <CardDescription className="text-slate-400">
            Your UjenziXform account has been temporarily paused by an administrator. You cannot access dashboards or
            post on the public hub until your account is resumed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-center text-slate-400">
            If you believe this is a mistake, contact{' '}
            <a href="mailto:info@ujenzixform.org" className="text-blue-400 underline underline-offset-2">
              info@ujenzixform.org
            </a>
            .
          </p>
          <Button type="button" variant="secondary" className="w-full" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
