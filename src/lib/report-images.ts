/**
 * 보고서 다이어그램·월 예상 금액 분석을 PNG로 만들기 위한 HTML 생성
 * (신청 버튼과 무관, 관리자/API에서만 사용)
 * - 서버에 Chrome이 없어도 서버리스용 Chromium 번들(@sparticuz/chromium)로 동작
 * - PUPPETEER_EXECUTABLE_PATH 설정 시 해당 Chrome/Chromium 사용
 */
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import { getConcreteTipForCategory } from './report-analysis';

const DEFAULT_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--single-process',
  '--no-zygote',
];

function isServerless(): boolean {
  return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME != null || process.cwd().startsWith('/var/task');
}

/** Vercel 등 서버리스에서 Chromium pack 다운로드 URL (런타임에 /tmp에 다운로드 후 사용) */
const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar';

/** 서버/서버리스에 맞는 브라우저 실행 옵션 반환 */
async function getLaunchOptions(): Promise<{ executablePath: string; args: string[] } | null> {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath) {
    return { executablePath: envPath, args: DEFAULT_ARGS };
  }
  if (isServerless()) {
    // Vercel 등: chromium-min + pack URL로 런타임 다운로드 (번들에 bin 미포함 문제 회피)
    const chromium = await import('@sparticuz/chromium-min');
    const executablePath = await chromium.default.executablePath(CHROMIUM_PACK_URL);
    const args = chromium.default.args ?? DEFAULT_ARGS;
    return { executablePath, args };
  }
  return null;
}

