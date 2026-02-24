/**
 * JSON → 인지 기능 다이어그램 PNG (신청 버튼과 무관, 관리자용)
 * Vercel: chromium-min이 첫 요청 시 pack 다운로드할 수 있도록 시간 여유
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateDiagramPng } from '../../../lib/report-images';

export const maxDuration = 60;

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
    const msg = err?.message ?? '';
    const isChromeMissing = /Could not find Chrome|Failed to launch|Executable doesn't exist|no such file.*chrome/i.test(msg);
    if (isChromeMissing) {
      return NextResponse.json(
        { error: '이 환경에서는 Chrome을 사용할 수 없어 이미지 생성이 불가합니다. 로컬 또는 Chrome 설치된 서버에서 이용해 주세요.', code: 'CHROME_UNAVAILABLE' },
        { status: 503 }
      );
    }
    console.error('[generate-report-diagram-image]', e);
    return NextResponse.json({ error: '이미지 생성 실패', details: msg }, { status: 500 });
  }
}
