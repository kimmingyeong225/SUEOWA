/* 부트스트랩: assets/partials/*.html(화면별 마크업)을 fetch로 불러와
   #app에 붙인 다음, 화면별 컨트롤러 스크립트를 순서대로 로드하고
   대기 화면을 띄운다. HTML은 화면별 파일로 나뉘어 있지만 실제 동작은
   여전히 완전한 단일 페이지(페이지 이동 없음)다. */
(function () {
  "use strict";

  var SCREENS = ["standby", "menu", "content", "relay", "survey"];
  var SCREEN_SCRIPTS = [
    "assets/js/app.js",
    "assets/js/menu.js",
    "assets/js/content.js",
    "assets/js/relay.js",
    "assets/js/survey.js"
  ];

  var app = document.getElementById("app");

  function loadScriptsInOrder(urls) {
    return urls.reduce(function (chain, url) {
      return chain.then(function () {
        return new Promise(function (resolve, reject) {
          var script = document.createElement("script");
          script.src = url;
          script.onload = resolve;
          script.onerror = function () {
            reject(new Error("스크립트 로드 실패: " + url));
          };
          document.body.appendChild(script);
        });
      });
    }, Promise.resolve());
  }

  Promise.all(
    SCREENS.map(function (name) {
      return fetch("assets/partials/" + name + ".html").then(function (res) {
        if (!res.ok) throw new Error("partial 로드 실패: " + name + " (" + res.status + ")");
        return res.text();
      });
    })
  )
    .then(function (htmlChunks) {
      app.innerHTML = htmlChunks.join("\n");
      console.log("[boot] 화면 4개 partial 로드 완료");
      return loadScriptsInOrder(SCREEN_SCRIPTS);
    })
    .then(function () {
      console.log("[boot] 화면 컨트롤러 스크립트 로드 완료 — 대기 화면 시작");
      Kiosk.currentScreen = "standby";
      if (Kiosk.screens.standby && Kiosk.screens.standby.show) {
        Kiosk.screens.standby.show({});
      }
      Kiosk.setupGlobalTapFeedback();
      Kiosk.guardInput();
      Kiosk.requestWakeLock();
      Kiosk.fadeInOnLoad();
    })
    .catch(function (err) {
      console.error("[boot] 부팅 실패:", err);
    });
})();
