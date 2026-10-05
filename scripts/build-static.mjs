// Builds a fully static copy of the site into ./dist (for GitHub Pages or any static host).
// The proxy still needs a Wisp server for its network connections: set WISP_URL, e.g.
//   WISP_URL=wss://your-wisp-server.example/ node scripts/build-static.mjs
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = root + "dist/";

// Default public Wisp server. Override with the WISP_URL repository variable.
const DEFAULT_WISP = "wss://wisp.mercurywork.shop/";
const wisp = (process.env.WISP_URL || DEFAULT_WISP).trim();
if (wisp && !/^wss?:\/\//i.test(wisp)) {
	throw new Error(`WISP_URL must start with wss:// or ws:// (got "${wisp}")`);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const copy = (from, to) => cpSync(from, out + to, { recursive: true, dereference: true });
copy(root + "public", "");
copy(scramjetPath, "scram");
copy(libcurlPath, "libcurl");
copy(baremuxPath, "baremux");

writeFileSync(
	out + "wisp-config.js",
	`window.STATIC_MODE = true;\nwindow.WISP_URL = ${JSON.stringify(wisp)};\n`
);
writeFileSync(out + ".nojekyll", ""); // tell GitHub Pages not to post-process the files

console.log(`Static site written to dist/ (WISP_URL ${wisp ? "set" : "NOT set"})`);
