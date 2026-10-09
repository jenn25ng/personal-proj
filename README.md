# 생각 먼저 AI

초등 고학년(10~12세) 어린이가 **AI에게 묻기 전에 먼저 생각하고**, **AI 답을 의심하고 확인하는 습관**을 기르도록 돕는 서비스의 MVP입니다.
클로드, 제미나이, 챗지피티 세 모델에 같은 질문을 보내고, 답이 서로 다를 때 그것을 아이에게 보여 줘서 할루시네이션을 직접 체감하게 합니다.

## 아이가 거치는 흐름

1. **질문하기** – 궁금한 것을 적는다.
2. **생각 먼저** – AI가 답 대신 "먼저 생각해 볼 질문"을 던진다. 아이는 아는 것과 **예상**을 적어야 다음으로 갈 수 있다. 막히면 힌트.
3. **답 읽기** – 답변 하나를 먼저 보여 준다. 각 답에는 AI가 스스로 밝힌 **확신도**와 **꼭 확인해야 할 부분**이 붙는다.
4. **다른 AI는 뭐라고 할까?** – 버튼을 누르면 나머지 모델의 답과 비교 결과(🟢 일치 / 🟡 부분 일치 / 🔴 불일치), 틀리기 쉬운 주장, 직접 확인하는 방법이 나온다.
5. **한 줄 정리** – 새로 알게 된 것을 적으면 과정을 칭찬하고, 예상과 답을 비교하고, 다음 질문을 제안한다.

### 틀린 거 찾기 게임 (`/game`)

주제를 고르면 AI가 5~6문장짜리 설명글을 쓰는데, 그중 2문장을 **일부러 틀리게** 씁니다(숫자 바꿔치기, 날짜·순서 바꿔치기, 이름·장소 바꿔치기, 그럴듯한 가짜 이유). 아이가 틀린 문장을 눌러 고른 뒤 확인하면 어디를 찾았고 놓쳤는지, 바르게 고친 내용, AI가 쓴 수법, 그리고 오늘 교훈이 나옵니다. 게임용 글이라는 점을 화면에 명시합니다.

### 부모 계정과 아이 프로필

- 부모가 이메일·비밀번호로 계정을 만들고(`/signup`, `/login`), 아이 프로필(별명, 학년)을 최대 5명까지 만듭니다.
- 아이는 만 14세 미만이므로 프로필을 만들 때 **법정대리인 동의** 체크가 필수이고, 동의 시각과 문구 버전이 DB에 남습니다.
- 부모가 "이 아이로 시작"을 누르면 그 기기에서 아이 프로필이 선택되고, 그때부터 질문과 게임이 그 아이 이름으로 기록됩니다. 로그인과 프로필 선택이 없으면 질문·게임 화면과 API 모두 막힙니다.
- `/parent`에서 아이별로 "질문 수"보다 "먼저 예상한 비율", "비교해 본 비율", "AI 답을 의심한 비율", 게임에서 "숨은 틀린 문장을 찾은 비율"을 보고, 최근 질문·게임 기록을 읽을 수 있습니다.
- 프로필이나 계정을 지우면 관련 기록이 모두 함께 지워집니다(cascade).

인증은 외부 라이브러리 없이 구현했습니다. 비밀번호는 Node의 scrypt로 해시하고, 세션은 DB의 `auth_sessions` 테이블과 httpOnly 쿠키로 관리합니다.

### 이메일 인증과 비밀번호 재설정

- 가입하면 인증 메일이 가고, **인증을 마쳐야 아이 프로필을 만들 수 있습니다.** 부모 화면 배너에서 1분 간격으로 다시 보낼 수 있습니다.
- 로그인 화면의 "비밀번호를 잊었어요"에서 재설정 메일을 받습니다. 가입 여부는 드러내지 않고 항상 같은 안내를 보여 줍니다.
- 링크 토큰은 DB에 SHA-256 해시만 저장하고, 한 번 쓰면 끝나며, 인증은 24시간·재설정은 1시간 뒤 만료됩니다. 비밀번호를 바꾸면 모든 기기의 로그인이 끊깁니다.
- 메일 스캐너가 링크를 자동으로 열어도 처리되지 않도록, 링크를 연 뒤 버튼을 한 번 더 눌러야 완료됩니다.
- `SMTP_URL`이 있으면 nodemailer로 보내고, 없으면 링크를 서버 콘솔에 출력합니다(개발 모드에서는 화면에도 보여 줍니다).

