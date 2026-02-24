/**
 * 관리자용: "치매검사보고서.pdf" 템플릿(1·2페이지) + 자동 생성된 3·4페이지 PDF를 합칩니다.
 *
 * 사용법:
 *   node scripts/merge-report-pdf.js <템플릿PDF경로> <3-4페이지PDF경로> <출력PDF경로>
 *
 * 예:
 *   node scripts/merge-report-pdf.js "C:\Documents\치매검사보고서.pdf" pages34.pdf "C:\output\홍길동_보고서.pdf"
 *
 * 3·4페이지 PDF는 서버 API로 받아서 저장한 파일을 사용합니다.
 *   POST /api/generate-report-pages-3-4  (body: 보고서 JSON) → 응답을 파일로 저장 후 이 스크립트에 넘기면 됩니다.
 */
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error(`
사용법: node scripts/merge-report-pdf.js <템플릿PDF> <3-4페이지PDF> <출력경로>

  템플릿PDF     : 참고용 치매검사보고서.pdf (1·2페이지 + 5페이지 이후 사용)
  3-4페이지PDF  : API /api/generate-report-pages-3-4 로 받은 2페이지 PDF
  출력경로      : 합쳐서 저장할 최종 PDF 경로

예: node scripts/merge-report-pdf.js "C:\\Documents\\치매검사보고서.pdf" ./pages34.pdf ./result.pdf
`);
    process.exit(1);
  }

  const [templatePath, pages34Path, outputPath] = args;

  if (!fs.existsSync(templatePath)) {
    console.error('오류: 템플릿 PDF 파일을 찾을 수 없습니다.', templatePath);
    process.exit(1);
  }
  if (!fs.existsSync(pages34Path)) {
    console.error('오류: 3·4페이지 PDF 파일을 찾을 수 없습니다.', pages34Path);
    process.exit(1);
  }

  const templateBuf = fs.readFileSync(templatePath);
  const pages34Buf = fs.readFileSync(pages34Path);

  const templateDoc = await PDFDocument.load(templateBuf);
  const pages34Doc = await PDFDocument.load(pages34Buf);

  const templatePageCount = templateDoc.getPageCount();
  const pages34PageCount = pages34Doc.getPageCount();

  if (pages34PageCount < 2) {
    console.error('오류: 3·4페이지 PDF는 최소 2페이지여야 합니다. (현재:', pages34PageCount, '페이지)');
    process.exit(1);
  }

  const outDoc = await PDFDocument.create();

  // 템플릿 1·2페이지 (인덱스 0, 1)
  const templateFirst = await outDoc.copyPages(templateDoc, [0, 1]);
  templateFirst.forEach((p) => outDoc.addPage(p));

  // 자동 생성 3·4페이지
  const generated = await outDoc.copyPages(pages34Doc, [0, 1]);
  generated.forEach((p) => outDoc.addPage(p));

  // 템플릿 5페이지~끝 (인덱스 4부터. 3·4번은 우리가 만든 걸로 채우므로 건너뜀)
  if (templatePageCount > 4) {
    const rest = Array.from({ length: templatePageCount - 4 }, (_, i) => i + 4);
    const restPages = await outDoc.copyPages(templateDoc, rest);
    restPages.forEach((p) => outDoc.addPage(p));
  }

  const outBuf = await outDoc.save();
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, outBuf);

  console.log('저장 완료:', path.resolve(outputPath));
  console.log('구성: 템플릿 1·2페이지 + 생성 3·4페이지 + 템플릿 5~' + templatePageCount + '페이지 (3·4번은 생성분으로 대체)');
}

main().catch((err) => {
  console.error('실행 오류:', err);
  process.exit(1);
});
