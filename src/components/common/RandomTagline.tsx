'use client';

import { useEffect, useState } from 'react';
import { getRandomTaglineIndex, taglines } from '@/lib/taglines';

interface RandomTaglineProps {
  className?: string;
}

export default function RandomTagline({ className }: RandomTaglineProps) {
  const [tagline, setTagline] = useState('');

  useEffect(() => {
    setTagline(taglines[getRandomTaglineIndex()]);
  }, []);

  if (!tagline) return null;

  return <p className={className}>"{tagline}"</p>;
}
