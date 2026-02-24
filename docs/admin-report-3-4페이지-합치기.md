# 관리자용: 치매검사 보고서 3·4페이지 자동 생성 및 합치기

이메일로 오는 PDF 대신, **참고용 치매검사보고서.pdf**의 1·2페이지는 그대로 두고 **3·4페이지만** 검진 데이터로 자동 만들어서 합치는 방법입니다.

---

## 🧪 테스트 방법 (바로 해보기)

### 1단계: 서버 실행

```bash
cd c:\Users\ok\amazing-biz-brain
npm run dev
```

브라우저에서 `http://localhost:3100` 이 뜨면 서버가 켜진 상태입니다.

### 2단계: 3·4페이지 PDF만 받기 (API 호출)

**샘플 데이터**가 `scripts/sample-report-data.json`에 있습니다. 아래 중 하나로 실행하세요.

**PowerShell:**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3100/api/generate-report-pages-3-4" -ContentType "application/json" -InFile "scripts/sample-report-data.json" -OutFile "test-pages-34.pdf"
```

**Node 스크립트 (추천):**
```bash
node scripts/test-fetch-pages-34.js
```
또는 저장 파일명 지정: `node scripts/test-fetch-pages-34.js 내보고서.pdf`

**curl (설치되어 있다면):**
```bash
curl -X POST http://localhost:3100/api/generate-report-pages-3-4 -H "Content-Type: application/json" -d "@scripts/sample-report-data.json" -o test-pages-34.pdf
```

실행 후 **`test-pages-34.pdf`** 파일이 생깁니다.  
- 1쪽: 치매 점수 결과 및 분석 (육각형 다이어그램 + 단계 해석)  
- 2쪽: 예상비용 (2026/2036 세부 금액)

### 3단계: 템플릿 PDF와 합치기 (선택)

참고용 치매검사보고서.pdf가 있다면:

```bash
node scripts/merge-report-pdf.js "C:\경로\치매검사보고서.pdf" test-pages-34.pdf result.pdf
```

또는 **JSON만 있으면** 한 번에 3·4 생성 + 합치기:

```bash
node scripts/fetch-pages-34-and-merge.js scripts/sample-report-data.json "C:\경로\치매검사보고서.pdf" result.pdf
```

(템플릿 PDF 없이 3·4페이지만 확인하려면 2단계만 하면 됩니다.)

---

## 흐름 요약

1. **데이터**: 치매검사 신청 시 이메일로 오는 PDF와 **같은 데이터**(보고서 JSON)를 준비합니다.
2. **3·4페이지 생성**: 서버 API에 그 JSON을 보내면 **2페이지만 담긴 PDF**(3페이지=다이어그램, 4페이지=비용 요약)를 받습니다.
3. **합치기**: 참고 PDF(1·2 + 5~끝) + 방금 받은 2페이지 → 순서대로 합쳐서 최종 보고서 PDF로 저장합니다.

---

## 방법 1: 한 번에 실행 (JSON + 템플릿 → 최종 PDF)

서버가 켜져 있을 때 (예: `npm run dev` → http://localhost:3100):

```bash
node scripts/fetch-pages-34-and-merge.js report-data.json "C:\경로\치매검사보고서.pdf" result.pdf
```

- `report-data.json`: 이메일 전송 시 쓰는 것과 같은 형식의 보고서 데이터 파일
- `치매검사보고서.pdf`: 참고용 템플릿 (1·2페이지 + 5페이지 이후 사용)
- `result.pdf`: 합쳐서 저장할 파일명 (생략 시 `merged-report.pdf`)

다른 서버 주소를 쓰려면:

```bash
node scripts/fetch-pages-34-and-merge.js report-data.json template.pdf result.pdf --api https://도메인.com
```

---

## 방법 2: API만 쓰고, 합치기는 별도 프로그램에서

### 1) 3·4페이지 PDF 받기

- **URL**: `POST /api/generate-report-pages-3-4`
- **Body**: JSON (이메일 보고서와 동일한 필드)
  - 예: `total`, `grade`, `limitAmount`, `status`, `careType`, `realGovSupport`, `coPay`, `nonCoveredCost`, `finalSelfPay`, `futureTotalCost`, `futureGovSupport`, `futureSelfPay`, `futureDetails`, `categoryScores`, `familyWarning`, `userName` 등
- **응답**: 2페이지 PDF 파일 (3페이지=인지 기능 프로필, 4페이지=인지지원·비용 요약)

예 (curl):

```bash
curl -X POST http://localhost:3100/api/generate-report-pages-3-4 -H "Content-Type: application/json" -d "@report-data.json" -o pages34.pdf
```

### 2) 템플릿과 합치기

3·4페이지 PDF를 받은 뒤, 관리자가 만든 프로그램에서:

1. 참고 PDF에서 1·2페이지 추출
2. 받은 PDF 2페이지를 그대로 3·4페이지로 사용
3. 참고 PDF 5페이지 이후 붙이기
4. 순서대로 합쳐서 저장

또는 이 프로젝트에 있는 스크립트 사용:

```bash
node scripts/merge-report-pdf.js "C:\경로\치매검사보고서.pdf" pages34.pdf result.pdf
```

---

## 보고서 JSON 데이터从哪里来?

- **옵션 A**: 이메일 전송 시 서버/관리자 쪽에서 같은 데이터를 JSON 파일로 저장해 두고, 그 파일을 `report-data.json`으로 사용.
- **옵션 B**: 나중에 웹에서 "보고서 데이터 다운로드" 버튼을 만들어서, 그때 받는 JSON을 저장해 두고 사용.

현재는 이메일 본문/첨부 PDF만 가므로, **데이터를 JSON으로 남기는 기능**을 추가하면 위 스크립트/API와 바로 연동할 수 있습니다.

---

## 요약

| 목적 | 사용할 것 |
|------|------------|
| 3·4페이지만 PDF로 받기 | `POST /api/generate-report-pages-3-4` + 보고서 JSON |
| JSON + 템플릿 → 한 번에 최종 PDF | `node scripts/fetch-pages-34-and-merge.js` |
| 3·4페이지 PDF만 이미 있을 때 합치기 | `node scripts/merge-report-pdf.js` |

템플릿 PDF(치매검사보고서.pdf)의 1·2페이지와 5페이지 이후는 그대로 두고, **3·4페이지만** 검진 결과로 자동 채워 넣는 구조입니다.
