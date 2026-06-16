// CI/CD 자동 배포 테스트 — main push → GitHub Actions → clasp push
// Code.js — Google Docs용 코드 하이라이터 애드온 (선택 영역 변환 방식)
// 사용 흐름: 코드 부분을 드래그로 선택 → 사이드바에서 언어 고르고 버튼 클릭
//          → 그 자리를 VSCode 스타일 다크박스(줄번호 + 구문강조 표)로 교체.

var FONT = 'Roboto Mono';
var FONT_SIZE = 10;

function onOpen() {
  DocumentApp.getUi()
    .createMenu('🎨 Code Highlighter')
    .addItem('Apply', 'showLangSearchDialog')
    .addItem('Help', 'showHelpDialog')
    .addToUi();
}

// "Apply Highlighter" → 언어 검색 + 변환 팝업(모달 다이얼로그).
function showLangSearchDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Dialog')
    .setWidth(360).setHeight(210);
  DocumentApp.getUi().showModalDialog(html, 'Apply');
}

// "Help" → 한/영 사용법 팝업.
function showHelpDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Help')
    .setWidth(460).setHeight(500);
  DocumentApp.getUi().showModalDialog(html, '🎨 Code Highlighter');
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('코드 하이라이터');
  DocumentApp.getUi().showSidebar(html);
}

