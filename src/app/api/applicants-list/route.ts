/**
 * 신청 목록 조회·삭제 (data/applicants.json). 관리자용.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const getApplicantsPath = () => join(process.cwd(), 'data', 'applicants.json');

export async function GET() {
  try {
    const raw = await readFile(getApplicantsPath(), 'utf-8');
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

/** 한 명 삭제: body { "index": number } (목록 배열의 인덱스) */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const index = typeof body.index === 'number' ? body.index : -1;
    const path = getApplicantsPath();
    let list: unknown[];
    try {
      const raw = await readFile(path, 'utf-8');
      list = JSON.parse(raw);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return NextResponse.json({ ok: true, list: [] });
      }
      throw e;
    }
    if (!Array.isArray(list)) list = [];
    if (index < 0 || index >= list.length) {
      return NextResponse.json({ error: '잘못된 인덱스입니다.', list }, { status: 400 });
    }
    list.splice(index, 1);
    const dataDir = join(process.cwd(), 'data');
    await mkdir(dataDir, { recursive: true });
    await writeFile(path, JSON.stringify(list, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, list });
  } catch (e: unknown) {
    console.error('[applicants-list DELETE]', e);
    return NextResponse.json(
      { error: '삭제에 실패했습니다.', details: (e as Error).message },
      { status: 500 }
    );
  }
}
