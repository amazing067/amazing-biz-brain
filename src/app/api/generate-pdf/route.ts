import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  console.log('📄 [PDF] PDF 생성 요청 수신');
  
  try {
    const body = await request.json();
    const reportData = body;

    // 보고서 HTML 생성
    const htmlContent = generateReportHTML(reportData);

    // Puppeteer로 PDF 생성
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();

    console.log('✅ [PDF] PDF 생성 성공!', { size: pdfBuffer.length });

    const date = new Date().toISOString().split('T')[0];
    const safeFilename = `report_${date}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error: any) {
    console.error('❌ [PDF] PDF 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: 'PDF 생성 실패', details: error.message },
      { status: 500 }
    );
  }
}

function generateReportHTML(data: any): string {
  const categories = Object.entries(data.categoryScores || {}).filter(([, v]: any) => v.max > 0);
  const n = categories.length || 1;
  const cx = 160; const cy = 160; const maxR = 120;
  
  const axisPoints = categories.map(([cat]: any, i: number) => {
    const percent = data.categoryScores[cat]?.percent ?? 0;
    const r = (percent / 100) * maxR;
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      label: cat,
      percent,
    };
  });
  
  const polygonPoints = axisPoints.map((p: any) => `${p.x},${p.y}`).join(' ');
  const axisLines = categories.map((_, i: number) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { 
      x: cx + maxR * Math.cos(angle), 
      y: cy + maxR * Math.sin(angle), 
      label: categories[i][0] 
    };
  });

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>치매검사 보고서</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1f2937; line-height: 1.6; }
    .page { page-break-after: always; padding: 20px; }
    .page:last-child { page-break-after: auto; }
    h1 { font-size: 24px; font-weight: 900; text-align: center; margin-bottom: 8px; }
    h2 { font-size: 18px; font-weight: 700; border-bottom: 2px solid #d1d5db; padding-bottom: 8px; margin-bottom: 16px; }
    .cover-circle { width: 160px; height: 160px; border-radius: 50%; border: 8px solid ${data.total >= 80 ? '#10b981' : '#ef4444'}; margin: 32px auto; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .cover-score { font-size: 48px; font-weight: 900; color: ${data.total >= 80 ? '#059669' : '#dc2626'}; }
    .cover-grade { text-align: center; font-weight: 700; font-size: 18px; margin-top: 16px; }
    .cover-status { text-align: center; font-size: 14px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td { padding: 12px; border: 1px solid #e5e7eb; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-blue-50 { background-color: #eff6ff; }
    .bg-red-50 { background-color: #fef2f2; }
    .bg-amber-50 { background-color: #fffbeb; border: 1px solid #fde68a; }
    .text-blue-800 { color: #1e40af; }
    .text-red-600 { color: #dc2626; }
    .text-red-700 { color: #b91c1c; }
    .text-amber-800 { color: #92400e; }
    .font-bold { font-weight: 700; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-xs { font-size: 12px; }
    .text-sm { font-size: 14px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-4 { margin-bottom: 16px; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .p-4 { padding: 16px; }
    .p-5 { padding: 20px; }
    .rounded-lg { border-radius: 8px; }
    .rounded-xl { border-radius: 12px; }
    .space-y-4 > * + * { margin-top: 16px; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .bar-container { width: 100%; background-color: #f3f4f6; border-radius: 4px; height: 8px; margin-top: 4px; }
    .bar-fill { height: 100%; border-radius: 4px; }
    .diagram-container { display: flex; justify-content: center; margin: 24px 0; }
    .diagram-svg { width: 100%; max-width: 320px; height: auto; }
    .category-item { display: flex; flex-direction: column; }
    .category-header { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
    .whitespace-pre-line { white-space: pre-line; }
  </style>
</head>
<body>
  <!-- 1. 표지 -->
  <div class="page">
    <h1>치매검사 보고서</h1>
    <p class="text-center text-sm" style="color: #6b7280; margin-bottom: 32px;">뇌 건강 검진 결과</p>
    <div class="cover-circle">
      <span class="cover-score">${data.total}</span>
      <span class="text-sm font-bold" style="color: #6b7280;">/ 100점</span>
    </div>
    <p class="cover-grade">${data.grade.split('(')[0].trim()}</p>
    <p class="cover-status">(${data.status})</p>
  </div>

  <!-- 2. 영역별 점수 요약 -->
  <div class="page">
    <h2>📊 영역별 상세 점수</h2>
    <div class="grid grid-cols-2 gap-3">
      ${categories.map(([cat]: any) => {
        const s = data.categoryScores[cat];
        const percent = s?.percent ?? 0;
        const color = percent < 60 ? '#ef4444' : '#2563eb';
        return `
        <div class="category-item">
          <div class="category-header">
            <span>${cat}</span>
            <span style="color: ${color}; font-weight: 700;">${s?.score}점 / ${s?.max}점</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percent}%; background-color: ${color};"></div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  </div>

  <!-- 3. 인지 기능 프로필 (다이어그램) - 상세 버전 -->
  <div class="page">
    <h2>📈 인지 기능 프로필 (다이어그램)</h2>
    <div class="diagram-container">
      <svg viewBox="0 0 320 320" class="diagram-svg">
        ${[0.25, 0.5, 0.75, 1].map((ratio) => {
          const points = axisLines.map((ap: any) => {
            const x = cx + (ap.x - cx) * ratio;
            const y = cy + (ap.y - cy) * ratio;
            return `${x},${y}`;
          }).join(' ');
          return `<polygon points="${points}" fill="none" stroke="#e5e7eb" stroke-width="1" />`;
        }).join('')}
        ${axisLines.map((ap: any, i: number) => 
          `<line x1="${cx}" y1="${cy}" x2="${ap.x}" y2="${ap.y}" stroke="#d1d5db" stroke-width="1" />`
        ).join('')}
        <polygon points="${polygonPoints}" fill="rgba(59, 130, 246, 0.35)" stroke="#2563eb" stroke-width="2" />
        ${axisLines.map((ap: any, i: number) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          const tx = cx + (maxR + 22) * Math.cos(angle);
          const ty = cy + (maxR + 22) * Math.sin(angle);
          const percent = data.categoryScores[ap.label]?.percent ?? 0;
          return `
            <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#374151" style="font-size: 10px; font-weight: 600;">${ap.label}</text>
            <text x="${tx}" y="${ty + 12}" text-anchor="middle" dominant-baseline="middle" fill="#2563eb" style="font-size: 9px; font-weight: 700;">${percent}%</text>
          `;
        }).join('')}
      </svg>
    </div>
    <p class="text-center text-xs" style="color: #6b7280; margin-top: 8px;">각 영역별 달성률(%) 기준</p>
    
    <!-- 상세 설명 추가 -->
    <div style="margin-top: 24px; padding: 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0284c7;">
      <h3 style="font-size: 16px; font-weight: 700; color: #0c4a6e; margin-bottom: 8px;">📋 인지 기능 프로필 해석</h3>
      <ul style="color: #075985; font-size: 13px; line-height: 1.8; padding-left: 20px;">
        ${categories.map(([cat]: any) => {
          const s = data.categoryScores[cat];
          const percent = s?.percent ?? 0;
          let interpretation = '';
          if (percent >= 80) interpretation = '양호한 수준입니다.';
          else if (percent >= 60) interpretation = '보통 수준입니다. 주기적인 관찰이 필요합니다.';
          else interpretation = '주의가 필요합니다. 전문의 상담을 권장합니다.';
          return `<li><strong>${cat}</strong>: ${percent}% - ${interpretation}</li>`;
        }).join('')}
      </ul>
    </div>
  </div>

  <!-- 4. 인지지원·비용 요약 - 상세 버전 -->
  <div class="page">
    <h2>💰 인지지원·비용 요약</h2>
    <div class="bg-gray-50 rounded-xl p-5" style="space-y: 16px;">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-xs" style="color: #6b7280; margin-bottom: 4px;">예상 장기요양 등급</p>
          <p class="font-bold" style="font-size: 18px; color: #111827;">${data.grade.split('(')[0].trim()}</p>
        </div>
        <div>
          <p class="text-xs" style="color: #2563eb; margin-bottom: 4px;">인지지원(월 한도액)</p>
          <p class="font-bold" style="font-size: 18px; color: #1e40af;">
            ${data.limitAmount > 0 ? `${(data.limitAmount / 10000).toFixed(0)}만원 (${data.limitAmount.toLocaleString()}원)` : '해당 없음 (등급 외)'}
          </p>
        </div>
      </div>
      
      <table style="margin-top: 16px;">
        <tbody>
          <tr class="bg-gray-50">
            <td class="font-bold">현재(2026년) 월 본인 부담</td>
            <td class="text-right font-bold" style="color: #dc2626; font-size: 16px;">${data.finalSelfPay.toLocaleString()}원</td>
          </tr>
          <tr>
            <td class="font-bold">10년 후(2036년) 예상 월 부담</td>
            <td class="text-right font-bold" style="color: #b91c1c; font-size: 16px;">
              ${data.futureSelfPay >= 10000 ? `${Math.round(data.futureSelfPay / 10000)}만원 (${data.futureSelfPay.toLocaleString()}원)` : `${data.futureSelfPay.toLocaleString()}원`}
            </td>
          </tr>
        </tbody>
      </table>
      
      <p class="text-xs" style="color: #9ca3af; margin-top: 12px;">* 2026년 장기요양 수가 고시 및 물가상승률 반영</p>
    </div>

    <!-- 비용 상세 분석 추가 -->
    <div style="margin-top: 24px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">📊 비용 상세 분석</h3>
      <div class="space-y-4">
        <div class="bg-blue-50 rounded-lg p-4">
          <p class="text-sm font-bold text-blue-800 mb-1">2026년 월 예상 비용</p>
          <table style="margin-top: 8px;">
            <tbody>
              <tr>
                <td>총 비용</td>
                <td class="text-right">${(data.finalSelfPay + data.realGovSupport).toLocaleString()}원</td>
              </tr>
              <tr>
                <td>국가 지원금(최대)</td>
                <td class="text-right" style="color: #2563eb;">${data.realGovSupport.toLocaleString()}원</td>
              </tr>
              <tr class="bg-red-50">
                <td class="font-bold">본인 부담금</td>
                <td class="text-right font-bold" style="color: #dc2626;">${data.finalSelfPay.toLocaleString()}원</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="bg-red-50 rounded-lg p-4">
          <p class="text-sm font-bold text-red-800 mb-1">2036년 월 예상 비용 (물가상승 반영)</p>
          <table style="margin-top: 8px;">
            <tbody>
              <tr>
                <td>총 비용</td>
                <td class="text-right">${data.futureTotalCost.toLocaleString()}원</td>
              </tr>
              <tr>
                <td>국가 지원금(예상)</td>
                <td class="text-right" style="color: #2563eb;">${data.futureGovSupport.toLocaleString()}원</td>
              </tr>
              <tr class="bg-red-100">
                <td class="font-bold">본인 부담금</td>
                <td class="text-right font-bold" style="color: #b91c1c; font-size: 15px;">
                  ${data.futureSelfPay >= 10000 ? `${Math.round(data.futureSelfPay / 10000)}만원 (${data.futureSelfPay.toLocaleString()}원)` : `${data.futureSelfPay.toLocaleString()}원`}
                </td>
              </tr>
            </tbody>
          </table>
          ${data.futureDetails ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #fecaca;">
            <p class="text-xs" style="color: #991b1b; margin-bottom: 6px;"><strong>비용 구성:</strong></p>
            <ul style="font-size: 12px; color: #7f1d1d; line-height: 1.6; padding-left: 16px;">
              <li>간병비: ${data.futureDetails.caregiver?.toLocaleString()}원</li>
              <li>병원·시설비: ${data.futureDetails.medical?.toLocaleString()}원</li>
              <li>식대·소모품: ${data.futureDetails.living?.toLocaleString()}원</li>
            </ul>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    ${data.familyWarning ? `
    <div class="bg-amber-50 rounded-lg p-4" style="margin-top: 20px;">
      <p class="text-sm font-bold text-amber-800 whitespace-pre-line">${data.familyWarning}</p>
    </div>
    ` : ''}
  </div>

  <!-- 푸터 -->
  <div style="padding-top: 32px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
    <p>본 보고서는 뇌 건강 검진 결과를 바탕으로 작성되었습니다.</p>
    <p style="margin-top: 4px;">치매검사.com</p>
  </div>
</body>
</html>
  `;
}
