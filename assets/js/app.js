(function () {
  "use strict";

  var videoA = document.getElementById("introVideoA");
  var videoB = document.getElementById("introVideoB");
  var fallback = document.getElementById("videoFallback");
  var tapLayer = document.getElementById("tapLayer");

  var isTransitioning = false;
  var playlist = [];
  var current = 0;
  var activeEl = videoA;
  var standbyEl = videoB;

  function urlFor(clip) {
    return VIDEO_BASE + clip.file;
  }

  // ---------------------------------------------------------------------
  // 영상이 하나도 없을 때 보여줄 정적 대체 화면
  // ---------------------------------------------------------------------

  function showFallback() {
    videoA.setAttribute("hidden", "");
    videoB.setAttribute("hidden", "");
    fallback.removeAttribute("hidden");
  }

  function hideFallback() {
    fallback.setAttribute("hidden", "");
    videoA.removeAttribute("hidden");
    videoB.removeAttribute("hidden");
  }

  // ---------------------------------------------------------------------
  // welcome → intro → touch 순서로 끊김 없이 이어 재생 후 무한 반복.
  // 두 개의 video 엘리먼트를 번갈아 사용해 다음 영상을 미리 로드해두고
  // 현재 영상이 끝나면 자리를 바꿔(크로스페이드) 재생한다.
  // ---------------------------------------------------------------------

  function preloadStandby() {
    var nextIdx = (current + 1) % playlist.length;
    standbyEl.src = urlFor(playlist[nextIdx]);
    standbyEl.load();
  }

  function playCurrent() {
    activeEl.currentTime = 0;
    var playPromise = activeEl.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(advance);
    }
    preloadStandby();
  }

  function advance() {
    current = (current + 1) % playlist.length;

    var tmp = activeEl;
    activeEl = standbyEl;
    standbyEl = tmp;

    activeEl.classList.add("is-active");
    standbyEl.classList.remove("is-active");

    playCurrent();
  }

  function onClipEnded(event) {
    if (event.target !== activeEl) return;
    advance();
  }

  function onClipError(event) {
    if (event.target !== activeEl) return;
    advance();
  }

  videoA.addEventListener("ended", onClipEnded);
  videoB.addEventListener("ended", onClipEnded);
  videoA.addEventListener("error", onClipError);
  videoB.addEventListener("error", onClipError);

  function start() {
    hideFallback();
    current = 0;
    activeEl = videoA;
    standbyEl = videoB;
    activeEl.classList.add("is-active");
    standbyEl.classList.remove("is-active");
    activeEl.src = urlFor(playlist[0]);
    activeEl.load();
    playCurrent();
  }

  var urls = ATTRACT_CLIPS.map(urlFor);
  Kiosk.probeClips(urls, function (results) {
    playlist = ATTRACT_CLIPS.filter(function (clip) {
      return results[urlFor(clip)];
    });

    if (playlist.length === 0) {
      showFallback();
      return;
    }

    start();
  });

  // ---------------------------------------------------------------------
  // 메뉴 화면 전환: 터치 파장이 끝난 뒤 0.3초 페이드로 menu.html로 이동
  // ---------------------------------------------------------------------

  function goToMenu() {
    Kiosk.fadeNavigate("menu.html");
  }

  // ---------------------------------------------------------------------
  // 터치 피드백: 터치 지점에서 파란 원이 크게 퍼지며 사라짐 (소리 없이 시각으로만)
  // ---------------------------------------------------------------------

  var spawnRipple = Kiosk.spawnRippleOn(tapLayer);

  function handleTap(event) {
    if (isTransitioning) return;
    isTransitioning = true;

    var point =
      event.changedTouches && event.changedTouches.length
        ? event.changedTouches[0]
        : event;

    spawnRipple(point.clientX, point.clientY);

    setTimeout(function () {
      goToMenu();
    }, 550);
  }

  tapLayer.addEventListener("pointerdown", handleTap);

  Kiosk.guardInput();
  Kiosk.requestWakeLock();
  Kiosk.fadeInOnLoad();
})();
