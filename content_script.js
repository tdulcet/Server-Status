"use strict";

// communication type
const CONTENT = "content";

/**
 * Send performance data.
 * Called by the popup.
 *
 * @returns {void}
 */
function send() {
	const response = {
		type: CONTENT,
		performance: {
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1685688
			navigation: JSON.parse(JSON.stringify(performance.getEntriesByType("navigation"))),
			paint: JSON.parse(JSON.stringify(performance.getEntriesByType("paint")))
		}
	};
	// console.log(response);

	browser.runtime.sendMessage(response);
}

if (document.readyState === "complete") {
	send();
} else {
	addEventListener("load", (event) => {
		send();
	}, true);
}

browser.runtime.onMessage.addListener((message) => {
	if (message.type === CONTENT) {
		// console.log(message);
		return Promise.resolve({ type: CONTENT });
	}
});
