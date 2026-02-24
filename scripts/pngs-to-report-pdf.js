/**
 * 치매검사보고서 (1).png ~ (16).png 처럼 번호 순서의 PNG 16장을
 * 한 개의 템플릿 PDF로 합쳐서 public/templates/치매검사보고서.pdf 로 저장합니다.
 *
 * - 3·4번 페이지: 합칠 때 우리가 만든 3·4페이지로 대체되므로, 빈 PNG(흰 이미지)로 두어도 됩니다.
 * - PNG 넣을 폴더: 아무 경로나 가능. 예: public/templates/png 또는 바탕화면 폴더
 *
 * 사용법:
 *   node scripts/pngs-to-report-pdf.js [PNG들이 있는 폴더경로]
 *
 * 예: public/templates 아래에 png 폴더를 만들고 1~16번 PNG 넣은 경우
 *   npm run template:pdf -- "C:\Users\ok\amazing-biz-brain\public\templates\png"
 */
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

function findOrderedPngs(dir) {
  const fullPath = path.resolve(dir);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return null;
  }
  const files = fs.readdirSync(fullPath);
  const matched = files
    .filter((f) => /\.png$/i.test(f))
    .map((f) => {
      const m = f.match(/치매검사보고서\s*\((\d+)\)\.png/i) || f.match(/(\d+)\.png$/);
      const num = m ? parseInt(m[1], 10) : NaN;
      return { name: f, num, full: path.join(fullPath, f) };
    })
    .filter((x) => !Number.isNaN(x.num))
    .sort((a, b) => a.num - b.num);
  return matched.length ? matched : null;
}

async function main() {
  const dir = process.argv[2] || process.cwd();
  const pngs = findOrderedPngs(dir);
  if (!pngs || pngs.length === 0) {
    console.error('오류: PNG 파일을 찾을 수 없습니다.');
    console.error('  "치매검사보고서 (1).png" ~ "치매검사보고서 (16).png" 형식이거나, 폴더 안에 1.png ~ 16.png 형태로 넣어 주세요.');
    console.error('  사용법: node scripts/pngs-to-report-pdf.js [PNG폴더경로]');
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), 'public', 'templates');
  const outPath = path.join(outDir, '치매검사보고서.pdf');
  fs.mkdirSync(outDir, { recursive: true });

  const doc = await PDFDocument.create();

  for (const { full } of pngs) {
    const buf = fs.readFileSync(full);
    const img = await doc.embedPng(buf);
    const { width: iw, height: ih } = img.scale(1);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const scale = Math.min(pageWidth / iw, pageHeight / ih, 1);
    const w = iw * scale;
    const h = ih * scale;
    const x = (pageWidth - w) / 2;
    const y = pageHeight - h;
    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(img, { x, y: Math.max(0, y), width: w, height: h });
  }

  const pdfBytes = await doc.save();
  fs.writeFileSync(outPath, pdfBytes);

  console.log('저장 완료:', path.resolve(outPath));
  console.log('페이지 수:', pngs.length, '(파일:', pngs.map((p) => p.name).join(', '), ')');
}

main().catch((err) => {
  console.error('실행 오류:', err);
  process.exit(1);
});
