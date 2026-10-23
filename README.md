# 양희본 · Heebon Yang

싱어송라이터 · 치과의사

이 저장소는 개인 홈페이지 소스입니다. 음악과 치과 진료를 각각의 탭으로 소개합니다.

## 실행

```bash
npm ci
npm run dev     # 개발 서버
npm run build   # out/ 폴더에 정적 사이트 생성
```

- 발매 음원·팀 프로젝트·방명록 관리: 배포된 사이트의 `/admin` 페이지 (관리자 구글 계정으로 로그인)
- 음악 탭 소개·연락처: `app/music.ts` 맨 위의 `MUSIC_PROFILE`
- 치과 탭: `app/ProfileTabs.tsx` 맨 위의 `DENTAL`

음원·팀·방명록 데이터는 Firebase Firestore에 저장되고, 접근 규칙은 `firestore.rules`에 있습니다.

## 배포 (Firebase Hosting)

```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting
```
