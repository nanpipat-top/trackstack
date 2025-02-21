'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInContent() {
  const searchParams = useSearchParams();
  const platform = searchParams.get('platform');

  const handleSignIn = () => {
    if (platform === 'youtube') {
      signIn('google', { callbackUrl: '/' });
    } else if (platform === 'spotify') {
      signIn('spotify', { callbackUrl: '/' });
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Connect Your Account</h1>
          <p className="mt-2 text-gray-400">
            Sign in to {platform === 'youtube' ? 'YouTube Music' : 'Spotify'} to create your playlist
          </p>
        </div>

        <button
          onClick={handleSignIn}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span>Continue with {platform === 'youtube' ? 'Google' : 'Spotify'}</span>
        </button>
      </div>
    </main>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
