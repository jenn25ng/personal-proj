# 막장 드라마 생성 프로젝트

웹소설/드라마 카드형 서비스에 올릴 막장 드라마 시리즈 데이터를 모아둔 저장소.

## 구조

```
data/series.json   # 시리즈 60편 (카드 메타데이터 + 무료 컷 지점)
data/episodes.json # 회차별 시놉시스 889회차 (시리즈 id로 키잉)
data/slots.json    # 조합형 생성 슬롯 테이블 + 유료 전환 규칙
scripts/render_catalog.py  # series.json -> CATALOG.md 렌더링
scripts/style_check.py     # 초고 문체 지표 측정 (기준은 STYLE.md)
scripts/canon_check.py     # 서사 논리 검증 (설정·정보보유·인과·복선·현실성)
scripts/verify.py          # 1~3층 한 번에
data/canon/                # 시리즈별 설정표와 검증 자료
drafts/                    # 본문 초고
CATALOG.md         # 사람이 읽는 카탈로그 (자동 생성물, 직접 수정 금지)
```

## series.json 스키마

```jsonc
{
  "version": 1,
  "count": 60,
  "series": [
    {
      "id": "S001",              // 고유 ID
      "genre": "막장",            // 카드 좌상단 태그
      "title": "...",            // 카드 제목
      "logline": "...",          // 카드 설명 2문장
      "totalEpisodes": 20,       // 총 화수
      "freeEpisodes": 5,         // 무료 화수
      "makjangLevel": 5,         // 막장 강도 1~5
      "slots": {                 // 어떤 조합으로 만들어졌는지
        "낙차": "며느리→원수",
        "배신": "시어머니+전남편",
        "비밀": "출생의 비밀",
        "시한": "임신 8개월"
      },
      "freeCutLine": "..."       // 무료 마지막 화의 마지막 문장
    }
  ]
}
```

## episodes.json 스키마

`data/series.json`의 `id`를 키로, 회차 배열을 값으로 갖는다.

```jsonc
{
  "version": 1,
  "episodeCount": 889,
  "episodes": {
    "S001": [
      {
        "ep": 5,              // 회차 번호 (1부터 연속)
        "act": "전개",         // 발단 / 전개 / 위기 / 절정 / 결말
        "synopsis": "...",    // 해당 회차 줄거리 1~2문장
        "isFree": true,       // ep <= series.freeEpisodes
        "isFreeCut": true     // 무료 마지막 화 = 페이월 직전 회차
      }
    ]
  }
}
```

`isFreeCut`이 true인 회차는 시리즈당 정확히 하나이며, 그 회차의 마지막 문장이
`series.json`의 `freeCutLine`이다. 두 파일의 정합성은 렌더링 전에 검증된다.

## 생성 공식

한 편 = **낙차 x 배신 x 비밀 x 시한**. `data/slots.json` 기준 20 x 15 x 15 x 15 = 67,500 조합.
여기에 장르 31종과 막장 강도 5단계를 얹어 톤을 가른다.

## 유료 전환 규칙

- 무료 마지막 화는 비밀이 **공개되기 직전**에서 끊는다. `freeCutLine`이 그 문장이다.
- 무료분 안에서 비밀을 공개하고 "그 후"로 끊지 않는다. 이탈률이 급등한다.
- 총 화수는 12/14/16/18/20/22 중에서 고르고, 무료는 총 화수의 20~35%.
  (12화짜리는 1화가 8%라 25~30% 안에 들어갈 수가 없다.)
- 1~3화 안에 낙차/배신/시한 중 최소 2개가 등장해야 한다.

## 카탈로그 갱신

`data/series.json`을 수정한 뒤:

```bash
python3 scripts/render_catalog.py
```

## 컷 라인 판정 페이지

무료 컷 라인 60개만 모아 블라인드로 읽고 결제 전환 여부를 판정하는 한 페이지:

```bash
python3 scripts/render_cutlines.py   # cutlines.html 생성
```

제목과 장르는 판정 전까지 가려진다. 시리즈를 알면 이미 궁금해진 상태라
판정이 무의미해지기 때문이다. 60개를 모두 판정하면 전환 가능성 %와
다시 써야 할 컷 라인 목록이 나온다.

## 검증

전체 프로세스는 `VERIFY.md`. 네 층이고 아래 세 층은 자동이다.

```bash
python3 scripts/verify.py
```

### 1층 — 구조 검증

읽지 않고 잡히는 결함을 데이터에서 검출한다.

```bash
python3 scripts/audit.py               # 리포트
python3 scripts/audit.py --level high  # high 만
python3 scripts/audit.py --json        # 기계용
python3 scripts/audit.py --strict      # high 가 있으면 exit 1 (CI 용)
```

검사 항목:

| 분류 | 잡는 것 |
| --- | --- |
| 정합성 | 회차 수·번호·무료 컷 위치·isFree 플래그가 series.json 과 어긋나는 경우 |
| 페이스 | 무료분이 전부 발단, 위기 단계 없음, 발단 과다, 절정 지연, 같은 막 8화 연속 |
| 페이월 | 비밀 장치가 컷보다 앞서 등장, 컷 라인이 서술로 닫힘, 무료 비율 이탈 |
| 카탈로그 | 슬롯 조합 3개 이상 일치(사실상 중복), 제목·로그라인 유사도, 장르 쏠림 |

정합성은 단정이고, 페이스·페이월·카탈로그는 **확인 대상 목록**이다.
`secret-early` 와 `declarative-cutline` 은 기계가 판정할 수 없는 항목이라
사람이 그 편만 읽어보라는 뜻이다.

가장 중요한 검사는 `cutline-drift` 다. 카드에 적힌 컷 라인은 무료 마지막 화의
마지막 문장이어야 하는데, 이게 앞 화를 가리키면 훅이 무료분 안에서 소진되고
뒤 화를 가리키면 유료 내용을 카드에 미리 노출한다.

### 검토 완료 처리

기계가 판정할 수 없는 findings 는 사람이 읽고 `data/reviewed.json` 에 이유와
함께 기록한다. 기록된 항목은 리포트 본문에서 빠지고 요약에만 집계된다.

```jsonc
{
  "declarative-cutline": {
    "S014": "3년 내내 같은 문장이라고만 하고 그 문장이 무엇인지 감춘다."
  }
}
```

```bash
python3 scripts/audit.py --show-reviewed   # 검토 완료 항목까지 보기
```

이유 없이 끄는 것은 안 된다. reviewed.json 의 값은 판정 근거이지 무시 목록이 아니다.

## 본문 초고

`drafts/` 에 회차 본문을 쓴다. 파일명은 `<시리즈 id>-<회차 2자리>.md`.

```bash
python3 scripts/style_check.py     # 분량·문장·대사·문단 지표 측정
```

기준과 그 근거는 `STYLE.md`. 업계 관행인 공백 포함 5,000자에 맞춘다.

### 2층 — 서사 검증

`data/canon/<시리즈>.json` 에 고정 설정표, 인물별 정보보유표, 원인–행동–결과,
반전 역검증, 현실성 검증, 회차 삭제 테스트, 결제 반대 심사를 적고 초고와 대조한다.

```bash
python3 scripts/canon_check.py        # 전체
python3 scripts/canon_check.py S056   # 한 편
```

`draftedThrough` 까지만 검사한다. 자세한 내용은 `VERIFY.md`.
