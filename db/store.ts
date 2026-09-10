import { env } from 'cloudflare:workers';
import seed from '@/lib/seed.json';
import { defaultSettings, type Schedule } from '@/lib/schedule';
export function database() {
  if (!env.DB) throw new Error('Database unavailable');
  return env.DB;
}
export async function readSchedule(userId: string): Promise<Schedule> {
  const db = database();
  await db
    .prepare(
      'INSERT INTO schedules (user_id,payload,revision) VALUES (?,?,1) ON CONFLICT(user_id) DO NOTHING',
    )
    .bind(userId, JSON.stringify({ courses: seed, settings: defaultSettings }))
    .run();
  const row = await db
    .prepare('SELECT payload, revision FROM schedules WHERE user_id=?')
    .bind(userId)
    .first<{ payload: string; revision: number }>();
  if (!row) throw new Error('Schedule unavailable');
  const saved = JSON.parse(row.payload);
  return {
    ...saved,
    settings: { ...defaultSettings, ...saved.settings },
    revision: row.revision,
  };
}
