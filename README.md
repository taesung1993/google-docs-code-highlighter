# 🎨 Google Docs Code Highlighter

Google Docs 안의 코드를 **VSCode 스타일 다크박스(줄번호 + 구문강조)**로 바꿔주는 Google Apps Script 애드온입니다.
Turns code inside Google Docs into a **VSCode‑style dark box** with line numbers and syntax highlighting.

마크다운을 Google Docs로 올리면 코드블럭이 평범한 Arial 텍스트로 풀려 가독성이 떨어지는 문제를 해결합니다.

![demo](docs/demo.png)

---

## ✨ 기능 / Features

- **선택 → 변환**: 코드를 드래그로 선택하고 메뉴 한 번이면 다크박스로 변환
- **구문 강조**: [highlight.js](https://highlightjs.org) 내장 (Java, Python, JS/TS, C/C++/C#, Kotlin, Swift, Dart, Go, Rust, PHP, Ruby, SQL, HTML/CSS, JSON, YAML 등)
- **프레임워크 매핑**: React/React Native→JS, Android→Kotlin, Flutter→Dart, Vue/HTML→XML
- **VSCode Dark+ 테마** 색상, 줄번호(가운데 정렬), 모노스페이스
- **언어 검색**: 팝업에서 언어 입력/검색 (또는 자동 감지)
- **긴 줄 자동 줄바꿈** — 각 줄에 번호 부여 (Docs 자동 줄바꿈으로 번호 빠지는 문제 없음)
- **박스 + 새 줄 병합**: 이미 변환한 박스와 새 줄을 함께 선택해 다시 적용하면 하나로 합쳐짐
- **스마트 따옴표 자동 교정**: Docs가 바꾼 둥근 따옴표(`“ ”`)를 곧은 따옴표로 되돌려 강조 깨짐 방지
- **페이지 경계·대용량**(1000줄+) 처리 — `deleteText` 일괄 삭제로 빠르게
- **한/영 도움말**

## 🚀 사용법 / Usage

1. 문서에서 **코드 부분을 드래그**로 선택
2. 메뉴 **🎨 Code Highlighter → Apply**
3. 팝업에서 **언어 입력/검색** (예: `Java`, `Flutter`, `React`) → **Apply** (비워두면 자동 감지)

## 🛠 개발 / Development

[clasp](https://github.com/google/clasp)로 관리되는 Apps Script 프로젝트입니다.

```bash
npm i -g @google/clasp      # 또는 npx @google/clasp
clasp login                 # 구글 로그인
clasp push                  # 코드 업로드
```

| 파일 | 설명 |
|---|---|
| `Code.js` | 메뉴·변환 로직(선택 복원, 하이라이팅, 표 생성·스타일) |
| `highlighter.js` | highlight.js 결과를 VSCode Dark+ 토큰으로 변환 + 줄바꿈 |
| `hljs.js` | highlight.js v11.9.0 번들 (+ dart 문법) |
| `Dialog.html` | "Apply" 언어 검색 팝업 |
| `Help.html` | 한/영 도움말 팝업 |
| `Sidebar.html` | (선택) 사이드바 UI |
| `appsscript.json` | 매니페스트 (scope: documents.currentonly, container.ui) |

## 🐛 문의 · 버그 제보 / Feedback

버그·기능 요청은 [Issues](../../issues)에 남겨주세요.
Found a bug or have a feature request? Please open an [issue](../../issues).

## 📄 License

이 프로젝트는 MIT License로 배포됩니다.
[highlight.js](https://github.com/highlightjs/highlight.js)는 BSD‑3‑Clause License를 따릅니다.
