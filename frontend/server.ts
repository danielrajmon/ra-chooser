import * as fs from "fs";
import * as http from "http";
import * as path from "path";

const port = parseInt(process.env.FRONTEND_PORT || "3000", 10);
const baseDir = __dirname;

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function sendFile(filePath: string, res: http.ServerResponse): void {
  fs.readFile(filePath, (error: NodeJS.ErrnoException | null, content: Buffer) => {
    if (error) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.end(content);
  });
}

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = new URL(req.url || "/", `http://localhost:${port}`);
  const requestPath = parsedUrl.pathname === "/" ? "/index.html" : parsedUrl.pathname;
  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
  const filePath = path.join(baseDir, safePath);

  if (!filePath.startsWith(baseDir)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Bad request");
    return;
  }

  sendFile(filePath, res);
});

server.listen(port, () => {
  console.log(`Frontend running on http://localhost:${port}`);
});
