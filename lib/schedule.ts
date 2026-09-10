export type Course = {
  id: string;
  name: string;
  code: string;
  day: number;
  start: number;
  end: number;
  weeks: number[];
  teacher: string;
  room: string;
  category: string;
  notes: string;
};
export type Settings = {
  firstMonday: string;
  title: string;
  duration: number;
  morning: number;
  afternoon: number;
  confirmed: boolean;
  times: string[];
};
export type Schedule = {
  courses: Course[];
  settings: Settings;
  revision: number;
};
export const categories = [
  '专业课程',
  '实验实践',
  '课程设计',
  '通识课程',
  '自定义',
];
export const defaultSettings: Settings = {
  firstMonday: new Date(
    Date.now() - ((new Date().getUTCDay() + 6) % 7) * 86400000,
  )
    .toISOString()
    .slice(0, 10),
  title: '我的学期',
  duration: 45,
  morning: 5,
  afternoon: 5,
  confirmed: false,
  times: [
    '08:00',
    '08:50',
    '09:50',
    '10:40',
    '11:30',
    '13:30',
    '14:20',
    '15:20',
    '16:10',
    '17:00',
    '18:30',
    '19:20',
    '20:10',
    '21:00',
  ],
};
export const weekdays = [
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
  '周日',
];
export function endTime(t: string, duration = 45) {
  const [h, m] = t.split(':').map(Number);
  const v = h * 60 + m + duration;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}
export function dateFor(start: string, week: number, day = 1) {
  const d = new Date(start + 'T12:00:00');
  d.setDate(d.getDate() + (week - 1) * 7 + day - 1);
  return d;
}
export function currentWeek(start: string) {
  const today = new Date();
  const first = new Date(start + 'T00:00:00');
  return (
    Math.floor(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) /
        604800000,
    ) + 1
  );
}
export function weekLabel(weeks: number[]) {
  const a = [...weeks].sort((a, b) => a - b),
    r: string[] = [];
  for (let i = 0; i < a.length; i++) {
    let end = a[i],
      start = end;
    while (a[i + 1] === end + 1) end = a[++i];
    r.push(start === end ? `${start}` : `${start}–${end}`);
  }
  return r.join('、') + ' 周';
}
export function conflicts(courses: Course[], course: Course) {
  return courses.filter(
    (c) =>
      c.id !== course.id &&
      c.day === course.day &&
      c.start <= course.end &&
      course.start <= c.end &&
      c.weeks.some((w) => course.weeks.includes(w)),
  );
}
export function validateSchedule(
  value: unknown,
): value is Omit<Schedule, 'revision'> {
  if (!value || typeof value !== 'object') return false;
  const x = value as Schedule;
  return (
    Array.isArray(x.courses) &&
    x.courses.length <= 1000 &&
    new Set(x.courses.map((c) => c?.id)).size === x.courses.length &&
    x.courses.every(
      (c) =>
        c &&
        ['id', 'name', 'code', 'teacher', 'room', 'category', 'notes'].every(
          (k) =>
            typeof c[k as keyof Course] === 'string' &&
            (c[k as keyof Course] as string).length <= 1000,
        ) &&
        c.id.length > 0 &&
        c.name.trim().length > 0 &&
        Number.isInteger(c.day) &&
        c.day >= 1 &&
        c.day <= 7 &&
        Number.isInteger(c.start) &&
        Number.isInteger(c.end) &&
        c.start >= 1 &&
        c.end <= (x.settings?.times?.length ?? 0) &&
        c.end >= c.start &&
        Array.isArray(c.weeks) &&
        c.weeks.length > 0 &&
        c.weeks.every((w) => Number.isInteger(w) && w >= 1 && w <= 30),
    ) &&
    !!x.settings &&
    typeof x.settings.confirmed === 'boolean' &&
    typeof x.settings.title === 'string' &&
    x.settings.title.trim().length > 0 &&
    x.settings.title.length <= 100 &&
    Number.isInteger(x.settings.duration) &&
    x.settings.duration >= 20 &&
    x.settings.duration <= 120 &&
    Number.isInteger(x.settings.morning) &&
    Number.isInteger(x.settings.afternoon) &&
    x.settings.morning >= 0 &&
    x.settings.afternoon >= 0 &&
    x.settings.morning + x.settings.afternoon <= x.settings.times?.length &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.settings.firstMonday) &&
    Number.isFinite(Date.parse(x.settings.firstMonday)) &&
    new Date(x.settings.firstMonday + 'T12:00:00').getDay() === 1 &&
    new Date(x.settings.firstMonday + 'T12:00:00Z')
      .toISOString()
      .slice(0, 10) === x.settings.firstMonday &&
    Array.isArray(x.settings.times) &&
    x.settings.times.length >= 1 &&
    x.settings.times.length <= 20 &&
    x.settings.times.every(
      (t, i, a) =>
        typeof t === 'string' &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t) &&
        endTime(t, x.settings.duration) <= '23:59' &&
        (i === 0 || t >= endTime(a[i - 1], x.settings.duration)),
    )
  );
}
export function courseLanes(courses: Course[]) {
  const positions: Record<string, { lane: number; count: number }> = {};
  for (let day = 1; day <= 7; day++) {
    const sorted = courses
      .filter((c) => c.day === day)
      .sort(
        (a, b) =>
          a.start - b.start || a.end - b.end || a.id.localeCompare(b.id),
      );
    let group: Course[] = [],
      groupEnd = 0;
    const flush = () => {
      const ends: number[] = [];
      for (const c of group) {
        let lane = ends.findIndex((e) => e < c.start);
        if (lane === -1) lane = ends.length;
        ends[lane] = c.end;
        positions[c.id] = { lane, count: 0 };
      }
      for (const c of group) positions[c.id].count = ends.length;
      group = [];
    };
    for (const c of sorted) {
      if (group.length && c.start > groupEnd) flush();
      group.push(c);
      groupEnd = Math.max(group.length === 1 ? 0 : groupEnd, c.end);
    }
    flush();
  }
  return positions;
}