// 사이드바 버튼이 호출하는 핵심 함수.
function convertSelection(language) {
  var t0 = Date.now();
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();
  if (!selection) {
    return { ok: false, msg: '먼저 코드 부분을 드래그로 선택해 주세요.' };
  }
  var body = doc.getBody();
  var ET = DocumentApp.ElementType;

  // 1) 선택이 덮는 "body 최상위 자식"의 인덱스 범위[minIdx..maxIdx]를 구한다.
  //    (표 셀 안 요소는 그 표(Table)로 올라가므로 기존 코드표도 범위에 잡힌다.)
  var elements = selection.getRangeElements();
  var minIdx = null, maxIdx = null;
  for (var i = 0; i < elements.length; i++) {
    var top = elements[i].getElement();
    while (top.getParent() && top.getParent().getType() !== ET.BODY_SECTION) {
      top = top.getParent();
    }
    if (!top.getParent() || top.getParent().getType() !== ET.BODY_SECTION) continue;
    var idx = body.getChildIndex(top);
    if (minIdx === null || idx < minIdx) minIdx = idx;
    if (maxIdx === null || idx > maxIdx) maxIdx = idx;
  }
  if (minIdx === null) {
    return { ok: false, msg: '선택 영역에서 변환할 내용을 찾지 못했어요.' };
  }

  // 2) 범위 안 자식들을 순서대로 훑어 코드 줄을 복원한다.
  //    - 문단: 한 줄(빈 문단 2개 이상 연속만 의도된 빈 줄로 보존)
  //    - 기존 코드표(우리가 만든 것): 코드 칸을 다시 꺼내 합친다 → 재변환 시 병합
  //    Google이 코드 줄마다 끼우는 빈 문단(artifact)과 소스의 단일 빈 줄은 구분 불가(실측).
  var codeLines = [];
  var emptyRun = 0, started = false;
  var hasForeignTable = false, tablesInRange = false;
  for (var c = minIdx; c <= maxIdx; c++) {
    var child = body.getChild(c);
    var ct = child.getType();
    if (ct === ET.PARAGRAPH || ct === ET.LIST_ITEM) {
      var t = child.getText().replace(/ /g, ' ').replace(/\s+$/, '');
      if (t.trim() === '') { if (started) emptyRun++; continue; }
      if (started && emptyRun >= 2) {
        for (var b = 0; b < emptyRun; b++) codeLines.push('');
      }
      emptyRun = 0;
      codeLines.push(t);
      started = true;
    } else if (ct === ET.TABLE) {
      tablesInRange = true;
      var tbl = child.asTable();
      if (isOurCodeTable(tbl)) {
        emptyRun = 0;
        var tl = extractCodeFromTable(tbl);
        for (var z = 0; z < tl.length; z++) { codeLines.push(tl[z]); }
        if (tl.length) started = true;
      } else {
        hasForeignTable = true; // 코드 표가 아닌 일반 표가 섞임
      }
    }
  }
  if (hasForeignTable) {
    return { ok: false, msg: '선택 영역에 코드가 아닌 표가 섞여 있어요. 코드 부분만 선택해 주세요.' };
  }
  if (!codeLines.length) {
    return { ok: false, msg: '선택 영역에 코드 텍스트가 없어요.' };
  }
  // Google Docs가 자동으로 바꾼 "스마트 따옴표"(둥근 “ ” ‘ ’)를 곧은 따옴표로 되돌린다.
  // 안 그러면 highlight.js가 문자열을 인식 못해 그 줄 강조가 깨진다(코드엔 곧은 따옴표가 정답).
  var code = codeLines.join('\n')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'");

  // 3) 하이라이팅 → 논리 줄 토큰, 셀 폭에 맞춰 하드 줄바꿈(자동 줄바꿈 방지).
  var hl = highlightToLines(code, language);
  var gutterW = 22 + 3 * 7;
  var availPts = body.getPageWidth() - body.getMarginLeft() - body.getMarginRight() - gutterW - 24;
  var maxEm = (availPts / FONT_SIZE) * 0.95;
  var lines = wrapVisualLines(hl.lines, maxEm);

  // 4) 원본(문단 + 기존 코드표)을 제거하고 그 자리에 표 하나를 새로 넣는다.
  var cells = [];
  for (var r = 0; r < lines.length; r++) {
    var lineText = lines[r].map(function (tk) { return tk.text; }).join('');
    cells.push([String(r + 1), lineText.length ? lineText : ' ']);
  }

  // 선택의 마지막 줄이 문서의 맨 끝 문단이면, 그걸 지울 때 표가 문서 마지막이 되어
  // Docs가 removeChild를 거부한다(→ 마지막 줄이 남는 버그). 미리 끝에 빈 문단을
  // 하나 둬서 표가 마지막이 되지 않게 하면 안전하게 지워진다.
  var atDocEnd = (maxIdx === body.getNumChildren() - 1);

  // 표가 끼어 있으면 deleteText(텍스트 전용)를 못 쓰므로 개별 제거. 아니면 빠른 일괄 삭제.
  var fastRemoved = false;
  if (!tablesInRange) {
    try { fastRemoved = deleteRangeFast(body, minIdx, maxIdx); } catch (e) { fastRemoved = false; }
  }

  var table = body.insertTable(minIdx, cells);
  if (atDocEnd) body.appendParagraph(''); // 표가 문서 끝이 되지 않게 보강

  if (fastRemoved) {
    try {
      var leftover = body.getChild(minIdx + 1);
      if (leftover.getType() === ET.PARAGRAPH && leftover.asParagraph().getText() === '') {
        body.removeChild(leftover);
      }
    } catch (e2) {}
  } else {
    // 원본 자식들(표 삽입으로 minIdx+1..maxIdx+1로 밀림)을 뒤에서부터 제거
    for (var k = maxIdx + 1; k >= minIdx + 1; k--) {
      try { body.removeChild(body.getChild(k)); } catch (e3) {}
    }
  }

  // 5) 표 스타일링
  styleCodeTable(table, lines);

  var secs = ((Date.now() - t0) / 1000).toFixed(1);
  return {
    ok: true,
    msg: lines.length + '줄 변환 완료 (' + (hl.language || language) + ', ' + secs + '초)'
  };
}

// 우리가 만든 코드표인지 판별(첫 셀 배경이 다크 테마색).
function isOurCodeTable(tbl) {
  try {
    if (tbl.getNumRows() < 1) return false;
    var bg = tbl.getRow(0).getCell(0).getBackgroundColor();
    return bg && bg.toLowerCase() === THEME.background.toLowerCase();
  } catch (e) { return false; }
}

