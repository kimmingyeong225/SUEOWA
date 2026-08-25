/* 대기 화면(screen-standby) 컨트롤러. 단일 페이지 안의 한 섹션으로 동작하며
   Kiosk.switchScreen("standby")로 다시 보일 때마다 show()가 처음부터 재생을 시작한다. */
(function () {
  "use strict";

  var videoA = document.getElementById("introVideoA");
  var videoB = document.getElementById("introVideoB");
  var fallback = document.getElementById("videoFallback");
  var captionEl = document.getElementById("introCaption");
  var ctaTextEl = document.getElementById("ctaText");
  var ctaSubtextEl = document.getElementById("ctaSubtext");
  var langKoButton = document.getElementById("standbyLangKoButton");
  var langEnButton = document.getElementById("standbyLangEnButton");

  var playlist = [];
  var current = 0;
  var activeEl = videoA;
  var standbyEl = videoB;
  var started = false;

  function urlFor(clip) {
    return VIDEO_BASE + clip.file;
  }

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

  function renderIntroCaption() {
    if (!captionEl || playlist.length === 0) return;
    var clip = playlist[current];
    var isEn = Kiosk.lang === "en";
    captionEl.textContent = isEn ? (clip.en || clip.caption || "") : (clip.caption || "");
  }

  function playCurrent() {
    renderIntroCaption();
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

  langKoButton.addEventListener("click", function () { Kiosk.applyLang("ko"); });
  langEnButton.addEventListener("click", function () { Kiosk.applyLang("en"); });

  Kiosk.onLangChange(function (lang) {
    var t = TEXT[lang];
    ctaTextEl.textContent = t.standbyTouch;
    ctaSubtextEl.textContent = t.standbySignGuide;
    langKoButton.classList.toggle("is-active", lang === "ko");
    langEnButton.classList.toggle("is-active", lang === "en");
    renderIntroCaption();
  });

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

  function show() {
    videoA.pause();
    videoB.pause();
    started = true;
    Kiosk.applyLang("ko");

    var urls = ATTRACT_CLIPS.map(urlFor);
    Kiosk.probeClips(urls, function (results) {
      if (!started) return; // 그 사이 다른 화면으로 넘어갔으면 재생하지 않는다
      playlist = ATTRACT_CLIPS.filter(function (clip) {
        return results[urlFor(clip)];
      });

      if (playlist.length === 0) {
        showFallback();
        return;
      }

      start();
    });
  }

  function hide() {
    started = false;
    videoA.pause();
    videoB.pause();
  }

  Kiosk.registerScreen("standby", { show: show, hide: hide });
})();
