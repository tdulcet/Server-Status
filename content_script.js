"use strict";

// communication type
const CONTENT = "content";
const PERFORMANCE = "performance";

let paint = null;
let lcp = null;

/**
 * Send performance data.
 *
 * @returns {void}
 */
function send() {
	const response = {
		type: PERFORMANCE,
		performance: {
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1685688
			navigation: JSON.parse(JSON.stringify(performance.getEntriesByType("navigation"))),
			paint: JSON.parse(JSON.stringify(paint)),
			lcp: JSON.parse(JSON.stringify(lcp))
		}
	};
	// console.log(response);

	browser.runtime.sendMessage(response);
}

new PerformanceObserver((list/* , observer */) => {
	const entries = list.getEntries();
	// console.log(entries);
	// const entry = entries.find((x) => x.name === "first-contentful-paint");
	// console.log(`First Contentful Paint: ${entry ? `${entry.startTime} ms` : "None"}`, entry);

	paint = entries;
	send();
}).observe({ type: "paint", buffered: true });

new PerformanceObserver((list/* , observer */) => {
	const entries = list.getEntries();
	// console.log(entries);
	// const entry = entries.at(-1);
	// console.log(`Largest Contentful Paint: ${entry.startTime} ms`, entry);

	lcp = entries;
	send();
}).observe({ type: "largest-contentful-paint", buffered: true });

if (document.readyState === "complete") {
	send();
} else {
	addEventListener("load", (/* event */) => {
		send();
	}, true);
}

browser.runtime.onMessage.addListener((message) => {
	if (message.type === CONTENT) {
		const metas = Object.groupBy(document.querySelectorAll("head meta[name][content]"), (meta) => meta.name.toLowerCase());

		const response = {
			type: CONTENT,
			authors: metas.author?.map((meta) => meta.content),
			creators: metas.creator?.map((meta) => meta.content),
			publishers: metas.publisher?.map((meta) => meta.content),
			generators: metas.generator?.map((meta) => meta.content),
			descriptions: metas.description?.map((meta) => meta.content)
		};
		// console.log(response);

		return Promise.resolve(response);
	} else if (message.type === PERFORMANCE) {
		// console.log(message);
		return Promise.resolve({ type: PERFORMANCE });
	}
});

console.log("Server Status loaded.");
