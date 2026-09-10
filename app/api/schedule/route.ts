import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, readSchedule } from '@/db/store';
import { validateSchedule } from '@/lib/schedule';
const reply = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return reply({ error: '请先登录' }, 401);
  try {
    return reply(await readSchedule(user.userId));
  } catch {
    return reply({ error: '暂时无法读取课表，请稍后重试' }, 503);
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return reply({ error: '请先登录' }, 401);
  if (request.headers.get('Origin') !== new URL(request.url).origin)
    return reply({ error: '请求来源无效' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return reply({ error: '数据格式不正确' }, 415);
  try {
    const text = await request.text();
    if (text.length > 1_000_000) return reply({ error: '课程数据过大' }, 413);
    const value = JSON.parse(text) as import('@/lib/schedule').Schedule;
    if (
      !Number.isInteger(value.revision) ||
      value.revision < 1 ||
      !validateSchedule(value)
    )
      return reply({ error: '请检查课程名称、周次、节次和作息时间' }, 400);
    const payload = JSON.stringify({
      courses: value.courses,
      settings: value.settings,
    });
    const result = await database()
      .prepare(
        'UPDATE schedules SET payload=?, revision=revision+1 WHERE user_id=? AND revision=?',
      )
      .bind(payload, user.userId, value.revision)
      .run();
    if (result.meta.changes !== 1)
      return reply(
        { error: '另一台设备已更新课表。请刷新后重新修改，以免覆盖新内容。' },
        409,
      );
    return reply({ ...value, revision: value.revision + 1 });
  } catch {
    return reply(
      { error: '保存失败，请检查网络后重试。你的修改仍保留在编辑窗口。' },
      503,
    );
  }
}
