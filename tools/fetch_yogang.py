# -*- coding: utf-8 -*-
"""
진심 입시정보 — '대학 자료실(모집요강 뷰어)' 데이터 자동 수집기
--------------------------------------------------------------------
대입정보포털 '어디가'(adiga.kr)에서 전국 4년제 대학이 제출한 공식 자료의
다운로드 링크를 긁어와  data-html/yogang/yogang-data.js  를 새로 만든다.

수집 대상(대학별)
  · 대학입학전형시행계획
  · 수시모집요강 / 정시모집요강
  · 선행학습영향평가(보고서)
  · 대학별 고사자료(논술/적성)
  · 재외국민 / 외국인 모집요강
  · 모집단위별 반영 과목 등 기타 첨부

사용법 (파워셸/명령프롬프트)
    python ipsi-site/tools/fetch_yogang.py             # 2028 + 2027학년도
    python ipsi-site/tools/fetch_yogang.py 2027        # 특정 학년도만
파이썬 기본 라이브러리만 사용하므로 따로 설치할 것이 없다.
"""

import sys
import os
import re
import json
import time
import urllib.request
import urllib.parse
import http.cookiejar
from concurrent.futures import ThreadPoolExecutor

BASE = "https://www.adiga.kr"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125 Safari/537.36")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                          # ipsi-site/
OUT_DIR = os.path.join(ROOT, "data-html", "yogang")
OUT_JS = os.path.join(OUT_DIR, "yogang-data.js")
META_JSON = os.path.join(OUT_DIR, "univ-meta.json")   # 입학처 주소 등 보존용

YEARS = sys.argv[1:] or ["2028", "2027"]

try:  # 윈도우 콘솔에서 한글이 깨지지 않도록
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def opener():
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.addheaders = [("User-Agent", UA), ("Referer", BASE + "/")]
    return op


def get(op, url, data=None, retry=3):
    for i in range(retry):
        try:
            body = urllib.parse.urlencode(data).encode() if data else None
            with op.open(url, body, timeout=40) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == retry - 1:
                raise
            time.sleep(1.2 * (i + 1))


def fetch_univ_list(op, year):
    """어디가 '대학별 입시가이드' 목록에서 전국 대학 코드·이름·지역을 얻는다."""
    html = get(op, BASE + "/uct/acd/ueg/univEtenGuideView.do?menuId=PCUCTACD3100")
    csrf = re.search(r'name="_csrf" value="([^"]+)"', html).group(1)
    html = get(op, BASE + "/uct/acd/ueg/univEtenGuideView.do", {
        "_csrf": csrf, "searchSyr": year, "menuId": "PCUCTACD3100",
        "pagination.currentPage": 1, "pagination.cntPerPage": 1000,
        "searchConstIndex": 0, "searchUnvComp": 0,
    })
    rows = re.findall(
        r'fnDetailPopup\(&quot;(\d+)&quot;\)">([^<]+)</a>\s*'
        r'<input type="hidden" name="stdClsfRgnNm" value="([^"]*)"', html)
    seen, out = set(), []
    for code, name, region in rows:
        if code in seen:
            continue
        seen.add(code)
        out.append({"code": code, "name": name.strip(),
                    "region": (region or "기타").strip()})
    return out


FILE_RE = re.compile(
    r"fnUnvFileDownOne\(&#39;(\d+)&#39;,\s*&#39;(\d+)&#39;.*?<span>(.*?)</span>", re.S)


def fetch_docs(univ, year):
    """대학 상세 페이지의 '모집요강 다운로드' 첨부 목록을 뽑는다."""
    op = opener()
    html = get(op, BASE + "/ucp/uvt/uni/univDetail.do",
               {"menuId": "PCUVTINF2000", "unvCd": univ["code"], "searchSyr": year})
    i = html.find('id="fileResult"')
    seg = html[i:i + 12000] if i > 0 else ""
    docs = []
    for fid, fsn, label in FILE_RE.findall(seg):
        title = re.sub(r"<br\s*/?>", "", label).strip()
        docs.append({
            "title": title,
            "file_id": fid,
            "file_sn": fsn,
            "url": "%s/cmm/com/file/fileDown.do?fileId=%s&fileSn=%s" % (BASE, fid, fsn),
        })
    return docs



