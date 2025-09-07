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

export const toSydneyDateTime = (iso: string) =>
  dayjs(iso).tz(SYD).format('DD/MM/YYYY HH:mm');