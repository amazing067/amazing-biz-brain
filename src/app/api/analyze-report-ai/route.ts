/**
 * 보고서 데이터를 Gemini로 분석해 월보험료 예상, 다음 단계, 문제 영역 문구 생성
 * GEMINI_API_KEY가 없으면 503 반환 (관리자에서 로컬 분석으로 폴백)
 */
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ReportAnalysis } from '../../../lib/report-analysis';
import { getCostBreakdownText } from '../../../lib/report-analysis';

/** 등급을 '이미 판정받은 것'처럼 단정하는 표현을 완화합니다. */
function sanitizeDementiaRiskNote(note: string | undefined): string | undefined {
  if (!note || typeof note !== 'string') return note;
  let s = note;
  if (/이미\s*(장기요양\s*)?\d등급\s*판정을\s*받으신|판정을\s*받으신\s*상태/.test(s)) {
    s = s
      .replace(/이미\s*(장기요양\s*)?\d등급\s*판정을\s*받으신\s*상태로,?/g, '검진 결과상 해당 등급 구간으로 추정될 수 있으며, 실제 등급은 장기요양 인정 신청·공단 심사 후 결정됩니다. ')
      .replace(/판정을\s*받으신\s*상태로,?/g, '실제 등급은 공단 심사 후 결정됩니다. ');
  }
  return s.trim() || note;
}

