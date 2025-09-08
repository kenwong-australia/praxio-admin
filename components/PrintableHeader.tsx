'use client';

import Image from 'next/image';
import { useMemo } from 'react';

function formatNow() {
  const d = new Date();

  const date = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);

  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short', // show local TZ (AEST/PDT/etc)
  }).format(d);

  return `${date}, ${time}`;
}

export default function PrintableHeader() {
  const stamp = useMemo(formatNow, []); // snapshot time when rendered
  return (
    <header className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Image
          src="/Praxio Logo clean-12 (logo only).png"
          alt="Praxio AI"
          width={22}
          height={22}
          priority
        />
        <h2 className="text-base font-semibold">Praxio AI — Admin Summary</h2>
      </div>
      <time className="text-xs text-neutral-500" dateTime={new Date().toISOString()}>
        As of {stamp}
      </time>
    </header>
  );
}