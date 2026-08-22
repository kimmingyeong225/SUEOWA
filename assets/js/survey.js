/* 사용자 테스트용 평가 설문(screen-survey) + 관리자 화면(admin-overlay) 컨트롤러.
   Supabase JS SDK는 assets/lib/supabase.js로 로컬 포함되어 전역 `supabase.createClient`로 접근한다
   (CDN 미사용 — 오프라인 대비). 제출은 항상 localStorage(survey_backup)에 먼저 남기고,
   Supabase insert가 실패해도 화면에는 정상 완료로 보여준 뒤 pending 항목으로 남겨
   앱 시작 시 백그라운드에서 자동으로 재전송을 시도한다.

   ⚠️ Supabase의 feedback 테이블에는 expand 컬럼(int2)이 있어야 한다. 없으면 추가해야 한다. */
(function () {
  "use strict";

  var SUPABASE_URL = "https://cyaebtwdqvcavapfieus.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_Z1M8dW9vH-xeLa-MNW0MqA__Mp0LecO";
  var FEEDBACK_TABLE = "feedback";
  var BACKUP_KEY = "survey_backup";

  var TOTAL_PAGES = 6;
  var AUTO_ADVANCE_MS = 400;

  var FACE_LEVELS = [
    { score: 1, color: "#E05B4B" },
    { score: 2, color: "#E08B4B" },
    { score: 3, color: "#C9C077" },
    { score: 4, color: "#7DBE8A" },
    { score: 5, color: "#4ADE9E" }
  ];

  var FACE_QUESTIONS = [
    { key: "understand", title: "수어 안내가 이해되었나요?" },
    { key: "easy", title: "화면 사용이 쉬웠나요?" },
    { key: "natural", title: "아바타 수어가 자연스러웠나요?" },
    { key: "expand", title: "다른 관광지에도 이런 안내가 있으면 좋겠나요?" }
  ];

  var WANT_MORE_OPTIONS = [
    { key: "food", icon: "tools-kitchen-2", label: "맛집" },
    { key: "event", icon: "calendar-event", label: "축제·행사" },
    { key: "history", icon: "book", label: "역사·유래" },
    { key: "directions", icon: "map-pin", label: "교통·길" },
    { key: "facility", icon: "building-store", label: "화장실·편의시설" },
    { key: "etc", icon: "dots", label: "기타" }
  ];

  var WANT_MORE_ICON_PATHS = {
    "tools-kitchen-2":
      '<path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3" />',
    "calendar-event":
      '<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" />' +
      '<path d="M16 3l0 4" /><path d="M8 3l0 4" /><path d="M4 11l16 0" /><path d="M8 15h2v2h-2l0 -2" />',
    book:
      '<path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />' +
      '<path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />' +
      '<path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" />',
    "map-pin":
      '<path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />' +
      '<path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0" />',
    "building-store":
      '<path d="M3 21l18 0" />' +
      '<path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4" />' +
      '<path d="M5 21l0 -10.15" /><path d="M19 21l0 -10.15" />' +
      '<path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4" />',
    dots:
      '<path d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />' +
      '<path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />' +
      '<path d="M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />'
  };

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  // -------------------------------------------------------------------
  // 얼굴 아이콘: 외부 폰트·이모지 없이 인라인 SVG로 직접 그린다 (오프라인 대비)
  // -------------------------------------------------------------------

  function faceParts(score, color) {
    switch (score) {
      case 1:
        // 매우 부정: 화난 눈썹(팔자) + 깊은 찡그림
        return (
          '<path d="M5 7.6 L9.3 9.5" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />' +
          '<path d="M19 7.6 L14.7 9.5" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />' +
          '<path d="M6.5 17.5 Q12 12 17.5 17.5" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />'
        );
      case 2:
        // 부정: 평범한 눈 + 약한 찡그림
        return (
          '<circle cx="8.5" cy="10" r="1.15" fill="' + color + '" />' +
          '<circle cx="15.5" cy="10" r="1.15" fill="' + color + '" />' +
          '<path d="M7.5 16.3 Q12 14.3 16.5 16.3" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />'
        );
      case 3:
        // 보통: 평범한 눈 + 무표정 직선
        return (
          '<circle cx="8.5" cy="10" r="1.15" fill="' + color + '" />' +
          '<circle cx="15.5" cy="10" r="1.15" fill="' + color + '" />' +
          '<path d="M8 15.5 L16 15.5" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />'
        );
      case 4:
        // 긍정: 평범한 눈 + 은은한 미소
        return (
          '<circle cx="8.5" cy="10" r="1.15" fill="' + color + '" />' +
          '<circle cx="15.5" cy="10" r="1.15" fill="' + color + '" />' +
          '<path d="M7.5 15 Q12 17.8 16.5 15" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />'
        );
      case 5:
        // 매우 긍정: 웃는 눈(아치) + 활짝 웃는 입
        return (
          '<path d="M5.8 9.7 Q8.3 7 10.8 9.7" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />' +
          '<path d="M13.2 9.7 Q15.7 7 18.2 9.7" stroke="' + color + '" stroke-width="2" stroke-linecap="round" fill="none" />' +
          '<path d="M6 14.3 Q12 20.5 18 14.3 Q12 17.6 6 14.3 Z" fill="' + color + '" />'
        );
      default:
        return "";
    }
  }

  function buildFaceSvg(score, color) {
    return (
      '<svg class="face-svg" viewBox="0 0 24 24" aria-hidden="true">' + faceParts(score, color) + "</svg>"
    );
  }

  // -------------------------------------------------------------------
  // DOM 참조 (survey 파샬은 부팅 시 한 번만 로드되므로 여기서 바로 잡아둔다)
  // -------------------------------------------------------------------

  var bodyEl = document.getElementById("surveyBody");
  var dotsWrap = document.getElementById("surveyDots");
  var dotEls = dotsWrap.querySelectorAll(".survey-dot");
  var prevButton = document.getElementById("surveyPrevButton");
  var nextButton = document.getElementById("surveyNextButton");
  var closeButton = document.getElementById("surveyCloseButton");
  var completeEl = document.getElementById("surveyComplete");
  var stageEl = document.getElementById("screen-survey");

  var pages = [];
  var answers = {};
  var pageIndex = 0;
  var autoAdvanceTimer = null;

  // -------------------------------------------------------------------
  // 문항 1~4: 얼굴 5단계 척도 페이지
  // -------------------------------------------------------------------

  function selectFace(key, score, btn, row) {
    var siblings = row.querySelectorAll(".face-option");
    for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove("is-selected");
    btn.classList.add("is-selected");
    answers[key] = score;
    updateNextEnabled();

    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(function () {
      goNext();
    }, AUTO_ADVANCE_MS);
  }

  function buildFacePage(question) {
    var page = document.createElement("div");
    page.className = "survey-page";

    var title = document.createElement("p");
    title.className = "survey-question";
    title.textContent = question.title;
    page.appendChild(title);

    var row = document.createElement("div");
    row.className = "face-row";

    FACE_LEVELS.forEach(function (level) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "face-option";
      btn.dataset.key = question.key;
      btn.dataset.score = String(level.score);
      btn.style.setProperty("--face-color", level.color);
      btn.style.setProperty("--face-glow", hexToRgba(level.color, 0.3));

      var circle = document.createElement("span");
      circle.className = "face-circle";
      circle.style.backgroundColor = hexToRgba(level.color, 0.16);
      circle.innerHTML = buildFaceSvg(level.score, level.color);

      var num = document.createElement("span");
      num.className = "face-number";
      num.textContent = String(level.score);

      btn.appendChild(circle);
      btn.appendChild(num);
      btn.addEventListener("click", function () {
        selectFace(question.key, level.score, btn, row);
      });

      row.appendChild(btn);
    });

    page.appendChild(row);
    return page;
  }

  // -------------------------------------------------------------------
  // 문항 5: 다중선택 (want_more) 페이지
  // -------------------------------------------------------------------

  function buildWantMorePage() {
    var page = document.createElement("div");
    page.className = "survey-page";

    var title = document.createElement("p");
    title.className = "survey-question";
    title.textContent = "어떤 내용이 더 있으면 좋을까요?";
    page.appendChild(title);

    var grid = document.createElement("div");
    grid.className = "want-more-grid";

    WANT_MORE_OPTIONS.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "want-more-option";
      btn.dataset.key = opt.key;
      btn.innerHTML =
        '<svg class="want-more-icon" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        WANT_MORE_ICON_PATHS[opt.icon] +
        "</svg>" +
        '<span class="want-more-label">' + opt.label + "</span>";

      btn.addEventListener("click", function () {
        var list = answers.want_more || [];
        var idx = list.indexOf(opt.label);
        if (idx === -1) {
          list.push(opt.label);
          btn.classList.add("is-selected");
        } else {
          list.splice(idx, 1);
          btn.classList.remove("is-selected");
        }
        answers.want_more = list;
      });

      grid.appendChild(btn);
    });

    page.appendChild(grid);
    return page;
  }

  // -------------------------------------------------------------------
  // 문항 6: 자유 의견 (건너뛰기 가능)
  // -------------------------------------------------------------------

  function buildCommentPage() {
    var page = document.createElement("div");
    page.className = "survey-page";

    var title = document.createElement("p");
    title.className = "survey-question";
    title.textContent = "하고 싶은 말이 있나요?";
    page.appendChild(title);

    var sub = document.createElement("p");
    sub.className = "survey-question-sub";
    sub.textContent = "답하지 않아도 괜찮아요";
    page.appendChild(sub);

    var textarea = document.createElement("textarea");
    textarea.className = "survey-comment";
    textarea.rows = 4;
    textarea.maxLength = 500;
    textarea.placeholder = "이곳에 적어 주세요";
    textarea.addEventListener("input", function () {
      answers.comment = textarea.value;
    });
    page.appendChild(textarea);

    return page;
  }

  FACE_QUESTIONS.forEach(function (q) {
    pages.push(buildFacePage(q));
  });
  pages.push(buildWantMorePage());
  pages.push(buildCommentPage());
  pages.forEach(function (p) {
    bodyEl.appendChild(p);
  });

  // -------------------------------------------------------------------
  // 화면 진행 상태
  // -------------------------------------------------------------------

  function updateNextEnabled() {
    if (pageIndex < FACE_QUESTIONS.length) {
      var q = FACE_QUESTIONS[pageIndex];
      nextButton.disabled = !answers[q.key];
    } else {
      nextButton.disabled = false;
    }
  }

  function renderPage() {
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.toggle("is-active", i === pageIndex);
    }
    for (var d = 0; d < dotEls.length; d++) {
      dotEls[d].classList.toggle("is-active", d === pageIndex);
    }
    prevButton.hidden = pageIndex === 0;
    nextButton.textContent = pageIndex === TOTAL_PAGES - 1 ? "제출" : "다음";
    updateNextEnabled();
  }

  function goNext() {
    clearTimeout(autoAdvanceTimer);
    if (nextButton.disabled) return;
    if (pageIndex >= TOTAL_PAGES - 1) {
      submitSurvey();
      return;
    }
    pageIndex += 1;
    renderPage();
  }

  function goPrev() {
    clearTimeout(autoAdvanceTimer);
    if (pageIndex === 0) return;
    pageIndex -= 1;
    renderPage();
  }

  prevButton.addEventListener("click", goPrev);
  nextButton.addEventListener("click", goNext);

  closeButton.addEventListener("click", function () {
    clearTimeout(autoAdvanceTimer);
    Kiosk.switchScreen("menu");
  });

  // -------------------------------------------------------------------
  // localStorage 백업 (survey_backup 배열로 누적)
  // -------------------------------------------------------------------

  function getBackupList() {
    try {
      var raw = localStorage.getItem(BACKUP_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("[survey] localStorage 읽기 실패:", e);
      return [];
    }
  }

  function setBackupList(list) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("[survey] localStorage 쓰기 실패:", e);
    }
  }

  function appendBackup(entry) {
    var list = getBackupList();
    list.push(entry);
    setBackupList(list);
  }

  function markBackupSent(id) {
    var list = getBackupList();
    var changed = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i].pending = false;
        changed = true;
      }
    }
    if (changed) setBackupList(list);
  }

  // -------------------------------------------------------------------
  // Supabase 전송 + 실패 시 재시도
  // -------------------------------------------------------------------

  var supabaseClient = null;

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase && typeof window.supabase.createClient === "function") {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (e) {
        console.error("[survey] supabase 클라이언트 생성 실패:", e);
      }
    } else {
      console.error("[survey] supabase SDK가 로드되지 않았습니다 (assets/lib/supabase.js 확인 필요)");
    }
    return supabaseClient;
  }

  function sendRecord(record, backupId) {
    var client = getSupabaseClient();
    if (!client) return; // 오프라인/미로드 — localStorage에 pending:true로 남아 다음 시작 때 재시도됨

    client
      .from(FEEDBACK_TABLE)
      .insert([record])
      .then(function (res) {
        if (res && res.error) {
          console.error("[survey] insert 실패 — pending 유지:", res.error.message);
          return;
        }
        console.log("[survey] insert 성공 (id=" + backupId + ")");
        markBackupSent(backupId);
      })
      .catch(function (err) {
        console.error("[survey] insert 중 예외 발생 — pending 유지:", err);
      });
  }

  function retryPending() {
    var client = getSupabaseClient();
    if (!client) return;

    var pendingItems = getBackupList().filter(function (item) {
      return item.pending;
    });
    if (pendingItems.length === 0) return;

    console.log("[survey] 미전송 " + pendingItems.length + "건 백그라운드 재전송 시도");
    pendingItems.forEach(function (item) {
      client
        .from(FEEDBACK_TABLE)
        .insert([item.payload])
        .then(function (res) {
          if (res && res.error) {
            console.error("[survey] 재전송 실패 (id=" + item.id + "):", res.error.message);
            return;
          }
          markBackupSent(item.id);
          console.log("[survey] 재전송 성공 (id=" + item.id + ")");
        })
        .catch(function (err) {
          console.error("[survey] 재전송 중 예외 발생 (id=" + item.id + "):", err);
        });
    });
  }

  // -------------------------------------------------------------------
  // 제출: 항상 화면에는 완료로 표시, 실패해도 pending으로 로컬에 남는다
  // -------------------------------------------------------------------

  function submitSurvey() {
    var nowIso = new Date().toISOString();
    var record = {
      understand: answers.understand,
      easy: answers.easy,
      natural: answers.natural,
      expand: answers.expand,
      want_more: (answers.want_more || []).join(","),
      comment: answers.comment || "",
      created_at: nowIso
    };

    var backupId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    appendBackup({ id: backupId, payload: record, pending: true, created_at: nowIso });

    sendRecord(record, backupId);
    showComplete();
  }

  function showComplete() {
    stageEl.classList.add("is-complete");
    completeEl.hidden = false;
    setTimeout(function () {
      Kiosk.switchScreen("standby");
    }, 3000);
  }

  // -------------------------------------------------------------------
  // 화면 진입/이탈 (Kiosk.registerScreen)
  // -------------------------------------------------------------------

  function resetSurvey() {
    clearTimeout(autoAdvanceTimer);
    pageIndex = 0;
    answers = { want_more: [], comment: "" };

    var selected = document.querySelectorAll(
      "#surveyBody .face-option.is-selected, #surveyBody .want-more-option.is-selected"
    );
    for (var i = 0; i < selected.length; i++) selected[i].classList.remove("is-selected");

    var textarea = document.querySelector("#surveyBody .survey-comment");
    if (textarea) textarea.value = "";

    stageEl.classList.remove("is-complete");
    completeEl.hidden = true;

    renderPage();
  }

  function show() {
    resetSurvey();
    Kiosk.startIdleReturn(60000, "menu");
  }

  function hide() {
    clearTimeout(autoAdvanceTimer);
  }

  Kiosk.registerScreen("survey", { show: show, hide: hide });

  // -------------------------------------------------------------------
  // 메뉴 화면 진입점: 우측 하단 상시 노출 버튼
  // -------------------------------------------------------------------

  var surveyMenuButton = document.getElementById("surveyMenuButton");
  if (surveyMenuButton) {
    surveyMenuButton.addEventListener("click", function () {
      Kiosk.switchScreen("survey", { from: "menu" });
    });
  }

  // -------------------------------------------------------------------
  // 관리자 화면 (숨김): 메뉴 화면 우측 상단 5회 연속 탭으로 진입
  // -------------------------------------------------------------------

  var adminOverlay = document.getElementById("adminOverlay");
  var adminStatsEl = document.getElementById("adminStats");
  var adminAveragesEl = document.getElementById("adminAverages");
  var adminCloseButton = document.getElementById("adminCloseButton");
  var adminExportButton = document.getElementById("adminExportButton");
  var adminRetryButton = document.getElementById("adminRetryButton");

  var ADMIN_AVERAGE_FIELDS = [
    { key: "understand", label: "수어 안내 이해" },
    { key: "easy", label: "화면 사용 편의" },
    { key: "natural", label: "아바타 자연스러움" },
    { key: "expand", label: "확장 요청" }
  ];

  function statTileHtml(value, label) {
    return (
      '<div class="admin-stat-tile"><span class="admin-stat-value">' +
      value +
      '</span><span class="admin-stat-label">' +
      label +
      "</span></div>"
    );
  }

  function renderAdmin() {
    var list = getBackupList();
    var total = list.length;
    var success = list.filter(function (item) {
      return !item.pending;
    }).length;
    var pending = total - success;

    adminStatsEl.innerHTML =
      statTileHtml(total, "총 응답 수") + statTileHtml(success, "전송 성공") + statTileHtml(pending, "미전송 대기");

    adminAveragesEl.innerHTML = ADMIN_AVERAGE_FIELDS.map(function (field) {
      var values = list
        .map(function (item) {
          return item.payload && item.payload[field.key];
        })
        .filter(function (v) {
          return typeof v === "number";
        });
      var avgText = values.length
        ? (values.reduce(function (a, b) { return a + b; }, 0) / values.length).toFixed(2)
        : "-";
      return (
        '<div class="admin-avg-row"><span class="admin-avg-label">' +
        field.label +
        '</span><span class="admin-avg-value">' +
        avgText +
        "</span></div>"
      );
    }).join("");
  }

  function openAdmin() {
    renderAdmin();
    adminOverlay.hidden = false;
  }

  function closeAdmin() {
    adminOverlay.hidden = true;
  }

  adminCloseButton.addEventListener("click", closeAdmin);
  adminRetryButton.addEventListener("click", function () {
    retryPending();
    setTimeout(renderAdmin, 600);
  });
  adminExportButton.addEventListener("click", exportCsv);

  var adminTapZone = document.getElementById("adminTapZone");
  if (adminTapZone) {
    var adminTapCount = 0;
    var adminTapTimer = null;
    adminTapZone.addEventListener("click", function () {
      adminTapCount += 1;
      clearTimeout(adminTapTimer);
      adminTapTimer = setTimeout(function () {
        adminTapCount = 0;
      }, 2000);
      if (adminTapCount >= 5) {
        adminTapCount = 0;
        clearTimeout(adminTapTimer);
        openAdmin();
      }
    });
  }

  // -------------------------------------------------------------------
  // CSV 내보내기 (UTF-8 BOM 포함 — 한글 깨짐 방지)
  // -------------------------------------------------------------------

  function csvEscape(value) {
    var s = String(value === null || value === undefined ? "" : value);
    if (/[",\n\r]/.test(s)) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportCsv() {
    var list = getBackupList();
    var header = [
      "id", "created_at", "understand", "easy", "natural", "expand", "want_more", "comment", "pending"
    ];
    var rows = list.map(function (item) {
      var p = item.payload || {};
      return [
        item.id,
        p.created_at || item.created_at || "",
        p.understand != null ? p.understand : "",
        p.easy != null ? p.easy : "",
        p.natural != null ? p.natural : "",
        p.expand != null ? p.expand : "",
        p.want_more || "",
        p.comment || "",
        item.pending ? "Y" : "N"
      ]
        .map(csvEscape)
        .join(",");
    });

    var csv = header.join(",") + "\r\n" + rows.join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "survey_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // -------------------------------------------------------------------
  // 앱 시작 시 미전송 항목 백그라운드 자동 재전송
  // -------------------------------------------------------------------

  setTimeout(retryPending, 3000);
})();
