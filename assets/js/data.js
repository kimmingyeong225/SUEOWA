/* ==========================================================================
   수어와 — 콘텐츠 데이터 (태종대)
   다른 관광지로 확장할 때는 이 파일만 교체하면 된다 (UI 문구는 text.js 참고).
   index.html(대기 화면) / menu.html(메뉴) / content.html(재생 화면)이 공통으로 사용.
   ========================================================================== */

var VIDEO_BASE = "assets/videos/";

/* 장소명은 TEXT.ko.placeName / TEXT.en.placeName (assets/js/text.js)을 쓴다.
   다른 관광지로 확장할 때는 이 파일과 text.js의 placeName을 함께 바꾸면 된다. */

/* ---------------------------------------------------------------------
   대기 화면(index.html) 왼쪽 아바타 영역 — welcome → intro → touch 순서로
   이어 재생 후 처음부터 무한 반복.
   이 영상들은 자막이 없어서 웹앱에서 caption 텍스트를 직접 띄운다.
   --------------------------------------------------------------------- */
var ATTRACT_CLIPS = [
  { file: "main_welcome_3.mp4", caption: "안녕하세요. 아름다운 부산의 자랑, 태종대유원지에 오신 것을 환영합니다.", en: "Hello, and welcome to Taejongdae Park, the pride of beautiful Busan." },
  { file: "main_intro_3.mp4", caption: "여기는 수어로 태종대를 안내해 드리는 곳입니다.", en: "This is where you can get a guide to Taejongdae in sign language." },
  { file: "main_touch_3.mp4", caption: "화면을 터치해 주세요.", en: "Please touch the screen." }
];

/* 메뉴 화면(menu.html) 왼쪽 아바타 영역 — 단독 반복 재생.
   이 영상도 자막이 없어서 웹앱에서 자막을 직접 띄운다. */
var MENU_IDLE_CLIP = {
  file: "button_select_3.mp4",
  caption: "보고 싶은 것을 눌러 주세요",
  en: "Tap whatever you'd like to see"
};

/* ---------------------------------------------------------------------
   메뉴 카테고리 — 순서대로 2열x2행 그리드에 렌더링됨.
   clips: 버튼을 누르면 순서대로 이어 재생되는 영상 목록 (문장 단위 촬영본)
   --------------------------------------------------------------------- */
var CATEGORIES = [
  {
    id: "shuttle",
    label: "셔틀버스 안내",
    labelEn: "Shuttle Bus",
    icon: "bus",
    color: "#85B7EB",
    clips: [
      { file: "shuttle_1_3.mp4", caption: "지금 다누비열차는 안전 검사 중이라 다니지 않습니다. 대신 무료 셔틀버스가 다닙니다.", en: "The Danubi Train is not running right now because it's undergoing a safety inspection. A free shuttle bus is running instead." },
      { file: "shuttle_2_3.mp4", caption: "버스를 타려면, 정문에서 조금 올라가 매표소에서 표를 먼저 받아야 합니다.", en: "To ride the bus, walk a short way up from the main gate and pick up a ticket at the ticket booth first." },
      { file: "shuttle_3_3.mp4", caption: "표는 오전 9시 10분부터 받을 수 있고, 버스는 9시 30분부터 오후 5시 30분까지 다닙니다.", en: "Tickets are available starting at 9:10 a.m., and the bus runs from 9:30 a.m. until 5:30 p.m." },
      { file: "shuttle_4_3.mp4", caption: "버스는 10분에서 20분마다 옵니다. 월요일은 운행하지 않습니다.", en: "Buses come every 10 to 20 minutes. There is no service on Mondays." }
    ]
  },
  {
    id: "notice",
    label: "안전·통제 구역",
    labelEn: "Safety & Closed Areas",
    icon: "alert-triangle",
    color: "#F0997B",
    clips: [
      { file: "notice_intro_3.mp4", caption: "관람에 앞서, 안전을 위해 꼭 알아야 할 내용을 안내해 드립니다.", en: "Before you start your visit, here are a few things you need to know for your safety." },
      { file: "closed_1_3.mp4", caption: "신선바위와 망부석은 돌이 떨어질 위험이 있어, 지금은 들어갈 수 없습니다.", en: "Sinseon Rock and Mangbuseok are closed right now because of the risk of falling rocks." },
      { file: "closed_2.mp4", caption: "등대 아래 자갈밭은 저녁 8시부터 들어갈 수 없습니다.", en: "The pebble beach below the lighthouse is closed after 8 p.m." },
      { file: "closed_3_3.mp4", caption: "전망대는 공사 때문에 막힐 수 있으니, 가기 전에 안내소에 물어보세요.", en: "The observatory may be closed off for construction, so please check at the information desk before you head there." }
    ]
  },
  {
    id: "info",
    label: "이용 안내",
    labelEn: "Visitor Information",
    icon: "clock-hour-4",
    color: "#9FE1CB",
    clips: [
      { file: "info_open_3.mp4", caption: "태종대는 아침 4시부터 밤 12시까지 들어올 수 있습니다.", en: "Taejongdae is open from 4 a.m. until midnight." },
      { file: "info_drink.mp4", caption: "공원 안에서는 음료수를 살 수 없습니다. 정문 편의점에서 미리 사 오세요.", en: "There is nowhere to buy drinks inside the park. Please buy them ahead of time at the convenience store by the main gate." }
    ]
  }
];
