# 양희본 · Heebon Yang

싱어송라이터 · 치과의사 양희본의 개인 홈페이지입니다. https://heebonyang.web.app

음악 · 치과 · 라운지(공지 / 방명록)를 탭으로 나눠 소개하고, 0집 CD 구매 페이지(`/shop`)와 관리자 페이지(`/admin`)가 있습니다.

## 실행

```bash
npm ci
npm run dev     # 개발 서버 (http://localhost:3000)
npm run lint    # 코드 검사
npm run build   # out/ 폴더에 정적 사이트 생성 (검사도 함께 실행)
```

로컬 개발 서버에서는 Firebase에 연결되지 않아 데이터베이스 대신 코드에 적힌 기본 내용이 보여요.

## 배포

`main`에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 사이트를 빌드해 Firebase Hosting(프로젝트 `heebonyang`)에 올리고, `firestore.rules`도 함께 반영합니다.
필요한 비밀값: 저장소 Settings › Secrets › `FIREBASE_SERVICE_ACCOUNT` (서비스 계정 키 JSON).

## 수노 공장 (https://alkosuno.web.app)

같은 Firebase 프로젝트(`heebonyang`) 안의 별도 사이트입니다. 구글 로그인 후 Claude와 대화하며 Suno 곡(제목 · 스타일 · 가사)을 만들고,
버튼으로 실제 곡까지 생성합니다. 코드는 `suno-web/`(페이지)와 `functions/`(서버 함수)에 있습니다.
API 키는 서버 함수에만 있고, 함수는 `functions/src/index.ts`의 `ALLOWED_EMAILS` 계정(지금은 관리자)만 받습니다.
곡 생성은 비공식 유료 서비스 sunoapi.org를 씁니다.

처음 한 번 해야 하는 설정:

1. Firebase 콘솔 › 요금제를 **Blaze(종량제)** 로 바꾸기 (Cloud Functions는 무료 요금제에서 안 됨). 예산 알림 추천.
2. Firebase 콘솔 › Hosting › **다른 사이트 추가** › 사이트 ID `alkosuno`
   (또는 터미널에서 `firebase hosting:sites:create alkosuno --project heebonyang`).
