import { getChatGPTUser } from './chatgpt-auth';
import Timetable from './timetable';
import seed from '@/lib/seed.json';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getChatGPTUser();
  return <Timetable seed={seed} signedIn={!!user} />;
}
