import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setPublicVisitorDisplayName } from '@/utils/publicVisitorDisplayName';
import { User } from 'lucide-react';

type Props = {
  onSaved: (name: string) => void;
};

/**
 * First-time anonymous visitors on the Market Hub (/builders) enter a display name
 * before browsing; stored in localStorage on this device only.
 */
export function PublicVisitorNameGate({ onSaved }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    if (t.length < 2) {
      setError('Please enter at least 2 characters.');
      return;
    }
    if (t.length > 120) {
      setError('Please use a shorter name (120 characters max).');
      return;
    }
    setError('');
    setPublicVisitorDisplayName(t);
    onSaved(t);
  };

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-visitor-name-title"
    >
      <Link
        to="/"
        className="absolute left-4 top-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Home
      </Link>
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <User className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle id="public-visitor-name-title">Welcome to Market Hub</CardTitle>
          <CardDescription>
            Enter how you&apos;d like your name to appear when you like or comment. This is saved only on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="public-visitor-name" className="text-sm font-medium text-foreground">
                Your name
              </label>
              <Input
                id="public-visitor-name"
                name="displayName"
                autoComplete="name"
                autoFocus
                placeholder="e.g. Jane Wanjiru"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError('');
                }}
                className="text-base"
                maxLength={120}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <Button type="submit" className="w-full" size="lg">
              Continue
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/builder-signin" className="text-primary underline-offset-4 hover:underline font-medium">
                Sign in instead
              </Link>{' '}
              if you already have an account.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
