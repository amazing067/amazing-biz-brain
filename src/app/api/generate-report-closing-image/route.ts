/**
 * JSON → 마무리 페이지 PNG (보고서 끝맺음용, PDF 병합 없음)
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateClosingPng } from '../../../lib/report-images';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json().catch(() => ({}));
    const png = await generateClosingPng(data);
    const date = new Date().toISOString().split('T')[0];
    const userNameRaw = (data?.userName ? String(data.userName) : 'guest').replace(/[/\\?%*:|"<>]/g, '_');
    const fileNameAscii = `closing_${userNameRaw.replace(/[^\x00-\x7F]/g, '_')}_${date}.png`;
    const buffer = Buffer.isBuffer(png) ? png : Buffer.from(png as ArrayBuffer);
    const body = new Uint8Array(buffer.length);
    body.set(buffer);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${fileNameAscii}"`,
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
    console.error('[generate-report-closing-image]', e);
    return NextResponse.json({ error: '이미지 생성 실패', details: msg }, { status: 500 });
  }
}
