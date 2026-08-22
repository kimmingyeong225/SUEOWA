/* 카테고리 목록·영상·자막은 assets/js/data.js의 CATEGORIES 배열에서 가져온다.
   다른 관광지로 교체할 때는 data.js만 바꾸면 된다. */

(function () {
  "use strict";

  // Tabler Icons(outline, MIT) 원본 path. 아이콘을 직접 그리지 않고 공식 마크업을 그대로 사용한다.
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

  function buildIconSvg(iconName, color) {
    return (
      '<svg class="category-icon" width="76" height="76" viewBox="0 0 24 24" fill="none" ' +
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
  var tapLayer = document.getElementById("tapLayer");
  var grid = document.getElementById("categoryGrid");
  var interpreterCta = document.getElementById("interpreterCta");

  var fallbackTimer = null;

  if (placeNameEl) placeNameEl.textContent = PLACE_NAME;

  // ---------------------------------------------------------------------
  // button_select.mp4 유무 처리: 대기 화면과 동일한 방식
  // ---------------------------------------------------------------------

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

  if (promptEl) promptEl.textContent = MENU_IDLE_CLIP.caption;

  if (avatarVideo) {
    avatarVideo.src = VIDEO_BASE + MENU_IDLE_CLIP.file;
    avatarVideo.load();

    fallbackTimer = setTimeout(showFallback, 4000);
    avatarVideo.addEventListener("error", showFallback);
    avatarVideo.addEventListener("playing", hideFallback, { once: true });
  } else {
    showFallback();
  }

  // ---------------------------------------------------------------------
  // 카테고리 그리드 렌더링. 촬영된 영상이 하나도 없는 카테고리는
  // 자동으로 흐리게 처리하고 터치를 막는다 (하드코딩 없이 파일 존재 여부로 판단).
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
    label.textContent = cat.label;

    btn.appendChild(tile);
    btn.appendChild(label);
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-disabled")) {
        console.log("[menu] category '" + cat.id + "' tapped but disabled — ignored");
        return;
      }
      console.log("[menu] category '" + cat.id + "' tapped — navigating to content.html?cat=" + cat.id);
      Kiosk.fadeNavigate("content.html?cat=" + encodeURIComponent(cat.id));
    });

    grid.appendChild(btn);

    // 클립이 여러 개라도 준비 여부는 첫 번째 클립 파일 하나로 판정한다
    // (촬영은 항상 순서대로 진행되므로, 첫 클립이 있으면 카테고리는 사용 가능한 것으로 본다)
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

  // ---------------------------------------------------------------------
  // 107 수어통역 연결 버튼
  // ---------------------------------------------------------------------

  interpreterCta.addEventListener("click", function () {
    Kiosk.connectTo107();
  });

  // ---------------------------------------------------------------------
  // 화면 전체 터치 피드백 (클릭 동작은 그대로 각 버튼에서 처리됨)
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
