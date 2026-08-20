# 막장 드라마 생성 프로젝트

웹소설/드라마 카드형 서비스에 올릴 막장 드라마 시리즈 데이터를 모아둔 저장소.

## 구조

```
data/series.json   # 시리즈 60편 (카드 메타데이터 + 무료 컷 지점)
data/episodes.json # 회차별 시놉시스 889회차 (시리즈 id로 키잉)
data/slots.json    # 조합형 생성 슬롯 테이블 + 유료 전환 규칙
scripts/render_catalog.py  # series.json -> CATALOG.md 렌더링
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
- 총 화수는 12/14/16/18/20/22 중에서 고르고, 무료는 총 화수의 25~30%.
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