// 코드표에서 코드 줄을 복원(각 행의 코드 칸=둘째 칸 텍스트).
function extractCodeFromTable(tbl) {
  var out = [];
  for (var r = 0; r < tbl.getNumRows(); r++) {
    var row = tbl.getRow(r);
    var cell = row.getNumCells() >= 2 ? row.getCell(1) : row.getCell(0);
    out.push(cell.getText().replace(/ /g, ' ').replace(/\s+$/, ''));
  }
  return out;
}

function styleCodeTable(table, lines) {
  var ATTR = DocumentApp.Attribute;

  // 텍스트 속성(폰트·크기·기본색)은 표 전체에 한 번에 적용 — 이건 셀 텍스트로 전파된다.
  // (단, BACKGROUND_COLOR는 셀 배경에 전파되지 않아 셀 단위로 칠해야 한다.)
  var base = {};
  base[ATTR.FONT_FAMILY] = FONT;
  base[ATTR.FONT_SIZE] = FONT_SIZE;
  base[ATTR.FOREGROUND_COLOR] = THEME.foreground;
  table.setAttributes(base);

  // 테두리를 배경색 1pt로 → 행 사이 회색 가이드선을 덮어 매끈한 다크박스.
  table.setBorderWidth(1);
  table.setBorderColor(THEME.background);

  var n = table.getNumRows();
  var CENTER = DocumentApp.HorizontalAlignment.CENTER;
  var bg = THEME.background;
  for (var r = 0; r < n; r++) {
    var row = table.getRow(r);
    var gutter = row.getCell(0);
    var codeCell = row.getCell(1);

    // 다크 배경 + 위아래 패딩 0 (줄 간격 촘촘하게)
    gutter.setBackgroundColor(bg).setPaddingTop(0).setPaddingBottom(0);
    codeCell.setBackgroundColor(bg).setPaddingTop(0).setPaddingBottom(0);

    // 줄번호 셀: 색만 덮고 가운데 정렬
    gutter.editAsText().setForegroundColor(THEME.lineNumber);
    gutter.getChild(0).asParagraph().setAlignment(CENTER);

    // 코드 셀: 기본색이 아닌 토큰만 색칠(공백·기호 등은 생략)
    var cText = codeCell.editAsText();
    var toks = lines[r], offset = 0;
    for (var i = 0; i < toks.length; i++) {
      var len = toks[i].text.length;
      if (len > 0 && toks[i].color !== THEME.foreground) {
        cText.setForegroundColor(offset, offset + len - 1, toks[i].color);
      }
      offset += len;
    }
  }

  // 줄번호 열 폭 좁게(자릿수에 따라 약간 가변)
  var digits = String(n).length;
  table.setColumnWidth(0, 22 + digits * 7);
}

// 선택 범위[first..last]의 body 자식(문단 전용)을 deleteText 한 번으로 통째 삭제.
// 삭제 후 그 자리에 빈 문단 1개가 남는다. 성공 시 true.
// 안전장치: editAsText 플랫텍스트가 문단 수와 어긋나면(표 등 존재) false → 호출측 폴백.
function deleteRangeFast(body, first, last) {
  var bodyText = body.editAsText();
  var full = bodyText.getText();
  var segs = full.split('\n');
  if (segs.length !== body.getNumChildren()) return false;
  if (first < 0 || last >= segs.length) return false;
  var startOffset = 0;
  for (var c = 0; c < first; c++) startOffset += segs[c].length + 1;
  var blockChars = -1; // (last-first+1)개 문단이 (개수-1)개 \n으로 이어진 길이
  for (var c2 = first; c2 <= last; c2++) blockChars += segs[c2].length + 1;
  bodyText.deleteText(startOffset, startOffset + blockChars - 1);
  return true;
}
