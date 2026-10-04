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

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

function showError(message, err) {
	error.textContent = message;
	errorCode.textContent = err ? String(err) : "";
	console.error(message, err);
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	error.textContent = "";
	errorCode.textContent = "";
	address.blur(); // dismiss the on-screen keyboard (iOS)

	try {
		await registerSW();
		// make sure the worker is actually active before the first request
		await navigator.serviceWorker.ready;
	} catch (err) {
		showError("Failed to register service worker.", err);
		return;
	}

	const url = search(address.value, searchEngine.value);

	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	try {
		if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
			await connection.setTransport("/libcurl/index.mjs", [
				{ websocket: wispUrl },
			]);
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
