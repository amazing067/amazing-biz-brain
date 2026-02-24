/**
 * 신청 목록 조회 (data/applicants.json). 관리자용.
 */
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const applicantsPath = join(process.cwd(), 'data', 'applicants.json');
    const raw = await readFile(applicantsPath, 'utf-8');
    const list = JSON.parse(raw);
    return NextResponse.json(Array.isArray(list) ? list : []);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('[applicants-list]', e);
    return NextResponse.json(
      { error: '목록을 불러올 수 없습니다.', details: (e as Error).message },
      { status: 500 }
    );
  }
}
