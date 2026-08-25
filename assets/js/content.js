/* 콘텐츠 재생 화면(screen-content) 컨트롤러.
   video 2개(A/B)를 겹쳐두고 하나는 재생, 하나는 다음 클립을 미리 로드해
   두었다가 opacity 전환으로 즉시 교체한다 (대기 화면과 같은 방식).
   이전/다시보기처럼 미리 로드해두지 않은 클립으로 이동할 때만
   그 자리에서 새로 불러온다 — 그 경우에도 앱 시작·메뉴 진입 시 미리
   예열해둔 브라우저 캐시 덕분에 대체로 빠르게 뜬다. */
(function () {
  "use strict";

  var MEDIA_ERROR_NAMES = {
    1: "MEDIA_ERR_ABORTED",
    2: "MEDIA_ERR_NETWORK",
    3: "MEDIA_ERR_DECODE",
    4: "MEDIA_ERR_SRC_NOT_SUPPORTED"
  };

  var videoA = document.getElementById("contentVideoA");
  var videoB = document.getElementById("contentVideoB");
  var fallback = document.getElementById("contentFallback");
  var captionEl = document.getElementById("playerCaption");
  var captionBarEl = document.getElementById("playerCaptionBar");
  var langKoButton = document.getElementById("contentLangKoButton");
  var langEnButton = document.getElementById("contentLangEnButton");
  var loadingEl = document.getElementById("contentLoading");
  var categoryLabelEl = document.getElementById("categoryLabel");
  var placeSubEl = document.getElementById("placeSub");
  var progressCountEl = document.getElementById("progressCount");
  var progressFillEl = document.getElementById("progressFill");
  var backButton = document.getElementById("contentBackButton");
  var backButtonLabelEl = document.getElementById("contentBackLabel");
  var replayButton = document.getElementById("replayButton");
  var replayButtonLabelEl = document.getElementById("replayButtonLabel");
  var prevButton = document.getElementById("prevButton");
  var prevButtonLabelEl = document.getElementById("prevButtonLabel");
  var nextButton = document.getElementById("nextButton");
  var nextButtonLabelEl = document.getElementById("nextButtonLabel");
  var surveyEntryBar = document.getElementById("surveyEntryBar");
  var surveyEntryButton = document.getElementById("surveyEntryButton");

  var category = null;
  var playlist = [];
  var current = 0;
  var everPlayed = false;
  var activeEl = videoA;
  var standbyEl = videoB;
  var loadingShowTimer = null;

  function urlFor(clip) {
    return VIDEO_BASE + clip.file;
  }

  function findCategory(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // 자막/UI 언어. 상태는 Kiosk.lang(공용, common.js)에 저장돼 화면을
  // 넘나들어도 유지되고, 대기 화면으로 돌아가면 app.js가 "ko"로 되돌린다.
  // 이 화면의 토글 버튼은 Kiosk.applyLang()을 호출해 대기 화면 토글과
  // 상태를 공유한다.
  // ---------------------------------------------------------------------

  // 한 줄에 맞을 때까지 글자 크기를 줄여보고(최소 70%까지), 그래도 안
  // 맞으면 포기하고 CSS(white-space:normal + text-wrap:balance)가 알아서
  // 보기 좋게 줄바꿈하도록 넘긴다
  function fitCaptionToOneLine() {
    captionEl.style.fontSize = "";
    captionEl.style.whiteSpace = "nowrap";

    var maxSize = parseFloat(getComputedStyle(captionEl).fontSize);
    var minSize = maxSize * 0.7;
    var availableWidth = captionBarEl.clientWidth -
      parseFloat(getComputedStyle(captionBarEl).paddingLeft) -
      parseFloat(getComputedStyle(captionBarEl).paddingRight);

    var size = maxSize;
    while (captionEl.scrollWidth > availableWidth && size > minSize) {
      size -= 1;
      captionEl.style.fontSize = size + "px";
    }

    if (captionEl.scrollWidth > availableWidth) {
      // 최소 크기로도 한 줄에 못 들어감 — 줄바꿈을 허용한다
      captionEl.style.whiteSpace = "normal";
    }
  }

  function renderCaption() {
    if (!captionEl || playlist.length === 0) return;
    var clip = playlist[current];
    var isEn = Kiosk.lang === "en";

    captionEl.textContent = isEn ? (clip.en || clip.caption || "") : (clip.caption || "");
    fitCaptionToOneLine();
  }

  // 카테고리에 들어와 있을 때만 의미 있는 부분(카테고리명·장소 서브텍스트).
  // show()와 언어 변경 리스너 양쪽에서 부른다
  function applyCategoryText(lang) {
    if (!category) return;
    var t = TEXT[lang];
    var isEn = lang === "en";
    categoryLabelEl.textContent = isEn ? (category.labelEn || category.label) : category.label;
    placeSubEl.textContent = t.placeName + " " + t.placeSub;
  }

  langKoButton.addEventListener("click", function () { Kiosk.applyLang("ko"); });
  langEnButton.addEventListener("click", function () { Kiosk.applyLang("en"); });

  Kiosk.onLangChange(function (lang) {
    var t = TEXT[lang];
    langKoButton.classList.toggle("is-active", lang === "ko");
    langEnButton.classList.toggle("is-active", lang === "en");
    backButtonLabelEl.textContent = t.contentBack;
    prevButtonLabelEl.textContent = t.contentPrev;
    nextButtonLabelEl.textContent = t.contentNext;
    replayButtonLabelEl.textContent = t.contentReplay;
    applyCategoryText(lang);
    renderCaption();
  });

  // ---------------------------------------------------------------------
  // 로딩 표시: 0.3초 안에 재생이 시작되면 아예 보여주지 않는다.
  // 깜빡임 없이 부드러운 페이드로만 나타났다 사라진다
  // ---------------------------------------------------------------------

  function scheduleLoading() {
    cancelLoadingHide();
    if (loadingShowTimer) return;
    loadingShowTimer = setTimeout(function () {
      loadingShowTimer = null;
      loadingEl.hidden = false;
      requestAnimationFrame(function () {
        loadingEl.classList.add("is-visible");
      });
    }, 300);
  }

  function cancelLoadingHide() {
    if (loadingShowTimer) {
      clearTimeout(loadingShowTimer);
      loadingShowTimer = null;
    }
  }

  function hideLoading() {
    cancelLoadingHide();
    if (loadingEl.classList.contains("is-visible")) {
      loadingEl.classList.remove("is-visible");
      setTimeout(function () {
        loadingEl.hidden = true;
      }, 300);
    } else {
      loadingEl.hidden = true;
    }
  }

  // ---------------------------------------------------------------------
  // 대체 화면 (카테고리 전체 영상이 하나도 없을 때)
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

  function goToMenu() {
    Kiosk.switchScreen("menu");
  }

  // ---------------------------------------------------------------------
  // 평가하기 진입 버튼: 카테고리의 마지막 클립까지 다 보고 나면 나타난다.
  // (이전/다시보기/다음 등 재생 위치가 바뀌면 다시 숨긴다)
  // ---------------------------------------------------------------------

  function showSurveyEntry() {
    surveyEntryBar.hidden = false;
  }

  function hideSurveyEntry() {
    surveyEntryBar.hidden = true;
  }

  // ---------------------------------------------------------------------
  // 재생/전환
  // ---------------------------------------------------------------------

  function updateProgress() {
    progressCountEl.textContent = (current + 1) + " / " + playlist.length;
    progressFillEl.style.width = (((current + 1) / playlist.length) * 100) + "%";
    prevButton.disabled = current <= 0;
    nextButton.disabled = current >= playlist.length - 1;
  }

  function preloadStandby() {
    var nextIdx = current + 1;
    if (nextIdx >= playlist.length) return;
    var url = urlFor(playlist[nextIdx]);
    standbyEl.src = url;
    standbyEl.load();
    console.log("[content] preloading standby (next) clip: " + url);
  }

  function playActive() {
    updateProgress();
    scheduleLoading();
    renderCaption();
    console.log(
      "[content] playing clip " + (current + 1) + "/" + playlist.length + ": " + activeEl.src
    );
    var playPromise = activeEl.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function (err) {
        console.error(
          "[content] video.play() rejected for " + activeEl.src + " — " +
          (err && err.name ? err.name : "unknown error") + ": " +
          (err && err.message ? err.message : err)
        );
        advance();
      });
    }
    preloadStandby();
  }

  // standby가 이미 다음 클립을 들고 있으면 자리만 바꿔 즉시 재생(크로스페이드),
  // 아니면(이전으로 가기 등) 그 자리에서 새로 불러온다
  function goToClip(index) {
    if (index < 0 || index >= playlist.length) return;

    hideSurveyEntry();

    var isPreloadedNext =
      index === current + 1 &&
      standbyEl.currentSrc &&
      standbyEl.currentSrc.indexOf(playlist[index].file) !== -1;

    if (isPreloadedNext) {
      var tmp = activeEl;
      activeEl = standbyEl;
      standbyEl = tmp;
      activeEl.classList.add("is-active");
      standbyEl.classList.remove("is-active");
      current = index;
      playActive();
    } else {
      current = index;
      activeEl.src = urlFor(playlist[current]);
      activeEl.load();
      playActive();
    }
  }

  function advance() {
    if (current >= playlist.length - 1) {
      if (!everPlayed) {
        console.error(
          "[content] category '" + category.id + "' — none of the " + playlist.length +
          " clip(s) could be played. Showing fallback."
        );
        showFallback();
        setTimeout(goToMenu, 2500);
        return;
      }
      console.log("[content] last clip finished — showing survey entry button");
      showSurveyEntry();
      return;
    }
    goToClip(current + 1);
  }

  function onEnded(event) {
    if (event.target !== activeEl) return;
    console.log("[content] ended: " + activeEl.src);
    advance();
  }

  function onError(event) {
    if (event.target !== activeEl) return;
    var mediaError = activeEl.error;
    var code = mediaError ? mediaError.code : "?";
    var name = MEDIA_ERROR_NAMES[code] || "UNKNOWN";
    console.error(
      "[content] error loading clip " + (current + 1) + "/" + playlist.length + ": " +
      activeEl.src + " — code " + code + " (" + name + ")"
    );
    hideLoading(); // "playing" 이벤트가 안 오므로 여기서도 로딩 표시를 꺼줘야 한다
    advance();
  }

  function onPlaying(event) {
    if (event.target !== activeEl) return;
    everPlayed = true;
    hideFallback();
    hideLoading();
    console.log("[content] playing event fired: " + activeEl.src);
  }

  videoA.addEventListener("ended", onEnded);
  videoB.addEventListener("ended", onEnded);
  videoA.addEventListener("error", onError);
  videoB.addEventListener("error", onError);
  videoA.addEventListener("playing", onPlaying);
  videoB.addEventListener("playing", onPlaying);

  backButton.addEventListener("click", goToMenu);

  replayButton.addEventListener("click", function () {
    console.log("[content] replay requested — restarting playlist");
    everPlayed = false;
    goToClip(0);
  });

  prevButton.addEventListener("click", function () {
    console.log("[content] prev requested (currently " + (current + 1) + "/" + playlist.length + ")");
    goToClip(current - 1);
  });

  nextButton.addEventListener("click", function () {
    console.log("[content] next requested (currently " + (current + 1) + "/" + playlist.length + ")");
    goToClip(current + 1);
  });

  surveyEntryButton.addEventListener("click", function () {
    Kiosk.switchScreen("survey", { from: "content" });
  });

  // ---------------------------------------------------------------------
  // 앱이 처음 뜰 때 모든 카테고리의 첫 클립을 백그라운드에서 예열해둔다.
  // (화면 표시를 막지 않는 비동기 fire-and-forget)
  // ---------------------------------------------------------------------

  CATEGORIES.forEach(function (cat) {
    Kiosk.preloadClip(urlFor(cat.clips[0]));
  });

  // ---------------------------------------------------------------------
  // 화면 진입/이탈
  // ---------------------------------------------------------------------

  function show(opts) {
    var catId = opts && opts.cat;
    category = findCategory(catId);

    if (!category) {
      console.error("[content] no category found for id '" + catId + "' — returning to menu");
      goToMenu();
      return;
    }

    console.log(
      "[content] category '" + category.id + "' (" + category.label + ") resolved, " +
      category.clips.length + " clip(s): " +
      category.clips.map(function (c) { return c.file; }).join(", ")
    );

    applyCategoryText(Kiosk.lang);

    playlist = category.clips;
    current = 0;
    everPlayed = false;
    activeEl = videoA;
    standbyEl = videoB;
    videoA.classList.add("is-active");
    videoB.classList.remove("is-active");
    hideFallback();
    hideSurveyEntry();

    activeEl.src = urlFor(playlist[0]);
    activeEl.load();
    playActive();

    Kiosk.startIdleReturn(60000, "standby");
  }

  function hide() {
    videoA.pause();
    videoB.pause();
    hideLoading();
  }

  Kiosk.registerScreen("content", { show: show, hide: hide });
})();
