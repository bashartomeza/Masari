import { createReadStream, stat } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "apps/mobile/build/web");
const port = Number(process.env.MASARI_STATIC_PORT ?? "5176");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm"
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const target = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  const pathFromRoot = relative(root, target);
  if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
    response.writeHead(403).end();
    return;
  }
  stat(target, (error, details) => {
    if (error || !details.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(target)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(target).pipe(response);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Masari mobile static server: http://localhost:${port}`);
});
