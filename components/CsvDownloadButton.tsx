'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';
import { User } from '@/lib/types';

dayjs.extend(utc);
dayjs.extend(tz);

const SYD = 'Australia/Sydney';

type Props = {
  rows: User[];
  filenamePrefix?: string; // default: users_export
  className?: string;
};

function toSydneyIso(date: Date | undefined): string {
  if (!date) return '';
  const d = dayjs(date).tz(SYD);
  return d.format('YYYY-MM-DDTHH:mm:ssZ');
}

function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuotes = /[",\n\r]/.test(value);
  let v = value.replace(/"/g, '""');
  return needsQuotes ? `"${v}"` : v;
}

export default function CsvDownloadButton({ rows, filenamePrefix = 'users_export', className }: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    try {
      setBusy(true);
      // Columns match Users table order exactly
      const headers = [
        'User',
        'Email',
        'Email Verified',
        'Phone',
        'ABN',
        'Joined',
        'Status',
        'Frequency',
        'Last Activity',
        'Chats',
        'In Supabase?',
      ];

      const lines: string[] = [];
      lines.push(headers.map(csvEscape).join(','));

      for (const u of rows) {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        const joinedIsoSydney = toSydneyIso(u.created_time);
        const lastIsoSydney = toSydneyIso(u.last_activity);

        const record = [
          fullName,
          u.email || '',
          String(Boolean(u.email_verified)),
          u.phone_number || '',
          u.abn_num || '',
          joinedIsoSydney,
          u.stripe_subscription_status || '',
          (u.selected_frequency || ''),
          lastIsoSydney,
          String(u.supabase_chat_count ?? 0),
          String(Boolean(u.in_supabase)),
        ];
        lines.push(record.map(csvEscape).join(','));
      }

      const csv = '\uFEFF' + lines.join('\n'); // UTF-8 BOM for Excel
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = dayjs().tz(SYD).format('YYYYMMDD_HHmmss');
      a.download = `${filenamePrefix}_${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
      alert('Could not generate CSV. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={className ?? 'rounded-md px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60'}
      title="Download CSV"
    >
      {busy ? 'Preparing…' : 'Download CSV'}
    </button>
  );
}


