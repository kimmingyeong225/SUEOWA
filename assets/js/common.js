/* 단일 페이지 앱의 공용 인프라.
   대기/메뉴/콘텐츠/107 네 화면이 전부 하나의 index.html 안에 섹션으로
   존재하고, 이 파일이 화면 전환(표시 토글)·유휴 복귀·터치 피드백·
   프리로드 등 공통 로직을 담당한다. */
(function () {
  "use strict";

  window.Kiosk = window.Kiosk || {};

  // ---------------------------------------------------------------------
  // 화면 전환: .screen 중 하나만 .is-active로 표시. 실제 페이지 이동이
  // 없으므로 0.3초 페이드만 걸고 바로 다음 화면을 그린다
  // ---------------------------------------------------------------------

  Kiosk.screens = {};
  Kiosk.currentScreen = null;

  // controller = { show: function(opts) {...} } — show는 화면이 보이기 시작할 때 호출됨
  Kiosk.registerScreen = function (name, controller) {
    Kiosk.screens[name] = controller;
  };

  Kiosk.switchScreen = function (name, opts) {
    var previous = Kiosk.currentScreen;
    console.log("[Kiosk.switchScreen] " + previous + " -> " + name);
    document.body.classList.add("page-fade-out");

    setTimeout(function () {
      if (previous && Kiosk.screens[previous] && Kiosk.screens[previous].hide) {
        Kiosk.screens[previous].hide();
      }

      var sections = document.querySelectorAll(".screen");
      for (var i = 0; i < sections.length; i++) {
        sections[i].classList.remove("is-active");
      }
      var target = document.getElementById("screen-" + name);
      if (target) target.classList.add("is-active");

      // 대기 화면(standby)에서는 화면 전체 터치 = 메뉴로 이동(터치 레이어가
      // 클릭을 가로챔). 다른 화면에서는 터치 파장만 보여주고 클릭은
      // 그대로 버튼에 전달돼야 하므로 tap-layer--passive를 토글한다
      var tapLayer = document.getElementById("tapLayer");
      if (tapLayer) {
        tapLayer.classList.toggle("tap-layer--passive", name !== "standby");
      }

      Kiosk.currentScreen = name;
      if (Kiosk.screens[name] && Kiosk.screens[name].show) {
        Kiosk.screens[name].show(opts || {});
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.body.classList.remove("page-fade-out");
        });
      });
    }, 300);
  };

  // ---------------------------------------------------------------------
  // 터치 피드백: 터치 지점에서 파란 원이 크게 퍼지며 사라짐.
  // 화면이 여러 개라도 터치 레이어는 하나만 공유한다
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

  // 전체 앱에서 한 번만 호출. 터치 파장 표시 + (대기 화면일 때만) 메뉴로 이동
  Kiosk.setupGlobalTapFeedback = function () {
    var tapLayer = document.getElementById("tapLayer");
    if (!tapLayer) return;

    var spawnRipple = Kiosk.spawnRippleOn(tapLayer);
    var isTransitioning = false;

    document.addEventListener("pointerdown", function (event) {
      var point =
        event.changedTouches && event.changedTouches.length
          ? event.changedTouches[0]
          : event;
      spawnRipple(point.clientX, point.clientY);

      if (Kiosk.currentScreen === "standby" && !isTransitioning) {
        isTransitioning = true;
        setTimeout(function () {
          isTransitioning = false;
          Kiosk.switchScreen("menu");
        }, 550);
      }
    });
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

  // 앱 최초 구동 시 0.3초 페이드 인 (화면 전환 자체는 switchScreen이 담당)
  Kiosk.fadeInOnLoad = function () {
    document.body.classList.add("page-fade-in");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.remove("page-fade-in");
      });
    });
  };

  // ---------------------------------------------------------------------
  // 무입력 시 자동 복귀. 화면이 바뀔 때마다 각 화면의 show()에서 다시
  // 호출해 대상 화면·타임아웃을 갱신한다 (내부적으로 이전 타이머/리스너를
  // 먼저 정리하므로 중복 등록 걱정 없음)
  // ---------------------------------------------------------------------

  var idleTimer = null;
  var idleResetFn = null;

  Kiosk.stopIdleReturn = function () {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (idleResetFn) {
      document.removeEventListener("pointerdown", idleResetFn);
      document.removeEventListener("keydown", idleResetFn);
      idleResetFn = null;
    }
  };

  Kiosk.startIdleReturn = function (timeoutMs, targetScreen) {
    Kiosk.stopIdleReturn();

    function reset() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        Kiosk.switchScreen(targetScreen);
      }, timeoutMs);
    }

    idleResetFn = reset;
    document.addEventListener("pointerdown", reset);
    document.addEventListener("keydown", reset);
    reset();
  };

  // ---------------------------------------------------------------------
  // 107 수어통역 연결: QR 화면으로 전환
  // ---------------------------------------------------------------------

  Kiosk.connectTo107 = function () {
    Kiosk.switchScreen("relay");
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

  // ---------------------------------------------------------------------
  // 백그라운드 프리로드: 화면에 보이지 않는 <video preload="auto">로
  // 미리 받아둬서, 실제 재생 시점엔 서버 캐시(serve.js의 Cache-Control)에서
  // 바로 응답되게 한다. 같은 URL은 한 번만 예열한다.
  //
  // 한꺼번에 여러 개를 동시에 받으면 지금 화면에 실제로 보여줘야 하는
  // 영상(대기화면/메뉴 아바타)과 대역폭·커넥션을 놓고 경쟁해 오히려
  // 그 영상이 늦게 뜨는 역효과가 난다. 그래서 (1) 부팅 직후 약간의
  // 여유를 두고 (2) 한 번에 하나씩만 순차적으로 예열한다.
  // ---------------------------------------------------------------------

  var preloadedUrls = {};
  var preloadPool = [];
  var preloadQueue = [];
  var preloadActive = 0;
  var PRELOAD_CONCURRENCY = 1;
  var preloadGateOpen = false;

  setTimeout(function () {
    preloadGateOpen = true;
    pumpPreloadQueue();
  }, 2500);

  function pumpPreloadQueue() {
    if (!preloadGateOpen) return;

    while (preloadActive < PRELOAD_CONCURRENCY && preloadQueue.length) {
      (function (url) {
        preloadActive += 1;

        var probe = document.createElement("video");
        probe.preload = "auto";
        probe.muted = true;
        probe.style.display = "none";

        function settle(msg) {
          probe.removeEventListener("canplaythrough", onReady);
          probe.removeEventListener("error", onErr);
          console.log("[Kiosk.preloadClip] " + msg + ": " + url);
          preloadActive -= 1;
          pumpPreloadQueue();
        }

        function onReady() {
          settle("warmed");
        }
        function onErr() {
          settle("failed (probably missing file)");
        }

        probe.addEventListener("canplaythrough", onReady);
        probe.addEventListener("error", onErr);

        probe.src = url;
        probe.load();
        preloadPool.push(probe); // GC로 중간에 취소되지 않도록 참조 유지
      })(preloadQueue.shift());
    }
  }

  Kiosk.preloadClip = function (url) {
    if (!url || preloadedUrls[url]) return;
    preloadedUrls[url] = true;
    preloadQueue.push(url);
    pumpPreloadQueue();
  };

  Kiosk.preloadClips = function (urls) {
    urls.forEach(Kiosk.preloadClip);
  };
})();
