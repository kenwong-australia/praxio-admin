import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(tz);

const SYD = 'Australia/Sydney';

export const nowSydney = () => dayjs().tz(SYD);

export const rangeLast30Sydney = () => {
  const to = nowSydney().endOf('day');
  const from = to.clone().subtract(30, 'day').startOf('day');
  return { fromUTC: from.utc().toISOString(), toUTC: to.utc().toISOString() };
};

export const toSydneyDate = (iso: string) =>
  dayjs(iso).tz(SYD).format('DD/MM/YYYY');

export const toSydneyDateInput = (iso: string) =>
  dayjs(iso).tz(SYD).format('YYYY-MM-DD');

function sydneyAbbreviation(d: dayjs.Dayjs) {
  // Australia/Sydney offset: +10h standard (AEST), +11h daylight (AEDT)
  const offsetMinutes = d.utcOffset();
  return offsetMinutes === 660 ? 'AEDT' : 'AEST';
}

export const toSydneyDateTime = (iso: string) => {
  const d = dayjs(iso).tz(SYD);
  return `${d.format('DD/MM/YYYY HH:mm')} ${sydneyAbbreviation(d)}`;
};