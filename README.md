# 양희본 · Heebon Yang

싱어송라이터 · 치과의사

이 저장소는 개인 홈페이지 소스입니다. 음악과 치과 진료를 각각의 탭으로 소개합니다.

## 실행

```bash
npm ci
npm run dev     # 개발 서버
npm run build   # out/ 폴더에 정적 사이트 생성
```

- 음악 탭(발매 음원, 팀 프로젝트, 소개, 연락처): `app/music.ts`
- 앨범 커버 이미지: `public/covers/` 폴더
- 치과 탭: `app/ProfileTabs.tsx` 맨 위의 `DENTAL`

## 배포 (Firebase Hosting)

```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting
```