## 실행

```bash
pnpm install
cp .env.example .env.local   # API 키 입력
pnpm dev
```

키 없이 화면만 보려면 `.env.local`에 `MOCK_AI=1`을 넣으면 됩니다.

### 데이터베이스

Drizzle ORM의 PostgreSQL 스키마 하나(`src/db/schema.ts`)를 씁니다. 드라이버는 환경변수로 정해집니다.

- `DATABASE_URL`이 **없으면** `.data/pglite/`에 파일 기반 PGlite(내장 Postgres)를 만들어 씁니다. 설치할 것이 없어 바로 개발할 수 있습니다.
- `DATABASE_URL`이 **있으면** 그 PostgreSQL에 붙습니다. 운영은 이쪽입니다.

마이그레이션은 `drizzle/` 폴더의 SQL이며, 앱이 시작될 때 자동으로 적용됩니다. 스키마를 바꾼 뒤에는 다음으로 새 마이그레이션을 만듭니다.

```bash
pnpm exec drizzle-kit generate --name <이름>
```

테이블: `parents`, `auth_sessions`, `email_tokens`, `children`, `question_logs`, `game_results`.

세 제공사 중 **설정된 키가 있는 모델만** 사용됩니다. 생각 단계, 비교 판정, 반성 피드백은 기본적으로 Claude(`JUDGE_MODEL`)가 맡고, Claude 키가 없으면 설정된 다른 제공사로 대체됩니다.

| 환경변수 | 기본값 | 용도 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | `claude-opus-5-5` | 클로드 답변 |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GOOGLE_MODEL` | `gemini-flash-latest` | 제미나이 답변 |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | `gpt-5.5` | 챗지피티 답변 |
| `JUDGE_MODEL` | `claude-sonnet-5-5` | 생각 단계·비교·반성·게임 문제 생성 |
| `MOCK_AI` | – | `1`이면 가짜 응답 |
| `DATABASE_URL` | – | 비우면 PGlite, 있으면 PostgreSQL |
| `SMTP_URL` / `MAIL_FROM` | – | 비우면 메일 링크를 콘솔에 출력 |
| `APP_URL` | 요청 host | 메일 링크의 기준 주소 |
| `PGLITE_DIR` | `.data/pglite` | PGlite 데이터 폴더 |

제미나이·챗지피티 모델 ID는 각 회사 문서에서 현재 이름을 확인해 바꾸세요.

## 구조

```
src/app/login, signup, forgot-password, reset-password, verify-email   부모 계정 화면
src/app/page.tsx            아이용 메인 화면 (아이 프로필 선택 필요)
src/app/game/page.tsx       틀린 거 찾기 게임
src/app/parent/page.tsx     부모 요약
src/app/api/think|answer|reflect|game/route.ts   AI API (아이 프로필 선택 필요)
src/app/api/logs/question|game/route.ts          기록 저장 API
src/db/schema.ts, index.ts  Drizzle 스키마와 드라이버 선택
src/lib/auth.ts             비밀번호 해시, 세션 쿠키, 페이지 가드
src/lib/actions.ts          서버 액션 (가입, 로그인, 인증, 재설정, 아이 추가·선택·삭제, 계정 삭제)
src/lib/tokens.ts, mail.ts  일회성 토큰과 메일 발송
src/components/QuestionFlow.tsx             단계별 흐름 (클라이언트)
src/components/FindMistakeGame.tsx          게임 (클라이언트)
src/lib/ai.ts               generateObject 기반 파이프라인
src/lib/providers.ts        제공사 레지스트리 (Vercel AI SDK)
src/lib/prompts.ts          연령 가이드와 단계별 시스템 프롬프트
src/lib/mock.ts             MOCK_AI 응답
```

## 아직 없는 것 (다음 단계)

- 부모 외 기기에서 아이가 혼자 쓰는 흐름 (지금은 부모가 로그인한 기기에서만 사용)
- 입력·출력 양쪽의 별도 안전 필터 (지금은 시스템 프롬프트와 생각 단계의 `safe` 판정에 의존)
- 각 제공사의 미성년자 대상 서비스 정책 검토
