  // --- utils de fecha (sin deps) ---
  export const startOfTodayUTC = (now: Date, tz: string) => {
    const local = getLocalYMD(now, tz);
    const iso = makeUTCFromLocal(tz, local.y, local.m, local.d, 0, 0);
    return iso;
  }
  export const addDaysISO = (iso: string, days: number) => {
    const d = new Date(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
  }
  export const getLocalYMD = (date: Date, tz: string) => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date);
    const y = Number(p.find((x) => x.type === 'year')!.value);
    const m = Number(p.find((x) => x.type === 'month')!.value);
    const d = Number(p.find((x) => x.type === 'day')!.value);
    return { y, m, d };
  }
  export const offsetMinutesFor = (date: Date, tz: string) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(date);
    const raw = parts.find((x) => x.type === 'timeZoneName')?.value || 'GMT+0';
    const m = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(raw);
    const h = m ? parseInt(m[1], 10) : 0;
    const mm = m && m[2] ? parseInt(m[2], 10) : 0;
    return h * 60 + mm; // e.g., Bogota => -300
  }
  export const makeUTCFromLocal = (tz: string, y: number, m: number, d: number, hh: number, mm: number) => {
    const probe = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    const offMin = offsetMinutesFor(probe, tz);
    // UTC = local - offset
    const utc = Date.UTC(y, m - 1, d, hh - Math.trunc(offMin / 60), mm - (offMin % 60));
    return new Date(utc).toISOString();
  }