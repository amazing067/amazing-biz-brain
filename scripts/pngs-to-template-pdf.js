/**
 * 치매검사보고서 (1).png ~ (16).png 처럼 번호 순으로 된 PNG들을
 * 한 개의 템플릿 PDF로 합쳐서 public/templates/치매검사보고서.pdf 로 저장합니다.
 * 이 PDF를 두면 고객 신청 시 "1·2 + 자동 3·4 + 5~16" 합친 전체 PDF가 메일로 발송됩니다.
 *
 * 사용법:
 *   node scripts/pngs-to-template-pdf.js [PNG들이 있는 폴더 경로] [출력 PDF 경로(선택)]
 *
 * 예:
 *   node scripts/pngs-to-template-pdf.js "C:\Users\ok\Desktop\치매검사보고서"
 *   node scripts/pngs-to-template-pdf.js "C:\폴더" "C:\output\치매검사보고서.pdf"
 */
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// 파일명에서 페이지 번호 추출 (예: "치매검사보고서 (3).png" -> 3)
function getPageNumber(filePath) {
  const name = path.basename(filePath, path.extname(filePath));
  const match = name.match(/\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : NaN;
}

async function main() {
  const args = process.argv.slice(2);
  const inputDir = args[0] || path.join(process.cwd(), 'public', 'templates', 'pngs');
  const outputPath = args[1] || path.join(process.cwd(), 'public', 'templates', '치매검사보고서.pdf');

  if (!fs.existsSync(inputDir)) {
    console.error('오류: 입력 폴더를 찾을 수 없습니다.', inputDir);
    console.error('사용법: node scripts/pngs-to-template-pdf.js [PNG폴더경로] [출력PDF경로]');
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
    .map((f) => path.join(inputDir, f))
    .filter((f) => fs.statSync(f).isFile());

  const withNumbers = files.map((f) => ({ path: f, num: getPageNumber(f) }));
  withNumbers.sort((a, b) => {
    if (Number.isNaN(a.num) && Number.isNaN(b.num)) return a.path.localeCompare(b.path);
    if (Number.isNaN(a.num)) return 1;
    if (Number.isNaN(b.num)) return -1;
    return a.num - b.num;
  });

  const sorted = withNumbers.map((x) => x.path).filter((f) => /\.png$/i.test(path.basename(f)));
  if (sorted.length === 0) {
    console.error('오류: PNG 파일을 찾을 수 없습니다.', inputDir);
    process.exit(1);
  }

  console.log('총', sorted.length, '개 PNG 사용:', sorted.map((f) => path.basename(f)).join(', '));

  const doc = await PDFDocument.create();

  for (const pngPath of sorted) {
    const buf = fs.readFileSync(pngPath);
    const img = await doc.embedPng(buf);
    const { width: iw, height: ih } = img.scale(1);
    // A4 비율에 맞춰 페이지 추가 (세로)
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = doc.addPage([pageWidth, pageHeight]);
    const scale = Math.min(pageWidth / iw, pageHeight / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (pageWidth - w) / 2;
    const y = pageHeight - h - (pageHeight - h) / 2;
    page.drawImage(img, { x, y: pageHeight - h, width: w, height: h });
  }

  const outBuf = await doc.save();
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, outBuf);

  console.log('저장 완료:', path.resolve(outputPath));
  console.log('이제 고객 신청 시 이 템플릿 + 3·4페이지가 합쳐져 메일로 발송됩니다.');
}

main().catch((err) => {
  console.error('실행 오류:', err);
  process.exit(1);
});
