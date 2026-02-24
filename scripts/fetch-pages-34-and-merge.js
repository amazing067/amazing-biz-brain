/**
 * 관리자용: 보고서 JSON 파일로 3·4페이지 PDF를 받아서, 템플릿과 합칩니다.
 *
 * 사용법:
 *   node scripts/fetch-pages-34-and-merge.js <보고서JSON경로> <템플릿PDF경로> [출력PDF경로] [--api URL]
 *
 * 예 (서버가 http://localhost:3100 에서 실행 중일 때):
 *   node scripts/fetch-pages-34-and-merge.js report-data.json "C:\Documents\치매검사보고서.pdf" result.pdf
 *   node scripts/fetch-pages-34-and-merge.js report-data.json template.pdf result.pdf --api https://내도메인.com
 *
 * 보고서 JSON: 이메일로 보내는 것과 같은 형식 (total, grade, categoryScores, futureSelfPay 등)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const apiIdx = args.indexOf('--api');
const apiBase = apiIdx >= 0 && args[apiIdx + 1] ? args[apiIdx + 1] : 'http://localhost:3100';
if (apiIdx >= 0) args.splice(apiIdx, 2);

if (args.length < 2) {
  console.error(`
사용법: node scripts/fetch-pages-34-and-merge.js <보고서JSON> <템플릿PDF> [출력PDF] [--api URL]

  보고서JSON : API에 보낼 보고서 데이터 (이메일 첨부와 동일 형식)
  템플릿PDF : 참고용 치매검사보고서.pdf
  출력PDF   : 생략 시 "merged-report.pdf" 로 저장
  --api URL : 서버 주소 (기본: http://localhost:3100)
`);
  process.exit(1);
}

const [dataPath, templatePath, outputPath = 'merged-report.pdf'] = args;

if (!fs.existsSync(dataPath)) {
  console.error('오류: 보고서 JSON 파일을 찾을 수 없습니다.', dataPath);
  process.exit(1);
}
if (!fs.existsSync(templatePath)) {
  console.error('오류: 템플릿 PDF를 찾을 수 없습니다.', templatePath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const bodyStr = JSON.stringify(body);
    const req = (isHttps ? https : http).request(
      {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode !== 200) {
            reject(new Error(`API ${res.statusCode}: ${buf.toString().slice(0, 200)}`));
            return;
          }
          resolve(buf);
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const url = `${apiBase.replace(/\/$/, '')}/api/generate-report-pages-3-4`;
  console.log('3·4페이지 요청 중:', url);
  const pages34Buf = await post(url, data);
  const pages34Path = path.join(path.dirname(outputPath), 'temp-pages-34.pdf');
  fs.mkdirSync(path.dirname(path.resolve(pages34Path)) || '.', { recursive: true });
  fs.writeFileSync(pages34Path, pages34Buf);
  console.log('3·4페이지 저장:', pages34Path);

  const { PDFDocument } = require('pdf-lib');
  const templateBuf = fs.readFileSync(templatePath);
  const templateDoc = await PDFDocument.load(templateBuf);
  const pages34Doc = await PDFDocument.load(pages34Buf);
  const templatePageCount = templateDoc.getPageCount();

  const outDoc = await PDFDocument.create();
  const [p0, p1] = await outDoc.copyPages(templateDoc, [0, 1]);
  outDoc.addPage(p0);
  outDoc.addPage(p1);
  const [g0, g1] = await outDoc.copyPages(pages34Doc, [0, 1]);
  outDoc.addPage(g0);
  outDoc.addPage(g1);
  if (templatePageCount > 2) {
    const rest = Array.from({ length: templatePageCount - 2 }, (_, i) => i + 2);
    const restPages = await outDoc.copyPages(templateDoc, rest);
    restPages.forEach((p) => outDoc.addPage(p));
  }

  const outBuf = await outDoc.save();
  const outFull = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(outFull) || '.', { recursive: true });
  fs.writeFileSync(outFull, outBuf);
  try { fs.unlinkSync(pages34Path); } catch (_) {}

  console.log('저장 완료:', outFull);
}

main().catch((err) => {
  console.error('오류:', err.message);
  process.exit(1);
});
