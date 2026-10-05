"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");
/**
 * @type {HTMLDivElement}
 */
const mainUI = document.getElementById("main-ui");
/**
 * @type {HTMLButtonElement}
 */
const homeBtn = document.getElementById("home-btn");
/**
 * @type {HTMLAnchorElement}
 */
const wispLink = document.getElementById("wisp-link");

// Folder this page is served from: "/" on the Node server, "/Scramjet-App/" on GitHub Pages,
// "/gh/user/repo@static/" on jsDelivr. baseURI (not location) so it also works when the page
// is loaded into an iframe by index.svg, which sets a <base> tag.
const BASE = new URL("./", document.baseURI).pathname;

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	// must stay inside the service worker's scope (the folder sw.js lives in)
	prefix: BASE + "scramjet/",
	files: {
		wasm: BASE + "scram/scramjet.wasm.wasm",
		all: BASE + "scram/scramjet.all.js",
		sync: BASE + "scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection(BASE + "baremux/worker.js");

// Which wisp server the transport is currently set to (null = not set yet this page load)
let activeWisp = null;

function showError(message, detail) {
	error.classList.remove("ok");
	error.textContent = message;
	errorCode.textContent = detail ? String(detail) : "";
	console.error(message, detail);
}

function showNote(message) {
	error.classList.add("ok");
	error.textContent = message;
	errorCode.textContent = "";
}

function readSavedWisp() {
	try {
		return localStorage.getItem("wispUrl") || "";
	} catch {
		return "";
	}
}

/**
 * Order: server saved on this device > WISP_URL from wisp-config.js >
 * this site's own /wisp/ (Node server only; a static site has none).
 */
function getWispUrl() {
	const url = readSavedWisp() || window.WISP_URL || "";
	if (url) return url;
	if (window.STATIC_MODE) return "";
	return (
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/"
	);
}

wispLink.addEventListener("click", (event) => {
	event.preventDefault();
	const next = prompt(
		"Wisp server address (wss://...). Leave empty to reset.",
		getWispUrl()
	);
	if (next === null) return;
	const value = next.trim();
	if (value && !/^wss?:\/\//i.test(value)) {
		showError("The address must start with wss:// (or ws://).");
		return;
	}
	try {
		if (value) localStorage.setItem("wispUrl", value);
		else localStorage.removeItem("wispUrl");
	} catch (err) {
		showError("Couldn't save the setting in this browser.", err);
		return;
	}
	activeWisp = null; // force the transport to be re-created on the next search
	showNote(value ? "Wisp server saved." : "Wisp server reset.");
});

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	error.textContent = "";
	errorCode.textContent = "";
	address.blur(); // dismiss the on-screen keyboard (iOS)

	const wispUrl = getWispUrl();
	if (!wispUrl) {
		showError(
			"No Wisp server set.",
			'Tap "wisp server" under the search bar and enter one (wss://...).'
		);
		return;
	}

	try {
		await registerSW();
		// make sure the worker is actually active before the first request
		await navigator.serviceWorker.ready;
	} catch (err) {
		showError("Failed to register service worker.", err);
		return;
	}

	const url = search(address.value, searchEngine.value);

	try {
		const transport = BASE + "libcurl/index.mjs";
		if (
			activeWisp !== wispUrl ||
			(await connection.getTransport()) !== transport
		) {
			await connection.setTransport(transport, [{ websocket: wispUrl }]);
			activeWisp = wispUrl;
		}
	} catch (err) {
		showError("Failed to connect to the proxy transport.", err);
		return;
	}

	// replace any previous frame
	document.getElementById("sj-frame")?.remove();

	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	mainUI.classList.add("hidden");
	homeBtn.style.display = "block";
	frame.go(url);
});
