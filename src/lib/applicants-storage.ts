/**
 * 신청 목록 저장소: 로컬은 data/applicants.json, 프로덕션(Vercel)은 KV.
 * KV_REST_API_URL + KV_REST_API_TOKEN 이 있으면 KV 사용, 없으면 파일 사용.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const KV_KEY = 'applicants';
const getFilePath = () => join(process.cwd(), 'data', 'applicants.json');

function useKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** 목록 전체 조회 */
export async function getApplicantsList(): Promise<unknown[]> {
  if (useKv()) {
    try {
      const { kv } = await import('@vercel/kv');
      const raw = await kv.get(KV_KEY);
      if (raw == null) return [];
      const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.error('[applicants-storage] KV get:', e);
      return [];
    }
  }
  try {
    const raw = await readFile(getFilePath(), 'utf-8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    console.error('[applicants-storage] file get:', e);
    throw e;
  }
}

/** 한 건 추가 (맨 뒤) */
export async function appendApplicant(entry: Record<string, unknown>): Promise<void> {
  const list = await getApplicantsList();
  list.push(entry);
  if (useKv()) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(KV_KEY, list);
      return;
    } catch (e) {
      console.error('[applicants-storage] KV set:', e);
      throw e;
    }
  }
  const dataDir = join(process.cwd(), 'data');
  await mkdir(dataDir, { recursive: true });
  await writeFile(getFilePath(), JSON.stringify(list, null, 2), 'utf-8');
}

/** 인덱스로 한 건 삭제. 삭제 후 목록 반환. */
export async function deleteApplicantByIndex(index: number): Promise<unknown[]> {
  const list = await getApplicantsList();
  if (index < 0 || index >= list.length) return list;
  list.splice(index, 1);
  if (useKv()) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(KV_KEY, list);
      return list;
    } catch (e) {
      console.error('[applicants-storage] KV set (delete):', e);
      throw e;
    }
  }
  const dataDir = join(process.cwd(), 'data');
  await mkdir(dataDir, { recursive: true });
  await writeFile(getFilePath(), JSON.stringify(list, null, 2), 'utf-8');
  return list;
}
