This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 배포하기 (Deploy)

### 방법 1: Vercel (추천 - 가장 쉬움) ⭐

Vercel은 Next.js를 만든 회사에서 제공하는 플랫폼으로, 무료로 배포할 수 있습니다.

#### 단계별 가이드:

1. **GitHub에 코드 업로드**
   ```bash
   git add .
   git commit -m "배포 준비"
   git push origin main
   ```

2. **Vercel 가입 및 배포**
   - [vercel.com](https://vercel.com) 접속
   - "Sign Up" 클릭 → GitHub 계정으로 로그인
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - 프로젝트 설정 확인:
     - Framework Preset: Next.js (자동 감지됨)
     - Root Directory: `./` (기본값)
     - Build Command: `npm run build` (자동)
     - Output Directory: `.next` (자동)
   - "Deploy" 클릭

3. **배포 완료!**
   - 약 1-2분 후 배포 완료
   - 자동으로 `https://your-project-name.vercel.app` URL 생성
   - 이 URL을 누구에게나 공유 가능!

4. **자동 배포 설정**
   - GitHub에 코드를 push하면 자동으로 재배포됨
   - 각 배포마다 고유 URL 생성 (프리뷰 배포)

#### Vercel의 장점:
- ✅ 완전 무료 (개인 프로젝트)
- ✅ 자동 HTTPS 인증서
- ✅ 전 세계 CDN
- ✅ 자동 배포 (Git push 시)
- ✅ 커스텀 도메인 연결 가능

---

### 방법 2: Netlify

1. [netlify.com](https://www.netlify.com) 가입
2. "Add new site" → "Import an existing project"
3. GitHub 저장소 연결
4. 빌드 설정:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. "Deploy site" 클릭

---

### 방법 3: Railway

1. [railway.app](https://railway.app) 가입
2. "New Project" → "Deploy from GitHub repo"
3. 저장소 선택
4. 자동으로 배포 시작

---

### 배포 전 체크리스트

- [ ] `npm run build` 명령어가 에러 없이 실행되는지 확인
- [ ] 환경 변수가 필요한 경우 `.env.example` 파일 생성
- [ ] 중요한 정보(API 키 등)가 코드에 하드코딩되지 않았는지 확인
- [ ] 모든 기능이 정상 작동하는지 로컬에서 테스트

### 로컬에서 빌드 테스트

```bash
npm run build
npm start
```

빌드가 성공하면 배포 준비 완료!
