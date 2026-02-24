/**
 * 치매검사 보고서 3·4페이지 HTML 생성 및 PDF 버퍼 생성 (공유 모듈)
 * - 3페이지: 치매 점수 결과 및 분석 (레이더 + 단계 해석 + 추천 멘트)
 * - 4페이지: 예상비용 (2026/2036 비용 상세)
 */
import puppeteer from 'puppeteer';

export function generatePages34HTML(data: Record<string, unknown>): string {
  const total = (data.total as number) ?? 0;
  const userName = (data.userName || '고객').toString().replace(/</g, '&lt;');
  const status = (data.status || '양호') as string;
  const gradeLabel = ((data.grade as string) || '').split('(')[0].trim();

  const stageLabel = total >= 80 ? '좋음' : total >= 60 ? '보통' : total >= 40 ? '양호' : total >= 20 ? '주의' : '위험';
  const stageHighlight = total >= 80 ? 'green' : total >= 60 ? 'blue' : total >= 40 ? 'yellow' : total >= 20 ? 'orange' : 'red';

  const age = data.age != null ? Number(data.age) : 65;
  const ageGroupLabel = age >= 80 ? '80대' : age >= 70 ? '70대' : age >= 60 ? '60대' : age >= 50 ? '50대' : age >= 40 ? '40대' : '30대';
  const ageAvg = age >= 80 ? 65 : age >= 70 ? 72 : age >= 60 ? 79 : age >= 50 ? 88 : age >= 40 ? 91 : 96;
  const userBarWidth = Math.min(100, (total / 100) * 100);
  const avgBarWidth = Math.min(100, (ageAvg / 100) * 100);

  const recommendMsg =
    total >= 90
      ? '현재 인지 기능이 같은 나이대에서 매우 양호한 편입니다. 규칙적인 생활과 사회 참여를 이어가시고, 1년에 1회 정기 검진으로 변화를 확인해 주세요.'
      : total >= 80
        ? '현재 인지 기능이 양호한 편입니다. 꾸준한 관리와 예방 습관을 유지하시고, 실손·간병 보험 점검도 해 두시면 좋습니다.'
        : total >= 70
          ? '전반적으로 정상 범위에 가깝고 무리 없는 수준입니다. 6개월~1년 주기로 검진받으시며 추이를 살펴보시고, 간병·장기요양 보험 상담을 한 번 받아 보시는 것을 권장합니다.'
          : total >= 60
            ? '전반적으로 정상 범위에 가깝습니다. 일부 영역만 보완하면 좋은 수준이니, 주기적인 검진과 일상에서의 인지 활동(독서, 대화, 메모 등)을 권장합니다.'
            : total >= 50
              ? '일부 영역이 다소 낮게 나왔을 수 있습니다. 정밀 검사나 전문의 상담으로 원인을 확인하시고, 점검 영역에 맞춘 훈련과 보험 설계를 고려해 보세요.'
              : total >= 40
                ? '여러 영역을 점검해 보시는 것이 좋습니다. 경도인지장애 가능성을 배제하기 위해 인지 정밀 검사와 보험·돌봄 계획 상담을 함께 진행하시면 도움이 됩니다.'
                : total >= 20
                  ? '정밀 검사·상담이 권장되는 구간입니다. 가능한 빨리 전문 기관을 방문하시고, 가족과 함께 돌봄·경제 부담 준비를 논의하시기 바랍니다.'
                  : '즉각적인 정밀 검사와 상담이 권장됩니다. 의료기관 방문과 보험·지원 제도 상담을 받으시고, 가족과 돌봄 계획을 함께 정리하시기 바랍니다.';

  const categoryScores = (data.categoryScores || {}) as Record<string, { percent?: number; max?: number }>;
  const categories = Object.entries(categoryScores).filter(([, v]) => (v?.max ?? 0) > 0);
  const n = categories.length || 1;
  const cx = 160;
  const cy = 160;
  const maxR = 120;
  const axisPoints = categories.map(([cat], i) => {
    const percent = categoryScores[cat]?.percent ?? 0;
    const r = (percent / 100) * maxR;
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), label: cat, percent };
  });
  const polygonPoints = axisPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const axisLines = categories.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle), label: categories[i][0] };
  });

  const limitAmount = (data.limitAmount as number) ?? 0;
  const limitStr =
    limitAmount > 0
      ? `${(limitAmount / 10000).toFixed(0)}만원 (${limitAmount.toLocaleString()}원)`
      : '해당 없음 (등급 외)';
  const details = (data.futureDetails || { caregiver: 0, medical: 0, living: 0 }) as { caregiver?: number; medical?: number; living?: number };
  const finalSelfPay = (data.finalSelfPay as number) ?? 0;
  const realGovSupport = (data.realGovSupport as number) ?? 0;
  const coPay = (data.coPay as number) ?? 0;
  const nonCoveredCost = (data.nonCoveredCost as number) ?? 0;
  const futureTotalCost = (data.futureTotalCost as number) ?? 0;
  const futureGovSupport = (data.futureGovSupport as number) ?? 0;
  const futureSelfPay = (data.futureSelfPay as number) ?? 0;
  const familyWarning = data.familyWarning as string | undefined;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>치매검사 보고서 3·4페이지</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1f2937; line-height: 1.5; }
    .page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
    .page:last-child { page-break-after: auto; }
    .header-blue { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: #fff; padding: 14px 24px; margin: -20px -20px 0 -20px; border-radius: 0 0 0 24px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
    .header-blue .title { font-size: 18px; font-weight: 800; }
    .header-blue .sub { font-size: 11px; opacity: 0.9; }
    .pg-num { position: absolute; bottom: 16px; right: 24px; font-size: 12px; color: #9ca3af; }
    .content-box { flex: 1; padding: 20px; }
    .grey-box { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; min-height: 320px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
    td { padding: 10px 12px; border: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-red-600 { color: #dc2626; }
    .text-blue-700 { color: #1d4ed8; }
    .block { display: inline-block; padding: 12px 16px; border-radius: 12px; text-align: center; margin: 6px; vertical-align: top; width: calc(25% - 16px); min-width: 120px; }
    .block.good { background: #dcfce7; color: #166534; }
    .block.normal { background: #dbeafe; color: #1e40af; }
    .block.fair { background: #fef9c3; color: #854d0e; }
    .block.caution { background: #fee2e2; color: #b91c1c; }
    .yellow-msg { background: linear-gradient(135deg, #fef08a 0%, #fde047 100%); border-radius: 16px; padding: 16px 20px; margin-top: 16px; border: 1px solid #eab308; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  </style>
</head>
<body style="padding: 20px;">
  <div class="page" style="position: relative;">
    <div class="header-blue">
      <div style="text-align: right;">
        <div class="title">치매 점수 결과 및 분석</div>
        <div class="sub">Results and Analysis</div>
      </div>
      <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.3); border-radius: 8px;"></div>
    </div>
    <div class="content-box">
      <p style="font-size: 17px; font-weight: 800; margin: 20px 0 8px 0; color: #111;">[${userName}] 님의 현재 뇌 건강 상태는 '<span style="color: ${stageHighlight === 'red' ? '#dc2626' : stageHighlight === 'orange' ? '#ea580c' : stageHighlight === 'yellow' ? '#ca8a04' : stageHighlight === 'blue' ? '#2563eb' : '#16a34a'}; font-weight: 800;">${stageLabel}</span>' 단계입니다.</p>
      <p style="font-size: 15px; font-weight: 700; color: #374151; margin-bottom: 20px;">귀하의 인지 점수 : <strong>${total}점</strong> / 100점</p>
      <div style="margin-bottom: 20px;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">치매점수</p>
        <div style="display: flex; align-items: center; gap: 12px; height: 28px;">
          <span style="font-size: 11px; width: 72px;">${userName} 님</span>
          <div style="flex: 1; max-width: 320px; height: 20px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
            <div style="width: ${userBarWidth}%; height: 100%; background: #dc2626; border-radius: 4px;"></div>
          </div>
          <span style="font-size: 12px; font-weight: 700;">${total}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; height: 28px; margin-top: 6px;">
          <span style="font-size: 11px; width: 72px;">${ageGroupLabel} 평균</span>
          <div style="flex: 1; max-width: 320px; height: 20px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
            <div style="width: ${avgBarWidth}%; height: 100%; background: #ea580c; border-radius: 4px;"></div>
          </div>
          <span style="font-size: 12px; font-weight: 700;">${ageAvg}</span>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #6b7280;">
          <span style="display: inline-block; width: 12px; height: 12px; background: #dc2626; border-radius: 2px; vertical-align: middle;"></span> ${userName} 님
          <span style="display: inline-block; width: 12px; height: 12px; background: #ea580c; border-radius: 2px; vertical-align: middle; margin-left: 12px;"></span> ${ageGroupLabel} 평균 점수
        </div>
      </div>
      <p style="font-size: 12px; color: #6b7280; margin-bottom: 10px;">점수 구간 해석</p>
      <div style="margin-bottom: 8px;">
        <div class="block good">😉 좋음 (100~80점)<br/><span style="font-size: 11px;">인지 기능 좋음</span></div>
        <div class="block normal">😊 보통 (80~60점)<br/><span style="font-size: 11px;">인지기능 정상 대비 조금 낮음</span></div>
        <div class="block fair">😐 양호 (60~40점)<br/><span style="font-size: 11px;">치매 위험군으로 분류 가능</span></div>
        <div class="block caution">😢 주의 (40~20점)<br/><span style="font-size: 11px;">주의 관찰 필요</span></div>
        <div class="block caution">🚨 위험 (20~0점)<br/><span style="font-size: 11px;">고위험군·정밀 검사 권장</span></div>
      </div>
      <p style="font-size: 13px; font-weight: 700; color: #374151; margin: 16px 0 8px 0;">인지 기능</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: center; align-items: center;">
        <svg viewBox="0 0 340 340" style="width: 100%; max-width: 300px; height: auto;">
          ${[0.25, 0.5, 0.75, 1].map((ratio) => `<polygon points="${axisLines.map((ap) => `${cx + (ap.x - cx) * ratio},${cy + (ap.y - cy) * ratio}`).join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>`).join('')}
          ${axisLines.map((ap) => `<line x1="${cx}" y1="${cy}" x2="${ap.x}" y2="${ap.y}" stroke="#cbd5e1" stroke-width="1.5"/>`).join('')}
          <polygon points="${polygonPoints}" fill="rgba(59,130,246,0.45)" stroke="#2563eb" stroke-width="2.5"/>
          ${axisLines.map((ap, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const tx = cx + (maxR + 24) * Math.cos(angle);
            const ty = cy + (maxR + 24) * Math.sin(angle);
            const pct = categoryScores[ap.label]?.percent ?? 0;
            return `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#1e293b" style="font-size:10px;font-weight:700">${ap.label}</text><text x="${tx}" y="${ty + 14}" text-anchor="middle" dominant-baseline="middle" fill="#2563eb" style="font-size:9px;font-weight:700">${pct}%</text>`;
          }).join('')}
        </svg>
      </div>
      <p style="font-size: 11px; color: #64748b; text-align: center; margin-bottom: 12px;">각 영역별 달성률(%) · 꼭지점이 바깥으로 갈수록 양호</p>
      <div class="yellow-msg">
        <p style="font-size: 14px; font-weight: 700; color: #713f12; line-height: 1.6;">${recommendMsg}</p>
      </div>
    </div>
    <span class="pg-num">03</span>
  </div>
  <div class="page" style="position: relative;">
    <div class="header-blue">
      <div style="text-align: right;">
        <div class="title">예상비용</div>
        <div class="sub">Estimated cost</div>
      </div>
      <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.3); border-radius: 8px;"></div>
    </div>
    <div class="content-box">
      <div class="grey-box">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">본 검사 예상 등급 <span style="font-size: 10px; color: #9ca3af;">(공단 판정 아님)</span></p>
        <p style="font-size: 16px; font-weight: 800; color: #111; margin-bottom: 4px;">${gradeLabel}</p>
        <p style="font-size: 12px; color: #1d4ed8; margin-bottom: 16px;">인지지원 월 한도: ${limitStr}</p>
        <hr style="border: none; border-top: 1px solid #d1d5db; margin: 12px 0;" />
        <p style="font-size: 13px; font-weight: 800; color: #111; margin-bottom: 8px;">📊 2026년 월 예상 비용 (현재 기준)</p>
        <table style="font-size: 12px;">
          <tr><td style="background: #f9fafb; width: 50%;">총 월 예상 비용</td><td class="text-right">${(finalSelfPay + realGovSupport).toLocaleString()}원</td></tr>
          <tr><td style="background: #eff6ff;">국가 지원금 (최대)</td><td class="text-right text-blue-700">${realGovSupport.toLocaleString()}원</td></tr>
          <tr><td style="padding-left: 20px;">① 법정 본인부담금</td><td class="text-right">${coPay.toLocaleString()}원</td></tr>
          <tr><td style="padding-left: 20px;">② 비급여 (식대/간병비 등)</td><td class="text-right">+${nonCoveredCost.toLocaleString()}원</td></tr>
          <tr><td style="background: #fef2f2;">실제 본인 부담금 (월) <span style="font-size: 10px; color: #b91c1c;">※ 위 ①·② 포함</span></td><td class="text-right font-bold text-red-600">${finalSelfPay.toLocaleString()}원</td></tr>
        </table>
        <p style="font-size: 10px; color: #9ca3af; margin-top: 6px;">📋 2026년 장기요양 수가 고시 기준 반영</p>
        <p style="font-size: 13px; font-weight: 800; color: #111; margin: 18px 0 4px 0;">📊 10년 후 (2036년) 월 예상 비용 · 물가상승 반영</p>
        <p style="font-size: 11px; font-weight: 700; color: #374151; margin: 10px 0 4px 0;">🧾 비용 산출 상세 내역 (월 기준)</p>
        <table style="font-size: 11px;">
          <tr><td style="background: #fef2f2;">① 사적 간병비 (인건비) 최대 부담</td><td class="text-right font-bold">${(details.caregiver || 0).toLocaleString()}원</td></tr>
          <tr><td style="padding-left: 16px; font-size: 10px; color: #6b7280;">⚠️ 정부 지원 없음 (100% 본인 부담) · 실손보험 비적용</td><td></td></tr>
          <tr><td>② 병원비/시설비</td><td class="text-right">${(details.medical || 0).toLocaleString()}원</td></tr>
          <tr><td>③ 식대/소모품 (기저귀 등)</td><td class="text-right">${(details.living || 0).toLocaleString()}원</td></tr>
          <tr style="background: #f3f4f6;"><td class="font-bold">총 비용 합계 (2036년 예상)</td><td class="text-right font-bold">${futureTotalCost.toLocaleString()}원</td></tr>
          <tr><td>- 국가 지원금 (예상)</td><td class="text-right text-blue-700">${futureGovSupport.toLocaleString()}원</td></tr>
          <tr style="background: #fef2f2;"><td class="font-bold">= 실제 본인 부담금</td><td class="text-right font-bold text-red-600">${futureSelfPay.toLocaleString()}원</td></tr>
        </table>
        <p style="font-size: 10px; color: #9ca3af; margin-top: 8px;">* 계산 근거: 2026년 기준 비용 × 물가상승률 1.5배 (연 평균 4% 상승 × 10년 = 1.04¹⁰ ≈ 1.48)</p>
        ${familyWarning ? `<div style="margin-top: 14px; padding: 10px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;"><p style="font-size: 12px; font-weight: 700; color: #92400e; white-space: pre-line">${String(familyWarning).replace(/</g, '&lt;')}</p></div>` : ''}
      </div>
    </div>
    <span class="pg-num">04</span>
  </div>
</body>
</html>
  `;
}

/** 보고서 데이터로 3·4페이지 PDF 버퍼 생성 (서버 전용) */
export async function generateReportPages34PdfBuffer(data: Record<string, unknown>): Promise<Buffer> {
  const html = generatePages34HTML(data);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
