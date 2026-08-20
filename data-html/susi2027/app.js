/* =========================================================
   2027 수시 전형분석 DB — app
   ========================================================= */
(function () {
'use strict';

var D = window.DB;
var app = document.getElementById('app');

/* ---------- helpers ---------- */
function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nfm(n) {
  if (n === null || n === undefined || n === '') return '';
  var v = typeof n === 'number' ? n : parseFloat(String(n).replace(/,/g, ''));
  return isNaN(v) ? esc(n) : v.toLocaleString('ko-KR');
}
function toNum(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  var m = String(v).replace(/[^0-9.\-]/g, '');
  var n = parseFloat(m);
  return isNaN(n) ? 0 : n;
}
function uniq(arr) { var s = [], seen = {}; arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; s.push(v); } }); return s; }

var GORDER = D._meta.group_order;
function groupSort(a, b) {
  var ia = GORDER.indexOf(a), ib = GORDER.indexOf(b);
  if (ia < 0) ia = 99; if (ib < 0) ib = 99;
  return ia - ib || String(a).localeCompare(String(b), 'ko');
}
var TYPE_KEY = { '교과': 'gyo', '종합': 'jong', '논술': 'non', '실기': 'sil', '기타': 'etc' };
function typeTag(t) {
  var k = TYPE_KEY[t] || 'etc';
  return '<span class="tag t-' + k + '">' + esc(t || '기타') + '</span>';
}
function grpTag(g) { return g ? '<span class="tag tag-grp">' + esc(g) + '</span>' : ''; }
function yrTag(y) {
  if (!y) return '';
  var on = y === '27수시';
  return '<span class="tag tag-yr' + (on ? ' y27' : '') + '">' + esc(on ? '2027' : '2028') + '</span>';
}

/* ---------- shared filter state ---------- */
function mkState() { return { yr: '27수시', grp: [], type: [], q: '' }; }

/* Build a filter bar. cfg: {state, data, onChange, showYear, showType, extra} */
function filterBar(cfg) {
  var st = cfg.state, box = el('div', 'filters'), row = el('div', 'frow');

  function grp(label, node) {
    var g = el('div', 'fgrp');
    g.appendChild(el('div', 'flabel', label));
    g.appendChild(node);
    return g;
  }
  function pillSet(values, arr, cls) {
    var p = el('div', 'pills');
    values.forEach(function (v) {
      var b = el('button', 'pill' + (cls ? ' p-' + (TYPE_KEY[v] || '') : ''), esc(v));
      if (arr.indexOf(v) >= 0) b.classList.add('is-on');
      b.onclick = function () {
        var i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1); else arr.push(v);
        b.classList.toggle('is-on');
        cfg.onChange();
      };
      p.appendChild(b);
    });
    return p;
  }

  if (cfg.showYear) {
    var yp = el('div', 'pills');
    [['27수시', '2027 수시'], ['28시행', '2028 시행계획'], ['', '전체']].forEach(function (o) {
      var b = el('button', 'pill', o[1]);
      if (st.yr === o[0]) b.classList.add('is-on');
      b.onclick = function () {
        st.yr = o[0];
        yp.querySelectorAll('.pill').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        cfg.onChange();
      };
      yp.appendChild(b);
    });
    row.appendChild(grp('학년도', yp));
  }

  var groups = uniq(cfg.data.map(function (r) { return r['대학그룹']; })).sort(groupSort);
  row.appendChild(grp('대학 구분', pillSet(groups, st.grp)));

  if (cfg.showType) {
    var types = uniq(cfg.data.map(function (r) { return r['전형유형']; }))
      .sort(function (a, b) { return ['교과', '종합', '논술', '실기', '기타'].indexOf(a) - ['교과', '종합', '논술', '실기', '기타'].indexOf(b); });
    row.appendChild(grp('전형유형', pillSet(types, st.type, true)));
  }

  var inp = el('input', 'search');
  inp.type = 'search';
  inp.placeholder = cfg.placeholder || '대학·전형명 검색';
  inp.value = st.q;
  var tid;
  inp.oninput = function () { clearTimeout(tid); tid = setTimeout(function () { st.q = inp.value.trim(); cfg.onChange(); }, 160); };
  row.appendChild(grp('검색', inp));

  if (cfg.extra) cfg.extra.forEach(function (n) { row.appendChild(n); });

  var note = el('div', 'fnote');
  note.id = cfg.countId || 'cnt';
  row.appendChild(note);

  box.appendChild(row);
  return box;
}

