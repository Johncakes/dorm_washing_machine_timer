# 율곡관 스마트 세탁실

300명 이상이 거주하는 기숙사에서 삼성 세탁기·건조기의 **작동 상태와 기기가 보고한 남은 시간**을 확인하기 위한 읽기 전용 웹 프로토타입입니다. 원격 제어 기능은 없습니다.

## 현재 구현과 확인 범위

- 세탁기 5대·건조기 5대의 대시보드 UI와 시각적 잔여 시간 표시
- SmartThings에 등록한 **5번 세탁기 1대**의 상태를 조회하는 서버 연결 경로
- PowerShell에서 실제 SmartThings API로 작동 상태·남은 시간·진행률을 받아오는 데 성공
- 연결된 페이지가 보이는 동안 10초마다 조회, 서버에서 세션별 8초 캐시 적용
- 실제 데이터가 없으면 미연동·확인 불가로 표시하고, 예시 데이터는 별도로 구분
- AES-GCM 암호화 세션 쿠키, 만료·권한 오류·요청 제한 처리

웹사이트에서 실제 토큰을 입력한 뒤 정상 동작하는지에 대한 최종 확인은 소유자가 수행해야 합니다. 나머지 기기 연결, 장기 OAuth 갱신, 학생 전체에게 제공할 공유 운영 구조는 아직 구현되지 않았습니다. 조회 간격을 줄여도 세탁기 자체의 보고 주기가 더 빨라지는 것은 아닙니다.

## 구성

로컬 컴퓨터에서 실행하는 Next.js(App Router) + TypeScript 프로젝트입니다. 화면과 API가 한 앱에 있으며 별도 서버가 필요 없습니다.

기존 Sites **버전 6**(원본 커밋 `d87a1679c26a5d1fe3cc1aff72073d3114b1ebda`)에서 가져와 다시 구성했습니다. 이 저장소는 기존 웹사이트(https://sinsa-smart-laundry.yeeuni0276.chatgpt.site/)에 배포되지 않으며, 기존 사이트는 이 변경의 영향을 받지 않습니다.

## 로컬 실행

Node.js **22.12 이상**이 필요합니다.

```sh
npm install
npm run gen-key > .env.local   # 세션 암호화 키 생성 (최초 1회)
npm run dev                    # http://localhost:3000
```

- `.env.local`이 없으면 임시 키를 사용하므로 서버를 재시작하면 다시 연결해야 합니다.
- 운영 빌드: `npm run build && npm start`
- 검사: `npm test`, `npm run lint`, `npm run typecheck`

## 주요 파일

| 경로 | 역할 |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | 페이지와 스타일 |
| `app/api/laundry/*/route.ts` | `connect`·`session`·`status`·`disconnect` API |
| `components/` | 대시보드 UI 컴포넌트 (`LaundryDashboard`가 최상위) |
| `hooks/useLiveConnection.ts` | 세션 복원, 10초 조회, 오류 시 대기, 연결·해제 |
| `lib/laundry/` | 브라우저·서버 공용 타입, 표시 문구, API 클라이언트 |
| `lib/server/` | 삼성 API 조회·상태 정규화(`smartthings`), 암호화 세션(`session`), 캐시, 요청 검사(`guard`) |
| `tests/` | Vitest 테스트 (모의 삼성 응답 사용) |
| `LIVE-CONNECTION.md` | 연결 구조 및 운영상 제약 |

## 보안 및 주의할 점

- **이 서버는 본인 컴퓨터에서 혼자 쓰는 용도입니다.** 로그인 기능이 없으며, 단일 로컬 사용자로 동작합니다. API는 `localhost`·`127.0.0.1`·`[::1]` 주소로 온 요청에만 응답합니다. `--host`로 열거나 외부에 공개하지 마세요.
- SmartThings PAT는 화면의 연결 창에 입력합니다. 서버는 이를 AES-GCM으로 암호화해 HttpOnly·SameSite=Strict 쿠키에 저장하며 최대 24시간 유지합니다. HTTPS로 접속하면 `__Host-`·Secure 쿠키를 사용합니다.
- 실제 PAT와 `LAUNDRY_SESSION_KEY`는 Git에서 제외된 `.env.local`에만 두고 커밋하지 마세요.
- 여러 학생에게 제공하려면 별도의 인증 계층과 서버 호스팅이 필요합니다.

## 다음 개발 작업

1. 소유자의 실제 PAT로 기존 비공개 사이트 연결 확인
2. 기숙사 공식 기기 소유·관리 계정 및 삼성 기관 API 이용 조건 확인
3. 정식 OAuth 등록, 자동 갱신 및 안전한 장기 자격 증명 저장
4. 관리자와 학생 조회 권한 분리, 여러 학생이 함께 조회하는 서버 캐시 구성
5. 기기 목록 설정화, 데이터 갱신 시각·오프라인 상태 검증, 운영 계정과 인수인계 정리

세탁물 회수 여부나 고장 원인을 추정하는 기능은 구현하지 않았습니다. 기존 타사 라이선스 파일은 보존했으며, 프로젝트 전체의 공개 라이선스는 별도로 정하지 않았습니다.
