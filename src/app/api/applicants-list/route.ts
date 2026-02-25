/**
 * 신청 목록 조회·삭제. 로컬은 data/applicants.json, 프로덕션은 KV. 관리자용.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getApplicantsList, deleteApplicantByIndex } from '@/lib/applicants-storage';

export async function GET() {
  try {
    const list = await getApplicantsList();
    return NextResponse.json(list);
  } catch (e: unknown) {
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
    const list = await getApplicantsList();
    if (index < 0 || index >= list.length) {
      return NextResponse.json({ error: '잘못된 인덱스입니다.', list }, { status: 400 });
    }
    const newList = await deleteApplicantByIndex(index);
    return NextResponse.json({ ok: true, list: newList });
  } catch (e: unknown) {
    console.error('[applicants-list DELETE]', e);
    return NextResponse.json(
      { error: '삭제에 실패했습니다.', details: (e as Error).message },
      { status: 500 }
    );
  }
}
