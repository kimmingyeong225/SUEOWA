/* ==========================================================================
   수어와 — UI 문자열 (다국어)
   화면에 고정으로 박혀 있던 한국어 문구를 전부 여기로 모았다. 각 화면
   스크립트는 Kiosk.onLangChange(fn)으로 이 사전을 참조해 문구를 채우고,
   언어 토글(대기 화면 우측 하단 / 콘텐츠 재생 화면 하단)을 누르면
   Kiosk.applyLang(lang)이 모든 화면의 문구를 한 번에 갱신한다.
   언어를 추가하려면: 아래에 새 언어 키(예: "ja")를 추가하고, ko와 같은
   키를 전부 채우면 된다. 카테고리 라벨(CATEGORIES[].labelEn)과 영상
   자막(clip.en)은 콘텐츠 데이터라 여기가 아니라 data.js에 있다.
   ========================================================================== */
var TEXT = {
  ko: {
    placeName: "태종대",
    placeSub: "수어 안내",
    standbyTouch: "화면을 터치해 주세요",
    standbySignGuide: "수어로 안내해 드립니다",
    menuBack: "뒤로가기",
    menuInterpreterCta: "다른 질문이 있어요 · 수어통역 연결 107",
    contentBack: "메뉴로 돌아가기",
    contentPrev: "이전",
    contentNext: "다음",
    contentReplay: "처음부터 다시 보기",
    relayQrPrompt: "휴대폰으로 QR을 찍어 주세요",
    relaySubtext: "손말이음 홈페이지로 연결됩니다",
    relayBack: "돌아가기"
  },
  en: {
    placeName: "Taejongdae",
    placeSub: "Sign Language Guide",
    standbyTouch: "Touch the screen to start",
    standbySignGuide: "Sign language guide",
    menuBack: "Back",
    menuInterpreterCta: "Other questions · Sign Language Relay 107",
    contentBack: "Back to Menu",
    contentPrev: "Previous",
    contentNext: "Next",
    contentReplay: "Watch from the Beginning",
    relayQrPrompt: "Scan the QR code with your phone",
    relaySubtext: "Connects to the Sonmalieum website",
    relayBack: "Back"
  }
};
