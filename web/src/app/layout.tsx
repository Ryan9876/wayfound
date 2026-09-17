import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wayfound',
  description: 'Turn an idea into something you can actually build.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.ReactNode {
  const content = <div className="app-root">{children}</div>;
  const hostedIdentity = process.env.WAYFOUND_IDENTITY_MODE === 'clerk';
  const configured = hostedIdentity && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html lang="en">
      <body>{configured ? <ClerkProvider>{content}</ClerkProvider> : content}</body>
    </html>
  );
}
