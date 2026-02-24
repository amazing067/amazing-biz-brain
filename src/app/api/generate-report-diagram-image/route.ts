/**
 * JSON → 인지 기능 다이어그램 PNG (신청 버튼과 무관, 관리자용)
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateDiagramPng } from '../../../lib/report-images';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const png = await generateDiagramPng(data);
    const date = new Date().toISOString().split('T')[0];
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="diagram_${date}.png"`,
      },
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error('[generate-report-diagram-image]', e);
    return NextResponse.json({ error: '이미지 생성 실패', details: err?.message }, { status: 500 });
  }
}
