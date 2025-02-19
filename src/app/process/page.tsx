'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProcessPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect back to home page
    router.push('/');
  }, []);

  return null;
}
