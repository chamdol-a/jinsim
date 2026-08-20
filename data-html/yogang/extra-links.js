/* =========================================================================
   대학 자료실 — 직접 등록 자료 (전공가이드북 · 전형별 안내 책자 등)
   -------------------------------------------------------------------------
   ▶ 어디가(adiga)에 올라오는 자료(시행계획·수시/정시요강·선행학습영향평가·
     논술자료)는  yogang-data.js  가 자동으로 채웁니다. 손댈 필요 없습니다.
   ▶ 여기에는 어디가에 없는 자료 — 전공가이드북, 학생부전형 가이드북,
     전형별 안내 책자, 입학처 발간자료 페이지 — 를 손으로 등록합니다.

   ▶ 추가하는 법 (한 줄만 복사해서 고치면 됩니다)
       "대학이름": [
         { title:"자료 이름", url:"주소", type:"guide", year:"2027" }
       ],
     · 대학이름 : 왼쪽 목록에 보이는 이름 그대로. 캠퍼스가 여럿이면
                  "고려대학교[본교]" 처럼 대괄호까지 적으면 그 캠퍼스에만 붙습니다.
     · type     : guide(전공가이드북·책자) / plan / susi / jeongsi / prior / essay
     · year     : 비워도 됩니다. 적으면 자료 이름 옆에 작게 표시됩니다.
   ▶ 파일을 저장하고 새로고침하면 바로 반영됩니다.
   ========================================================================= */

window.YOGANG_EXTRA = {
  items: {

    "서울대학교[본교]": [
      { title:"입학자료실(발간자료)", url:"https://admission.snu.ac.kr/materials/downloads/press", type:"guide" },
      { title:"웹진 아로리 — 전공안내", url:"https://snuarori.snu.ac.kr/", type:"guide" }
    ],

    "연세대학교[본교]": [
      { title:"전공안내서 ALLWAYS", url:"https://admission.yonsei.ac.kr/seoul/admission/html/data/major/2026/yonsei_allways_251028.pdf", type:"guide", year:"2026" },
      { title:"입학처 통합자료실", url:"https://admission.yonsei.ac.kr/seoul/admission/html/counsel/data.asp", type:"guide" }
    ],

    "고려대학교[본교]": [
      { title:"전공안내(학과별 가이드북)", url:"https://oku.korea.ac.kr/oku/cms/FR_CON/index.do?MENU_ID=820", type:"guide" }
    ],

    "서강대학교[본교]": [
      { title:"입학처 자료실", url:"https://admission.sogang.ac.kr/", type:"guide" }
    ],

    "성균관대학교[본교]": [
      { title:"입학처 발간자료·전공안내", url:"https://admission.skku.edu/", type:"guide" }
    ],

    "한양대학교[본교]": [
      { title:"전공 가이드", url:"https://go.hanyang.ac.kr/web/youtube/youtube2.do", type:"guide" }
    ],

    "경희대학교[본교]": [
      { title:"학생부전형 가이드북", url:"https://kr.object.gov-ncloudstorage.com/khuiphakstorage/upload/20260429043102836_2027%20%ED%95%99%EC%83%9D%EB%B6%80%EC%A0%84%ED%98%95%20%EA%B0%80%EC%9D%B4%EB%93%9C%EB%B6%81.pdf", type:"guide", year:"2027" },
      { title:"입학처 발간자료", url:"https://iphak.khu.ac.kr/submenu.do?menuurl=P1VDYMswmuRM5ruMYMNGxg%3D%3D", type:"guide" }
    ],

    "서울시립대학교[본교]": [
      { title:"전공안내(전공안내서)", url:"https://www.uos.ac.kr/admissionNew/information/department.do?identified=anonymous", type:"guide" }
    ],

    "이화여자대학교[본교]": [
      { title:"입학처 발간자료", url:"https://admission.ewha.ac.kr/admission/html/ewharo/publication2.asp", type:"guide" }
    ],

    "중앙대학교[본교]": [
      { title:"입학처 자료실", url:"https://admission.cau.ac.kr/main.do", type:"guide" }
    ],

    "한국외국어대학교[본교]": [
      { title:"전공가이드북", url:"https://www.hufs.ac.kr/sites/iei/file/2025%EC%A0%84%EA%B3%B5%EA%B0%80%EC%9D%B4%EB%93%9C%EB%B6%81(%EA%B8%80%EB%A1%9C%EB%B2%8C).pdf", type:"guide", year:"2025" },
      { title:"입학처 자료실", url:"https://adms.hufs.ac.kr/index.do", type:"guide" }
    ],

    "동국대학교[본교]": [
      { title:"전공가이드북", url:"https://www.dongguk.edu/page/181", type:"guide" }
    ]

  }
};
