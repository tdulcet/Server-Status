"use strict";

// communication type
const CONTENT = "content";

/**
 * Send performance data.
 * Called by the popup.
 *
 * @returns {Object}
 */
function send() {
	const response = {
		type: CONTENT,
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1685688
		navigation: JSON.parse(JSON.stringify(performance.getEntriesByType("navigation"))),
		paint: JSON.parse(JSON.stringify(performance.getEntriesByType("paint")))
	};
	// console.log(response);

	return response;
}

browser.runtime.onMessage.addListener((message) => {
	if (message.type === CONTENT) {
		if (document.readyState === "complete") {
			return Promise.resolve(send());
		}
		return new Promise((resolve) => {
			window.addEventListener("load", (event) => {
				resolve(send());
			});
		});

	}
});
