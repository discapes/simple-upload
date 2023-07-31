import { createWriteStream } from "fs";
import { readFile } from "fs/promises";
import { IncomingMessage, ServerResponse, createServer } from "http";
import busboy from "busboy";
import { basename, join, normalize } from "path";

const indexHtml = await readFile("index.html");
createServer(handler).listen(3000);
console.log("Listening on port 3000...");

function handler(req: IncomingMessage, res: ServerResponse) {
  switch (req.method) {
    case "HEAD":
      res.writeHead(200, { "access-control-allow-origin": "*'" });
      res.end();
      break;
    case "GET":
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(indexHtml);
      res.end();
      break;
    case "POST":
      const bb = busboy({ headers: req.headers });
      bb.on("file", (name, file, info) => {
        const { filename, encoding, mimeType } = info;
        const ws = createWriteStream(join("uploads", basename(filename)));
        console.log(
          `File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
          filename,
          encoding,
          mimeType
        );
        file
          .on("data", (data) => {
            console.log(`File [${name}] got ${data.length} bytes`);
            ws.write(data);
          })
          .on("close", () => {
            console.log(`File [${name}] done`);
            ws.close();
          });
      });

      bb.on("close", () => {
        console.log("Done parsing form!");
        res.writeHead(303, { Connection: "close", Location: "/" });
        res.end();
      });
      req.pipe(bb);
      break;
  }
}
