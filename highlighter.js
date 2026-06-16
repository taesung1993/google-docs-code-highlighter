// highlighter.js — VSCode Dark+ 테마로 highlight.js 결과를 토큰화한다.
// hljs.highlight()는 HTML 문자열을 돌려주므로, span을 직접 파싱해서
// {text, color} 토큰 배열로 바꾼 뒤 Docs 표에 색을 입힌다.

var THEME = {
  background: '#1E1E1E',
  foreground: '#D4D4D4',
  lineNumber: '#858585',
  gutterBg:   '#1E1E1E'
};

// hljs 스코프(클래스명)를 VSCode Dark+ 색으로 매핑.
// 미니파이 번들은 "title function_" 처럼 클래스가 합쳐져 나오므로
// 부분 문자열 우선순위로 판정한다(위에서부터 먼저 매칭되는 것 사용).
function scopeToColor(cls) {
  if (!cls) return null;
  var c = cls.toLowerCase();
  if (c.indexOf('comment') >= 0)               return '#6A9955';
  if (c.indexOf('string') >= 0)                return '#CE9178';
  if (c.indexOf('subst') >= 0)                 return '#D4D4D4';
  if (c.indexOf('number') >= 0)                return '#B5CEA8';
  if (c.indexOf('regexp') >= 0)                return '#D16969';
  if (c.indexOf('meta') >= 0)                  return '#DCDCAA'; // 어노테이션 등
  if (c.indexOf('title') >= 0 && c.indexOf('class') >= 0) return '#4EC9B0';
  if (c.indexOf('title') >= 0 && c.indexOf('function') >= 0) return '#DCDCAA';
  if (c.indexOf('title') >= 0)                 return '#DCDCAA';
  if (c.indexOf('function') >= 0)              return '#DCDCAA';
  if (c.indexOf('class') >= 0)                 return '#4EC9B0';
  if (c.indexOf('built_in') >= 0)              return '#4EC9B0';
  if (c.indexOf('type') >= 0)                  return '#4EC9B0';
  if (c.indexOf('keyword') >= 0)               return '#569CD6';
  if (c.indexOf('literal') >= 0)               return '#569CD6';
  if (c.indexOf('symbol') >= 0)                return '#569CD6';
  if (c.indexOf('attr') >= 0)                  return '#9CDCFE';
  if (c.indexOf('property') >= 0)              return '#9CDCFE';
  if (c.indexOf('variable') >= 0)              return '#9CDCFE';
  if (c.indexOf('params') >= 0)                return '#9CDCFE';
  if (c.indexOf('selector') >= 0)              return '#D7BA7D';
  if (c.indexOf('tag') >= 0)                   return '#569CD6';
  if (c.indexOf('name') >= 0)                  return '#569CD6';
  if (c.indexOf('operator') >= 0)              return '#D4D4D4';
  if (c.indexOf('punctuation') >= 0)           return '#D4D4D4';
  return null; // 모르는 스코프 → 부모/기본색 사용
}

function decodeEntities(s) {
  return s.replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&');
}

// hljs HTML 출력을 {text,color} 토큰 배열로 파싱.
// 중첩 span은 스택으로 추적하고, 가장 안쪽의 "색이 정해진" 스코프를 적용.
function parseHljsHtml(html) {
  var tokens = [];
  var stack = []; // 각 원소: 색(string) 또는 null
  var re = /<span class="([^"]*)">|<\/span>|([^<]+)/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== undefined) {
      stack.push(scopeToColor(m[1]));
    } else if (m[0] === '</span>') {
      stack.pop();
    } else if (m[2] !== undefined) {
      var color = THEME.foreground;
      for (var i = stack.length - 1; i >= 0; i--) {
        if (stack[i]) { color = stack[i]; break; }
      }
      tokens.push({ text: decodeEntities(m[2]), color: color });
    }
  }
  return tokens;
}

// 코드 문자열 → 줄 단위 토큰 배열. 각 줄은 [{text,color}, ...].
function highlightToLines(code, language) {
  var res;
  try {
    if (language && language !== 'auto') {
      res = hljs.highlight(code, { language: language, ignoreIllegals: true });
    } else {
      res = hljs.highlightAuto(code);
    }
  } catch (e) {
    // 지원 안 하는 언어 등 → 자동 감지로 폴백
    res = hljs.highlightAuto(code);
  }

  var tokens = parseHljsHtml(res.value);
  var lines = [[]];
  tokens.forEach(function (tok) {
    var parts = tok.text.split('\n');
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) lines.push([]);
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({ text: parts[i], color: tok.color });
      }
    }
  });
  // 마지막에 빈 줄이 하나 더 생기면 제거
  if (lines.length > 1 && lines[lines.length - 1].length === 0) {
    lines.pop();
  }
  return { lines: lines, language: res.language || language };
}

// 글자 1개의 표시 폭(em). 한글·CJK·전각은 ASCII의 약 2배라 넓게 잡는다.
// 안전하게(조금 넓게) 추정해서 Docs 자동 줄바꿈이 다시 생기지 않도록 한다.
function charWidthEm(ch) {
  var c = ch.codePointAt(0);
  if ((c >= 0x1100 && c <= 0x115F) || (c >= 0x2E80 && c <= 0x303E) ||
      (c >= 0x3041 && c <= 0x33FF) || (c >= 0x3400 && c <= 0x4DBF) ||
      (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0xA000 && c <= 0xA4CF) ||
      (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF) ||
      (c >= 0xFE30 && c <= 0xFE4F) || (c >= 0xFF00 && c <= 0xFF60) ||
      (c >= 0xFFE0 && c <= 0xFFE6)) {
    return 1.15; // 전각(한글 등)
  }
  return 0.6;   // Roboto Mono ASCII 전진폭 ≈ 0.6em
}

// 논리적 코드 줄(토큰 배열)들을 셀 폭(maxEm)에 맞춰 하드 줄바꿈한다.
// 긴 줄은 여러 개의 "보이는 줄"로 쪼개지고, 각 조각이 독립된 번호 행이 된다.
// 토큰 색은 쪼개도 그대로 유지된다.
function wrapVisualLines(lines, maxEm) {
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var toks = lines[i];
    var cur = [], w = 0, pushedForLine = false;
    for (var t = 0; t < toks.length; t++) {
      var text = toks[t].text, color = toks[t].color, buf = '';
      for (var k = 0; k < text.length; k++) {
        var ch = text[k];
        var cw = charWidthEm(ch);
        if (w + cw > maxEm && (cur.length > 0 || buf.length > 0)) {
          if (buf.length) { cur.push({ text: buf, color: color }); buf = ''; }
          out.push(cur); pushedForLine = true; cur = []; w = 0;
        }
        buf += ch; w += cw;
      }
      if (buf.length) cur.push({ text: buf, color: color });
    }
    if (cur.length > 0 || !pushedForLine) {
      out.push(cur.length ? cur : [{ text: ' ', color: THEME.foreground }]);
    }
  }
  return out;
}