function getDiagramHTML(data: Record<string, unknown>): string {
  const categoryScores = (data.categoryScores || {}) as Record<string, { percent?: number; max?: number }>;
  const categories = Object.entries(categoryScores).filter(([, v]) => (v?.max ?? 0) > 0);
  const n = categories.length || 1;
  const cx = 160;
  const cy = 160;
  const maxR = 120;
  const axisLines = categories.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle), label: categories[i][0] };
  });
  const axisPoints = categories.map(([cat], i) => {
    const percent = categoryScores[cat]?.percent ?? 0;
    const r = (percent / 100) * maxR;
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), label: cat, percent };
  });
  const polygonPoints = axisPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    h2 { font-size: 16px; color: #374151; margin-bottom: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <h2>인지 기능 프로필 (육각형 다이어그램)</h2>
    <svg viewBox="0 0 340 340" style="width: 320px; height: 320px;">
      ${[0.25, 0.5, 0.75, 1].map((ratio) => `<polygon points="${axisLines.map((ap) => `${cx + (ap.x - cx) * ratio},${cy + (ap.y - cy) * ratio}`).join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>`).join('')}
      ${axisLines.map((ap) => `<line x1="${cx}" y1="${cy}" x2="${ap.x}" y2="${ap.y}" stroke="#cbd5e1" stroke-width="1.5"/>`).join('')}
      <polygon points="${polygonPoints}" fill="rgba(59,130,246,0.45)" stroke="#2563eb" stroke-width="2.5"/>
      ${axisLines.map((ap, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const tx = cx + (maxR + 24) * Math.cos(angle);
        const ty = cy + (maxR + 24) * Math.sin(angle);
        const pct = categoryScores[ap.label]?.percent ?? 0;
        return `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" fill="#1e293b" style="font-family:'Noto Sans KR',sans-serif;font-size:10px;font-weight:700">${ap.label}</text><text x="${tx}" y="${ty + 14}" text-anchor="middle" dominant-baseline="middle" fill="#2563eb" style="font-family:'Noto Sans KR',sans-serif;font-size:9px;font-weight:700">${pct}%</text>`;
      }).join('')}
    </svg>
    <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 12px;">각 영역별 달성률(%) · 꼭지점이 바깥으로 갈수록 양호</p>
  </div>
</body>
</html>
  `;
}

function getCostAnalysisHTML(data: Record<string, unknown>): string {
  const gradeLabel = ((data.grade as string) || '').split('(')[0].trim();
  const limitAmount = (data.limitAmount as number) ?? 0;
  const limitStr = limitAmount > 0 ? `${(limitAmount / 10000).toFixed(0)}만원 (${limitAmount.toLocaleString()}원)` : '해당 없음 (등급 외)';
  const details = (data.futureDetails || { caregiver: 0, medical: 0, living: 0 }) as { caregiver?: number; medical?: number; living?: number };
  const finalSelfPay = (data.finalSelfPay as number) ?? 0;
  const realGovSupport = (data.realGovSupport as number) ?? 0;
  const coPay = (data.coPay as number) ?? 0;
  const nonCoveredCost = (data.nonCoveredCost as number) ?? 0;
  const futureTotalCost = (data.futureTotalCost as number) ?? 0;
  const futureGovSupport = (data.futureGovSupport as number) ?? 0;
  const futureSelfPay = (data.futureSelfPay as number) ?? 0;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; background: #f8fafc; padding: 20px; }
    .wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 520px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    h2 { font-size: 18px; color: #111; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 10px 12px; border: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-red-600 { color: #dc2626; }
    .text-blue-700 { color: #1d4ed8; }
    .small { font-size: 10px; color: #9ca3af; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h2>월 예상 금액 분석</h2>
    <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">예상 장기요양 등급: ${gradeLabel}</p>
    <p style="font-size: 12px; color: #1d4ed8; margin-bottom: 16px;">인지지원 월 한도: ${limitStr}</p>
    <p style="font-size: 13px; font-weight: 800; color: #111; margin-bottom: 8px;">2026년 월 예상 비용 (현재 기준)</p>
    <table>
      <tr><td style="background: #f9fafb;">총 월 예상 비용</td><td class="text-right">${(finalSelfPay + realGovSupport).toLocaleString()}원</td></tr>
      <tr><td style="background: #eff6ff;">국가 지원금 (최대)</td><td class="text-right text-blue-700">${realGovSupport.toLocaleString()}원</td></tr>
      <tr><td style="background: #fef2f2;">실제 본인 부담금 (월)</td><td class="text-right font-bold text-red-600">${finalSelfPay.toLocaleString()}원</td></tr>
      <tr><td style="padding-left: 20px;">① 법정 본인부담금</td><td class="text-right">${coPay.toLocaleString()}원</td></tr>
      <tr><td style="padding-left: 20px;">② 비급여 (식대/간병비 등)</td><td class="text-right">+${nonCoveredCost.toLocaleString()}원</td></tr>
    </table>
    <p class="small">2026년 장기요양 수가 고시 기준 반영</p>
    <p style="font-size: 13px; font-weight: 800; color: #111; margin: 18px 0 8px 0;">10년 후 (2036년) 월 예상 비용 · 물가상승 반영</p>
    <table>
      <tr><td style="background: #f9fafb;">총 월 예상 비용 (2036년)</td><td class="text-right">${futureTotalCost.toLocaleString()}원</td></tr>
      <tr><td style="background: #eff6ff;">국가 지원금 (예상)</td><td class="text-right text-blue-700">${futureGovSupport.toLocaleString()}원</td></tr>
      <tr><td style="background: #fef2f2;">실제 본인 부담금 (월)</td><td class="text-right font-bold text-red-600">${futureSelfPay.toLocaleString()}원</td></tr>
    </table>
    <p style="font-size: 11px; font-weight: 700; color: #374151; margin: 10px 0 4px 0;">비용 산출 상세 내역 (월 기준)</p>
    <table>
      <tr><td style="background: #fef2f2;">① 사적 간병비 (인건비) 최대 부담</td><td class="text-right font-bold">${(details.caregiver || 0).toLocaleString()}원</td></tr>
      <tr><td>② 병원비/시설비</td><td class="text-right">${(details.medical || 0).toLocaleString()}원</td></tr>
      <tr><td>③ 식대/소모품 (기저귀 등)</td><td class="text-right">${(details.living || 0).toLocaleString()}원</td></tr>
      <tr style="background: #f3f4f6;"><td class="font-bold">총 비용 합계 (2036년 예상)</td><td class="text-right font-bold">${futureTotalCost.toLocaleString()}원</td></tr>
      <tr><td>- 국가 지원금 (예상)</td><td class="text-right text-blue-700">${futureGovSupport.toLocaleString()}원</td></tr>
      <tr style="background: #fef2f2;"><td class="font-bold">= 실제 본인 부담금</td><td class="text-right font-bold text-red-600">${futureSelfPay.toLocaleString()}원</td></tr>
    </table>
    <p class="small" style="margin-top: 8px;">* 2026년 기준 비용 × 물가상승률 1.5배 (연 4% × 10년)</p>
  </div>
</body>
</html>
  `;
}

async function htmlToPng(html: string, viewport = { width: 400, height: 420 }): Promise<Buffer> {
  const launchOpts = await getLaunchOptions();
  const browser = launchOpts
    ? await puppeteerCore.launch({
        headless: true,
        executablePath: launchOpts.executablePath,
        args: launchOpts.args,
      })
    : await puppeteer.launch({
        headless: true,
        args: DEFAULT_ARGS,
      });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 600));
    const buf = await page.screenshot({ type: 'png' });
    const buffer = Buffer.from(buf);
    if (!buffer || buffer.length === 0) throw new Error('스크린샷이 비어 있습니다.');
    return buffer;
  } finally {
    await browser.close();
  }
}