3. Firebase 콘솔 › Authentication › 설정 › **승인된 도메인**에 `alkosuno.web.app` 추가 (안 하면 구글 로그인 실패).
4. 비밀값 등록 (터미널, `npm i -g firebase-tools` 후 `firebase login`):
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY --project heebonyang   # console.anthropic.com
   firebase functions:secrets:set SUNOAPI_KEY --project heebonyang         # sunoapi.org
   ```
5. Google Cloud 콘솔 › IAM에서 배포용 서비스 계정(`FIREBASE_SERVICE_ACCOUNT`)에 역할 추가:
   Cloud Functions 관리자, 서비스 계정 사용자, Secret Manager 뷰어, Artifact Registry 관리자, Cloud Build 편집자.
6. GitHub 저장소 Settings › Secrets and variables › Actions › **Variables**에 `DEPLOY_ALKOSUNO` = `true` 추가.
   이후 `main`에 푸시하면(또는 Actions에서 워크플로를 직접 실행하면) 수노 공장 사이트와 서버 함수도 함께 배포됩니다.

같은 기능의 터미널용 Python 버전은 `suno-agent/`에 있습니다.

## 내용 고치는 곳

대부분은 사이트의 **`/admin`** 에서 관리자 구글 계정으로 로그인해 고칩니다.

| 관리자 페이지 메뉴 | 바뀌는 곳 |
| --- | --- |
| 머리글 | 음악 · 치과 탭 이름 아래 한 줄 소개 |
| 링크 | 음악 탭 머리글 옆 로고 링크 (멜론 등, PNG 로고 업로드) |
| 0집 CD | 남은 수량 / 전체 수량 |
| 음원 | 발매 음원 (표지, 미리듣기 음원 경로) |
| 팀 프로젝트 | 팀 이름과 순서 |
| 공지 | 라운지 공지 (고정 가능) |
| 방명록 | 방명록 글 삭제 |

코드에서 고치는 것:

| 파일 | 내용 |
| --- | --- |
| `app/ProfileTabs.tsx` 맨 위 `DENTAL` | 치과 탭 정보 |
| `app/music.ts` 맨 위 `MUSIC_PROFILE` | 공연 · 협업 문의 이메일 |
| `app/shop.ts` `ALBUM0` | 0집 가격, 구매 신청서 주소, 입금 계좌 |
| `app/SocialLinks.tsx` `SOCIAL` | 상단 유튜브 · 인스타그램 주소 |
| `public/audio`, `public/images` | 음원 파일, 앨범 표지 |

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `app/ProfileTabs.tsx` | 첫 화면: 상단 바(SNS · 탭)와 음악 / 치과 / 라운지 탭 전환, 치과 탭 |
| `app/MusicPanel.tsx` | 음악 탭: 머리글 · 로고 링크, 0집 배너, 대표곡 플레이어, 디스코그래피(솔로 / 팀), 문의 |
| `app/AlbumBanner.tsx`, `app/LimitedStock.tsx` | 0집 판매 배너와 한정판 남은 수량 막대 |
| `app/shop/ShopPage.tsx` | 0집 구매 페이지 (`/shop`) |
| `app/Lounge.tsx`, `app/Guestbook.tsx` | 라운지: 공지와 방명록 (비밀번호로 직접 삭제, 이름 무지개색) |
| `app/admin/AdminApp.tsx` | 관리자 페이지 (`/admin`, 구글 로그인) |
| `suno-web/app/SunoFactory.tsx` | 수노 공장 사이트 (alkosuno.web.app, 구글 로그인): 대화 · 곡 초안 · 생성 결과 |
| `functions/src/index.ts` | 수노 공장 서버 함수: 로그인 계정 확인, Claude 대화, sunoapi.org 생성 · 상태 확인 |
| `app/firebase.ts` | Firebase 연결 (`/__/firebase/init.json`에서 설정을 읽음) |
| `app/siteSettings.ts` | 머리글 · 링크 · 0집 수량 설정 (`settings/site`) |
| `app/musicData.ts`, `app/notices.ts` | 음원 · 팀 · 공지 불러오기 (데이터베이스가 비면 코드의 기본값) |
| `app/music.ts`, `app/shop.ts` | 기본 음원 · 팀 데이터, 0집 판매 정보 |
| `firestore.rules` | 데이터베이스 보안 규칙: 누구나 읽기, 쓰기는 관리자만 (방명록은 비밀번호 확인) |
| `firebase.json`, `.firebaserc` | 호스팅 설정: `main` = heebonyang.web.app, `suno` = alkosuno.web.app (캐시: 페이지는 항상 새로, `/_next/static`은 오래) |

## 개발 기록

1. **10/23 첫 버전** — 음악 / 치과 탭으로 나뉜 개인 홈페이지, Firebase Hosting 자동 배포.
   음악 탭을 발매 음원 중심으로, 디스코그래피를 솔로 / 팀 프로젝트로 나눔.
   관리자 페이지와 방명록 → 라운지(공지 / 방명록)로 확장.
2. **10/24 음원 · SNS** — 싱글 'Day 3', '내 남은 초록을 모두 그대에게' 미리듣기 추가.
   상단에 유튜브 · 인스타그램 아이콘, 공연 · 협업 문의는 이메일 하나로.
3. **10/27 데이터베이스 · 0집** — 방명록 비밀번호 작성 / 삭제, 공지 '세로 라이브 100일' 고정.
   데이터베이스가 비면 기본 내용을 보여 주고 관리자 페이지에서 가져오기.
   항상 최신 화면을 받도록 캐시 설정.
   0집 CD 한정판 500장 배너와 구매 페이지(`/shop`), 팀 이름만으로 저장, 팀 순서 조정.
4. **10/28 방명록 디자인** — 카드형 글, 작성 칸을 아래로, 아이콘 대신 이름 색.
5. **10/29 머리글 통일** — 이름 앞에 탭 색으로 직업 표시, 음악 · 치과 · 라운지 머리글 크기와 탭 폭 통일.
   머리글을 관리자 페이지에서 수정, 방명록 이름 무지개 7색.
6. **10/30 링크 · 수량 관리** — 멜론 로고 링크, 관리자 페이지 '링크'에서 로고 링크 관리, About 삭제.
   관리자 페이지 '0집 CD'에서 남은 수량 조절.
   휴대폰에서 글자를 키워도 상단 탭이 잘리지 않게 수정.
7. **10/31 코드 정리** — 코드 검사(ESLint) 설정 추가와 경고 정리, README 정리.
