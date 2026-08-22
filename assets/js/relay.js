/* 손말이음센터 문의 결과로 주소가 바뀌면 이 한 줄만 고치면 된다 */
const RELAY_URL = "https://107.relaycall.or.kr";

(function () {
  "use strict";

  var qrCodeEl = document.getElementById("qrCode");
  var qrFallbackEl = document.getElementById("qrFallback");
  var backButton = document.getElementById("relayBackButton");

  var qrBuilt = false;

  function showFallbackQr() {
    qrCodeEl.setAttribute("hidden", "");
    qrFallbackEl.removeAttribute("hidden");
  }

  function buildQr() {
    if (qrBuilt) return;
    qrBuilt = true;

    if (typeof QRCode === "undefined") {
      showFallbackQr();
      return;
    }
    try {
      new QRCode(qrCodeEl, {
        text: RELAY_URL,
        width: 300,
        height: 300,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (e) {
      showFallbackQr();
    }
  }

  function goToMenu() {
    Kiosk.switchScreen("menu");
  }

  backButton.addEventListener("click", goToMenu);

  function show() {
    buildQr(); // 한 번만 생성 — 재생성할 필요 없음
    Kiosk.startIdleReturn(30000, "menu");
  }

  Kiosk.registerScreen("relay", { show: show });
})();
