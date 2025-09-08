'use client';

import Image from 'next/image';
import { useMemo } from 'react';

function formatNow() {
  const d = new Date();
  const date = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).format(d);
  return `${date}, ${time}`;
}

export default function PrintableHeader({ title = 'Admin Summary' }: { title?: string }) {
  const stamp = useMemo(formatNow, []); // snapshot at render time
  return (
    <header className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Image
          src="/Praxio Logo clean-12 (logo only).png" // ensure this exists in /public
          alt="Praxio AI"
          width={22}
          height={22}
          priority
        />
        <h2 className="text-base font-semibold">Praxio AI — {title}</h2>
      </div>
      <time className="text-xs text-neutral-500" dateTime={new Date().toISOString()}>
        As of {stamp}
      </time>
    </header>
  );
}