'use client';

import { useState, useEffect } from 'react';
import { analyzeReport, getCostBreakdownText, type ReportAnalysis } from '../../lib/report-analysis';

/**
 * 관리자용: 이메일로 받은 "보고서 데이터 JSON" 파일을 넣으면
 * 3·4페이지 PDF(치매 점수 결과 및 분석 / 예상비용)를 만들어 다운로드합니다.
 * 신청한 사람 목록은 data/applicants.json 에 저장되며 여기서 조회·다운로드할 수 있습니다.
 */
type InputMode = 'file' | 'paste';

export default function AdminReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [pastedJson, setPastedJson] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [applicantsList, setApplicantsList] = useState<Record<string, unknown>[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReportAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const load = async () => {
      setListLoading(true);
      try {
        const res = await fetch('/api/applicants-list');
        const data = await res.json();
        setApplicantsList(Array.isArray(data) ? data : []);
      } catch {
        setApplicantsList([]);
      } finally {
        setListLoading(false);
      }
    };
    load();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setStatus('idle');
    setMessage('');
    setAnalysisResult(null);
  };

  const acceptFile = (f: File | null): boolean => {
    if (!f) return false;
    const name = f.name.toLowerCase();
    const type = (f.type || '').toLowerCase();
    return name.endsWith('.json') || type === 'application/json';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!acceptFile(dropped)) {
      setMessage('JSON 파일(.json)만 넣어 주세요.');
      return;
    }
    setFile(dropped);
    setStatus('idle');
    setMessage('');
    setAnalysisResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const dateFromHeader = (fromHeader: string) =>
    fromHeader.replace(/^report_full_|^report_3-4_|^report_|^diagram_|^cost_analysis_|^explanation_|\.(pdf|png)$/g, '').trim() || new Date().toISOString().split('T')[0];

  /** 현재 입력(파일 또는 붙여넣기)에서 보고서 데이터 가져오기 */
  const getReportData = async (): Promise<Record<string, unknown> | null> => {
    if (inputMode === 'file') {
      if (!file) {
        setMessage('JSON 파일을 선택해 주세요.');
        return null;
      }
      try {
        const text = await file.text();
        return JSON.parse(text) as Record<string, unknown>;
      } catch (e: unknown) {
        setMessage('JSON 파일 형식이 올바르지 않습니다.');
        return null;
      }
    }
    const raw = pastedJson.trim();
    if (!raw) {
      setMessage('JSON을 붙여넣어 주세요.');
      return null;
    }
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      setMessage('붙여넣은 내용이 올바른 JSON이 아닙니다.');
      return null;
    }
  };

  const runAnalysis = async () => {
    const data = await getReportData();
    if (!data) return;
    setAnalysisLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/analyze-report-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json && (json.monthlyPremiumRecommend != null || json.nextSteps != null)) {
        setAnalysisResult(json as ReportAnalysis);
        setMessage('Gemini AI 분석 결과입니다.');
      } else {
        setAnalysisResult(analyzeReport(data));
        setMessage(res.status === 503 ? 'AI 분석은 API 키 미설정으로 비활성화되어 있습니다. 로컬 분석 결과를 사용합니다.' : '');
      }
    } catch {
      setAnalysisResult(analyzeReport(data));
      setMessage('');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const hasReportData = (): boolean => {
    if (inputMode === 'file') return !!file;
    try {
      const raw = pastedJson.trim();
      if (!raw) return false;
      JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  };

  const runGenerate = async (
    apiPath: string,
    defaultName: string,
    ext: 'pdf' | 'png' = 'pdf',
    extraBody?: Record<string, unknown>,
    downloadName?: (data: Record<string, unknown>) => string
  ) => {
    const data = await getReportData();
    if (!data) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extraBody ? { ...data, ...extraBody } : data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || `서버 오류 ${res.status}`);
      }
      const blob = await res.blob();
      const fromHeader = res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || '';
      const date = dateFromHeader(fromHeader);
      const suggestedName = downloadName
        ? downloadName(data)
        : data?.userName
          ? `치매검사보고서_${data.userName}_${date}.${ext}`
          : (fromHeader || defaultName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('done');
      setMessage(ext === 'png' ? '이미지 다운로드가 시작되었습니다.' : 'PDF 다운로드가 시작되었습니다.');
    } catch (e: unknown) {
      setStatus('error');
      setMessage((e as Error)?.message || (ext === 'png' ? '이미지 생성에 실패했습니다.' : 'PDF 생성에 실패했습니다.'));
    }
  };

  const name = (d: Record<string, unknown>) => (d?.userName ? String(d.userName) : '고객');

  const handleDiagramPng = () =>
    runGenerate('/api/generate-report-diagram-image', 'diagram.png', 'png', undefined, (d) => `${name(d)}_다이어그램.png`);
  const handleCostPng = () =>
    runGenerate('/api/generate-report-cost-image', 'cost_analysis.png', 'png', undefined, (d) => `${name(d)}_월예상금액.png`);
  const handleExplanationPng1 = () =>
    runGenerate(
      '/api/generate-report-explanation-image',
      'explanation_1.png',
      'png',
      { part: 1, ...(analysisResult ? { analysisResult } : {}) },
      (d) => `${name(d)}_부가설명_1.png`
    );
  const handleExplanationPng2 = () =>
    runGenerate(
      '/api/generate-report-explanation-image',
      'explanation_2.png',
      'png',
      { part: 2, ...(analysisResult ? { analysisResult } : {}) },
      (d) => `${name(d)}_부가설명_2.png`
    );

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    const data = await getReportData();
    if (!data) return;
    const userName = name(data);
    setStatus('loading');
    setMessage('AI 분석 중…');
    try {
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let analysisResultForDownload: Record<string, unknown> | null = null;
      try {
        const resAnalyze = await fetch('/api/analyze-report-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (resAnalyze.ok) {
          const json = await resAnalyze.json();
          if (json.monthlyPremiumRecommend != null || json.nextSteps != null) analysisResultForDownload = json;
        }
      } catch {
        // 분석 실패 시 로컬 분석으로 PNG 생성
      }

      setMessage('다이어그램 생성 중…');
      let res = await fetch('/api/generate-report-diagram-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '다이어그램 생성 실패');
      }
      triggerDownload(await res.blob(), `${userName}_다이어그램.png`);
      await delay(400);

      setMessage('월 예상 금액 생성 중…');
      res = await fetch('/api/generate-report-cost-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '월 예상 금액 생성 실패');
      }
      triggerDownload(await res.blob(), `${userName}_월예상금액.png`);
      await delay(400);

      setMessage('부가설명 1 생성 중…');
      res = await fetch('/api/generate-report-explanation-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, part: 1, ...(analysisResultForDownload ? { analysisResult: analysisResultForDownload } : {}) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '부가설명 1 생성 실패');
      }
      triggerDownload(await res.blob(), `${userName}_부가설명_1.png`);
      await delay(400);

      setMessage('부가설명 2 생성 중…');
      res = await fetch('/api/generate-report-explanation-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, part: 2, ...(analysisResultForDownload ? { analysisResult: analysisResultForDownload } : {}) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '부가설명 2 생성 실패');
      }
      triggerDownload(await res.blob(), `${userName}_부가설명_2.png`);

      setStatus('done');
      setMessage(analysisResultForDownload ? '4개 이미지 다운로드 완료 (AI 분석 반영).' : '4개 이미지 다운로드 완료.');
    } catch (e: unknown) {
      setStatus('error');
      setMessage((e as Error)?.message || '전체 다운로드 중 오류가 발생했습니다.');
    }
  };

  const downloadApplicantsJson = () => {
    const blob = new Blob([JSON.stringify(applicantsList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `신청목록_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshApplicantsList = async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/applicants-list');
      const data = await res.json();
      setApplicantsList(Array.isArray(data) ? data : []);
    } catch {
      setApplicantsList([]);
    } finally {
      setListLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 신청 목록 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">신청한 사람 목록</h2>
            </div>
            <button
              type="button"
              onClick={() => document.querySelector('[data-section="report"]')?.scrollIntoView({ behavior: 'smooth' })}
              className="shrink-0 py-2 px-3 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              밑으로 가기 ↓
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={refreshApplicantsList}
              disabled={listLoading}
              className="py-2 px-4 bg-slate-200 text-slate-800 font-medium rounded-lg text-sm disabled:opacity-50"
            >
              {listLoading ? '불러오는 중…' : '목록 새로고침'}
            </button>
            <button
              type="button"
              onClick={downloadApplicantsJson}
              disabled={applicantsList.length === 0}
              className="py-2 px-4 bg-slate-700 text-white font-medium rounded-lg text-sm disabled:opacity-50"
            >
              JSON 파일로 다운로드
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">신청 일시</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">이름</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">연락처</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">점수</th>
                  <th className="py-2 px-3 font-semibold text-gray-700 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {applicantsList.length === 0 && !listLoading && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">저장된 신청이 없습니다.</td></tr>
                )}
                {[...applicantsList].reverse().map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600">{(row.appliedAt as string)?.replace('T', ' ').slice(0, 19) ?? '-'}</td>
                    <td className="py-2 px-3 font-medium">{(row.userName as string) ?? '-'}</td>
                    <td className="py-2 px-3">{(row.phoneNumber as string) ?? '-'}</td>
                    <td className="py-2 px-3 text-right">{(row.total as number) ?? '-'}점</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setInputMode('paste');
                          const obj = { ...row } as Record<string, unknown>;
                          if (obj.costBreakdown == null) obj.costBreakdown = getCostBreakdownText(obj);
                          setPastedJson(JSON.stringify(obj, null, 2));
                          setMessage('');
                          document.querySelector('[data-section="report"]')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        바로 넣기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8" data-section="report">
        <h1 className="text-xl font-bold text-gray-800 mb-2">보고서·이미지 만들기</h1>
        <p className="text-sm text-gray-500 mb-4">
          <strong>파일 선택</strong> 또는 <strong>JSON 바로 넣기</strong> 후 PDF·이미지를 만드세요.
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setInputMode('file'); setMessage(''); }}
            className={`py-2 px-4 rounded-lg text-sm font-medium ${inputMode === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            파일 선택
          </button>
          <button
            type="button"
            onClick={() => { setInputMode('paste'); setMessage(''); }}
            className={`py-2 px-4 rounded-lg text-sm font-medium ${inputMode === 'paste' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            JSON 바로 넣기
          </button>
        </div>

        {inputMode === 'file' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">보고서 데이터 JSON 파일</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
            >
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="report-json-file"
              />
              <label htmlFor="report-json-file" className="cursor-pointer block">
                {file ? (
                  <>
                    <p className="text-sm font-medium text-gray-800">선택된 파일: {file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">클릭하면 다른 파일 선택</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-1">클릭해서 선택하거나, JSON 파일을 여기에 놓으세요</p>
                    <p className="text-xs text-gray-500">.json 또는 application/json</p>
                  </>
                )}
              </label>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">보고서 데이터 JSON 붙여넣기</label>
            <textarea
              value={pastedJson}
              onChange={(e) => { setPastedJson(e.target.value); setStatus('idle'); setMessage(''); setAnalysisResult(null); }}
              placeholder='{"userName":"홍길동","phoneNumber":"010-0000-0000","total":75,...}'
              className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-y"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-gray-500">이메일 첨부 JSON 또는 신청 목록에서 복사한 항목을 그대로 붙여넣으면 됩니다.</p>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!hasReportData() || analysisLoading}
            className="py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analysisLoading ? '분석 중…' : '분석 보기'}
          </button>
          {analysisResult && (
            <span className="text-sm text-gray-500">
              {analysisResult.stageLabel} · {analysisResult.total}점
              {message && ` · ${message}`}
            </span>
          )}
        </div>

        {analysisResult && (
          <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <h3 className="font-bold text-slate-800">분석 결과</h3>
            {analysisResult.ageContext && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">동일 나이대 인지 위치</p>
                <p className="text-sm text-slate-800">{analysisResult.ageContext}</p>
              </div>
            )}
            {analysisResult.dementiaRiskNote && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">치매·인지 위험 해석</p>
                <p className="text-sm text-slate-800">{analysisResult.dementiaRiskNote}</p>
              </div>
            )}
            {analysisResult.oneActionThisMonth && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs font-semibold text-indigo-700 mb-1">이번 달 한 가지 행동</p>
                <p className="text-sm text-slate-800 font-medium">{analysisResult.oneActionThisMonth}</p>
              </div>
            )}
            {analysisResult.costBreakdown && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">월 예상 비용 요약 (2026·10년후·상세·안내)</p>
                <pre className="text-sm text-slate-800 whitespace-pre-line font-sans bg-slate-100 p-3 rounded-lg overflow-x-auto">{analysisResult.costBreakdown}</pre>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">월 보험료 예상 (참고)</p>
              <p className="text-sm text-slate-800">{analysisResult.monthlyPremiumRecommend}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">다음에 할 일</p>
              <ul className="list-disc list-inside text-sm text-slate-800 space-y-0.5">
                {analysisResult.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
            {analysisResult.problemAreas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">점검해볼 부분</p>
                <ul className="list-disc list-inside text-sm text-slate-800 space-y-0.5">
                  {analysisResult.problemAreas.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">{analysisResult.summary}</p>
            {(() => {
              const u = (analysisResult as Record<string, unknown>).usage as { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
              if (!u) return null;
              return (
                <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 mt-2">
                  토큰: 입력 {u.promptTokenCount ?? 0} · 출력 {u.candidatesTokenCount ?? 0} · 합계 {u.totalTokenCount ?? 0}
                </p>
              );
            })()}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700 mb-2">이미지 (PNG) — 리포터용</p>
          <p className="text-xs text-gray-500 mb-2">데이터 JSON 선택 후 필요한 이미지를 뽑아, 워드/한글 등에서 리포터를 따로 만드세요. 다운로드 시 파일명은 「이름_다이어그램」「이름_월예상금액」「이름_부가설명_1」「이름_부가설명_2」로 저장됩니다.</p>
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={!hasReportData() || status === 'loading'}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm mb-3 hover:bg-blue-700"
          >
            전체 다운로드 (다이어그램 + 월예상금액 + 부가설명 1·2)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDiagramPng}
              disabled={!hasReportData() || status === 'loading'}
              className="py-2.5 px-4 bg-emerald-100 text-emerald-800 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              다이어그램 PNG
            </button>
            <button
              type="button"
              onClick={handleCostPng}
              disabled={!hasReportData() || status === 'loading'}
              className="py-2.5 px-4 bg-amber-100 text-amber-800 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              월 예상 금액 PNG
            </button>
            <button
              type="button"
              onClick={handleExplanationPng1}
              disabled={!hasReportData() || status === 'loading'}
              className="py-2.5 px-4 bg-violet-100 text-violet-800 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              부가설명 PNG (1) 비용·보험료
            </button>
            <button
              type="button"
              onClick={handleExplanationPng2}
              disabled={!hasReportData() || status === 'loading'}
              className="py-2.5 px-4 bg-violet-100 text-violet-800 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              부가설명 PNG (2) 분석·다음단계
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">부가설명 1장=비용·보험료, 2장=다음 단계·주의사항. <strong>분석 보기</strong>를 먼저 실행하면 화면에 나온 AI 분석 결과가 그대로 부가설명 PNG(1·2)에 반영됩니다. <strong>전체 다운로드</strong>는 자동으로 AI 분석을 호출한 뒤 같은 내용으로 PNG를 뽑습니다.</p>

          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
              {message}
            </p>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500">
          <p className="font-medium text-gray-700 mb-2">리포터 만드는 흐름</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>이메일로 받은 <strong>치매검사보고서_이름_날짜_데이터.json</strong> 을 여기서 선택 (드래그 앤 드롭 가능)</li>
            <li><strong>다이어그램 PNG</strong> · <strong>월 예상 금액 PNG</strong> · <strong>부가설명 PNG (1) 비용·보험료</strong> · <strong>부가설명 PNG (2) 분석·다음단계</strong> 를 각각 뽑아 다운로드</li>
            <li>워드/한글/디자인 툴에서 위 이미지 + 필요한 텍스트를 붙여 고객 전달용 리포터 제작</li>
          </ol>
          <p className="font-medium text-gray-700 mt-3 mb-1">부가 설명 문구 수정</p>
          <p><code className="bg-gray-100 px-1">content/report-content.json</code> 에서 단계별 해석·추가 섹션을 수정하면, 다음에 부가 설명 PNG 뽑을 때 반영됩니다.</p>
          <p className="font-medium text-gray-700 mt-3 mb-1">이미지</p>
          <p>다이어그램·월 예상 금액·부가 설명 PNG만 생성합니다.</p>
        </div>
        </div>
      </div>
    </div>
  );
}
