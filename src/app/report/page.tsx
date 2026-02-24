'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

type ReportData = {
  total: number;
  grade: string;
  limitAmount: number;
  status: string;
  careType: string;
  realGovSupport: number;
  coPay: number;
  nonCoveredCost: number;
  finalSelfPay: number;
  futureTotalCost: number;
  futureGovSupport: number;
  futureSelfPay: number;
  futureDetails: { caregiver: number; medical: number; living: number };
  categoryScores: Record<string, { score: number; max: number; percent: number }>;
  familyWarning?: string;
  userName?: string;
};

function base64UrlDecode(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return '';
  }
}

function ReportPageContent() {
  const searchParams = useSearchParams();
  const [printMode, setPrintMode] = useState(false);

  const data = useMemo((): ReportData | null => {
    const d = searchParams.get('d');
    if (!d) return null;
    try {
      const json = base64UrlDecode(d);
      return JSON.parse(json) as ReportData;
    } catch {
      return null;
    }
  }, [searchParams]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <p className="text-gray-600 mb-2">유효하지 않은 보고서 링크이거나 만료되었습니다.</p>
          <a href="/" className="text-blue-600 underline">홈으로 이동</a>
        </div>
      </div>
    );
  }

  const categories = Object.entries(data.categoryScores || {}).filter(([, v]) => v.max > 0);
  const n = categories.length || 1;
  const cx = 160; const cy = 160; const maxR = 120;
  const axisPoints = categories.map(([cat], i) => {
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
  const polygonPoints = axisPoints.map(p => `${p.x},${p.y}`).join(' ');
  const axisLines = categories.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle), label: categories[i][0] };
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-[800px] mx-auto p-6 space-y-8 print:p-0 print:space-y-0">
        {/* 인쇄 버튼 - 화면에서만 */}
        {!printMode && (
          <div className="flex justify-end gap-2 print:hidden sticky top-0 bg-white/95 py-2 z-10">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
            >
              🖨️ 인쇄 / PDF 저장
            </button>
            <a href="/" className="px-4 py-2 border border-gray-300 rounded-lg font-bold">홈으로</a>
          </div>
        )}

        {/* 1. 표지 */}
        <section className="border-b border-gray-200 pb-8 print:break-after-page">
          <h1 className="text-2xl font-black text-center text-gray-900 mb-2">치매검사 보고서</h1>
          <p className="text-center text-gray-500 text-sm">뇌 건강 검진 결과</p>
          <div className="mt-8 flex justify-center">
            <div className={`w-40 h-40 rounded-full border-8 flex flex-col items-center justify-center ${data.total >= 80 ? 'border-green-500' : 'border-red-500'}`}>
              <span className={`text-4xl font-black ${data.total >= 80 ? 'text-green-600' : 'text-red-600'}`}>{data.total}</span>
              <span className="text-sm font-bold text-gray-500">/ 100점</span>
            </div>
          </div>
          <p className="text-center font-bold text-gray-800 mt-4">{data.grade ? String(data.grade).split('(')[0].trim() : '-'}</p>
          <p className="text-center text-sm text-gray-500">({data.status ?? '-'})</p>
        </section>

        {/* 2. 영역별 점수 요약 */}
        <section className="print:break-inside-avoid">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">📊 영역별 상세 점수</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(([cat]) => {
              const s = data.categoryScores[cat];
              const percent = s?.percent ?? 0;
              return (
                <div key={cat} className="flex flex-col">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat}</span>
                    <span className={percent < 60 ? 'text-red-600 font-bold' : 'text-blue-600'}>{s?.score}점 / {s?.max}점</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${percent < 60 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. 인지 기능 프로필 (다이어그램) */}
        <section className="print:break-before-page print:break-after-page">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">📈 인지 기능 프로필 (다이어그램)</h2>
          <div className="flex justify-center">
            <svg viewBox="0 0 320 320" className="w-full max-w-[320px] h-auto">
              {[0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                <polygon
                  key={idx}
                  points={axisLines.map(({ x, y }) => `${cx + (x - cx) * ratio},${cy + (y - cy) * ratio}`).join(' ')}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}
              {axisLines.map((ap, i) => (
                <line key={i} x1={cx} y1={cy} x2={ap.x} y2={ap.y} stroke="#d1d5db" strokeWidth="1" />
              ))}
              <polygon points={polygonPoints} fill="rgba(59, 130, 246, 0.35)" stroke="#2563eb" strokeWidth="2" />
              {axisLines.map((ap, i) => {
                const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                const tx = cx + (maxR + 22) * Math.cos(angle);
                const ty = cy + (maxR + 22) * Math.sin(angle);
                return (
                  <text key={i} x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#374151" style={{ fontSize: 10, fontWeight: 600 }}>{ap.label}</text>
                );
              })}
            </svg>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">각 영역별 달성률(%) 기준</p>
        </section>

        {/* 4. 인지지원·비용 요약 */}
        <section className="print:break-before-page print:break-after-page">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">💰 인지지원·비용 요약</h2>
          <div className="bg-gray-50 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">예상 장기요양 등급</p>
                <p className="font-bold text-gray-900">{data.grade.split('(')[0].trim()}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 mb-1">인지지원(월 한도액)</p>
                <p className="font-bold text-blue-800">
                  {data.limitAmount > 0 ? `${(data.limitAmount / 10000).toFixed(0)}만원 (${data.limitAmount.toLocaleString()}원)` : '해당 없음 (등급 외)'}
                </p>
              </div>
            </div>
            <table className="w-full text-sm border-collapse border border-gray-200">
              <tbody>
                <tr className="bg-gray-100">
                  <td className="border border-gray-200 p-2 font-medium">현재(2026년) 월 본인 부담</td>
                  <td className="border border-gray-200 p-2 text-right font-bold text-red-600">{data.finalSelfPay.toLocaleString()}원</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-2 font-medium">10년 후(2036년) 예상 월 부담</td>
                  <td className="border border-gray-200 p-2 text-right font-bold text-red-700">
                    {data.futureSelfPay >= 10000 ? `${Math.round(data.futureSelfPay / 10000)}만원 (${data.futureSelfPay.toLocaleString()}원)` : `${data.futureSelfPay.toLocaleString()}원`}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-400">* 2026년 장기요양 수가 고시 및 물가상승률 반영</p>
          </div>
        </section>

        {/* 5. 2026년 / 2036년 비용 상세 */}
        <section className="print:break-inside-avoid">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">📊 비용 상세</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-bold text-blue-800 mb-1">2026년 월 예상</p>
              <p className="text-gray-700">국가 지원금(최대) {data.realGovSupport.toLocaleString()}원 / 본인 부담금 {data.finalSelfPay.toLocaleString()}원</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-bold text-red-800 mb-1">2036년 월 예상 (물가상승 반영)</p>
              <p className="text-gray-700">본인 부담금 약 {data.futureSelfPay >= 10000 ? `${Math.round(data.futureSelfPay / 10000)}만원` : `${data.futureSelfPay.toLocaleString()}원`}</p>
              {data.futureDetails && (
                <p className="text-xs text-gray-600 mt-1">
                  (간병비 {data.futureDetails.caregiver?.toLocaleString()}원 / 병원·시설 {data.futureDetails.medical?.toLocaleString()}원 / 식대·소모품 {data.futureDetails.living?.toLocaleString()}원)
                </p>
              )}
            </div>
            {data.familyWarning && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-bold text-amber-800 whitespace-pre-line">{data.familyWarning}</p>
              </div>
            )}
          </div>
        </section>

        {/* 푸터 */}
        <section className="pt-8 border-t border-gray-200 text-center text-xs text-gray-400 print:break-inside-avoid">
          <p>본 보고서는 뇌 건강 검진 결과를 바탕으로 작성되었습니다.</p>
          <p className="mt-1">치매검사.com</p>
        </section>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:break-after-page { page-break-after: always; }
          .print\\:break-before-page { page-break-before: always; }
          .print\\:break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    }>
      <ReportPageContent />
    </Suspense>
  );
}
