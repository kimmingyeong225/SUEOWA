/* 이 키오스크 프로젝트 전용 정적 서버.
   npx serve 등 범용 도구 대신 쓰는 이유:
   - serve는 .html 요청을 확장자 없는 주소로 301 리다이렉트하면서 쿼리스트링(?cat=...)을 지워버림
   - python -m http.server는 Range 요청(bytes=...)을 지원하지 않아 큰 mp4가 안 뜰 수 있음
   이 스크립트는 리다이렉트를 아예 하지 않고, Range 요청도 지원한다.

   실행: node serve.js [포트]  (기본 8000)
   접속: http://localhost:8000/index.html */

var http = require("http");
var fs = require("fs");
var path = require("path");

var PORT = Number(process.argv[2]) || 8000;
var ROOT = __dirname;

var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function send404(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
}

http
  .createServer(function (req, res) {
    var reqPath = decodeURIComponent(req.url.split("?")[0]);
    if (reqPath === "/") reqPath = "/index.html";

    var filePath = path.join(ROOT, reqPath);

    // 프로젝트 폴더 바깥으로 나가는 경로 요청 차단
    if (filePath.indexOf(ROOT) !== 0) {
      send404(res);
      return;
    }

    fs.stat(filePath, function (err, stats) {
      if (err || !stats.isFile()) {
        send404(res);
        return;
      }

      var ext = path.extname(filePath);
      var mime = MIME_TYPES[ext] || "application/octet-stream";
      var range = req.headers.range;

      // 영상/폰트는 내용이 안 바뀌므로 브라우저 캐시를 최대한 활용한다.
      // (카테고리 프리로드가 실제로 효과를 보려면 두 번째 요청이 캐시에서
      // 즉시 응답돼야 하는데, 캐시 헤더가 없으면 브라우저가 매번 다시 받아올 수 있다)
      var cacheControl =
        ext === ".mp4" || ext === ".woff2" ? "public, max-age=31536000, immutable" : "no-cache";

      if (range) {
        var match = /bytes=(\d*)-(\d*)/.exec(range);
        var start = match[1] ? parseInt(match[1], 10) : 0;
        var end = match[2] ? parseInt(match[2], 10) : stats.size - 1;

        res.writeHead(206, {
          "Content-Type": mime,
          "Content-Length": end - start + 1,
          "Content-Range": "bytes " + start + "-" + end + "/" + stats.size,
          "Accept-Ranges": "bytes",
          "Cache-Control": cacheControl,
          "Last-Modified": stats.mtime.toUTCString()
        });
        fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
        return;
      }

      res.writeHead(200, {
        "Content-Type": mime,
        "Content-Length": stats.size,
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl,
        "Last-Modified": stats.mtime.toUTCString()
      });
      fs.createReadStream(filePath).pipe(res);
    });
  })
  .listen(PORT, "0.0.0.0", function () {
    var nets = require("os").networkInterfaces();
    var lanIPs = [];
    for (var name in nets) {
      nets[name].forEach(function (net) {
        if (net.family === "IPv4" && !net.internal) lanIPs.push(net.address);
      });
    }
    console.log("수어와 키오스크 서버 실행 중:");
    console.log("  로컬:  http://localhost:" + PORT + "/index.html");
    lanIPs.forEach(function (ip) {
      console.log("  네트워크: http://" + ip + ":" + PORT + "/index.html");
    });
  });
