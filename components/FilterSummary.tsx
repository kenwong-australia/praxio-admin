'use client';

type Props = {
  email: string | null;
  fromISO: string; // UTC ISO
  toISO: string;   // UTC ISO
};

function fmtDate(dISO: string) {
  const d = new Date(dISO);
  // browser-local date (no time)
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}

export default function FilterSummary({ email, fromISO, toISO }: Props) {
  const emailText = email ?? 'All';
  return (
    <div className="mb-4 text-sm text-neutral-600">
      <span className="font-medium">Filters:</span>{' '}
      <span>Email: {emailText}</span>{' '}
      <span className="mx-2">•</span>
      <span>Date range: {fmtDate(fromISO)} → {fmtDate(toISO)}</span>
    </div>
  );
}