'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings as SettingsIcon,
  Cloud,
  BookOpen,
  MapPin,
  Clock,
  RefreshCw,
  Check,
  Sun,
  Sunset,
  Moon,
  Trash2,
  AlertCircle,
  CalendarCheck,
  Smartphone,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  type Course,
  type Schedule,
  type Settings,
  defaultSettings,
  weekdays,
  endTime,
  categories,
  dateFor,
  currentWeek,
  weekLabel,
  conflicts,
  validateSchedule,
  courseLanes,
} from '@/lib/schedule';

function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger aria-label={label} className="picker">
        <SelectValue>
          {options.find((x) => x.value === value)?.label || value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem value={o.value} key={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const nums = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const categoryIndex = (c: Course) =>
  Math.max(0, categories.indexOf(c.category));
const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
function freshCourse(week: number): Course {
  return {
    id: crypto.randomUUID(),
    name: '',
    code: '',
    teacher: '',
    room: '',
    day: 1,
    start: 1,
    end: 2,
    weeks: [week],
    category: '自定义',
    notes: '',
  };
}

export default function Timetable({
  seed,
  signedIn,
}: {
  seed: Course[];
  signedIn: boolean;
}) {
  const [data, setData] = useState<Schedule>({
    courses: seed,
    settings: defaultSettings,
    revision: 0,
  });
  const [ready, setReady] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [week, setWeek] = useState(1),
    [filter, setFilter] = useState('全部课程'),
    [tab, setTab] = useState('week'),
    [selectedDay, setSelectedDay] = useState(1),
    [mobileMode, setMobileMode] = useState('day');
  const [editing, setEditing] = useState<Course | null>(null),
    [deleteMode, setDeleteMode] = useState(false),
    [settings, setSettings] = useState<Settings | null>(null),
    [install, setInstall] = useState(false);
  const busyRef = useRef(false),
    editorRef = useRef(false),
    initialized = useRef(false);
  editorRef.current = !!editing || !!settings;
  const refresh = useCallback(
    async (quiet = false) => {
      if (!signedIn) {
        setLoading(false);
        return;
      }
      if (busyRef.current || editorRef.current) return;
      try {
        if (!quiet) setLoading(true);
        const r = await fetch('/api/schedule', { cache: 'no-store' });
        const result = (await r.json()) as Schedule & { error?: string };
        if (!r.ok) throw new Error(result.error);
        if (busyRef.current || editorRef.current) return;
        setData(result);
        setReady(true);
        setError('');
        if (!initialized.current) {
          setWeek(
            Math.max(1, Math.min(30, currentWeek(result.settings.firstMonday))),
          );
          initialized.current = true;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '同步失败，请重试');
      } finally {
        setLoading(false);
      }
    },
    [signedIn],
  );
  useEffect(() => {
    setSelectedDay(((new Date().getDay() + 6) % 7) + 1);
    void refresh();
    const focus = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    const t = setInterval(focus, 30000);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  async function save(next: Schedule) {
    if (busyRef.current || !ready) return false;
    if (!validateSchedule(next)) {
      setError(
        '请填写有效的课程名称、周次和时间。首周日期必须是周一，各节课时间不能重叠。',
      );
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const value = (await r.json()) as Schedule & { error?: string };
      if (!r.ok) throw new Error(value.error);
      setData(value);
      setNotice('已保存，其他设备打开课表时会自动同步');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const active = data.courses.filter((c) => c.weeks.includes(week));
  const filtered = active.filter(
    (c) => filter === '全部课程' || c.category === filter,
  );
  const lanes = courseLanes(filtered);
  const classEnd = (t: string) => endTime(t, data.settings.duration);
  const totalPeriods = active.reduce((n, c) => n + c.end - c.start + 1, 0);
  const actualWeek = currentWeek(data.settings.firstMonday);
  const collision = editing ? conflicts(data.courses, editing) : [];
  const currentIsNew =
    editing && !data.courses.some((c) => c.id === editing.id);
  const change = <K extends keyof Course>(key: K, value: Course[K]) =>
    setEditing((c) => (c ? { ...c, [key]: value } : null));
  async function saveCourse() {
    if (!editing) return;
    const next = editing.name.trim();
    if (
      await save({
        ...data,
        courses: [
          ...data.courses.filter((c) => c.id !== editing.id),
          {
            ...editing,
            name: next,
            weeks: [...new Set(editing.weeks)].sort((a, b) => a - b),
          },
        ],
      })
    ) {
      setEditing(null);
    }
  }
  async function remove(onlyWeek: boolean) {
    if (!editing) return;
    const courses = data.courses.flatMap((c) =>
      c.id !== editing.id
        ? [c]
        : onlyWeek && c.weeks.some((w) => w !== week)
          ? [{ ...c, weeks: c.weeks.filter((w) => w !== week) }]
          : [],
    );
    if (await save({ ...data, courses })) {
      setDeleteMode(false);
      setEditing(null);
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            opts: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'show_timetable_week',
            description: '切换到指定教学周，返回该拾课程。不会修改已保存课程。',
            inputSchema: {
              type: 'object',
              properties: {
                week: { type: 'integer', minimum: 1, maximum: 30 },
              },
              required: ['week'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute: async (input: unknown) => {
              const w = (input as { week?: unknown })?.week;
              if (!Number.isInteger(w) || Number(w) < 1 || Number(w) > 30)
                throw new Error('周次应为 1–30 的整数');
              setWeek(Number(w));
              setTab('week');
              setFilter('全部课程');
              await new Promise((r) => setTimeout(r, 0));
              return {
                week: w,
                courses: data.courses.filter((c) =>
                  c.weeks.includes(Number(w)),
                ),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [data.courses]);
  function courseButton(c: Course, style?: React.CSSProperties) {
    return (
      <button
        key={c.id}
        disabled={!ready}
        onClick={() => {
          setError('');
          setEditing({ ...c, weeks: [...c.weeks] });
        }}
        className={'course category-' + categoryIndex(c)}
        style={style}
      >
        <strong>{c.name}</strong>
        <span>{c.room || '教室待定'}</span>
        <small>
          {c.teacher || '教师待定'} · {c.start}–{c.end} 节
        </small>
        {conflicts(active, c).length > 0 && (
          <small className="conflict-tag">时间重叠</small>
        )}
      </button>
    );
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <CalendarDays />
          </span>
          <strong>拾课</strong>
          <span className="brand-divider" />
          <span className="school">每周有序，每天从容</span>
        </div>
        <div className="header-actions">
          {!signedIn && (
            <a
              className="sign-in"
              href="/signin-with-chatgpt?return_to=%2F"
              target="_top"
            >
              登录
            </a>
          )}
          <span className={'sync ' + (error ? 'sync-error' : '')}>
            <Cloud size={16} />
            {busy
              ? '正在保存'
              : loading
                ? '正在同步'
                : ready
                  ? '账号同步已开启'
                  : signedIn
                    ? '同步暂不可用'
                    : '请先登录'}
          </span>
          <button
            className="icon-btn"
            title="添加到手机主屏幕"
            aria-label="安装到手机"
            onClick={() => setInstall(true)}
          >
            <Smartphone size={18} />
          </button>
        </div>
      </header>
      <main>
        <section className="page-heading">
          <div>
            <span className="eyebrow">{data.settings.title}</span>
            <h1>我的一周</h1>
            <p>
              {data.courses.length
                ? `${new Set(data.courses.map((c) => c.name)).size} 门课程 · 你的专属安排`
                : '从第一门课开始，安排新的一周'}
            </p>
          </div>
          <button
            disabled={!ready || busy}
            onClick={() => {
              setError('');
              setEditing(freshCourse(week));
            }}
            className="primary"
          >
            <Plus size={18} />
            添加课程
          </button>
        </section>
        {!signedIn && (
          <section className="welcome-card">
            <div>
              <h2>为自己建一张课表</h2>
              <p>按周安排课程，手机与电脑同步。每个人的课表独立保存。</p>
            </div>
            <a
              className="primary"
              href="/signin-with-chatgpt?return_to=%2F"
              target="_top"
            >
              使用 ChatGPT 登录
            </a>
          </section>
        )}
        {error && (
          <div className="notice error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
            {!editing && !settings && (
              <button onClick={() => void refresh()}>重新同步</button>
            )}
          </div>
        )}
        {notice && (
          <div className="notice success" role="status">
            <Check size={17} />
            {notice}
          </div>
        )}
        {signedIn && !data.settings.confirmed && (
          <div className="semester-note">
            <CalendarCheck size={16} />
            <span>请先设置第 1 周的周一和作息时间，再添加自己的课程。</span>
            <button
              disabled={!ready}
              onClick={() => setSettings(structuredClone(data.settings))}
            >
              校准首周
            </button>
          </div>
        )}
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <section className="workspace">
            <div className="toolbar">
              <div className="week-nav">
                <button
                  disabled={week === 1}
                  onClick={() => setWeek((w) => w - 1)}
                  aria-label="上一周"
                >
                  <ChevronLeft size={18} />
                </button>
                <Picker
                  label="选择教学周"
                  value={String(week)}
                  options={nums(30).map((w) => ({
                    value: String(w),
                    label: `第 ${w} 周`,
                  }))}
                  onChange={(v) => setWeek(Number(v))}
                />
                <button
                  disabled={week === 30}
                  onClick={() => setWeek((w) => w + 1)}
                  aria-label="下一周"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="date-range">
                  {fmt(dateFor(data.settings.firstMonday, week))} —{' '}
                  {fmt(dateFor(data.settings.firstMonday, week, 7))}
                </span>
                <button
                  className="this-week"
                  onClick={() => setWeek(Math.max(1, Math.min(30, actualWeek)))}
                >
                  {actualWeek >= 1 && actualWeek <= 30
                    ? '回到本周'
                    : '回到学期'}
                </button>
              </div>
              <div className="view-actions">
                <TabsList className="view-tabs">
                  <TabsTrigger value="week">
                    <CalendarDays size={15} />
                    周课表
                  </TabsTrigger>
                  <TabsTrigger value="courses">
                    <BookOpen size={15} />
                    课程管理
                  </TabsTrigger>
                </TabsList>
                <button
                  className="icon-btn"
                  onClick={() => void refresh()}
                  disabled={busy || loading}
                  aria-label="同步课表"
                  title="同步课表"
                >
                  <RefreshCw size={17} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    setError('');
                    setSettings(structuredClone(data.settings));
                  }}
                  disabled={!ready}
                  aria-label="课表设置"
                  title="课表设置"
                >
                  <SettingsIcon size={18} />
                </button>
              </div>
            </div>
            <div className="filterbar">
              <div className="filters">
                {['全部课程', ...categories].map((cat, i) => (
                  <button
                    key={cat}
                    aria-pressed={filter === cat}
                    onClick={() => setFilter(cat)}
                    className={filter === cat ? 'filter-active' : ''}
                  >
                    {i > 0 && <i className={'category-' + (i - 1)} />} {cat}
                  </button>
                ))}
              </div>
              <span className="week-count">
                本周 {active.length} 次课 · {totalPeriods} 节
              </span>
            </div>
            <TabsContent value="week">
              <div className="phone-controls">
                <button
                  aria-pressed={mobileMode === 'day'}
                  onClick={() => setMobileMode('day')}
                >
                  按天看
                </button>
                <button
                  aria-pressed={mobileMode === 'week'}
                  onClick={() => setMobileMode('week')}
                >
                  整周看
                </button>
              </div>
              {mobileMode === 'day' && (
                <div className="phone-agenda">
                  <div className="phone-days">
                    {weekdays.map((day, i) => (
                      <button
                        key={day}
                        aria-pressed={selectedDay === i + 1}
                        onClick={() => setSelectedDay(i + 1)}
                      >
                        <span>{day}</span>
                        <strong>
                          {dateFor(
                            data.settings.firstMonday,
                            week,
                            i + 1,
                          ).getDate()}
                        </strong>
                        <i
                          className={
                            filtered.some((c) => c.day === i + 1)
                              ? 'has-course'
                              : ''
                          }
                        />
                      </button>
                    ))}
                  </div>
                  <h2>
                    {fmt(dateFor(data.settings.firstMonday, week, selectedDay))}{' '}
                    · {weekdays[selectedDay - 1]}
                  </h2>
                  {filtered
                    .filter((c) => c.day === selectedDay)
                    .sort((a, b) => a.start - b.start)
                    .map((c) => (
                      <button
                        className={'agenda-course category-' + categoryIndex(c)}
                        key={c.id}
                        disabled={!ready}
                        onClick={() =>
                          setEditing({ ...c, weeks: [...c.weeks] })
                        }
                      >
                        <div className="agenda-time">
                          <strong>{data.settings.times[c.start - 1]}</strong>
                          <span>
                            {classEnd(data.settings.times[c.end - 1])}
                          </span>
                        </div>
                        <div>
                          <strong>{c.name}</strong>
                          <p>
                            {c.room || '教室待定'} · {c.teacher || '教师待定'}
                          </p>
                          <small>
                            第 {c.start}–{c.end} 节 · {c.category}
                          </small>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  {!filtered.some((c) => c.day === selectedDay) && (
                    <div className="agenda-empty">
                      <Sun size={28} />
                      <h3>今天留点空白</h3>
                      <p>
                        {signedIn
                          ? '暂无课程，按自己的节奏安排。'
                          : '登录后，开始添加你的课程。'}
                      </p>
                      {ready && (
                        <button
                          className="secondary-btn"
                          onClick={() =>
                            setEditing({
                              ...freshCourse(week),
                              day: selectedDay,
                            })
                          }
                        >
                          <Plus size={16} />
                          添加课程
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div
                className={mobileMode === 'day' ? 'desktop-grid' : 'full-grid'}
              >
                <div className="mobile-hint">
                  左右滑动查看整周 · 点击课程编辑
                </div>
                {filtered.length === 0 && (
                  <div className="empty-week">
                    <CalendarDays size={24} />
                    <span>
                      {active.length
                        ? '本周没有此分类课程'
                        : '本周没有安排课程'}
                    </span>
                  </div>
                )}
                <div className="calendar-scroll">
                  <div className="calendar">
                    <div className="calendar-head">
                      <span>节次</span>
                      {weekdays.map((d, i) => {
                        const date = dateFor(
                          data.settings.firstMonday,
                          week,
                          i + 1,
                        );
                        const today =
                          date.toLocaleDateString('en-CA') ===
                          new Date().toLocaleDateString('en-CA');
                        return (
                          <div key={d} className={today ? 'today-head' : ''}>
                            <strong>{d}</strong>
                            <span>
                              {date.getMonth() + 1}/{date.getDate()}
                            </span>
                            {today && <em>今天</em>}
                          </div>
                        );
                      })}
                    </div>
                    {['上午', '下午', '晚上'].map((group, g) => {
                      const { morning, afternoon, times } = data.settings;
                      const first = [1, morning + 1, morning + afternoon + 1][
                          g
                        ],
                        last = [morning, morning + afternoon, times.length][g];
                      if (last < first) return null;
                      const Icon = [Sun, Sunset, Moon][g];
                      return (
                        <div key={group}>
                          <div className="period-label">
                            <Icon size={13} />
                            {group}
                            <span>
                              {data.settings.times[first - 1]} —{' '}
                              {classEnd(data.settings.times[last - 1])}
                            </span>
                          </div>
                          <div
                            className="period-grid"
                            style={{ height: (last - first + 1) * 70 }}
                          >
                            <div className="time-column">
                              {data.settings.times
                                .slice(first - 1, last)
                                .map((t, i) => (
                                  <div key={i}>
                                    <b>{first + i}</b>
                                    <span>
                                      {t}
                                      <br />
                                      {classEnd(t)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                            {weekdays.map((d, di) => (
                              <div
                                className={
                                  'day-column ' + (di > 4 ? 'weekend' : '')
                                }
                                key={d}
                              >
                                {filtered
                                  .filter(
                                    (c) =>
                                      c.day === di + 1 &&
                                      c.start <= last &&
                                      c.end >= first,
                                  )
                                  .map((c) => {
                                    const s = Math.max(c.start, first),
                                      e = Math.min(c.end, last);
                                    const { lane, count } = lanes[c.id],
                                      width = 100 / count;
                                    return courseButton(c, {
                                      top: (s - first) * 70 + 4,
                                      height: (e - s + 1) * 70 - 8,
                                      left: `calc(${lane * width}% + 4px)`,
                                      right: 'auto',
                                      width: `calc(${width}% - 8px)`,
                                    });
                                  })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="courses">
              <div className="manage-list">
                <p className="manage-note">
                  全学期课程 ·
                  点击一条安排修改教室、节次、周次或分类。分类为方便查看的初始整理，可自行调整。
                </p>
                {categories
                  .filter((cat) => filter === '全部课程' || filter === cat)
                  .map((cat) => {
                    const items = data.courses
                      .filter((c) => c.category === cat)
                      .sort(
                        (a, b) =>
                          a.name.localeCompare(b.name) ||
                          a.day - b.day ||
                          a.start - b.start,
                      );
                    if (!items.length) return null;
                    return (
                      <section key={cat}>
                        <h2>
                          <i
                            className={'category-' + categories.indexOf(cat)}
                          />
                          {cat}
                          <span>{items.length} 条安排</span>
                        </h2>
                        {items.map((c) => (
                          <button
                            className="manage-course"
                            key={c.id}
                            disabled={!ready}
                            onClick={() => {
                              setError('');
                              setEditing({ ...c, weeks: [...c.weeks] });
                            }}
                          >
                            <div>
                              <strong>{c.name}</strong>
                              <small>
                                {c.code} · {c.teacher || '教师待定'}
                              </small>
                            </div>
                            <div>
                              <span>
                                {weekdays[c.day - 1]} · 第 {c.start}–{c.end} 节
                              </span>
                              <small>{weekLabel(c.weeks)}</small>
                            </div>
                            <span className="room">
                              <MapPin size={14} />
                              {c.room || '教室待定'}
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        ))}
                      </section>
                    );
                  })}
                {data.courses.filter(
                  (c) => filter === '全部课程' || c.category === filter,
                ).length === 0 && (
                  <div className="empty-week">
                    此分类暂无课程，点击“添加课程”开始安排。
                  </div>
                )}
              </div>
            </TabsContent>
            <footer>
              <BookOpen size={15} />
              <span>
                上午 {data.settings.morning} 节 · 下午 {data.settings.afternoon}{' '}
                节 · 晚上{' '}
                {data.settings.times.length -
                  data.settings.morning -
                  data.settings.afternoon}{' '}
                节
              </span>
              <span className="footer-source">
                每节 {data.settings.duration} 分钟 · 作息可自定义
              </span>
            </footer>
          </section>
        </Tabs>
        <div className="page-foot">
          <span>按教学周显示；节假日调课请按学校通知自行修改。</span>
          <span>同一个 ChatGPT 账号登录即可同步</span>
        </div>
      </main>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setEditing(null);
            setError('');
          }
        }}
      >
        <DialogContent className="editor">
          <DialogHeader>
            <DialogTitle>
              {currentIsNew ? '添加课程' : '编辑课程安排'}
            </DialogTitle>
            <DialogDescription>
              本条安排的修改会应用到下方选中的教学周。
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveCourse();
              }}
            >
              <fieldset disabled={busy}>
                <label>
                  课程名称
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={editing.name}
                    onChange={(e) => change('name', e.target.value)}
                    placeholder="例如：高等数学"
                  />
                </label>
                <div className="form-row">
                  <label>
                    分类
                    <Picker
                      label="课程分类"
                      value={editing.category}
                      options={categories.map((c) => ({ value: c, label: c }))}
                      onChange={(v) => change('category', v)}
                    />
                  </label>
                  <label>
                    课程编号
                    <input
                      value={editing.code}
                      maxLength={100}
                      onChange={(e) => change('code', e.target.value)}
                      placeholder="可选"
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    任课教师
                    <input
                      value={editing.teacher}
                      maxLength={100}
                      onChange={(e) => change('teacher', e.target.value)}
                      placeholder="可选"
                    />
                  </label>
                  <label>
                    上课地点
                    <input
                      value={editing.room}
                      maxLength={150}
                      onChange={(e) => change('room', e.target.value)}
                      placeholder="例如 教学楼 302"
                    />
                  </label>
                </div>
                <div className="form-row three">
                  <label>
                    星期
                    <Picker
                      label="上课星期"
                      value={String(editing.day)}
                      options={weekdays.map((d, i) => ({
                        value: String(i + 1),
                        label: d,
                      }))}
                      onChange={(v) => change('day', Number(v))}
                    />
                  </label>
                  <label>
                    开始节次
                    <Picker
                      label="开始节次"
                      value={String(editing.start)}
                      options={nums(data.settings.times.length).map((n) => ({
                        value: String(n),
                        label: `第 ${n} 节`,
                      }))}
                      onChange={(v) =>
                        setEditing((c) =>
                          c
                            ? {
                                ...c,
                                start: Number(v),
                                end: Math.max(Number(v), c.end),
                              }
                            : c,
                        )
                      }
                    />
                  </label>
                  <label>
                    结束节次
                    <Picker
                      label="结束节次"
                      value={String(editing.end)}
                      options={nums(data.settings.times.length)
                        .filter((n) => n >= editing.start)
                        .map((n) => ({
                          value: String(n),
                          label: `第 ${n} 节`,
                        }))}
                      onChange={(v) => change('end', Number(v))}
                    />
                  </label>
                </div>
                <p className="time-summary">
                  <Clock size={14} />
                  {data.settings.times[editing.start - 1]} —{' '}
                  {classEnd(data.settings.times[editing.end - 1])} ·{' '}
                  {editing.end - editing.start + 1} 节
                </p>
                <div className="weeks-label">
                  上课周次 <span>已选 {editing.weeks.length} 周</span>
                </div>
                <div className="week-shortcuts">
                  {[
                    ['1–20 周', nums(20)],
                    ['单周', nums(20).filter((w) => w % 2)],
                    ['双周', nums(20).filter((w) => w % 2 === 0)],
                    ['仅本周', [week]],
                    ['清空', []],
                  ].map(([label, weeks]) => (
                    <button
                      type="button"
                      key={String(label)}
                      onClick={() => change('weeks', weeks as number[])}
                    >
                      {String(label)}
                    </button>
                  ))}
                </div>
                <div className="week-picker">
                  {nums(30).map((w) => (
                    <button
                      type="button"
                      key={w}
                      aria-label={`第 ${w} 周`}
                      aria-pressed={editing.weeks.includes(w)}
                      onClick={() =>
                        change(
                          'weeks',
                          editing.weeks.includes(w)
                            ? editing.weeks.filter((n) => n !== w)
                            : [...editing.weeks, w],
                        )
                      }
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <label>
                  备注
                  <textarea
                    value={editing.notes}
                    maxLength={1000}
                    onChange={(e) => change('notes', e.target.value)}
                    placeholder="可选：携带实验板、调课说明等"
                  />
                </label>
                {collision.length > 0 && (
                  <div className="inline-warning">
                    与 {collision.map((c) => c.name).join('、')}{' '}
                    存在时间重叠。请核对；仍可保存。
                  </div>
                )}
                {error && (
                  <p role="alert" className="inline-error">
                    {error}
                  </p>
                )}
                <div className="form-footer">
                  {!currentIsNew && (
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => setDeleteMode(true)}
                    >
                      <Trash2 size={16} />
                      删除
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setEditing(null)}
                  >
                    取消
                  </button>
                  <button
                    className="primary"
                    disabled={
                      busy || !editing.name.trim() || editing.weeks.length === 0
                    }
                  >
                    {busy ? '正在保存…' : '保存课程'}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteMode}
        onOpenChange={(v) => !busy && setDeleteMode(v)}
      >
        <AlertDialogContent className="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条课程安排？</AlertDialogTitle>
            <AlertDialogDescription>
              “整条安排”会删除这条记录的所有上课周次；同名课程的其他记录不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            {editing?.weeks.includes(week) && (
              <button
                className="secondary-btn"
                disabled={busy}
                onClick={() => void remove(true)}
              >
                仅删除第 {week} 周
              </button>
            )}
            <button
              className="danger-btn"
              disabled={busy}
              onClick={() => void remove(false)}
            >
              删除整条安排
            </button>
          </AlertDialogFooter>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={!!settings}
        onOpenChange={(v) => {
          if (!v && !busy) {
            setSettings(null);
            setError('');
          }
        }}
      >
        <DialogContent className="editor settings-editor">
          <DialogHeader>
            <DialogTitle>学期与作息设置</DialogTitle>
            <DialogDescription>
              首周日期决定每周对应的日期，不改变课程的教学周次。
            </DialogDescription>
          </DialogHeader>
          {settings && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await save({
                    ...data,
                    settings: { ...settings, confirmed: true },
                  })
                )
                  setSettings(null);
              }}
            >
              <fieldset disabled={busy}>
                <label>
                  学期名称
                  <input
                    required
                    maxLength={100}
                    value={settings.title}
                    onChange={(e) =>
                      setSettings({ ...settings, title: e.target.value })
                    }
                    placeholder="例如：大一上学期"
                  />
                </label>
                <label>
                  第 1 周的周一
                  <input
                    type="date"
                    required
                    value={settings.firstMonday}
                    onChange={(e) =>
                      setSettings({ ...settings, firstMonday: e.target.value })
                    }
                  />
                </label>
                <p className="manage-note">
                  不同学校的首周和作息可能不同，请按自己的教学安排设置。
                </p>
                <div className="settings-title">
                  <h2>各节上课时间</h2>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        times: [...defaultSettings.times],
                        duration: 45,
                        morning: 5,
                        afternoon: 5,
                      })
                    }
                  >
                    恢复通用模板
                  </button>
                </div>
                <div className="form-row three">
                  <label>
                    每节分钟
                    <input
                      type="number"
                      min={20}
                      max={120}
                      required
                      value={settings.duration}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          duration: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    上午节数
                    <input
                      type="number"
                      min={0}
                      max={settings.times.length - settings.afternoon}
                      required
                      value={settings.morning}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          morning: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    下午节数
                    <input
                      type="number"
                      min={0}
                      max={settings.times.length - settings.morning}
                      required
                      value={settings.afternoon}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          afternoon: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <p className="manage-note">
                  其余节次计入晚上。可逐节调整时间；已有课程使用的节次不能被移除。
                </p>
                <div className="slot-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={settings.times.length >= 20}
                    onClick={() => {
                      const next = endTime(
                        settings.times.at(-1)!,
                        settings.duration + 5,
                      );
                      setSettings({
                        ...settings,
                        times: [
                          ...settings.times,
                          next <= '23:59' ? next : '23:00',
                        ],
                      });
                    }}
                  >
                    增加一节
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={
                      settings.times.length <= 1 ||
                      data.courses.some((c) => c.end >= settings.times.length)
                    }
                    onClick={() => {
                      const length = settings.times.length - 1,
                        morning = Math.min(settings.morning, length),
                        afternoon = Math.min(
                          settings.afternoon,
                          length - morning,
                        );
                      setSettings({
                        ...settings,
                        times: settings.times.slice(0, -1),
                        morning,
                        afternoon,
                      });
                    }}
                  >
                    减少最后一节
                  </button>
                </div>
                <div className="time-settings">
                  {settings.times.map((t, i) => (
                    <label key={i}>
                      第 {i + 1} 节
                      <input
                        type="time"
                        required
                        value={t}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            times: settings.times.map((v, j) =>
                              j === i ? e.target.value : v,
                            ),
                          })
                        }
                      />
                      <span>至 {endTime(t, settings.duration)}</span>
                    </label>
                  ))}
                </div>
                {error && (
                  <p className="inline-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="form-footer">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setSettings(null)}
                  >
                    取消
                  </button>
                  <button className="primary" disabled={busy}>
                    {busy ? '正在保存…' : '确认并保存'}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={install} onOpenChange={setInstall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>把课表放到主屏幕</DialogTitle>
            <DialogDescription>
              使用手机浏览器打开此课表，并登录同一个 ChatGPT 账号。
            </DialogDescription>
          </DialogHeader>
          <p>iPhone：在 Safari 点“分享”，选择“添加到主屏幕”。</p>
          <p>安卓：在浏览器菜单中选择“安装应用”或“添加到主屏幕”。</p>
          <p className="manage-note">
            查看和编辑需要联网。修改保存后，其他设备打开课表或点击同步即可获取。
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