# --------------------------------------------------------------------------
# 사용자 표준 분류(SKY·6·11·15·22·25개·경기·인천·여대·거국·교대) + 의치한약수 태그
# --------------------------------------------------------------------------
CLS_JSON = os.path.join(HERE, "univ-classification.json")


def _base(n):
    b = re.sub(r"\[.*?\]", "", n)
    b = re.sub(r"\(.*?\)", "", b).strip()
    b = b.replace("교육대학교", "교대").replace("여자대학교", "여대").replace("대학교", "대")
    b = b.replace("한국외국어대", "한국외대").replace("서울과학기술대", "서울과기대")
    return b


def _camp(n):
    m = re.search(r"\[(.*?)\]", n)
    return m.group(1) if m else "본교"


def enrich(univs):
    """라인(구분)·의치한약수 정보를 각 대학 레코드에 붙인다."""
    if not os.path.exists(CLS_JSON):
        return
    cls = json.load(open(CLS_JSON, encoding="utf-8"))

    idx = {}
    for u in univs:
        idx.setdefault(_base(u["name"]), {})[_camp(u["name"])] = u

    for line in cls.get("표시순서", []):
        for rank, row in enumerate(cls["대학분류"].get(line, [])):
            pool = idx.get(_base(row["대학"]))
            if not pool:
                continue
            camp_txt = row.get("캠퍼스") or ""
            m = re.search(r"제\d캠퍼스", camp_txt)
            key = m.group(0) if m else ("분교" if "분교" in camp_txt else "본교")
            u = pool.get(key) or (list(pool.values())[0] if len(pool) == 1 else None)
            if u:
                u["line"] = line
                u["rank"] = rank

    med_idx = {}
    for u in univs:
        med_idx.setdefault(_base(u["name"]), []).append(u)
    for field, rows in cls.get("의치한약수", {}).items():
        for nm in rows.get("대학_고유", rows.get("대학", [])):
            for u in med_idx.get(_base(nm), []):
                u.setdefault("med", [])
                if field not in u["med"]:
                    u["med"].append(field)

    ordered = cls.get("표시순서", [])
    for u in univs:
        u["line_no"] = ordered.index(u["line"]) if u.get("line") in ordered else 99


def collect(year):
    op = opener()
    print("[%s] 대학 목록 가져오는 중..." % year)
    univs = fetch_univ_list(op, year)
    print("       대학 %d개 — 자료 링크 수집 중 (2~4분)" % len(univs))
    done = [0]

    def work(u):
        try:
            u["docs"] = fetch_docs(u, year)
        except Exception as e:
            u["docs"] = []
            print("       ! 실패:", u["name"], e)
        done[0] += 1
        if done[0] % 50 == 0:
            print("       %d/%d" % (done[0], len(univs)))
        return u

    with ThreadPoolExecutor(max_workers=8) as ex:
        univs = list(ex.map(work, univs))
    univs = [u for u in univs if u["docs"]]
    total = sum(len(u["docs"]) for u in univs)
    print("       → 대학 %d개 / 자료 %d건" % (len(univs), total))
    return univs


def main():
    meta = {}
    if os.path.exists(META_JSON):
        meta = json.load(open(META_JSON, encoding="utf-8"))

    data = {}
    for year in YEARS:
        univs = collect(year)
        for u in univs:
            u["homepage"] = meta.get(u["code"], {}).get("homepage", "")
            u["short"] = re.sub(r"\[.*?\]", "", u["name"]).strip()
        enrich(univs)
        data[year] = univs

    os.makedirs(OUT_DIR, exist_ok=True)
    payload = {"updated": time.strftime("%Y-%m-%d"),
               "years": list(YEARS), "data": data}
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("/* 자동 생성 파일 — 직접 고치지 마세요.\n")
        f.write("   갱신:  python ipsi-site/tools/fetch_yogang.py\n")
        f.write("   출처: 대입정보포털 어디가(adiga.kr) 공개 자료 */\n")
        f.write("window.YOGANG_DATA = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("완료 →", OUT_JS)


if __name__ == "__main__":
    main()
