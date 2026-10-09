# 생각 먼저 AI

초등 고학년(10~12세) 어린이가 **AI에게 묻기 전에 먼저 생각하고**, **AI 답을 의심하고 확인하는 습관**을 기르도록 돕는 서비스의 MVP입니다.
클로드, 제미나이, 챗지피티 세 모델에 같은 질문을 보내고, 답이 서로 다를 때 그것을 아이에게 보여 줘서 할루시네이션을 직접 체감하게 합니다.

## 아이가 거치는 흐름

1. **질문하기** – 궁금한 것을 적는다.
2. **생각 먼저** – AI가 답 대신 "먼저 생각해 볼 질문"을 던진다. 아이는 아는 것과 **예상**을 적어야 다음으로 갈 수 있다. 막히면 힌트.
3. **답 읽기** – 답변 하나를 먼저 보여 준다. 각 답에는 AI가 스스로 밝힌 **확신도**와 **꼭 확인해야 할 부분**이 붙는다.
4. **다른 AI는 뭐라고 할까?** – 버튼을 누르면 나머지 모델의 답과 비교 결과(🟢 일치 / 🟡 부분 일치 / 🔴 불일치), 틀리기 쉬운 주장, 직접 확인하는 방법이 나온다.
5. **한 줄 정리** – 새로 알게 된 것을 적으면 과정을 칭찬하고, 예상과 답을 비교하고, 다음 질문을 제안한다.

`/parent` 페이지에서 부모가 "질문 수"보다 "먼저 예상한 비율", "비교해 본 비율", "AI 답을 의심한 비율"을 볼 수 있습니다. 기록은 브라우저 localStorage에만 저장됩니다(MVP라 DB 없음).

## 실행

```bash
pnpm install
cp .env.example .env.local   # API 키 입력
pnpm dev
```

키 없이 화면만 보려면 `.env.local`에 `MOCK_AI=1`을 넣으면 됩니다.

세 제공사 중 **설정된 키가 있는 모델만** 사용됩니다. 생각 단계, 비교 판정, 반성 피드백은 기본적으로 Claude(`JUDGE_MODEL`)가 맡고, Claude 키가 없으면 설정된 다른 제공사로 대체됩니다.

| 환경변수 | 기본값 | 용도 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | `claude-opus-5-5` | 클로드 답변 |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GOOGLE_MODEL` | `gemini-flash-latest` | 제미나이 답변 |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | `gpt-5.5` | 챗지피티 답변 |
| `JUDGE_MODEL` | `claude-sonnet-5-5` | 생각 단계·비교·반성 |
| `MOCK_AI` | – | `1`이면 가짜 응답 |

제미나이·챗지피티 모델 ID는 각 회사 문서에서 현재 이름을 확인해 바꾸세요.

## 구조

```
src/app/page.tsx            아이용 메인 화면
src/app/parent/page.tsx     부모 요약
src/app/api/think|answer|reflect/route.ts   3단계 API
src/components/QuestionFlow.tsx             단계별 흐름 (클라이언트)
src/lib/ai.ts               generateObject 기반 파이프라인
src/lib/providers.ts        제공사 레지스트리 (Vercel AI SDK)
src/lib/prompts.ts          연령 가이드와 단계별 시스템 프롬프트
src/lib/mock.ts             MOCK_AI 응답
```

## 아직 없는 것 (다음 단계)

- 부모 계정과 아동 프로필, 서버 DB (만 14세 미만 법정대리인 동의 흐름 포함)
- 입력·출력 양쪽의 별도 안전 필터 (지금은 시스템 프롬프트와 생각 단계의 `safe` 판정에 의존)
- "틀린 거 찾기" 게임 모드
- 각 제공사의 미성년자 대상 서비스 정책 검토
