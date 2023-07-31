import { createWriteStream } from "fs";
import { readFile, readdir } from "fs/promises";
import { IncomingMessage, ServerResponse, createServer } from "http";
import busboy from "busboy";
import { basename, join, normalize } from "path";

const indexHtml: string = await readFile("index.html", "utf8");
createServer(handler).listen(3000);
console.log("Listening on port 3000...");

function handler(req: IncomingMessage, res: ServerResponse) {
	switch (req.method) {
		case "HEAD":
			res.writeHead(200, { "access-control-allow-origin": "*'" });
			res.end();
			break;
		case "GET":
			if (req.url == "/") {
				generateListing().then((listing) => {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.write(indexHtml.replace("__LISTING__", listing));
					res.end();
				});
			} else {
				const filename = req.url ?? "";
				readFile(join("uploads", filename))
					.then((data) => {
						res.writeHead(200);
						res.write(data);
						res.end();
					})
					.catch((e) => {
						res.writeHead(404, { "Content-Type": "text/plain" });
						res.write("404 - not found");
						res.end();
					});
			}
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

async function generateListing() {
	const files = await readdir("uploads");
	return files
		.filter((filename) => !filename.includes('"'))
		.map((fn) => `<a href="${fn}">${escapeHtml(fn)}</a><br>`)
		.join("\n");
}

function escapeHtml(string) {
	return String(string).replace(
		/[&<>"'`=\/]/g,
		(s) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
				"/": "&#x2F;",
				"`": "&#x60;",
				"=": "&#x3D;",
			}[s]!)
	);
}
