/**
 * JSON(보고서 데이터) + content/report-content.json → 부가 설명 PNG
 * 분석(월보험료 예상, 다음 단계, 문제 영역)을 포함해 이미지로 뽑음.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateExplanationPng, type ReportContent } from '../../../lib/report-images';
import { analyzeReport, getCostBreakdownExplanationShort, enrichProblemAreasWithConcreteTips } from '../../../lib/report-analysis';

export const maxDuration = 60;

function loadReportContent(): ReportContent | null {
  try {
    const path = join(process.cwd(), 'content', 'report-content.json');
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as ReportContent;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = body?.data != null ? body.data : body;
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: '보고서 데이터가 필요합니다.', details: 'data 또는 body에 유효한 JSON 객체를 넣어주세요.' },
        { status: 400 }
      );
    }
    const contentOverride: ReportContent | undefined =
      body.stageDescriptions != null || body.extraSections != null
        ? {
            stageDescriptions: body.stageDescriptions,
            extraSections: body.extraSections,
          }
        : undefined;

    let content = contentOverride ?? loadReportContent();
    const analysis = analyzeReport(data);
    const ai = body.analysisResult as Record<string, unknown> | undefined;
    const useAi = ai && (typeof ai.monthlyPremiumRecommend === 'string' || Array.isArray(ai.nextSteps));

    const monthlyText = useAi && typeof ai.monthlyPremiumRecommend === 'string'
      ? String(ai.monthlyPremiumRecommend)
      : String(analysis.monthlyPremiumRecommend ?? '');
    const nextStepsText = useAi && Array.isArray(ai.nextSteps)
      ? (ai.nextSteps as string[]).filter(Boolean).join('\n')
      : (analysis.nextSteps ?? []).filter(Boolean).join('\n') || '-';
    const problemAreasRaw = useAi && Array.isArray(ai.problemAreas)
      ? (ai.problemAreas as string[]).filter(Boolean)
      : (analysis.problemAreas ?? []).filter(Boolean);
    const problemAreasEnriched = enrichProblemAreasWithConcreteTips(problemAreasRaw);
    const problemAreasText = problemAreasEnriched.join('\n');

    const analysisSections: Array<{ title: string; body: string }> = [
      { title: '월 예상 비용 부가설명', body: String(getCostBreakdownExplanationShort(data) ?? '') },
      { title: '월 보험료 예상 (참고)', body: monthlyText },
      { title: '다음에 할 일', body: nextStepsText },
    ];
    if (problemAreasText) {
      analysisSections.push({ title: '점검해볼 부분', body: problemAreasText });
    }

    const part = body.part === 1 || body.part === 2 || body.part === 3 ? body.part : undefined;
    const userName = (data?.userName || '고객').toString();
    const disclaimerTitles = ['이 검사에 대해', '주의사항'];
    const baseExtra = content?.extraSections ?? [];
    const disclaimerFromContent = baseExtra
      .filter((s: { title?: string; body?: string }) => disclaimerTitles.includes(String(s?.title ?? '')))
      .map((s: { body?: string }) => String(s?.body ?? '').trim())
      .filter(Boolean)
      .join(' ');
    const defaultDisclaimer = '본 검사는 다수의 치매·인지 검사 항목을 기반으로 구성되었으며, 점수·해석은 검사 규준·매뉴얼 및 의료진 해석에 맞춰 안내합니다. 선별 목적이며 확진이 아닙니다. 결과는 참고용이며, 진단·치료를 대체하지 않습니다.';
    const disclaimerText = disclaimerFromContent || defaultDisclaimer;

    if (part === 1) {
      content = {
        ...content,
        stageDescriptions: content?.stageDescriptions,
        extraSections: [analysisSections[0]],
        pageTitle: '비용·보험료 요약',
        pageSubtitle: `${userName} 님 월 예상 비용 · 권장 보험료`,
        showStagePill: false,
        disclaimerText,
      };
    } else if (part === 2) {
      const part2Sections: Array<{ title: string; body: string }> = [];
      const ageContext = (ai?.ageContext != null ? String(ai.ageContext) : analysis.ageContext)?.trim();
      const dementiaRiskNote = (ai?.dementiaRiskNote != null ? String(ai.dementiaRiskNote) : analysis.dementiaRiskNote)?.trim();
      const oneActionThisMonth = (ai?.oneActionThisMonth != null ? String(ai.oneActionThisMonth) : analysis.oneActionThisMonth)?.trim();
      if (ageContext) part2Sections.push({ title: '동일 나이대 인지 위치', body: ageContext });
      if (dementiaRiskNote) part2Sections.push({ title: '치매·인지 위험 해석', body: dementiaRiskNote });
      if (oneActionThisMonth) part2Sections.push({ title: '이번 달 한 가지 행동', body: oneActionThisMonth });
      content = {
        ...content,
        stageDescriptions: content?.stageDescriptions,
        extraSections: part2Sections,
        pageTitle: '분석 결과',
        pageSubtitle: `${userName} 님 · 인지 위치·위험 해석`,
        showStagePill: true,
        disclaimerText: '',
        problemAreaCount: problemAreasEnriched.length,
      };
    } else if (part === 3) {
      const part3Sections: Array<{ title: string; body: string }> = [];
      part3Sections.push(analysisSections[2]);
      if (analysisSections[3]) part3Sections.push(analysisSections[3]);
      content = {
        ...content,
        stageDescriptions: content?.stageDescriptions,
        extraSections: part3Sections,
        pageTitle: '다음 단계',
        pageSubtitle: `${userName} 님 · 할 일·점검 영역`,
        showStagePill: false,
        disclaimerText: '',
      };
    } else {
      content = {
        ...content,
        extraSections: [...(content?.extraSections ?? []), ...analysisSections],
      };
    }
    const png = await generateExplanationPng(data, content ?? undefined);

    const date = new Date().toISOString().split('T')[0];
    const suffix = part === 1 ? '_1_비용보험료' : part === 2 ? '_2_분석결과' : part === 3 ? '_3_다음단계' : '';
    const rawName = data?.userName ? `explanation_${data.userName}_${date}${suffix}.png` : `explanation_${date}${suffix}.png`;
    const name = rawName.replace(/[^\x00-\x7F]/g, '_');

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch (e: unknown) {
    const err = e as Error;
    const msg = err?.message ?? String(e);
    const isChromeMissing = /Could not find Chrome|Failed to launch|Executable doesn't exist|no such file.*chrome/i.test(msg);
    if (isChromeMissing) {
      return NextResponse.json(
        { error: '이 환경에서는 Chrome을 사용할 수 없어 이미지 생성이 불가합니다. 로컬 또는 Chrome 설치된 서버에서 이용해 주세요.', code: 'CHROME_UNAVAILABLE' },
        { status: 503 }
      );
    }
    console.error('[generate-report-explanation-image]', e);
    return NextResponse.json(
      { error: '부가 설명 이미지 생성 실패', details: msg },
      { status: 500 }
    );
  }
}
