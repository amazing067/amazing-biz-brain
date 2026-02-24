/**
 * 관리자용: 치매검사 보고서 3·4페이지 PDF 생성 API.
 * - 3페이지: 치매 점수 결과 및 분석 (레이더 + 단계 해석 + 추천 멘트)
 * - 4페이지: 예상비용 (2026/2036 비용 상세)
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateReportPages34PdfBuffer } from '../../../lib/report-pages-34';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const pdfBuffer = await generateReportPages34PdfBuffer(data);

    const date = new Date().toISOString().split('T')[0];
    const safeFilename = `report_3-4_${date}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error('[generate-report-pages-3-4]', e);
    return NextResponse.json(
      { error: 'PDF 생성 실패', details: err?.message },
      { status: 500 }
    );
  }
}
