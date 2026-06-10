# Store-Style Design System

`직구 세이프패스 AI`의 2026-06 디자인 방향은 Apple Store KR의 구조적 리듬을 참고한 라이트 유틸리티 UI다. Apple 로고, 제품 이미지, 제품명, 문구는 사용하지 않는다.

## Principles

- 첫 화면은 마케팅 랜딩이 아니라 실제 진단 입력 화면이어야 한다.
- 홈은 `초대형 단어형 히어로 -> 카테고리 레일 -> 가로 카드형 진단 피드` 구조를 따른다.
- 데이터 화면은 장식보다 판독성을 우선한다. 표 숫자는 tabular number로 정렬한다.
- 기능 흐름은 유지한다: 입력, AI 추출, 검토, 공공데이터 조회, 결과, 체크리스트.

## Tokens

- Background: `#f5f5f7`
- Surface: `#ffffff`
- Foreground: `#1d1d1f`
- Secondary text: `#6e6e73`
- Primary: `#0071e3`
- Border: `rgba(29, 29, 31, 0.12)`
- Main card radius: `28px`
- Compact card radius: `20px`

## Components

- `AppHeader`: thin translucent global navigation.
- `store-card`: large white module for primary content.
- `store-rail`: horizontal card rail used on the home screen and secondary support sections.
- `apple-button`: blue pill primary action.
- `quiet-button`: muted secondary action.
- `input`: soft grey field with blue focus ring.
- `DiagnosisStepper`: compact pill progress rail.
- `RiskBadge`: semantic pill badge.

## Screen Mapping

- `/`: Store-style diagnosis feed with category rail and first-card input form.
- `/scan/new`: detailed diagnosis form using the same card and input system.
- `/scan/:scanId/review`: editable extraction review with card-based field groups.
- `/scan/:scanId/result`: data-dense result dashboard with subtle tabs and metric cards.
- `/scan/:scanId/checklist`: action checklist with completion progress.
- `/history`, `/compare`, `/cargo`, `/login`, `/readiness`: secondary utility screens using the same container, card, input, and button tokens.