/** 콘텐츠 높이에 딱 맞춰 스크린샷 (하단 빈 여백 없음). .page 기준으로 측정 */
async function htmlToPngContentHeight(html: string, width: number): Promise<Buffer> {
  const launchOpts = await getLaunchOptions();
  const browser = launchOpts
    ? await puppeteerCore.launch({
        headless: true,
        executablePath: launchOpts.executablePath,
        args: launchOpts.args,
      })
    : await puppeteer.launch({
        headless: true,
        args: DEFAULT_ARGS,
      });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.setViewport({ width, height: 2400, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 500));
    const contentHeight = await (page.evaluate as (fn: () => number) => Promise<number>)(() => {
      const pageEl = document.querySelector('.page') as HTMLElement | null;
      const h = pageEl ? pageEl.scrollHeight : Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      return Math.min(Math.max(Math.ceil(h) + 4, 500), 5000);
    });
    await page.setViewport({ width, height: contentHeight, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 100));
    const buf = await page.screenshot({ type: 'png' });
    const buffer = Buffer.from(buf);
    if (!buffer || buffer.length === 0) throw new Error('스크린샷이 비어 있습니다.');
    return buffer;
  } finally {
    await browser.close();
  }
}

export async function generateDiagramPng(data: Record<string, unknown>): Promise<Buffer> {
  const html = getDiagramHTML(data);
  return htmlToPng(html, { width: 400, height: 420 });
}

export async function generateCostAnalysisPng(data: Record<string, unknown>): Promise<Buffer> {
  const html = getCostAnalysisHTML(data);
  return htmlToPng(html, { width: 560, height: 720 });
}

