/**
 * 3·4페이지 PDF 생성 API 테스트
 * - 서버가 http://localhost:3100 에서 실행 중이어야 합니다.
 *
 * 사용법:
 *   node scripts/test-fetch-pages-34.js
 *   node scripts/test-fetch-pages-34.js [저장할파일명.pdf]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const apiUrl = 'http://localhost:3100';
const outFile = process.argv[2] || 'test-pages-34.pdf';
const dataPath = path.join(__dirname, 'sample-report-data.json');

if (!fs.existsSync(dataPath)) {
  console.error('오류: scripts/sample-report-data.json 파일이 없습니다.');
  process.exit(1);
}

const data = fs.readFileSync(dataPath, 'utf8');

const u = new URL(apiUrl + '/api/generate-report-pages-3-4');
const req = http.request(
  {
    hostname: u.hostname,
    port: u.port || 80,
    path: u.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (res.statusCode !== 200) {
        console.error('API 오류:', res.statusCode, buf.toString().slice(0, 300));
        process.exit(1);
      }
      const full = path.resolve(outFile);
      fs.writeFileSync(full, buf);
      console.log('저장 완료:', full);
      console.log('3페이지: 치매 점수 결과 및 분석 (육각형 다이어그램)');
      console.log('4페이지: 예상비용 (세부 금액)');
    });
  }
);
req.on('error', (e) => {
  console.error('연결 실패. 서버가 실행 중인지 확인하세요: npm run dev');
  console.error(e.message);
  process.exit(1);
});
req.write(data);
req.end();
