/**
 * JSON으로 전체 치매검사 보고서 PDF 생성 (1·2·3·4 동적 + 템플릿 5~16)
 * - 1페이지: 고객명, 검사일
 * - 2페이지: 고객명, 단계(좋음/보통/양호/주의/위험), 점수·나이대평균 그래프
 * - 3·4페이지: 기존 3·4 (점수 분석, 예상비용)
 * - 5~16: 템플릿 PDF
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generateReportPages12PdfBuffer } from '../../../lib/report-pages-1-2';
import { generateReportPages34PdfBuffer } from '../../../lib/report-pages-34';
import { mergeTemplateWithPages1234 } from '../../../lib/merge-report-pdf';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const templatePath =
      process.env.REPORT_TEMPLATE_PDF_PATH ||
      path.join(process.cwd(), 'public', 'templates', '치매검사보고서.pdf');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: '템플릿 PDF 없음', details: 'public/templates/치매검사보고서.pdf 를 넣어주세요.' },
        { status: 404 }
      );
    }

    const [pages12Buf, pages34Buf] = await Promise.all([
      generateReportPages12PdfBuffer(data),
      generateReportPages34PdfBuffer(data),
    ]);
    const templateBuf = fs.readFileSync(templatePath);
    const fullPdf = await mergeTemplateWithPages1234(templateBuf, pages12Buf, pages34Buf);

    const date = new Date().toISOString().split('T')[0];
    // ByteString 오류 방지: filename은 ASCII만 사용 (한글은 클라이언트에서 다운로드 시 적용)
    const safeFilename = `report_full_${date}.pdf`;

    return new NextResponse(new Uint8Array(fullPdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (e: unknown) {
    const err = e as Error;
    console.error('[generate-full-report]', e);
    return NextResponse.json(
      { error: 'PDF 생성 실패', details: err?.message },
      { status: 500 }
    );
  }
}
