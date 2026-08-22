(function () {
  "use strict";

  var MEDIA_ERROR_NAMES = {
    1: "MEDIA_ERR_ABORTED",
    2: "MEDIA_ERR_NETWORK",
    3: "MEDIA_ERR_DECODE",
    4: "MEDIA_ERR_SRC_NOT_SUPPORTED"
  };

  function findCategory(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  var catId = new URLSearchParams(window.location.search).get("cat");
  console.log("[content] script start — url search param cat = '" + catId + "'");

  var category = findCategory(catId);

  var video = document.getElementById("contentVideo");
  var fallback = document.getElementById("contentFallback");
  var categoryLabelEl = document.getElementById("categoryLabel");
  var placeSubEl = document.getElementById("placeSub");
  var progressCountEl = document.getElementById("progressCount");
  var progressFillEl = document.getElementById("progressFill");
  var backButton = document.getElementById("backButton");
  var replayButton = document.getElementById("replayButton");
  var prevButton = document.getElementById("prevButton");
  var nextButton = document.getElementById("nextButton");
  var tapLayer = document.getElementById("tapLayer");

  placeSubEl.textContent = PLACE_NAME + " 수어 안내";

  function goToMenu() {
    console.log("[content] returning to menu.html");
    Kiosk.fadeNavigate("menu.html");
  }

  backButton.addEventListener("click", goToMenu);

  if (!category) {
    console.error("[content] no category found for id '" + catId + "' — returning to menu");
    goToMenu();
    return;
  }

  console.log(
    "[content] category '" + category.id + "' (" + category.label + ") resolved, " +
    category.clips.length + " clip(s) defined: " +
    category.clips.map(function (c) { return c.file; }).join(", ")
  );

  categoryLabelEl.textContent = category.label;

  // ---------------------------------------------------------------------
  // 정의된 클립을 순서대로 재생 시도한다. 사전에 모든 파일의 존재 여부를
  // 따로 확인하지 않고(불필요한 지연/실패 지점을 줄이기 위해), 실제 재생
  // 시도 중 error 이벤트가 나면 그 클립만 건너뛰고 다음 클립으로 넘어간다.
  // ---------------------------------------------------------------------

  var playlist = category.clips;
  var current = 0;
  var everPlayed = false;

  function showFallback() {
    video.setAttribute("hidden", "");
    fallback.removeAttribute("hidden");
  }

  function hideFallback() {
    fallback.setAttribute("hidden", "");
    video.removeAttribute("hidden");
  }

  function updateProgress() {
    progressCountEl.textContent = (current + 1) + " / " + playlist.length;
    progressFillEl.style.width = (((current + 1) / playlist.length) * 100) + "%";
    prevButton.disabled = current <= 0;
    nextButton.disabled = current >= playlist.length - 1;
  }

  function playCurrent() {
    var clip = playlist[current];
    var url = VIDEO_BASE + clip.file;
    updateProgress();
    console.log("[content] loading clip " + (current + 1) + "/" + playlist.length + ": " + url);

    video.src = url;
    video.load();

    var playPromise = video.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function (err) {
        console.error(
          "[content] video.play() rejected for " + url + " — " +
          (err && err.name ? err.name : "unknown error") + ": " +
          (err && err.message ? err.message : err)
        );
        advance();
      });
    }
  }

  // 사용자가 이전/다음 버튼으로 직접 이동
  function goToClip(index) {
    if (index < 0 || index >= playlist.length) return;
    current = index;
    playCurrent();
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
      console.log("[content] last clip finished — returning to menu");
      goToMenu();
      return;
    }
    current += 1;
    playCurrent();
  }

  video.addEventListener("loadedmetadata", function () {
    console.log("[content] loadedmetadata: " + video.src + " (duration " + video.duration + "s)");
  });

  video.addEventListener("playing", function () {
    everPlayed = true;
    hideFallback();
    console.log("[content] playing: " + video.src);
  });

  video.addEventListener("ended", function () {
    console.log("[content] ended: " + video.src);
    advance();
  });

  video.addEventListener("error", function () {
    var mediaError = video.error;
    var code = mediaError ? mediaError.code : "?";
    var name = MEDIA_ERROR_NAMES[code] || "UNKNOWN";
    console.error(
      "[content] error loading clip " + (current + 1) + "/" + playlist.length + ": " +
      video.src + " — code " + code + " (" + name + ")"
    );
    advance();
  });

  replayButton.addEventListener("click", function () {
    console.log("[content] replay requested — restarting playlist");
    current = 0;
    everPlayed = false;
    playCurrent();
  });

  prevButton.addEventListener("click", function () {
    console.log("[content] prev requested (currently " + (current + 1) + "/" + playlist.length + ")");
    goToClip(current - 1);
  });

  nextButton.addEventListener("click", function () {
    console.log("[content] next requested (currently " + (current + 1) + "/" + playlist.length + ")");
    goToClip(current + 1);
  });

  hideFallback();
  playCurrent();

  // ---------------------------------------------------------------------
  // 화면 전체 터치 피드백
  // ---------------------------------------------------------------------

  var spawnRipple = Kiosk.spawnRippleOn(tapLayer);

  document.addEventListener("pointerdown", function (event) {
    var point =
      event.changedTouches && event.changedTouches.length
        ? event.changedTouches[0]
        : event;
    spawnRipple(point.clientX, point.clientY);
  });

  Kiosk.guardInput();
  Kiosk.requestWakeLock();
  Kiosk.fadeInOnLoad();
  Kiosk.setupIdleReturn(60000, "index.html");
})();