/** 부가 설명 콘텐츠 (content/report-content.json 구조) */
export type ReportContent = {
  stageDescriptions?: Record<string, string>;
  extraSections?: Array<{ title: string; body: string }>;
  /** 2장 분리 시 1장 제목 등 */
  pageTitle?: string;
  pageSubtitle?: string;
  showStagePill?: boolean;
  /** 하단 빨간 한 줄 안내 (직접 지정 시 sections에서 추출하지 않음) */
  disclaimerText?: string;
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getStageKey(total: number): string {
  if (total >= 80) return 'good';
  if (total >= 60) return 'normal';
  if (total >= 40) return 'fair';
  if (total >= 20) return 'caution';
  return 'danger';
}

function getStageLabel(total: number): string {
  if (total >= 80) return '좋음';
  if (total >= 60) return '보통';
  if (total >= 40) return '양호';
  if (total >= 20) return '주의';
  return '위험';
}

/** 나이대별 평균 보험료 참고 구간 + 왜 필요한지 이유 (만원). 30대는 본인 위주, 40대부터 부양 가족 대비로 확 올림 */
function getAgeGroupPremiumRange(age: number): { low: number; high: number; label: string; reason: string } {
  if (age >= 80) return { low: 16, high: 24, label: '80대', reason: '80대는 돌봄·간병 비용이 가장 많이 드는 시기입니다. 요양병원·간병인 비용이 월 수백만 원 넘는 경우가 많고, 비급여가 많아 건강보험만으로는 부족합니다. 같은 나이대에서는 이 구간 이상 준비해 두면, 본인 돌봄비로 가족에게 떠넘기는 부담을 줄일 수 있습니다.' };
  if (age >= 70) return { low: 14, high: 22, label: '70대', reason: '70대부터 치매·경도인지장애·만성질환으로 인한 간병·장기요양 필요가 크게 늘어납니다. 본인뿐 아니라 배우자 돌봄까지 겹칠 수 있어, 가족이 부담할 비용을 미리 보험으로 일부 전환해 두는 구간입니다.' };
  if (age >= 60) return { low: 12, high: 19, label: '60대', reason: '은퇴 전후라 소득은 줄고 의료·돌봄 부담은 커지는 시기입니다. 본인과 배우자 모두 노후·간병 리스크를 고려해, 자녀에게 경제적 부담을 주지 않도록 이 구간에서 보장을 갖춰 두는 것이 좋습니다.' };
  if (age >= 50) return { low: 10, high: 17, label: '50대', reason: '50대는 자녀 교육비, 부모님 봉양, 본인 노후·간병 대비가 동시에 필요한 나이대입니다. 부양할 가족이 많을수록 나중에 한꺼번에 드는 비용을 지금부터 나눠 준비하는 구간으로, 같은 나이대에서 많이 선택합니다.' };
  if (age >= 40) return { low: 9, high: 15, label: '40대', reason: '40대는 부양할 가족(배우자·자녀·양쪽 부모)이 있는 경우가 많습니다. 본인이나 부모님이 간병·치매 단계에 들어갔을 때 비급여 비용이 크게 나오므로, 미리 이 구간에서 보험을 쌓아 두면 나중 가족 부담을 줄일 수 있습니다.' };
  return { low: 6, high: 12, label: '30대', reason: '30대는 아직 본인 위주로 설계해도 되는 시기입니다. 같은 나이대에서는 실손·간병 보험을 점검하고, 저렴한 구간부터 가입해 두었다가 결혼·가족 생기면 보장을 올리는 경우가 많습니다.' };
}

/** 분석 결과(Part2) 전용: 요약 스트립 + 핵심 지표 배지 + 섹션별 인포그래픽 */
function buildAnalysisResultMain(
  data: Record<string, unknown>,
  sections: Array<{ title: string; body: string }>,
  total: number,
  stageKey: string,
  stageDesc: string,
  stageDescriptions?: Record<string, string>
): string {
  const stageLabel = getStageLabel(total);
  const stageColors: Record<string, string> = { good: '#10b981', normal: '#3b82f6', fair: '#f59e0b', caution: '#f97316', danger: '#ef4444' };
  const stageBg: Record<string, string> = { good: '#d1fae5', normal: '#dbeafe', fair: '#fef3c7', caution: '#ffedd5', danger: '#fee2e2' };
  const sc = stageColors[stageKey] ?? '#64748b';
  const sbg = stageBg[stageKey] ?? '#f1f5f9';
  const descOnly = stageDesc.replace(/^[^:]+:\s*/, '').trim();
  const firstSentence = (descOnly.match(/^[^.]*[.。]/) || [descOnly])[0].trim() || descOnly.slice(0, 60);

  const summaryStrip = `<div class="analysis-summary-strip">
    <span class="analysis-stage-badge" style="background:${sbg};color:${sc};border-color:${sc}">${escapeHtml(stageLabel)}</span>
    <span class="analysis-total">${total}<span class="analysis-total-unit">점</span></span>
    <p class="analysis-summary-line">${escapeHtml(firstSentence)}</p>
  </div>`;

  const getSection = (t: string) => sections.find((s) => String(s?.title ?? '').includes(t));
  const ageBody = getSection('동일 나이대')?.body ?? '';
  const dementiaBody = getSection('치매')?.body ?? '';
  const actionBody = getSection('이번 달')?.body ?? '';
  const nextBody = getSection('다음에 할 일')?.body ?? '';
  const problemBody = getSection('점검해볼')?.body ?? '';

  const ageMatch = ageBody.match(/상위\s*(\d+)~?(\d+)?\s*%|(\d+)~?(\d+)?\s*%?\s*수준/);
  const agePercent = ageMatch ? parseInt(ageMatch[1] || ageMatch[3] || '25', 10) : 25;
  // 위험도: '저위험'→저, '고위험'(단 '어렵' 제외)→고, '중위험'→중. '경도인지장애'의 '경도'만으로는 중으로 쓰지 않음.
  const riskLevel = dementiaBody.includes('저위험') ? '저' : (dementiaBody.includes('고위험') && !dementiaBody.includes('어렵')) ? '고' : dementiaBody.includes('중위험') ? '중' : '저';
  const riskColor = riskLevel === '고' ? '#ef4444' : riskLevel === '중' ? '#f59e0b' : '#10b981';
  const riskBg = riskLevel === '고' ? '#fee2e2' : riskLevel === '중' ? '#fef3c7' : '#d1fae5';
  const problemLines = problemBody.split('\n').filter(Boolean);
  const problemCount = problemLines.length;

  const keyMetrics = `<div class="analysis-key-metrics">
    <div class="analysis-metric"><span class="analysis-metric-label">인지 위치</span><span class="analysis-metric-value">상위 ${agePercent}%</span></div>
    <div class="analysis-metric analysis-metric-risk"><span class="analysis-metric-label">위험도</span><span class="analysis-metric-value" style="color:${riskColor}">${riskLevel}위험</span></div>
    <div class="analysis-metric"><span class="analysis-metric-label">이번 달</span><span class="analysis-metric-value">할 일 1건</span></div>
    <div class="analysis-metric"><span class="analysis-metric-label">점검</span><span class="analysis-metric-value">${problemCount}개 영역</span></div>
  </div>`;

  let blocks = summaryStrip + keyMetrics;

  const currentAge = data.age != null ? Number(data.age) : null;
  const ageLabel = currentAge != null ? `현재 ${currentAge}세 · 동일 나이대 인지 위치` : '동일 나이대 인지 위치';
  const ageSection = getSection('동일 나이대');
  const dementiaSection = getSection('치매');
  const ageCardHtml = ageSection?.body
    ? (() => {
        const pct = Math.min(100, Math.max(0, agePercent));
        return `<div class="analysis-card">
      <h4 class="analysis-card-title">${escapeHtml(ageLabel)}</h4>
      <div class="analysis-gauge-wrap">
        <div class="analysis-gauge-track"><div class="analysis-gauge-fill" style="width:${pct}%"></div></div>
        <p class="analysis-gauge-label">상위 ${pct}% 수준</p>
      </div>
      <p class="analysis-card-line">${escapeHtml(ageSection.body)}</p>
    </div>`;
      })()
    : '';
  const dementiaCardHtml = dementiaSection?.body
    ? `<div class="analysis-card analysis-card-risk">
      <div class="analysis-card-header-row">
        <h4 class="analysis-card-title">치매·인지 위험 해석</h4>
        <div class="analysis-risk-top-right">
          <div class="analysis-risk-badge" style="background:${riskBg};color:${riskColor};border-color:${riskColor}">${riskLevel}위험</div>
        </div>
      </div>
      <p class="analysis-card-line">${escapeHtml(dementiaSection.body)}</p>
    </div>`
    : '';
  if (ageCardHtml || dementiaCardHtml) {
    blocks += `<div class="analysis-two-col">${ageCardHtml}${dementiaCardHtml}</div>`;
  }

  const actionSection = getSection('이번 달');
  if (actionSection?.body) {
    blocks += `<div class="analysis-card analysis-cta">
      <h4 class="analysis-card-title">이번 달 한 가지 행동</h4>
      <p class="analysis-cta-text">${escapeHtml(actionSection.body)}</p>
    </div>`;
  }

  const nextSection = getSection('다음에 할 일');
  if (nextSection?.body) {
    const lines = nextSection.body.split('\n').filter(Boolean);
    blocks += `<div class="analysis-card">
      <h4 class="analysis-card-title">다음에 할 일</h4>
      <div class="analysis-steps">${lines.map((line, i) => `<div class="analysis-step"><span class="analysis-step-num">${i + 1}</span><span class="analysis-step-text">${escapeHtml(line.replace(/^\d+\.\s*/, ''))}</span></div>`).join('')}</div>
    </div>`;
  }

  const problemSection = getSection('점검해볼');
  if (problemSection?.body) {
    const categoryScores = (data.categoryScores || {}) as Record<string, { percent?: number; max?: number }>;
    const lines = problemSection.body.split('\n').filter(Boolean);
    const bars = lines.map((line) => {
      const trimmed = line.trim();
      const labelMatch = trimmed.match(/^([가-힣]+)(?:\s+영역)?/);
      const label = labelMatch ? labelMatch[1] : trimmed.slice(0, 8) || '영역';
      const pctFromData = categoryScores[label]?.percent;
      const pctFromLine = trimmed.match(/(\d+)%/);
      const pct = pctFromData != null ? Math.round(pctFromData) : (pctFromLine ? parseInt(pctFromLine[1], 10) : 0);
      const afterFirstSentence = trimmed.replace(/^[^.]*\.\s*/, '').trim();
      const tip = afterFirstSentence.length > 10 ? afterFirstSentence : getConcreteTipForCategory(label);
      return { label, pct: Math.min(100, Math.max(0, pct)), tip };
    });
    blocks += `<div class="analysis-card">
      <h4 class="analysis-card-title">점검해볼 부분</h4>
      <div class="analysis-mini-chart">${bars.map((b) => `<div class="analysis-bar-block"><div class="analysis-bar-row"><span class="analysis-bar-label">${escapeHtml(b.label)}</span><div class="analysis-bar-track"><div class="analysis-bar-fill" style="width:${b.pct}%"></div></div><span class="analysis-bar-pct">${b.pct}%</span></div><p class="analysis-bar-tip">${escapeHtml(b.tip)}</p></div>`).join('')}</div>
    </div>`;
  }

  return blocks;
}

function getExplanationHTML(data: Record<string, unknown>, content: ReportContent): string {
  const total = (data.total as number) ?? 0;
  const userName = (data.userName || '고객').toString();
  const stageKey = getStageKey(total);
  const stageDesc =
    (content.stageDescriptions && content.stageDescriptions[stageKey]) ||
    '현재 단계에 대한 설명을 참고해 주세요.';
  const sections = content.extraSections || [];
  const disclaimerTitles = ['이 검사에 대해', '주의사항'];
  const mainSections = sections.filter((s) => !disclaimerTitles.includes(String(s?.title ?? '')));
  const disclaimerParts = sections.filter((s) => disclaimerTitles.includes(String(s?.title ?? '')));
  const disclaimerText =
    content.disclaimerText !== undefined
      ? content.disclaimerText
      : disclaimerParts.map((s) => String(s?.body ?? '').trim()).filter(Boolean).join(' ');
  const pageTitle = content.pageTitle ?? '분석 결과';
  const pageSubtitle = content.pageSubtitle ?? `${userName} 님 인지 검진 · 맞춤 분석`;
  const showStagePill = content.showStagePill !== false;

  const isAnalysisResultPage = mainSections.some((s) => String(s?.title ?? '').includes('동일 나이대 인지 위치') || String(s?.title ?? '').includes('다음에 할 일'));
  const sectionHtml = isAnalysisResultPage ? buildAnalysisResultMain(data, mainSections, total, stageKey, stageDesc, content.stageDescriptions) : mainSections.map((s) => {
    const title = String(s?.title ?? '');
    const body = String(s?.body ?? '');
    const isExplanationOnly = title === '월 예상 비용 부가설명';
    const isCost = !isExplanationOnly && (title.includes('월 예상 비용') || title.includes('비용 요약'));
    const isNext = title.includes('다음에 할 일');
    const isProblem = title.includes('점검해볼 부분');
    const isPremium = title.includes('보험료');
    let contentHtml: string;
    if (isExplanationOnly && body) {
      const futureSelfPay = (data.futureSelfPay as number) ?? 0;
      const age = data.age != null ? Number(data.age) : 65;
      const low = futureSelfPay > 0 ? Math.max(1, Math.round(futureSelfPay * 0.25 / 10000)) : 7;
      const high = futureSelfPay > 0 ? Math.max(low, Math.round(futureSelfPay * 0.5 / 10000)) : 15;
      const agePremium = getAgeGroupPremiumRange(age);
      const badgeRow = `<div class="key-badges">
        <div class="badge-box badge-box-1"><span class="badge-label">본인부담금</span><span class="badge-value">15%</span></div>
        <div class="badge-box badge-box-2"><span class="badge-label">인지지원</span><span class="badge-value">65.7만원</span></div>
        <div class="badge-box badge-box-3"><span class="badge-label">비급여</span><span class="badge-value">전액본인</span></div>
        <div class="badge-box badge-box-primary"><span class="badge-label">권장 보험료</span><span class="badge-value">${low}~${high}만원</span></div>
      </div>
      <div class="age-premium-note">
        <p class="age-premium-line">※ 동일 나이대(${escapeHtml(agePremium.label)}) 평균 보험료(참고): 월 ${agePremium.low}~${agePremium.high}만원</p>
        <p class="age-premium-reason">${escapeHtml(agePremium.reason)}</p>
      </div>`;
      const blocks = body.split(/■\s*/).filter((b) => b.trim());
      const blocksHtml = blocks
        .map((block) => {
          const lines = block.trim().split('\n').filter(Boolean);
          const blockTitle = lines[0]?.trim() ?? '';
          const items = lines.slice(1).map((l) => l.replace(/^\s*·\s*/, '').trim()).filter(Boolean);
          let blockContent: string;
          if (blockTitle === '국가 지원금·급여 안내') {
            blockContent = `<div class="two-lines-block">
              <p class="line">등급별 월 한도 내 이용 시 본인부담 <span class="highlight">15%</span> (경감 <span class="highlight">9%·6%</span>)</p>
              <p class="line">인지지원 2025년 월 한도 <span class="highlight">65.7만원</span></p>
            </div>`;
          } else if (blockTitle === '비급여 (전액 본인 부담)') {
            blockContent = `<div class="two-lines-block">
              <p class="line">식대·이미용·상급침실 등은 급여 외 <span class="highlight">전액 본인 부담</span>.</p>
              <p class="line">간병인 고용비는 <span class="highlight">건강보험·실손 미적용</span>. <span class="highlight">치매간병보험</span>으로만 준비.</p>
            </div>`;
          } else if (blockTitle === '권장') {
            const manMatch = items[0]?.match(/예상 부담\(월 약 ([^)]+)\)/);
            const manStr = manMatch ? manMatch[1] : (futureSelfPay >= 10000 ? `${Math.round(futureSelfPay / 10000)}만` : '7~15만원');
            blockContent = `<div class="two-lines-block">
              <p class="line">예상 부담(월 약 <span class="highlight">${escapeHtml(manStr)}</span>)이 <span class="highlight">가족 부담</span>이 될 수 있어, <span class="highlight">치매간병보험·지원 제도 상담</span> 권장.</p>
            </div>`;
          } else {
            blockContent = items.length > 0 ? `<ul class="explanation-ul explanation-ul-short">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '';
          }
          return `<div class="explanation-block"><h4>${escapeHtml(blockTitle)}</h4>${blockContent}</div>`;
        })
        .join('');
      contentHtml = `${badgeRow}<div class="explanation-blocks explanation-blocks-short">${blocksHtml}</div>`;
    } else if (isNext && body.includes('\n')) {
      const lines = body.split('\n').filter(Boolean);
      contentHtml = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
      contentHtml = `<ol class="num-list">${contentHtml}</ol>`;
    } else if (isProblem && body.includes('\n')) {
      contentHtml = body.split('\n').filter(Boolean).map((l) => `<p class="problem-line">${escapeHtml(l)}</p>`).join('');
    } else {
      contentHtml = `<div class="pre-wrap">${escapeHtml(body)}</div>`;
    }
    const icon = isExplanationOnly ? 'cost' : isCost ? 'cost' : isPremium ? 'premium' : isNext ? 'next' : isProblem ? 'problem' : 'dot';
    const cardClass = [isCost || isExplanationOnly ? 'card-cost' : '', isPremium ? 'card-premium' : ''].filter(Boolean).join(' ');
    return `<section class="card${cardClass ? ' ' + cardClass : ''}">
      <h3 class="card-title"><span class="card-icon ${icon}"></span>${escapeHtml(title)}</h3>
      <div class="card-body">${contentHtml}</div>
    </section>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      background: #fff;
      color: #1e293b;
      line-height: 1.55;
      font-size: 15px;
      padding: 0;
      margin: 0;
    }
    .page {
      width: 560px;
      background: #fafbfc;
      padding-bottom: 12px;
    }
    .top-bar {
      height: 6px;
      background: linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
    }
    .title-row {
      padding: 18px 24px 14px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
    }
    .title-row h1 { font-size: 21px; font-weight: 800; color: #1e293b; }
    .title-row .by { font-size: 14px; color: #475569; margin-top: 2px; }
    .stage-pill {
      display: inline-block;
      margin: 14px 24px 0;
      padding: 8px 14px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 600;
      border-radius: 20px;
      border: 1px solid #bfdbfe;
    }
    .main { padding: 14px 24px 0; }
    .card {
      background: #fff;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .card:last-child { margin-bottom: 0; }
    .card-cost { border-left: 4px solid #2563eb; }
    .card-title {
      font-size: 15px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-icon { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }
    .card-icon.cost { background: #2563eb; width: 4px; height: 12px; border-radius: 2px; }
    .card-icon.premium { background: #059669; }
    .card-icon.next { background: #7c3aed; }
    .card-icon.problem { background: #dc2626; }
    .card-body { font-size: 14px; color: #334155; line-height: 1.65; }
    .card-body .pre-wrap { white-space: pre-line; word-break: keep-all; }
    .card-cost .card-body { font-size: 13px; color: #475569; line-height: 1.6; }
    .card-premium .card-body { font-size: 16px; color: #1e293b; line-height: 1.65; }
    .num-list { margin-left: 16px; padding-left: 4px; }
    .num-list li { margin-bottom: 6px; }
    .num-list li:last-child { margin-bottom: 0; }
    .problem-line { margin-bottom: 6px; }
    .problem-line:last-child { margin-bottom: 0; }
    .explanation-blocks { font-size: 13px; color: #475569; }
    .explanation-blocks-short { font-size: 15px; color: #334155; line-height: 1.6; }
    .explanation-block { margin-bottom: 14px; }
    .explanation-block:last-child { margin-bottom: 0; }
    .explanation-block h4 { font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
    .explanation-blocks-short .explanation-block h4 { font-size: 15px; margin-bottom: 8px; }
    .explanation-ul { margin-left: 16px; padding-left: 4px; list-style: none; }
    .explanation-ul li { margin-bottom: 5px; position: relative; padding-left: 10px; }
    .explanation-ul li::before { content: '·'; position: absolute; left: 0; font-weight: 700; color: #64748b; }
    .explanation-ul-short li { margin-bottom: 8px; font-size: 14px; }
    .key-badges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; align-items: stretch; }
    .badge-box { border-radius: 8px; padding: 8px 10px; text-align: center; border: 1px solid transparent; min-height: 0; display: flex; flex-direction: column; justify-content: center; }
    .badge-box .badge-label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 2px; line-height: 1.25; }
    .badge-box .badge-value { display: block; font-size: 15px; font-weight: 800; line-height: 1.3; }
    .badge-box-1 { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
    .badge-box-1 .badge-label { color: #b45309; }
    .badge-box-1 .badge-value { color: #1e293b; }
    .badge-box-2 { background: #d1fae5; border-color: #10b981; color: #065f46; }
    .badge-box-2 .badge-label { color: #047857; }
    .badge-box-2 .badge-value { color: #1e293b; }
    .badge-box-3 { background: #ffe4e6; border-color: #f43f5e; color: #9f1239; }
    .badge-box-3 .badge-label { color: #be123c; }
    .badge-box-3 .badge-value { color: #1e293b; }
    .badge-box-primary { background: #eff6ff; border-color: #3b82f6; }
    .badge-box-primary .badge-label { color: #1d4ed8; }
    .badge-box-primary .badge-value { color: #1e40af; font-size: 14px; }
    .age-premium-note { margin: -4px 0 14px 0; padding: 0 2px; }
    .age-premium-line { font-size: 12px; color: #64748b; font-weight: 600; margin: 0 0 4px 0; }
    .age-premium-reason { font-size: 11px; color: #64748b; line-height: 1.45; margin: 0; }
    .two-lines-block { margin-top: 4px; }
    .two-lines-block .line { font-size: 15px; line-height: 1.75; color: #334155; margin-bottom: 6px; }
    .two-lines-block .line:last-child { margin-bottom: 0; }
    .highlight { color: #dc2626; font-weight: 800; }
    .notice {
      margin: 16px 24px 0;
      padding: 10px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #b91c1c;
      text-align: center;
      line-height: 1.5;
    }
    .analysis-summary-strip {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 12px 16px; margin-bottom: 12px;
    }
    .analysis-stage-badge { font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid; }
    .analysis-total { font-size: 30px; font-weight: 800; color: #1e293b; line-height: 1; }
    .analysis-total-unit { font-size: 15px; font-weight: 600; color: #64748b; margin-left: 2px; }
    .analysis-summary-line { font-size: 14px; color: #334155; margin: 0; flex: 1; min-width: 120px; white-space: normal; word-break: keep-all; overflow-wrap: break-word; font-weight: 500; }
    .analysis-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; align-items: stretch; }
    .analysis-two-col .analysis-card { height: 100%; display: flex; flex-direction: column; }
    .analysis-two-col .analysis-card .analysis-card-line { flex: 1; }
    .analysis-key-metrics {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 14px;
    }
    .analysis-metric {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; text-align: center;
    }
    .analysis-metric-label { display: block; font-size: 12px; color: #475569; font-weight: 700; margin-bottom: 2px; }
    .analysis-metric-value { font-size: 14px; font-weight: 800; color: #1e293b; line-height: 1.3; }
    .analysis-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      overflow: visible;
    }
    .analysis-card:last-child { margin-bottom: 0; }
    .analysis-card-title { font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
    .analysis-card-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
    .analysis-card-header-row .analysis-card-title { margin-bottom: 0; }
    .analysis-risk-top-right { flex-shrink: 0; display: flex; align-items: center; }
    .analysis-card-line { font-size: 14px; color: #334155; line-height: 1.55; margin: 0; white-space: normal; word-break: keep-all; overflow-wrap: break-word; font-weight: 500; }
    .analysis-gauge-wrap { margin-bottom: 8px; }
    .analysis-gauge-track { height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; display: flex; }
    .analysis-gauge-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 5px; min-width: 4px; }
    .analysis-gauge-label { font-size: 13px; font-weight: 800; color: #1d4ed8; margin-top: 4px; }
    .analysis-risk-badge { display: inline-block; font-size: 12px; font-weight: 800; padding: 4px 8px; border-radius: 4px; border: 1px solid; }
    .analysis-cta { border-left: 4px solid #7c3aed; background: #f5f3ff; }
    .analysis-cta-text { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; white-space: normal; word-break: keep-all; overflow-wrap: break-word; }
    .analysis-steps { display: flex; flex-direction: column; gap: 6px; }
    .analysis-step { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #334155; font-weight: 500; }
    .analysis-step-num { flex-shrink: 0; width: 22px; height: 22px; background: #7c3aed; color: #fff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; }
    .analysis-step-text { line-height: 1.45; white-space: normal; word-break: keep-all; overflow-wrap: break-word; }
    .analysis-mini-chart { display: flex; flex-direction: column; gap: 12px; }
    .analysis-bar-block { display: flex; flex-direction: column; gap: 4px; }
    .analysis-bar-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .analysis-bar-label { flex: 0 0 80px; color: #334155; font-weight: 700; }
    .analysis-bar-track { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .analysis-bar-fill { height: 100%; background: #f97316; border-radius: 4px; }
    .analysis-bar-pct { flex: 0 0 28px; font-weight: 800; color: #ea580c; text-align: right; }
    .analysis-bar-tip { font-size: 12px; color: #475569; line-height: 1.45; margin: 0; padding-left: 0; word-break: keep-all; overflow-wrap: break-word; font-weight: 500; }
  </style>
</head>
<body>
  <div class="page">
    <div class="top-bar"></div>
    <div class="title-row">
      <h1>${escapeHtml(pageTitle)}</h1>
      <p class="by">${escapeHtml(pageSubtitle)}</p>
    </div>
    ${showStagePill && !isAnalysisResultPage ? `<div class="stage-pill">${escapeHtml(stageDesc)}</div>` : ''}
    <div class="main">
      ${sectionHtml}
    </div>
    ${disclaimerText ? `<div class="notice">${escapeHtml(disclaimerText)}</div>` : ''}
  </div>
</body>
</html>
  `;
}

/** 부가 설명 이미지 생성 (리포터 삽입용). content 없으면 기본 문구 사용 */
export async function generateExplanationPng(
  data: Record<string, unknown>,
  content?: ReportContent | null
): Promise<Buffer> {
  const defaultContent: ReportContent = {
    stageDescriptions: {
      good: '좋음(80~100점): 인지 기능이 잘 유지되고 있습니다. 규칙적인 생활과 사회 참여를 이어가 주세요.',
      normal: '보통(60~80점): 정상 범위에 가깝습니다. 주기적인 검진을 권장합니다.',
      fair: '양호(40~60점): 특정 영역이 다소 낮을 수 있습니다. 정밀 검사나 전문의 상담을 고려해 보세요.',
      caution: '주의(20~40점): 주의 관찰이 필요합니다. 정밀 검사 및 상담을 권장합니다.',
      danger: '위험(0~20점): 고위험군일 수 있습니다. 의료기관 정밀 검사와 상담을 권장합니다.',
    },
    extraSections: [
      { title: '이 검사에 대해', body: '본 검사는 선별 목적이며, 확진이 아닙니다. 정밀 검사는 의료기관을 방문하세요.' },
      { title: '주의사항', body: '결과는 참고용이며, 진단·치료를 대체하지 않습니다.' },
    ],
  };
  const c = content ?? defaultContent;
  const html = getExplanationHTML(data, c);
  return htmlToPngContentHeight(html, 560);
}
