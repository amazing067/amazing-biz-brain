/**
 * 장기요양 국가 지원금 이용·지급 안내 PNG (공식 자료 기준, 데이터 불필요)
 */
import { NextResponse } from 'next/server';
import { generateGovSupportGuidePng } from '../../../lib/report-images';

export const maxDuration = 60;

export async function POST() {
  try {
    const png = await generateGovSupportGuidePng();
    const date = new Date().toISOString().split('T')[0];
    const filenameAscii = `gov_support_guide_${date}.png`;
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filenameAscii}"`,
      },
    });
  } catch (e: unknown) {
    const err = e as Error;
    const msg = err?.message ?? '';
    const isChromeMissing = /Could not find Chrome|Failed to launch|Executable doesn't exist|no such file.*chrome/i.test(msg);
    if (isChromeMissing) {
      return NextResponse.json(
        { error: '이 환경에서는 Chrome을 사용할 수 없어 이미지 생성이 불가합니다.', code: 'CHROME_UNAVAILABLE' },
        { status: 503 }
      );
    }
    console.error('[generate-report-gov-support-guide-image]', e);
    return NextResponse.json({ error: '이미지 생성 실패', details: msg }, { status: 500 });
  }
}
