/* 메뉴 화면(screen-menu) 컨트롤러. 카테고리 목록·영상·자막은
   assets/js/data.js의 CATEGORIES 배열에서 가져온다. */

(function () {
  "use strict";

  var ICON_PATHS = {
    bus:
      '<path d="M4 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />' +
      '<path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />' +
      '<path d="M4 17h-2v-11a1 1 0 0 1 1 -1h14a5 7 0 0 1 5 7v5h-2m-4 0h-8" />' +
      '<path d="M16 5l1.5 7l4.5 0" /><path d="M2 10l15 0" />' +
      '<path d="M7 5l0 5" /><path d="M12 5l0 5" />',
    "alert-triangle":
      '<path d="M12 9v4" />' +
      '<path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0" />' +
      '<path d="M12 16h.01" />',
    "clock-hour-4":
      '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12l3 2" /><path d="M12 7v5" />'
  };

  // 크기는 고정 px가 아니라 CSS(.category-icon)에서 타일 크기의 %로 지정한다
  function buildIconSvg(iconName, color) {
    return (
      '<svg class="category-icon" viewBox="0 0 24 24" fill="none" ' +
      'stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      ICON_PATHS[iconName] +
      "</svg>"
    );
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  var avatarVideo = document.getElementById("avatarVideo");
  var fallback = document.getElementById("avatarFallback");
  var promptEl = document.getElementById("menuPrompt");
  var placeNameEl = document.getElementById("placeName");
  var placeSubEl = document.getElementById("placeSubLabel");
  var grid = document.getElementById("categoryGrid");
  var interpreterCta = document.getElementById("menuInterpreterCta");
  var interpreterCtaTextEl = document.getElementById("menuInterpreterCtaText");
  var backButton = document.getElementById("menuBackButton");
  var backButtonLabelEl = document.getElementById("menuBackLabel");

  var fallbackTimer = null;
  var categoryLabelEls = []; // { cat, el } — 언어 전환 시 카테고리 라벨을 다시 채우기 위해

  function showFallback() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    avatarVideo.setAttribute("hidden", "");
    fallback.removeAttribute("hidden");
  }

  function hideFallback() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    fallback.setAttribute("hidden", "");
    avatarVideo.removeAttribute("hidden");
  }

  avatarVideo.addEventListener("error", showFallback);
  avatarVideo.addEventListener("playing", hideFallback);

  // ---------------------------------------------------------------------
  // 카테고리 그리드는 한 번만 렌더링한다. 촬영된 영상이 하나도 없는
  // 카테고리는 자동으로 흐리게 처리하고 터치를 막는다.
  // ---------------------------------------------------------------------

  CATEGORIES.forEach(function (cat) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-button";
    btn.dataset.id = cat.id;

    var tile = document.createElement("span");
    tile.className = "category-tile";
    tile.style.backgroundColor = hexToRgba(cat.color, 0.18);
    tile.innerHTML = buildIconSvg(cat.icon, cat.color);

    var badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = "준비 중";
    badge.hidden = true;
    tile.appendChild(badge);

    var label = document.createElement("span");
    label.className = "category-label";
    categoryLabelEls.push({ cat: cat, el: label });

    btn.appendChild(tile);
    btn.appendChild(label);
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-disabled")) {
        console.log("[menu] category '" + cat.id + "' tapped but disabled — ignored");
        return;
      }
      console.log("[menu] category '" + cat.id + "' tapped — switching to content screen");
      Kiosk.switchScreen("content", { cat: cat.id });
    });

    grid.appendChild(btn);

    // 클립이 여러 개라도 준비 여부는 첫 번째 클립 파일 하나로 판정한다
    var firstClipUrl = VIDEO_BASE + cat.clips[0].file;
    Kiosk.probeClip(firstClipUrl, 5000, function (exists) {
      console.log(
        "[menu] category '" + cat.id + "' — first clip '" + cat.clips[0].file + "' " +
        (exists ? "found -> button enabled" : "missing -> button disabled")
      );
      if (!exists) {
        btn.classList.add("is-disabled");
        btn.setAttribute("aria-disabled", "true");
        badge.hidden = false;
      }
    });
  });

  interpreterCta.addEventListener("click", function () {
    Kiosk.connectTo107();
  });

  backButton.addEventListener("click", function () {
    Kiosk.switchScreen("standby");
  });

  Kiosk.onLangChange(function (lang) {
    var t = TEXT[lang];
    var isEn = lang === "en";
    placeNameEl.textContent = t.placeName;
    placeSubEl.textContent = t.placeSub;
    backButtonLabelEl.textContent = t.menuBack;
    promptEl.textContent = isEn ? (MENU_IDLE_CLIP.en || MENU_IDLE_CLIP.caption) : MENU_IDLE_CLIP.caption;
    interpreterCtaTextEl.textContent = t.menuInterpreterCta;
    categoryLabelEls.forEach(function (entry) {
      entry.el.textContent = isEn ? (entry.cat.labelEn || entry.cat.label) : entry.cat.label;
    });
  });

  // ---------------------------------------------------------------------
  // 메뉴에 들어오면 아직 안 받아둔 나머지 클립들을 백그라운드에서 순서대로
  // 예열한다 (첫 클립은 앱 시작 시 이미 예열됨 — content.js 참고)
  // ---------------------------------------------------------------------

  function preloadRemainingClips() {
    CATEGORIES.forEach(function (cat) {
      cat.clips.forEach(function (clip) {
        Kiosk.preloadClip(VIDEO_BASE + clip.file);
      });
    });
  }

  function show() {
    avatarVideo.src = VIDEO_BASE + MENU_IDLE_CLIP.file;
    avatarVideo.load();
    fallbackTimer = setTimeout(showFallback, 4000);
    avatarVideo.play().catch(function () {});

    preloadRemainingClips();

    Kiosk.startIdleReturn(60000, "standby");
  }

  function hide() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    avatarVideo.pause();
  }

  Kiosk.registerScreen("menu", { show: show, hide: hide });
})();
