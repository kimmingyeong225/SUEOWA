/* 여러 화면(index.html, menu.html, ...)이 공유하는 유틸리티.
   화면이 늘어나도 터치 피드백/화면 전환/유휴 복귀 로직을 한 곳에서 유지한다. */
(function () {
  "use strict";

  window.Kiosk = window.Kiosk || {};

  // ---------------------------------------------------------------------
  // 터치 피드백: 터치 지점에서 파란 원이 크게 퍼지며 사라짐
  // ---------------------------------------------------------------------

  Kiosk.spawnRippleOn = function (layer) {
    return function spawnRipple(x, y) {
      var ripple = document.createElement("div");
      ripple.className = "ripple";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";

      ripple.addEventListener("animationend", function onEnd() {
        ripple.removeEventListener("animationend", onEnd);
        ripple.remove();
      });

      layer.appendChild(ripple);
    };
  };

  // ---------------------------------------------------------------------
  // 길게 눌러도 컨텍스트 메뉴/텍스트 선택/드래그가 뜨지 않도록 차단
  // ---------------------------------------------------------------------

  Kiosk.guardInput = function () {
    document.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    document.addEventListener("selectstart", function (e) {
      e.preventDefault();
    });
    document.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });
  };

  // ---------------------------------------------------------------------
  // 화면 꺼짐 방지 (지원하지 않는 브라우저에서는 조용히 무시)
  // ---------------------------------------------------------------------

  Kiosk.requestWakeLock = function () {
    var wakeLock = null;

    function request() {
      if (!("wakeLock" in navigator)) return;
      navigator.wakeLock
        .request("screen")
        .then(function (lock) {
          wakeLock = lock;
          wakeLock.addEventListener("release", function () {
            wakeLock = null;
          });
        })
        .catch(function () {
          /* 미지원 또는 거부 — 무시 */
        });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") request();
    });

    request();
  };

  // ---------------------------------------------------------------------
  // 화면 전환: 0.3초 페이드 아웃 후 다음 페이지로 이동
  // ---------------------------------------------------------------------

  Kiosk.fadeNavigate = function (url) {
    console.log("[Kiosk.fadeNavigate] navigating to " + url + " in 300ms");
    document.body.classList.add("page-fade-out");
    setTimeout(function () {
      console.log("[Kiosk.fadeNavigate] location.href = " + url);
      window.location.href = url;
    }, 300);
  };

  // 페이지 진입 시 0.3초 페이드 인
  Kiosk.fadeInOnLoad = function () {
    document.body.classList.add("page-fade-in");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.remove("page-fade-in");
      });
    });
  };

  // ---------------------------------------------------------------------
  // 60초 무입력 시 대기 화면으로 자동 복귀
  // ---------------------------------------------------------------------

  Kiosk.setupIdleReturn = function (timeoutMs, targetUrl) {
    var timer = null;

    function reset() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        Kiosk.fadeNavigate(targetUrl);
      }, timeoutMs);
    }

    ["pointerdown", "keydown"].forEach(function (evt) {
      document.addEventListener(evt, reset);
    });

    reset();
  };

  // ---------------------------------------------------------------------
  // 107 수어통역 연결 (실제 구현은 이후 연결 — 지금은 빈 함수)
  // ---------------------------------------------------------------------

  Kiosk.connectTo107 = function () {
    // TODO: 수어통역 상담원 연결 로직을 여기에 연결한다.
  };

  // ---------------------------------------------------------------------
  // 영상 파일 존재 여부 확인: 촬영이 늦어진 파일이 섞여 있어도
  // 있는 파일만 자동으로 재생 목록에 남기기 위한 용도
  // ---------------------------------------------------------------------

  Kiosk.probeClip = function (url, timeoutMs, cb) {
    var done = false;
    var probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;

    var timer = setTimeout(function () {
      finish(false, "timeout after " + timeoutMs + "ms");
    }, timeoutMs);

    function finish(exists, reason) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      probe.removeEventListener("loadedmetadata", onLoad);
      probe.removeEventListener("error", onError);
      probe.src = "";
      console.log(
        "[Kiosk.probeClip] " + url + " -> " + (exists ? "exists" : "missing") + " (" + reason + ")"
      );
      cb(exists);
    }

    function onLoad() {
      finish(true, "loadedmetadata");
    }

    function onError() {
      finish(false, "error event");
    }

    probe.addEventListener("loadedmetadata", onLoad);
    probe.addEventListener("error", onError);
    probe.src = url;
  };

  // urls: 확인할 영상 URL 배열. cb({ url: true|false, ... })
  Kiosk.probeClips = function (urls, cb) {
    var results = {};
    var remaining = urls.length;

    if (remaining === 0) {
      cb(results);
      return;
    }

    urls.forEach(function (url) {
      Kiosk.probeClip(url, 5000, function (exists) {
        results[url] = exists;
        remaining -= 1;
        if (remaining === 0) cb(results);
      });
    });
  };
})();
