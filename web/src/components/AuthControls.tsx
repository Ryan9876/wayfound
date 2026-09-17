'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function AuthControls(): React.ReactNode {
  return (
    <div className="auth-controls">
      <SignedOut><SignInButton mode="modal"><button className="button primary">Sign in</button></SignInButton></SignedOut>
      <SignedIn><UserButton /></SignedIn>
    </div>
  );
}
