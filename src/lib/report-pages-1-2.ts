/**
 * 치매검사 보고서 1·2페이지 HTML 생성 (JSON 데이터 기반)
 * - 1페이지: 고객정보 (고객명, 검사일/신청일)
 * - 2페이지: 고객명, 단계(좋음/보통/양호/주의/위험), 치매점수 가로 그래프(점수 + 나이대별 평균)
 */
import puppeteer from 'puppeteer';

/** 검사일/신청일 포맷 (JSON의 applicationDateTime 사용) */
function formatExamDate(applicationDateTime: unknown): string {
  if (!applicationDateTime) return new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const str = String(applicationDateTime);
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** 5단계: 좋음(80~100), 보통(60~80), 양호(40~60), 주의(20~40), 위험(0~20) */
function getStageLabel(total: number): string {
  if (total >= 80) return '좋음';
  if (total >= 60) return '보통';
  if (total >= 40) return '양호';
  if (total >= 20) return '주의';
  return '위험';
}

function getStageColor(stage: string): string {
  switch (stage) {
    case '좋음': return '#16a34a';
    case '보통': return '#2563eb';
    case '양호': return '#ca8a04';
    case '주의': return '#ea580c';
    case '위험': return '#dc2626';
    default: return '#374151';
  }
}

/** 나이대별 평균 점수 (참고) */
function getAgeGroupAverage(age: number): number {
  if (age >= 80) return 65;
  if (age >= 70) return 72;
  if (age >= 60) return 79;
  if (age >= 50) return 88;
  if (age >= 40) return 91;
  return 96;
}

function getAgeGroupLabel(age: number): string {
  if (age >= 80) return '80대';
  if (age >= 70) return '70대';
  if (age >= 60) return '60대';
  if (age >= 50) return '50대';
  if (age >= 40) return '40대';
  return '30대';
}

export function generatePages12HTML(data: Record<string, unknown>): string {
  const userName = (data.userName || '고객').toString().replace(/</g, '&lt;');
  const total = (data.total as number) ?? 0;
  const age = data.age != null ? Number(data.age) : 65;
  const examDate = formatExamDate(data.applicationDateTime);
  const stageLabel = getStageLabel(total);
  const stageColor = getStageColor(stageLabel);
  const ageGroupLabel = getAgeGroupLabel(age);
  const ageAvg = getAgeGroupAverage(age);
  const userBarWidth = Math.min(100, (total / 100) * 100);
  const avgBarWidth = Math.min(100, (ageAvg / 100) * 100);

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>치매검사 보고서 1·2페이지</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1f2937; line-height: 1.5; }
    .page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; padding: 24px; position: relative; }
    .page:last-child { page-break-after: auto; }
    .pg-num { position: absolute; bottom: 16px; right: 24px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <!-- 1페이지: 고객정보 (고객명, 검사일) -->
  <div class="page">
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
      <h1 style="font-size: 28px; font-weight: 800; color: #1e40af; margin-bottom: 48px;">치매검사 보고서</h1>
      <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px 48px; min-width: 320px;">
        <h2 style="font-size: 14px; color: #64748b; margin-bottom: 16px; font-weight: 700;">고객정보</h2>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <tr>
            <td style="padding: 12px 16px 12px 0; font-weight: 700; color: #475569; width: 100px;">고객명</td>
            <td style="padding: 12px 0; font-size: 20px; font-weight: 800; color: #111;">${userName} 고객님</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px 12px 0; font-weight: 700; color: #475569;">검사일</td>
            <td style="padding: 12px 0; font-size: 18px; font-weight: 700; color: #111;">${examDate}</td>
          </tr>
        </table>
      </div>
    </div>
    <span class="pg-num">01</span>
  </div>

  <!-- 2페이지: 고객명, 단계, 치매점수 그래프 -->
  <div class="page">
    <div style="margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 800; color: #111; margin-bottom: 8px;">치매 점수 결과 및 분석</h1>
      <p style="font-size: 17px; font-weight: 800; color: #374151;">${userName} 님의 현재 뇌 건강 상태는 '<span style="color: ${stageColor}; font-weight: 800;">${stageLabel}</span>' 단계입니다.</p>
    </div>
    <div style="margin-bottom: 24px;">
      <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">치매점수</p>
      <div style="display: flex; align-items: center; gap: 12px; height: 32px;">
        <span style="font-size: 13px; width: 80px;">${userName} 님</span>
        <div style="flex: 1; max-width: 360px; height: 24px; background: #e5e7eb; border-radius: 6px; overflow: hidden;">
          <div style="width: ${userBarWidth}%; height: 100%; background: #2563eb; border-radius: 6px;"></div>
        </div>
        <span style="font-size: 14px; font-weight: 800; min-width: 36px;">${total}점</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; height: 32px; margin-top: 10px;">
        <span style="font-size: 13px; width: 80px;">${ageGroupLabel} 평균</span>
        <div style="flex: 1; max-width: 360px; height: 24px; background: #e5e7eb; border-radius: 6px; overflow: hidden;">
          <div style="width: ${avgBarWidth}%; height: 100%; background: #ea580c; border-radius: 6px;"></div>
        </div>
        <span style="font-size: 14px; font-weight: 800; min-width: 36px;">${ageAvg}점</span>
      </div>
      <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
        <span style="display: inline-block; width: 14px; height: 14px; background: #2563eb; border-radius: 3px; vertical-align: middle;"></span> ${userName} 님
        <span style="display: inline-block; width: 14px; height: 14px; background: #ea580c; border-radius: 3px; vertical-align: middle; margin-left: 16px;"></span> ${ageGroupLabel} 평균 점수
      </div>
    </div>
    <span class="pg-num">02</span>
  </div>
</body>
</html>
  `;
}

export async function generateReportPages12PdfBuffer(data: Record<string, unknown>): Promise<Buffer> {
  const html = generatePages12HTML(data);
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