function applyFilter(rows, st, opts) {
  opts = opts || {};
  var q = st.q.toLowerCase();
  return rows.filter(function (r) {
    if (st.yr && r['학년도'] && r['학년도'] !== st.yr) return false;
    if (st.grp.length && st.grp.indexOf(r['대학그룹']) < 0) return false;
    if (st.type.length && st.type.indexOf(r['전형유형']) < 0) return false;
    if (q) {
      var hay = (opts.searchFields || ['대학', '전형명', '모집단위', '전형유형'])
        .map(function (f) { return r[f] || ''; }).join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });
}

function setCount(id, n, tot, sum, root) {
  var e = (root || document).querySelector('#' + id);
  if (!e) return;
  var h = '<span><b class="count-n">' + nfm(n) + '</b> / ' + nfm(tot) + '행</span>';
  if (sum !== undefined) h += '<span>모집인원 <b class="count-n">' + nfm(sum) + '</b>명</span>';
  h += '<button class="btn" id="' + id + '-csv">CSV 저장</button>';
  h += '<button class="btn" id="' + id + '-prn">인쇄</button>';
  e.innerHTML = h;
}
function wireExport(id, getRows, getCols, fname, root) {
  var r = root || document;
  var c = r.querySelector('#' + id + '-csv'), p = r.querySelector('#' + id + '-prn');
  if (c) c.onclick = function () { downloadCSV(getRows(), getCols(), fname); };
  if (p) p.onclick = function () { window.print(); };
}
function downloadCSV(rows, cols, fname) {
  var lines = [cols.join(',')];
  rows.forEach(function (r) {
    lines.push(cols.map(function (c) {
      var v = r[c];
      if (v === null || v === undefined) v = '';
      v = String(v).replace(/"/g, '""').replace(/\n/g, ' ');
      return /[",\n]/.test(v) ? '"' + v + '"' : v;
    }).join(','));
  });
  var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}

/* sortable table builder */
function buildTable(cfg) {
  // cfg: {rows, cols:[{k,label,cls,fmt,sortable,w}], sort:{k,dir}, onSort}
  var wrap = el('div', 'tbl-wrap');
  if (!cfg.rows.length) {
    wrap.appendChild(el('div', 'empty', '<strong>해당 조건의 자료가 없습니다</strong>필터를 조정하거나 검색어를 지워 보세요.'));
    return wrap;
  }
  var t = el('table'), th = el('thead'), tr = el('tr');
  cfg.cols.forEach(function (c) {
    var h = el('th', c.sortable === false ? '' : 'sortable', esc(c.label) +
      (c.sortable === false ? '' : '<span class="arw">' + (cfg.sort && cfg.sort.k === c.k ? (cfg.sort.dir > 0 ? '▲' : '▼') : '◆') + '</span>'));
    if (cfg.sort && cfg.sort.k === c.k) h.classList.add('sorted');
    if (c.w) h.style.minWidth = c.w;
    if (c.sortable !== false && cfg.onSort) h.onclick = function () { cfg.onSort(c.k); };
    tr.appendChild(h);
  });
  th.appendChild(tr); t.appendChild(th);
  var tb = el('tbody');
  var frag = document.createDocumentFragment();
  cfg.rows.forEach(function (r) {
    var row = el('tr');
    cfg.cols.forEach(function (c) {
      var td = el('td', c.cls || '');
      td.innerHTML = c.fmt ? c.fmt(r[c.k], r) : esc(r[c.k] === null || r[c.k] === undefined ? '' : r[c.k]);
      row.appendChild(td);
    });
    frag.appendChild(row);
  });
  tb.appendChild(frag); t.appendChild(tb); wrap.appendChild(t);
  return wrap;
}
function sortRows(rows, k, dir) {
  var c = rows.slice();
  c.sort(function (a, b) {
    var x = a[k], y = b[k];
    var nx = typeof x === 'number', ny = typeof y === 'number';
    if (nx || ny) { return ((nx ? x : toNum(x)) - (ny ? y : toNum(y))) * dir; }
    if (k === '대학그룹') return groupSort(x, y) * dir;
    return String(x || '').localeCompare(String(y || ''), 'ko') * dir;
  });
  return c;
}

/* =========================================================
   VIEW 1 — 개관 (dashboard)
   ========================================================= */
function viewDash() {
  var v = el('div', 'view');
  var rows = D['전형별_인원요약'].rows.filter(function (r) { return r['학년도'] === '27수시'; });

  // per-university totals by type
  var byUni = {}, byGrp = {}, tot = { '교과': 0, '종합': 0, '논술': 0, '실기': 0, '기타': 0 };
  rows.forEach(function (r) {
    var u = r['대학'], g = r['대학그룹'], t = r['전형유형'] || '기타', n = toNum(r['모집인원']);
    if (!byUni[u]) byUni[u] = { uni: u, grp: g, '교과': 0, '종합': 0, '논술': 0, '실기': 0, '기타': 0, tot: 0 };
    byUni[u][t] = (byUni[u][t] || 0) + n; byUni[u].tot += n;
    if (!byGrp[g]) byGrp[g] = { grp: g, tot: 0, unis: {} };
    byGrp[g].tot += n; byGrp[g].unis[u] = 1;
    tot[t] = (tot[t] || 0) + n;
  });
  var grand = tot['교과'] + tot['종합'] + tot['논술'] + tot['실기'] + tot['기타'];
  var uniList = Object.keys(byUni).map(function (k) { return byUni[k]; });

  // KPIs
  var kp = el('div', 'kpis');
  function kpi(cls, val, lab) {
    var k = el('div', 'kpi ' + cls);
    k.appendChild(el('div', 'kpi-v', val));
    k.appendChild(el('div', 'kpi-l', lab));
    return k;
  }
  kp.appendChild(kpi('', nfm(uniList.length), '분석 대학 수 (2027 수시)'));
  kp.appendChild(kpi('', nfm(grand), '수시 모집인원 합계'));
  [['교과', 'k-gyo'], ['종합', 'k-jong'], ['논술', 'k-non'], ['실기', 'k-sil']].forEach(function (o) {
    var pct = grand ? (tot[o[0]] / grand * 100).toFixed(1) : 0;
    kp.appendChild(kpi(o[1], pct + '%', o[0] + ' ' + nfm(tot[o[0]]) + '명'));
  });
  v.appendChild(kp);

  var nb = el('div', 'callout');
  nb.innerHTML = '<strong>수치 기준 안내</strong> · 위 KPI는 <b>전형별_인원요약 시트의 2027 수시 68개 대학 전체</b>를 합산한 값입니다. ' +
    '「통계」 탭의 98,809명(61개 대학)은 경인지역 7개교(인천대·인하대·한양대ERICA·을지대·평택대·한국공학대·용인대, 계 9,891명) ' +
    '추가 이전에 작성된 표이며, 정원외 통합선발(재외국민·북한이탈 등 51명)도 제외되어 있어 두 수치가 다릅니다. 원본 시트를 그대로 보존했습니다.';
  v.appendChild(nb);

  var g2 = el('div', 'grid2');

  // panel A — 대학 구분별 모집인원
  var pA = el('div', 'panel');
  pA.appendChild(el('h3', '', '대학 구분별 수시 모집인원 <span>2027 수시 기준</span>'));
  var gl = Object.keys(byGrp).sort(groupSort);
  var gmax = Math.max.apply(null, gl.map(function (g) { return byGrp[g].tot; }));
  gl.forEach(function (g) {
    var o = byGrp[g], n = Object.keys(o.unis).length;
    var b = el('div', 'gbar');
    b.innerHTML = '<div>' + grpTag(g) + '</div>' +
      '<div class="gbar-track"><div class="gbar-fill" style="width:' + (o.tot / gmax * 100).toFixed(1) + '%"></div></div>' +
      '<div class="gbar-n">' + nfm(o.tot) + '</div>';
    b.title = g + ' · ' + n + '개교 · ' + nfm(o.tot) + '명';
    pA.appendChild(b);
  });
  pA.appendChild(el('p', 'sec-sub', '막대 길이는 구분별 모집인원 합계. 괄호 없는 수치는 명(名).'));
  g2.appendChild(pA);

  // panel B — 전형유형 구성 상위 대학
  var pB = el('div', 'panel');
  pB.appendChild(el('h3', '', '대학별 전형유형 구성 <span>모집인원 상위 24개교</span>'));
  var lg = el('div', 'legend');
  lg.innerHTML = [['교과', 'gyo'], ['종합', 'jong'], ['논술', 'non'], ['실기', 'sil']].map(function (o) {
    return '<span><i class="s-' + o[1] + '"></i>' + o[0] + '</span>';
  }).join('');
  pB.appendChild(lg);
  uniList.slice().sort(function (a, b) { return b.tot - a.tot; }).slice(0, 24).forEach(function (u) {
    var s = el('div', 'sbar');
    var segs = [['교과', 'gyo'], ['종합', 'jong'], ['논술', 'non'], ['실기', 'sil']].map(function (o) {
      var w = u.tot ? (u[o[0]] / u.tot * 100) : 0;
      if (w <= 0) return '';
      return '<div class="sbar-seg s-' + o[1] + '" style="width:' + w.toFixed(2) + '%" title="' +
        esc(u.uni) + ' ' + o[0] + ' ' + nfm(u[o[0]]) + '명 (' + w.toFixed(1) + '%)"></div>';
    }).join('');
    s.innerHTML = '<div class="sbar-top"><span class="sbar-name">' + grpTag(u.grp) + esc(u.uni) +
      '</span><span class="sbar-tot">' + nfm(u.tot) + '명</span></div>' +
      '<div class="sbar-track">' + segs + '</div>';
    pB.appendChild(s);
  });
  g2.appendChild(pB);
  v.appendChild(g2);

  // scope panel
  var pC = el('div', 'panel');
  pC.appendChild(el('h3', '', 'DB 수록 범위'));
  D['안내'].forEach(function (line) {
    if (!line) return;
    var p = el('p', 'bul');
    p.style.cssText = 'font-size:12.5px;line-height:1.7;color:#23343F;margin-bottom:5px';
    p.innerHTML = esc(line);
    pC.appendChild(p);
  });
  v.appendChild(pC);
  return v;
}

/* =========================================================
   VIEW 2 — 전형방식
   ========================================================= */
var stMethod = mkState(), sortMethod = { k: '모집인원', dir: -1 };
function viewMethod() {
  var v = el('div', 'view');
  var head = el('div', 'sec-head');
  head.innerHTML = '<h2>전형방식</h2><span class="desc">전형요소·선발배수·수능최저·전형일정을 한 표로. 행 클릭 없이 가로 스크롤로 전 항목 확인</span>';
  v.appendChild(head);

  var all = D['전형방식'].rows;
  var body = el('div');
  var bar = filterBar({
    state: stMethod, data: all, showYear: true, showType: true, countId: 'cnt-m',
    placeholder: '대학·전형명 검색',
    onChange: render
  });
  v.appendChild(bar); v.appendChild(body);

  function render() {
    var f = applyFilter(all, stMethod);
    var s = sortRows(f, sortMethod.k, sortMethod.dir);
    var sum = f.reduce(function (a, r) { return a + toNum(r['모집인원']); }, 0);
    body.innerHTML = '';
    body.appendChild(buildTable({
      rows: s, sort: sortMethod,
      onSort: function (k) {
        if (sortMethod.k === k) sortMethod.dir *= -1; else { sortMethod.k = k; sortMethod.dir = (k === '모집인원' ? -1 : 1); }
        render();
      },
      cols: [
        { k: '학년도', label: '학년도', cls: 'nowrap', fmt: function (x) { return yrTag(x); } },
        { k: '대학그룹', label: '구분', cls: 'nowrap', fmt: function (x) { return grpTag(x); } },
        { k: '지역', label: '지역', cls: 'nowrap small' },
        { k: '대학', label: '대학', cls: 'uni' },
        { k: '전형유형', label: '유형', cls: 'nowrap', fmt: function (x) { return typeTag(x); } },
        { k: '전형명', label: '전형명', w: '150px' },
        { k: '모집인원', label: '인원', cls: 'num', fmt: function (x) { return nfm(x); } },
        { k: '선발방법', label: '선발방법', cls: 'small', w: '110px' },
        { k: '1단계 전형요소', label: '1단계 전형요소', cls: 'small', w: '130px' },
        { k: '2단계/일괄 전형요소', label: '2단계/일괄 전형요소', cls: 'small', w: '180px' },
        { k: '면접', label: '면접', cls: 'small', w: '90px' },
        { k: '수능최저학력기준', label: '수능최저', cls: 'small', w: '150px' },
        { k: '한국사', label: '한국사', cls: 'nowrap small' },
        { k: '수시내 비율', label: '비율', cls: 'num small' },
        { k: '원서접수', label: '원서접수', cls: 'nowrap small' },
        { k: '1단계 발표', label: '1단계 발표', cls: 'nowrap small' },
        { k: '면접/논술 고사', label: '고사일', cls: 'nowrap small' },
        { k: '최종 발표', label: '최종발표', cls: 'nowrap small' },
        { k: '비고', label: '비고', cls: 'small', w: '150px' }
      ]
    }));
    setCount('cnt-m', f.length, all.length, sum, v);
    wireExport('cnt-m', function () { return s; }, function () { return D['전형방식'].headers; }, '2027수시_전형방식', v);
  }
  render();
  return v;
}

/* =========================================================
   VIEW 3 — 전형별 인원요약
   ========================================================= */
var stQuota = mkState(), sortQuota = { k: '모집인원', dir: -1 };
function viewQuota() {
  var v = el('div', 'view');
  var head = el('div', 'sec-head');
  head.innerHTML = '<h2>전형별 모집인원</h2><span class="desc">핵심전형·특별전형(기타) 구분 · 대학 수시 총원 대비 비율</span>';
  v.appendChild(head);

  var all = D['전형별_인원요약'].rows;
  var body = el('div');
  var coreOnly = { v: '' };
  var pl = el('div', 'fgrp');
  pl.appendChild(el('div', 'flabel', '전형 성격'));
  var pp = el('div', 'pills');
  [['', '전체'], ['핵심', '핵심전형'], ['기타', '특별전형']].forEach(function (o) {
    var b = el('button', 'pill', o[1]);
    if (coreOnly.v === o[0]) b.classList.add('is-on');
    b.onclick = function () {
      coreOnly.v = o[0];
      pp.querySelectorAll('.pill').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on'); render();
    };
    pp.appendChild(b);
  });
  pl.appendChild(pp);

  v.appendChild(filterBar({
    state: stQuota, data: all, showYear: true, showType: true, countId: 'cnt-q',
    extra: [pl], onChange: render
  }));
  v.appendChild(body);

  function render() {
    var f = applyFilter(all, stQuota).filter(function (r) {
      return !coreOnly.v || r['핵심/기타'] === coreOnly.v;
    });
    var s = sortRows(f, sortQuota.k, sortQuota.dir);
    var sum = f.reduce(function (a, r) { return a + toNum(r['모집인원']); }, 0);
    body.innerHTML = '';
    body.appendChild(buildTable({
      rows: s, sort: sortQuota,
      onSort: function (k) {
        if (sortQuota.k === k) sortQuota.dir *= -1; else { sortQuota.k = k; sortQuota.dir = (k === '모집인원' ? -1 : 1); }
        render();
      },
      cols: [
        { k: '학년도', label: '학년도', cls: 'nowrap', fmt: function (x) { return yrTag(x); } },
        { k: '대학그룹', label: '구분', cls: 'nowrap', fmt: function (x) { return grpTag(x); } },
        { k: '지역', label: '지역', cls: 'nowrap small' },
        { k: '대학', label: '대학', cls: 'uni' },
        { k: '전형유형', label: '유형', cls: 'nowrap', fmt: function (x) { return typeTag(x); } },
        { k: '전형명', label: '전형명', w: '170px' },
        {
          k: '핵심/기타', label: '성격', cls: 'nowrap', fmt: function (x) {
            return x === '핵심' ? '<span class="tag tag-grp" style="background:#DCE7F5;color:#1F5FA8">핵심</span>'
              : '<span class="tag tag-grp">특별</span>';
          }
        },
        { k: '모집인원', label: '인원', cls: 'num', fmt: function (x) { return nfm(x); } },
        { k: '수시 합계', label: '대학 총원', cls: 'num small', fmt: function (x) { return nfm(x); } },
        { k: '비율', label: '비율', cls: 'num small' },
        { k: '비고(특별전형 자격기준 등)', label: '지원자격·비고', cls: 'small', w: '340px' }
      ]
    }));
    setCount('cnt-q', f.length, all.length, sum, v);
    wireExport('cnt-q', function () { return s; }, function () { return D['전형별_인원요약'].headers; }, '2027수시_전형별인원', v);
  }
  render();
  return v;
}

/* =========================================================
   VIEW 4 — 모집단위별
   ========================================================= */
var stUnit = mkState(), sortUnit = { k: '모집인원', dir: -1 };
stUnit.yr = '';
function viewUnit() {
  var v = el('div', 'view');
  var head = el('div', 'sec-head');
  head.innerHTML = '<h2>모집단위별 전형</h2><span class="desc">학과·전공 단위 모집인원 (핵심전형 기준) · 계열 분류 포함</span>';
  v.appendChild(head);

  var all = D['모집단위별_핵심전형'].rows;
  var body = el('div');
  var gyeState = { v: [] };
  var gp = el('div', 'fgrp');
  gp.appendChild(el('div', 'flabel', '계열'));
  var gpp = el('div', 'pills');
  uniq(all.map(function (r) { return r['계열']; })).sort().forEach(function (c) {
    var b = el('button', 'pill', esc(c));
    b.onclick = function () {
      var i = gyeState.v.indexOf(c);
      if (i >= 0) gyeState.v.splice(i, 1); else gyeState.v.push(c);
      b.classList.toggle('is-on'); render();
    };
    gpp.appendChild(b);
  });
  gp.appendChild(gpp);

  v.appendChild(filterBar({
    state: stUnit, data: all, showYear: false, showType: true, countId: 'cnt-u',
    placeholder: '대학·모집단위·전형명 검색', extra: [gp], onChange: render
  }));
  v.appendChild(body);

  function render() {
    var f = applyFilter(all, stUnit, { searchFields: ['대학', '모집단위', '단과', '전형명'] })
      .filter(function (r) { return !gyeState.v.length || gyeState.v.indexOf(r['계열']) >= 0; });
    var s = sortRows(f, sortUnit.k, sortUnit.dir);
    var sum = f.reduce(function (a, r) { return a + toNum(r['모집인원']); }, 0);
    body.innerHTML = '';
    body.appendChild(buildTable({
      rows: s, sort: sortUnit,
      onSort: function (k) {
        if (sortUnit.k === k) sortUnit.dir *= -1; else { sortUnit.k = k; sortUnit.dir = (k === '모집인원' ? -1 : 1); }
        render();
      },
      cols: [
        { k: '대학그룹', label: '구분', cls: 'nowrap', fmt: function (x) { return grpTag(x); } },
        { k: '대학', label: '대학', cls: 'uni' },
        { k: '계열', label: '계열', cls: 'nowrap small' },
        { k: '단과', label: '단과대학', cls: 'small', w: '130px' },
        { k: '모집단위', label: '모집단위', w: '150px' },
        { k: '전형유형', label: '유형', cls: 'nowrap', fmt: function (x) { return typeTag(x); } },
        { k: '전형명', label: '전형명', w: '160px' },
        { k: '모집인원', label: '인원', cls: 'num', fmt: function (x) { return nfm(x); } }
      ]
    }));
    setCount('cnt-u', f.length, all.length, sum, v);
    wireExport('cnt-u', function () { return s; }, function () { return D['모집단위별_핵심전형'].headers; }, '2027수시_모집단위별', v);
  }
  render();
  return v;
}

/* =========================================================
   VIEW 5 — 특별전형 자격 매트릭스
   ========================================================= */
var QUAL = ['농어촌', '기초생활수급', '차상위', '한부모', '국가보훈', '장애인·특수교육', '자립지원',
  '서해5도', '다문화', '다자녀', '군인·소방·경찰자녀', '재직자(산업체)', '특성화고졸',
  '지역인재(비수도권)', '가톨릭지도자추천', '국제·외국어특기', '예체능·체육특기', '사이버국방(군)'];
var stSp = mkState(), sortSp = { k: '모집인원', dir: -1 };
stSp.yr = '';
function viewSpecial() {
  var v = el('div', 'view');
  var head = el('div', 'sec-head');
  head.innerHTML = '<h2>특별전형 지원자격 매트릭스</h2><span class="desc">18개 자격기준 × 전형 단위. ●는 해당 자격으로 지원 가능</span>';
  v.appendChild(head);

  var all = D['특별전형_자격매트릭스'].rows;
  var body = el('div');
  var qSel = { v: [] };
  var qp = el('div', 'fgrp');
  qp.appendChild(el('div', 'flabel', '지원자격 (선택 시 해당 자격 인정 전형만)'));
  var qpp = el('div', 'pills');
  QUAL.forEach(function (q) {
    var b = el('button', 'pill', esc(q));
    b.onclick = function () {
      var i = qSel.v.indexOf(q);
      if (i >= 0) qSel.v.splice(i, 1); else qSel.v.push(q);
      b.classList.toggle('is-on'); render();
    };
    qpp.appendChild(b);
  });
  qp.appendChild(qpp);

  v.appendChild(filterBar({
    state: stSp, data: all, showYear: false, showType: false, countId: 'cnt-s',
    placeholder: '대학·전형명 검색', extra: [qp], onChange: render
  }));
  v.appendChild(body);

  function render() {
    var f = applyFilter(all, stSp, { searchFields: ['대학', '전형명'] })
      .filter(function (r) {
        if (!qSel.v.length) return true;
        return qSel.v.every(function (q) { return toNum(r[q]) === 1; });
      });
    var s = sortRows(f, sortSp.k, sortSp.dir);
    var sum = f.reduce(function (a, r) { return a + toNum(r['모집인원']); }, 0);

    var cols = [
      { k: '대학그룹', label: '구분', cls: 'nowrap', fmt: function (x) { return grpTag(x); } },
      { k: '대학', label: '대학', cls: 'uni' },
      { k: '전형명', label: '전형명', w: '170px' },
      { k: '모집인원', label: '인원', cls: 'num', fmt: function (x) { return nfm(x); } }
    ];
    QUAL.forEach(function (q) {
      cols.push({
        k: q, label: q, sortable: false,
        fmt: function (x) { return toNum(x) === 1 ? '<div class="matrix-y">●</div>' : '<div class="matrix-n">·</div>'; }
      });
    });
    body.innerHTML = '';
    var tb = buildTable({
      rows: s, sort: sortSp, cols: cols,
      onSort: function (k) {
        if (sortSp.k === k) sortSp.dir *= -1; else { sortSp.k = k; sortSp.dir = (k === '모집인원' ? -1 : 1); }
        render();
      }
    });
    tb.querySelectorAll('thead th').forEach(function (th, i) { if (i >= 4) th.classList.add('vert'); });
    body.appendChild(tb);
    setCount('cnt-s', f.length, all.length, sum, v);
    wireExport('cnt-s', function () { return s; }, function () { return D['특별전형_자격매트릭스'].headers; }, '2027수시_특별전형자격', v);
  }
  render();
  return v;
}

/* =========================================================
   VIEW 6 — 고사일정 달력
   ========================================================= */
var calKind = { v: '논술' };
function viewCal() {
  var v = el('div', 'view');
  var head = el('div', 'sec-head');
  head.innerHTML = '<h2>고사일정</h2><span class="desc">2027 수시 논술·면접 고사일. 인문=파랑 · 자연=빨강 · 공통/기타=보라</span>';
  v.appendChild(head);

  var box = el('div', 'filters'), row = el('div', 'frow');
  var g1 = el('div', 'fgrp'); g1.appendChild(el('div', 'flabel', '고사 종류'));
  var p1 = el('div', 'pills');
  [['논술', '논술 고사'], ['면접', '면접 고사']].forEach(function (o) {
    var b = el('button', 'pill' + (calKind.v === o[0] ? ' is-on' : ''), o[1]);
    b.onclick = function () {
      calKind.v = o[0];
      p1.querySelectorAll('.pill').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on'); render();
    };
    p1.appendChild(b);
  });
  g1.appendChild(p1); row.appendChild(g1);

  var g2 = el('div', 'fgrp'); g2.appendChild(el('div', 'flabel', '검색'));
  var inp = el('input', 'search'); inp.type = 'search'; inp.placeholder = '대학명 검색';
  var q = { v: '' }, tid;
  inp.oninput = function () { clearTimeout(tid); tid = setTimeout(function () { q.v = inp.value.trim(); render(); }, 160); };
  g2.appendChild(inp); row.appendChild(g2);
  var note = el('div', 'fnote'); note.id = 'cnt-c'; row.appendChild(note);
  box.appendChild(row); v.appendChild(box);

  var body = el('div'); v.appendChild(body);

  function parseDate(s) {
    // "11.28(토)" → {m:11,d:28,w:'토'}
    var m = /^(\d{1,2})\.(\d{1,2})/.exec(String(s || ''));
    if (!m) return null;
    var w = /\(([^)]+)\)/.exec(String(s));
    return { m: +m[1], d: +m[2], w: w ? w[1] : '' };
  }
  function evClass(gye) {
    if (gye === '인문') return 'e-in';
    if (gye === '자연') return 'e-ja';
    return 'e-gt';
  }

  function render() {
    var src = D[calKind.v + '일정'] || [];
    var qq = q.v.toLowerCase();
    var list = src.filter(function (r) {
      return !qq || String(r['대학'] || '').toLowerCase().indexOf(qq) >= 0;
    });

    // bucket by year-month
    var buckets = {};
    list.forEach(function (r) {
      var dt = parseDate(r['일자']);
      if (!dt) return;
      var yr = dt.m >= 9 ? 2026 : 2027;
      var key = yr + '-' + dt.m;
      if (!buckets[key]) buckets[key] = { y: yr, m: dt.m, days: {} };
      (buckets[key].days[dt.d] = buckets[key].days[dt.d] || []).push(r);
    });
    var keys = Object.keys(buckets).sort(function (a, b) {
      var A = buckets[a], B = buckets[b];
      return A.y - B.y || A.m - B.m;
    });

    body.innerHTML = '';
    if (!keys.length) {
      body.appendChild(el('div', 'empty', '<strong>해당 대학의 고사일정이 없습니다</strong>검색어를 지우거나 다른 고사 종류를 선택해 보세요.'));
    } else {
      var grid = el('div', 'cal-grid');
      keys.forEach(function (k) {
        var b = buckets[k];
        var mon = el('div', 'cal-mon');
        mon.appendChild(el('h4', '', b.m + '월 <span style="font-size:11px;color:#6C7C87;font-family:var(--mono)">' + b.y + '</span>'));
        var dg = el('div', 'cal-days');
        ['일', '월', '화', '수', '목', '금', '토'].forEach(function (d, i) {
          dg.appendChild(el('div', 'cal-dow' + (i === 0 ? ' sun' : i === 6 ? ' sat' : ''), d));
        });
        var first = new Date(b.y, b.m - 1, 1).getDay();
        var last = new Date(b.y, b.m, 0).getDate();
        for (var i = 0; i < first; i++) dg.appendChild(el('div', 'cal-cell void'));
        for (var d = 1; d <= last; d++) {
          var evs = b.days[d] || [];
          var c = el('div', 'cal-cell' + (evs.length ? ' has' : ''));
          var h = '<div class="cal-d">' + d + '</div>';
          evs.slice(0, 12).forEach(function (e) {
            var label = e['대학'] + (e['계열'] && e['계열'] !== '공통' ? '(' + e['계열'] + ')' : '');
            var tip = e['대학'] + ' · ' + (e['계열'] || '') + ' · ' + e['일자'] + (e['비고'] ? ' · ' + e['비고'] : '');
            h += '<span class="cal-ev ' + evClass(e['계열']) + '" title="' + esc(tip) + '">' + esc(label) + '</span>';
          });
          if (evs.length > 12) h += '<span class="cal-more">＋' + (evs.length - 12) + '개교</span>';
          c.innerHTML = h;
          dg.appendChild(c);
        }
        mon.appendChild(dg);
        grid.appendChild(mon);
      });
      body.appendChild(grid);

      // list table
      var lt = el('div');
      lt.style.marginTop = '18px';
      var lh = el('div', 'sec-head');
      lh.innerHTML = '<h2 style="font-size:15px">' + calKind.v + ' 고사일 목록</h2><span class="desc">일자순</span>';
      lt.appendChild(lh);
      var sorted = list.slice().sort(function (a, b) {
        var A = parseDate(a['일자']), B = parseDate(b['일자']);
        if (!A || !B) return 0;
        var ay = A.m >= 9 ? 0 : 1, by = B.m >= 9 ? 0 : 1;
        return ay - by || A.m - B.m || A.d - B.d || String(a['대학']).localeCompare(String(b['대학']), 'ko');
      });
      lt.appendChild(buildTable({
        rows: sorted, sort: null,
        cols: [
          { k: '일자', label: '일자', cls: 'nowrap', sortable: false, fmt: function (x) { return '<b style="font-family:var(--mono)">' + esc(x) + '</b>'; } },
          {
            k: '대학', label: '대학', cls: 'uni', sortable: false, fmt: function (x, r) {
              var g = D._meta.group_master[x];
              return grpTag(g) + esc(x);
            }
          },
          {
            k: '계열', label: '계열', cls: 'nowrap', sortable: false, fmt: function (x) {
              return '<span class="tag ' + (x === '인문' ? 't-jong' : x === '자연' ? 't-non' : 't-etc') + '">' + esc(x || '공통') + '</span>';
            }
          },
          { k: '비고', label: '비고', cls: 'small', sortable: false }
        ]
      }));
      body.appendChild(lt);
    }
    var cnt = v.querySelector('#cnt-c');
    if (!cnt) return;
    cnt.innerHTML = '<span>고사 <b class="count-n">' + nfm(list.length) + '</b>건</span>' +
      '<button class="btn" id="cnt-c-csv">CSV 저장</button><button class="btn" id="cnt-c-prn">인쇄</button>';
    v.querySelector('#cnt-c-csv').onclick = function () {
      downloadCSV(list, ['대학', '계열', '일자', '비고'], '2027수시_' + calKind.v + '고사일정');
    };
    v.querySelector('#cnt-c-prn').onclick = function () { window.print(); };
  }
  render();
  return v;
}

/* =========================================================
   VIEW 7 — 통계
   ========================================================= */
function viewStat() {
  var v = el('div', 'view');
  var head = el('div', 'sec-head');
  head.innerHTML = '<h2>통계</h2><span class="desc">원본 통계 시트 7개 표 · 열 제목 클릭으로 정렬</span>';
  v.appendChild(head);

  var nb = el('div', 'callout');
  nb.innerHTML = '<strong>집계 시점 주의</strong> · 아래 표는 원본 workbook의 통계 시트를 <b>그대로</b> 옮긴 것으로, ' +
    '집계 기준은 <b>61개 대학 · 98,809명</b>입니다. 경인지역 7개교(인천대·인하대·한양대ERICA·을지대·평택대·한국공학대·용인대)는 ' +
    '이후 추가되어 이 표에 반영되어 있지 않습니다. 68개 대학 전체 기준 수치는 「개관」·「전형별 인원」 탭을 이용하세요.';
  v.appendChild(nb);

  D['통계'].forEach(function (t, ti) {
    if (!t.headers || !t.rows.length) return;
    var p = el('div', 'panel');
    p.appendChild(el('h3', '', esc(t.title)));
    var hdr = t.headers.map(function (h, i) { return h || ('열' + (i + 1)); });
    var objs = t.rows.map(function (r) {
      var o = {};
      hdr.forEach(function (h, i) { o[h] = r[i] === undefined ? null : r[i]; });
      return o;
    });
    var srt = { k: hdr[0], dir: 1 };
    var holder = el('div');
    function draw() {
      var rows = objs.slice();
      // keep 합계 rows pinned to bottom
      var totals = rows.filter(function (r) { return /합계|소계|전체/.test(String(r[hdr[0]] || '')); });
      var normal = rows.filter(function (r) { return !/합계|소계|전체/.test(String(r[hdr[0]] || '')); });
      normal = sortRows(normal, srt.k, srt.dir);
      holder.innerHTML = '';
      holder.appendChild(buildTable({
        rows: normal.concat(totals), sort: srt,
        onSort: function (k) { if (srt.k === k) srt.dir *= -1; else { srt.k = k; srt.dir = 1; } draw(); },
        cols: hdr.map(function (h, i) {
          return {
            k: h, label: h,
            cls: i === 0 ? 'uni' : (/%|인원|합계|계$/.test(h) || i > 0 ? 'num' : ''),
            fmt: function (x, r) {
              if (i === 0 && D._meta.group_master[x]) return grpTag(D._meta.group_master[x]) + esc(x);
              return typeof x === 'number' ? nfm(x) : esc(x);
            }
          };
        })
      }));
    }
    draw();
    p.appendChild(holder);
    var bt = el('button', 'btn', 'CSV 저장');
    bt.style.marginTop = '10px';
    bt.onclick = function () { downloadCSV(objs, hdr, '2027수시_통계_표' + (ti + 1)); };
    p.appendChild(bt);
    v.appendChild(p);
  });
  return v;
}

/* =========================================================
   VIEW 8 — 보고서·검증
   ========================================================= */
function viewDoc() {
  var v = el('div', 'view');
  var d = el('div', 'doc');
  var lines = D['보고서'];
  d.appendChild(el('h2', '', esc(lines[0] || '분석 보고서')));
  lines.slice(1).forEach(function (t) {
    if (!t) return;
    if (/^작성 기준일/.test(t)) { d.appendChild(el('p', 'meta', esc(t))); return; }
    if (/^[ⅠⅡⅢⅣⅤⅥⅦ]\./.test(t)) { d.appendChild(el('h3', '', esc(t))); return; }
    if (/^※/.test(t)) { d.appendChild(el('p', 'tail', esc(t))); return; }
    d.appendChild(el('p', /^[•①②③④⑤]/.test(t) ? 'bul' : '', esc(t)));
  });
  v.appendChild(d);

  // 검증 표
  var p = el('div', 'panel');
  p.appendChild(el('h3', '', '요강 원본 대조 — 정정사항'));
  D['검증'].note.forEach(function (n) {
    if (n) p.appendChild(el('p', 'sec-sub', esc(n)));
  });
  var rows = D['검증'].rows.map(function (r) {
    return { '대학': r[0], '항목': r[1], '기존': r[2], '정정': r[3] };
  }).filter(function (r) { return r['대학'] && r['대학'] !== '대학'; });
  p.appendChild(buildTable({
    rows: rows, sort: null,
    cols: [
      { k: '대학', label: '대학', cls: 'uni', sortable: false },
      { k: '항목', label: '항목', cls: 'nowrap', sortable: false },
      { k: '기존', label: '기존 (오류·누락)', cls: 'small', sortable: false, fmt: function (x) { return '<span class="no">' + esc(x) + '</span>'; } },
      { k: '정정', label: '정정 (요강 원본)', sortable: false, fmt: function (x) { return '<span class="ok">' + esc(x) + '</span>'; } }
    ]
  }));
  v.appendChild(p);

  var c = el('div', 'callout');
  c.innerHTML = '<strong>확인 필요</strong> · 삼육대는 원본 요강 부재로 기존 DB값을 유지하고 있습니다(원본 확보 후 재검증 필요). ' +
    '동덕·성신·단국·한국항공·경기2부 8개교와 대구·춘천교대(이미지 PDF)·전주교대(HWP)는 요강 표구조가 비표준이어서 정밀추출이 보류된 상태입니다.';
  v.appendChild(c);
  return v;
}

/* =========================================================
   router
   ========================================================= */
var VIEWS = {
  dash: viewDash, method: viewMethod, quota: viewQuota, unit: viewUnit,
  special: viewSpecial, cal: viewCal, stat: viewStat, doc: viewDoc
};
var cache = {};
function show(name) {
  app.innerHTML = '';
  app.appendChild(cache[name] || (cache[name] = VIEWS[name]()));
  window.scrollTo(0, 0);
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
}
document.getElementById('tabs').addEventListener('click', function (e) {
  var b = e.target.closest('.tab');
  if (!b) return;
  document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('is-on'); });
  b.classList.add('is-on');
  show(b.dataset.view);
});
function initialView() {
  var h = (location.hash || '').replace(/^#/, '');
  return Object.prototype.hasOwnProperty.call(VIEWS, h) ? h : 'dash';
}
function syncTabs(name) {
  document.querySelectorAll('.tab').forEach(function (b) {
    b.classList.toggle('is-on', b.dataset.view === name);
  });
}
var init = initialView();
syncTabs(init);
show(init);
window.addEventListener('hashchange', function () {
  var n = initialView();
  syncTabs(n);
  show(n);
});

})();