const REPORT_ANALYSIS_PROMPT = `당신은 **치매 예방·인지재활·장기요양 보험**를 아는 신경과 상담 전문가이자 보험 설계사입니다. 고객에게 전달할 **치매 관련 완벽한 리포터용 분석**을 작성합니다. 데이터에 있는 **나이·성별·총점·영역별 달성률·등급·본인부담금**을 반드시 모두 활용하세요.

## 1. 나이대 맥락 (ageContext) — 필수
- **같은 나이·성별**에서 인지 건강이 어느 정도인지 한 문장으로 제시.
- 예: "○세 남성/여성 기준 인지 기능은 같은 연령대에서 상위 20~30% 수준으로 추정됩니다.", "동일 연령대 평균 대비 양호한 편입니다."
- **70~92점은 인지지원등급 구간**이므로 "정상 범위에 가깝다"고 쓰지 말고, "인지지원등급 구간에 해당할 수 있으며 경미한 인지 저하가 있을 수 있다"는 톤으로 쓸 것. 93점 이상만 정상(등급 외).
- 총점·영역 점수를 바탕으로 상위/중위/하위 비율을 추정해 쓸 것. 확정적 표현 대신 "~로 추정됩니다" 사용.

## 2. 치매·경도인지장애 위험 해석 (dementiaRiskNote) — 필수
- 현재 점수와 연령을 기준으로 **경도인지장애(MCI)·치매 위험**을 **저위험 / 중위험 / 고위험** 중 하나로 문장 안에 반드시 포함.
- **위험도 기준 (총점만 사용, 등급 미반영)**: 총점 80 이상 → 저위험, 60~79 → 저위험, 40~59 → 중위험, 40 미만 → 고위험.
- **중요**: 데이터의 "장기요양등급"은 검진 점수로 **추정한 예상 등급**일 뿐, 실제 공단 판정이 아닙니다. "검진 결과상 ○등급 구간으로 추정될 수 있음", "실제 등급은 장기요양 인정 신청·공단 심사 후 결정됩니다" 등으로 완화할 것.
- 과도한 불안을 유발하지 말 것. 고위험일 때만 "의료기관 정밀 검진 권장" 등 구체적 안내.

## 3. 이번 달 한 가지 행동 (oneActionThisMonth) — 필수
- **이번 달 안에 할 수 있는 단 하나의 행동**만 한 문장으로. 예: "이번 달에 치매·장기요양 보험 견적 1건 받아보기.", "가족과 돌봄 계획 이야기 1번 나누기."

## 4. 금액 규칙 (monthlyPremiumRecommend) — 필수
- 데이터의 "2026년_월_본인부담금", "10년후_월_본인부담금"을 **그대로** 언급한 뒤, 권장 보험료는 **월 7~15만원** 구간으로 권유. (본인부담금이 낮으면 7만원대, 높으면 15만원대 근처로 조정 가능.)
- "1~2만원대 점검용으로 충분" 등 낮은 금액·점검용 표현은 사용하지 말 것. 보험 상담·가입을 권하는 톤으로 작성.
- nextSteps에서 보험 상담 언급 시 **같은 금액 구간(7~15만원)** 그대로 사용.

## 5. 다음 단계 (nextSteps) — 4~6개
- 나이에 맞춘 **검진 주기**(예: 65세 이상 1년 1회 인지 검진).
- **보험 상담**(위에서 정한 금액 구간).
- **취약 영역별 구체 훈련**(영역별_달성률에서 낮은 영역이 있으면 해당 훈련 한 줄).
- **가족과 돌봄·재정 계획 대화**.
- 실행 가능한 행동만, 구체적으로.

## 6. 문제·취약 영역 (problemAreas)
- 영역별_달성률_퍼센트에서 **60% 미만**인 영역만 "영역명 + 수치 + **무엇을 하면 좋은지 구체적 훈련/행동**" 형식으로 한 줄씩. "점검훈련을 권장합니다"만 쓰지 말고, **해당 영역에서 실제로 할 수 있는 행동**을 꼭 적을 것. 예: 작업기억 → "숫자 거꾸로 말하기, 할 일 목록 적고 당일 확인하기, 짧은 문장 따라 말하기 등이 도움이 됩니다.", 기억력 → "이름·약속·물건 둔 곳 메모하기, 매일 같은 시간에 복용·일과 확인하기", 주의력 → "한 가지 일에 10분씩 집중하는 습관, 방해 요소 줄이기" 등.
- 모두 60% 이상이면 1~2문장으로 "전반적으로 양호하나, 같은 나이대에 맞춘 유지 관리가 필요합니다" 등 요약.

## 출력 규칙
- 한국어만 사용. 다른 설명 없이 **아래 JSON 한 개만** 출력.
- 추정·권장 사항은 "~로 추정됩니다", "~를 권장합니다"로 완화.

{"ageContext":"같은 나이·성별 기준 인지 위치 한 문장", "dementiaRiskNote":"치매/MCI 위험 저·중·고 해석 한 문장", "oneActionThisMonth":"이번 달 할 한 가지 행동", "monthlyPremiumRecommend":"2~4문장. 데이터 본인부담금+권장 보험료 구간(25~50%)", "nextSteps":["행동1","행동2",...], "problemAreas":["한 줄",...]}`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API 키가 설정되지 않았습니다.', useLocal: true },
      { status: 503 }
    );
  }

  try {
    const data = await request.json();
    const total = (data.total as number) ?? 0;
    const age = data.age != null ? Number(data.age) : 65;
    const categoryScores = (data.categoryScores || {}) as Record<string, { percent?: number; max?: number }>;
    const finalSelfPay = (data.finalSelfPay as number) ?? 0;
    const realGovSupport = (data.realGovSupport as number) ?? 0;
    const futureSelfPay = (data.futureSelfPay as number) ?? 0;
    const futureTotalCost = (data.futureTotalCost as number) ?? 0;
    const futureGovSupport = (data.futureGovSupport as number) ?? 0;
    const grade = (data.grade as string) ?? '';
    const limitAmount = (data.limitAmount as number) ?? 0;
    const status = (data.status as string) ?? '';
    const careType = (data.careType as string) ?? '';
    const gender = (data.gender as string) ?? '';

    const summary = {
      인지총점: total,
      나이: age,
      성별: gender || '미입력',
      단계: total >= 80 ? '좋음' : total >= 60 ? '보통' : total >= 40 ? '양호' : total >= 20 ? '주의' : '위험',
      장기요양등급: grade,
      인지지원한도: limitAmount > 0 ? `${(limitAmount / 10000).toFixed(0)}만원` : '해당없음',
      돌봄유형: careType || status,
      '2026년_월_국가지원금': realGovSupport,
      '2026년_월_본인부담금': finalSelfPay,
      '10년후_월_예상총비용': futureTotalCost,
      '10년후_월_국가지원금': futureGovSupport,
      '10년후_월_본인부담금': futureSelfPay,
      영역별_달성률_퍼센트: Object.fromEntries(
        Object.entries(categoryScores).map(([k, v]) => [k, (v as { percent?: number })?.percent ?? 0])
      ),
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelId = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
    const model = genAI.getGenerativeModel({ model: modelId });
    const prompt = `${REPORT_ANALYSIS_PROMPT}\n\n## 검진 결과 데이터\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n\n위 데이터만 보고 JSON 한 개만 출력하세요.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) {
      return NextResponse.json(
        { error: 'Gemini 응답이 비어 있습니다.', useLocal: true },
        { status: 502 }
      );
    }

    const usage = result.response.usageMetadata
      ? {
          promptTokenCount: result.response.usageMetadata.promptTokenCount ?? 0,
          candidatesTokenCount: result.response.usageMetadata.candidatesTokenCount ?? 0,
          totalTokenCount: result.response.usageMetadata.totalTokenCount ?? 0,
        }
      : null;
    if (usage) {
      console.log('[analyze-report-ai] 토큰 사용량:', usage);
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const stageKey = total >= 80 ? 'good' : total >= 60 ? 'normal' : total >= 40 ? 'fair' : total >= 20 ? 'caution' : 'danger';
    const analysis: ReportAnalysis = {
      stageLabel: total >= 80 ? '좋음' : total >= 60 ? '보통' : total >= 40 ? '양호' : total >= 20 ? '주의' : '위험',
      stageKey,
      total,
      monthlyPremiumRecommend: String(parsed.monthlyPremiumRecommend ?? ''),
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter(Boolean) : [],
      problemAreas: Array.isArray(parsed.problemAreas) ? parsed.problemAreas.filter(Boolean) : [],
      summary: '',
      ageContext: typeof parsed.ageContext === 'string' ? parsed.ageContext : undefined,
      dementiaRiskNote: sanitizeDementiaRiskNote(typeof parsed.dementiaRiskNote === 'string' ? parsed.dementiaRiskNote : undefined),
      oneActionThisMonth: typeof parsed.oneActionThisMonth === 'string' ? parsed.oneActionThisMonth : undefined,
    };
    analysis.summary =
      [analysis.ageContext, analysis.oneActionThisMonth, analysis.monthlyPremiumRecommend, analysis.nextSteps[0]]
        .filter(Boolean)
        .join(' ') || analysis.stageLabel;
    analysis.costBreakdown = getCostBreakdownText(data);

    const body: Record<string, unknown> = { ...analysis };
    if (usage) body.usage = usage;
    return NextResponse.json(body);
  } catch (e: unknown) {
    const err = e as Error;
    console.error('[analyze-report-ai]', e);
    return NextResponse.json(
      { error: 'AI 분석 실패', details: err?.message, useLocal: true },
      { status: 500 }
    );
  }
}
