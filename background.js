"use strict";

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";

// import * as common from "common.js";

const TITLE = "Server Status";
const label = "PSL";

const TAB_ID_NONE = browser.tabs.TAB_ID_NONE;

const ALARM1 = "updatePSL";
const ALARM2 = "updateGeoIP";

// Chrome
// Adapted from: https://github.com/mozilla/webextension-polyfill/blob/master/src/browser-polyfill.js
const IS_CHROME = Object.getPrototypeOf(browser) !== Object.prototype;

// Seconds to wait
const wait = 60;

const settings = {
	icon: null,
	color: null,
	warndays: null, // Days
	dns: null,
	fullipv6: null,
	compactipv6: null,
	open: null,
	blocked: null,
	GeoDB: null,
	update: null,
	updateidle: null,
	idle: null, // Seconds
	map: null,
	lookup: null,
	suffix: null,
	https: null,
	blacklist: null,
	domainblacklists: null,
	ipv4blacklists: null,
	ipv6blacklists: null,
	send: null
};

const tabs = new Map();

const notifications = new Map();

let IS_ANDROID = null;
let IS_LINUX = null;

let icons = null;
let certificateIcons = null;
let statusIcons = null;
let digitIcons = null;
const flagIcons = {};

let httpsOnlyMode = null;

let popup = null;
let worker = null;

let date = null;

let suffixes = null;
let exceptions = null;

/**
 * Create notification.
 *
 * @param {string} title
 * @param {string} message
 * @param {number} [date]
 * @returns {void}
 */
function notification(title, message, date) {
	console.log(title, message, date && new Date(date));
	if (settings.send) {
		browser.notifications.create({
			type: "basic",
			iconUrl: browser.runtime.getURL("icons/icon_128.png"),
			title,
			message,
			eventTime: date
		});
	}
}

browser.notifications.onClicked.addListener((notificationId) => {
	const url = notifications.get(notificationId);

	if (url) {
		browser.tabs.create({ url });
	}
});

browser.notifications.onClosed.addListener((notificationId) => {
	notifications.delete(notificationId);
});

/**
 * Creates icon using native emoji.
 * Adapted from: https://stackoverflow.com/a/56313229 and https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setIcon#Examples
 *
 * @param {string} emoji
 * @param {number} size
 * @returns {ImageData}
 */
function getImageData(emoji, size) {
	// OffscreenCanvas is not yet enabled for Firefox: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#browser_compatibility
	const canvas = window.OffscreenCanvas ? new OffscreenCanvas(size, size) : document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	// https://bugzilla.mozilla.org/show_bug.cgi?id=1692791
	if (IS_LINUX) {
		ctx.font = `${size * (IS_LINUX && !IS_CHROME ? 63 / 64 : IS_ANDROID ? 57 / 64 : 7 / 8)}px sans-serif`;
	}
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	if (!IS_LINUX) {
		let font_size = size / 2;
		let width = 0;
		let height = 0;
		do {
			++font_size;
			ctx.font = `${font_size}px sans-serif`; // "Twemoji Mozilla"
			const textMetrics = ctx.measureText(emoji);
			width = Math.abs(textMetrics.actualBoundingBoxLeft) + Math.abs(textMetrics.actualBoundingBoxRight);
			height = Math.abs(textMetrics.actualBoundingBoxAscent) + Math.abs(textMetrics.actualBoundingBoxDescent);
		} while (width < size && height < size);

		--font_size;
		ctx.font = `${font_size}px sans-serif`; // "Twemoji Mozilla"
		const textMetrics = ctx.measureText(emoji);
		width = Math.abs(textMetrics.actualBoundingBoxLeft) - Math.abs(textMetrics.actualBoundingBoxRight);
		height = Math.abs(textMetrics.actualBoundingBoxAscent) - Math.abs(textMetrics.actualBoundingBoxDescent);
		// draw the emoji
		ctx.fillText(emoji, (size + width) / 2, (size + height) / 2);
	} else {
		// draw the emoji
		ctx.fillText(emoji, size / 2, size * (IS_CHROME && !IS_ANDROID ? 37 / 64 : IS_LINUX ? 59 / 96 : 13 / 24));
	}

	return ctx.getImageData(0, 0, size, size);
}

/**
 * Create icons.
 *
 * @param {string} emoji
 * @returns {Object.<number, ImageData>}
 */
function getIcons(emoji) {
	const icons = {};
	for (const size of [16, 32, 64, 128]) {
		icons[size] = getImageData(emoji, size);
	}
	return icons;
}

/**
 * Set the browserAction icon.
 *
 * @param {number|null} tabId
 * @param {ImageData|null} icon
 * @param {string|null} title
 * @param {string|null} text
 * @param {string|null} backgroundColor
 * @returns {void}
 */
function setIcon(tabId, icon, title, text, backgroundColor) {
	// console.log(tabId, icon, title, text, backgroundColor);
	browser.browserAction.setIcon({
		imageData: icon,
		tabId
	});
	browser.browserAction.setTitle({
		title,
		tabId
	});
	browser.browserAction.setBadgeText({
		text,
		tabId
	});
	browser.browserAction.setBadgeBackgroundColor({
		color: backgroundColor,
		tabId
	});
}

/**
 * Update the browserAction icon.
 *
 * @param {number} tabId
 * @param {Object} tab
 * @param {Object} tab.details
 * @param {Object} tab.securityInfo
 * @returns {Promise<void>}
 */
async function updateIcon(tabId, tab) {
	const { details, securityInfo } = tab;
	// console.log(tabId, details, securityInfo);
	let icon = null;
	const title = [`𝗦𝘁𝗮𝘁𝘂𝘀:  ${details.statusLine}`]; // Status
	let text = null;
	let backgroundColor = null;

	if (details.ip) {
		const ipv4 = IPv4RE.test(details.ip);
		const ipv6 = IPv6RE.test(details.ip);
		console.assert(ipv4 || ipv6, "Error: Unknown IP address", details.ip);
		if (ipv4) {
			// IPv4 address
			title.push(`𝗜𝗣𝘃𝟰 𝗮𝗱𝗱𝗿𝗲𝘀𝘀:  ${details.ip}`);
		} else if (ipv6) {
			// IPv6 address
			title.push(`𝗜𝗣𝘃𝟲 𝗮𝗱𝗱𝗿𝗲𝘀𝘀:  ${settings.fullipv6 ? expand(details.ip).join(":") : settings.compactipv6 ? outputbase85(IPv6toInt(expand(details.ip).join(""))) : details.ip}`);
		}

		if (settings.icon === 6) {
			if (ipv4) {
				icon = digitIcons[4];
				text = "v4";
				backgroundColor = "red";
			} else if (ipv6) {
				icon = digitIcons[6];
				text = "v6";
				backgroundColor = "green";
			}
		}
	} else if (settings.icon === 6) {
		icon = details.fromCache ? icons[3] : icons[2];
	}

	if (settings.GeoDB) {
		if (details.ip) {
			const info = await getGeoIP(details.ip);
			console.log(details.ip, info);

			const country = info?.country;
			// Server location
			title.push(`𝗦𝗲𝗿𝘃𝗲𝗿 𝗹𝗼𝗰𝗮𝘁𝗶𝗼𝗻:  ${country ? `${outputlocation(info)} (${country}) ${countryCode(country)}${info.lon != null ? ` ${earth(info.lon)}` : ""}` : "Unknown"}`);

			if (settings.icon === 1) {
				if (country) {
					if (!(country in flagIcons)) {
						const flag = countryCode(country);
						flagIcons[country] = getIcons(flag);
					}
					icon = flagIcons[country];
					text = country;
					backgroundColor = settings.color;
				} else {
					icon = icons[2];
				}
			}
		} else if (settings.icon === 1) {
			icon = details.fromCache ? icons[3] : icons[2];
		}
	} else if (settings.icon === 1) {
		title.unshift("Error: Geolocation database disabled");
		icon = certificateIcons[3];
	}

	let state = "";
	if (securityInfo.state === "insecure") {
		state = "Insecure";
		if (settings.icon === 2 || settings.icon === 3) {
			icon = certificateIcons[0];
		}
	} else if (securityInfo.state === "broken" || securityInfo.isUntrusted || securityInfo.isNotValidAtThisTime || securityInfo.isDomainMismatch) {
		state = getmessage(securityInfo);
	} else if (securityInfo.state === "weak") {
		state = `Weak${securityInfo.weaknessReasons ? ` (${securityInfo.weaknessReasons})` : ""}`;
	}
	if (state) {
		// Connection
		title.push(`𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗶𝗼𝗻:  ${state}`);
	}
	if (securityInfo.state !== "insecure") {
		if (securityInfo.certificates.length) {
			const certificate = securityInfo.certificates[0];
			// const start = certificate.validity.start;
			const end = certificate.validity.end;
			const sec = Math.floor(end / 1000) - Math.floor(details.timeStamp / 1000);
			const days = Math.floor(sec / 86400);
			const issuer = certificate.issuer;
			const aissuer = getissuer(issuer);
			// console.log(end, days, new Date(end));
			// Certificate expiration
			// sec > 0 ? outputdateRange(start, end) : outputdate(end)
			title.push(`𝗖𝗲𝗿𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗲:  ${sec > 0 ? "Expires" : "Expired"} ${rtf.format(days, "day")} (${dateTimeFormat4.format(new Date(end))})`);
			// Certificate issuer
			title.push(`𝗜𝘀𝘀𝘂𝗲𝗿:  ${aissuer.O || aissuer.CN || issuer}${aissuer.L ? `, ${aissuer.L}` : ""}${aissuer.S ? `, ${aissuer.S}` : ""}${aissuer.C ? `, ${regionNames.of(aissuer.C)} (${aissuer.C}) ${countryCode(aissuer.C)}` : ""}`);
			// SSL/TLS protocol
			title.push(`𝗦𝗦𝗟/𝗧𝗟𝗦 𝗽𝗿𝗼𝘁𝗼𝗰𝗼𝗹:  ${securityInfo.protocolVersion}${securityInfo.secretKeyLength ? `, ${securityInfo.secretKeyLength} bit keys` : ""}`);

			if (settings.icon === 2) {
				if (sec > 0) {
					if (days > settings.warndays) {
						icon = certificateIcons[1];
						backgroundColor = "green";
					} else {
						icon = certificateIcons[2];
						backgroundColor = "yellow";
					}
				} else {
					icon = certificateIcons[3];
					backgroundColor = "red";
				}
				text = days === 0 ? `< ${numberFormat.format(1)}` : numberFormat.format(days);
			} else if (settings.icon === 3) {
				const version = securityInfo.protocolVersion;
				if (version.startsWith("TLSv")) {
					const [major, minor] = version.slice("TLSv".length).split(".").map((x) => Number.parseInt(x, 10));
					if (major === 1) {
						icon = minor < digitIcons.length ? digitIcons[minor] : icons[2];
						if (minor === 0 || minor === 1) {
							backgroundColor = "red";
						} else if (minor === 2) {
							backgroundColor = "blue";
						} else if (minor >= 3) {
							backgroundColor = "green";
						}
					} else if (major > 1) {
						icon = icons[2];
						backgroundColor = settings.color;
					}
					text = version.slice("TLSv".length);
				} else {
					icon = icons[2];
					text = version;
					backgroundColor = settings.color;
				}
			}
		}
		if (securityInfo.state === "broken" || securityInfo.isUntrusted || securityInfo.isNotValidAtThisTime || securityInfo.isDomainMismatch) {
			if (settings.icon === 2 || settings.icon === 3) {
				icon = certificateIcons[3];
				backgroundColor = "red";
			}
		}
		let atitle = "";
		if (details.responseHeaders) {
			// console.log(details.responseHeaders);
			const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
			if (header) {
				const aheader = getHSTS(header.value);
				// console.log(header, aheader);
				atitle += `✔ Yes (${outputseconds(Number.parseInt(aheader["max-age"], 10))})`;
			} else {
				atitle += securityInfo.hsts ? "✔ Yes" : "✖ No";
			}
			// console.assert(!!header === securityInfo.hsts, "Error: HSTS", header, securityInfo.hsts);
		} else {
			atitle += securityInfo.hsts ? "✔ Yes" : "✖ No";
		}
		// HSTS
		title.push(`𝗛𝗦𝗧𝗦:  ${atitle}`);
	}

	switch (settings.icon) {
		case 4: {
			const statusCode = details.statusCode;
			if (statusCode >= 100 && statusCode < 200) {
				icon = statusIcons[0];
				backgroundColor = "blue";
			} else if (statusCode >= 200 && statusCode < 300) {
				icon = statusIcons[1];
				backgroundColor = "green";
			} else if (statusCode >= 300 && statusCode < 400) {
				icon = statusIcons[2];
				backgroundColor = "yellow";
			} else {
				// I'm a teapot, RFC 2324: https://datatracker.ietf.org/doc/html/rfc2324
				icon = statusCode === 418 ? statusIcons[4] : statusIcons[3];
				backgroundColor = "red";
			}
			text = statusCode.toString();
			break;
		}
		case 5: {
			// Get HTTP version
			const re = /^HTTP\/(\S+) ((\d{3})(?: .+)?)$/u;
			const regexResult = re.exec(details.statusLine);
			console.assert(regexResult, "Error: Unknown HTTP Status", details.statusLine);
			if (regexResult) {
				const version = regexResult[1];
				const [major, minor] = version.split(".").map((x) => Number.parseInt(x, 10));
				icon = major < digitIcons.length ? digitIcons[major] : icons[2];
				switch (major) {
					case 0:
						backgroundColor = "red";
						break;
					case 1:
						backgroundColor = minor === 0 ? "red" : "blue";
						break;
					case 2:
						backgroundColor = "teal";
						break;
					default: if (major >= 3) {
						backgroundColor = "green";
					}
				}
				text = version;
			} else {
				icon = icons[2];
				text = details.statusLine;
				backgroundColor = settings.color;
			}
			break;
		}
		case 7: {
			if (tab.performance) {
				const [navigation] = tab.performance.navigation;
				const start = navigation.redirectCount ? navigation.redirectStart : navigation.fetchStart;
				const load = navigation.loadEventStart - start;
				if (load <= 2500) {
					icon = statusIcons[1];
					backgroundColor = "green";
				} else if (load <= 4000) {
					icon = statusIcons[2];
					backgroundColor = "yellow";
				} else {
					icon = statusIcons[3];
					backgroundColor = "red";
				}
				text = numberFormat.format(load);
			}
			break;
		}
	}
	setIcon(tabId, icon, title.join("  \n"), text, backgroundColor);
}

/**
 * Update active tab.
 *
 * @param {Object} details
 * @returns {Promise<void>}
 */
async function updateActiveTab(details) {
	if (details.frameId === 0) {
		// console.log(details.url);
		// console.log("webNavigation.onCommitted:", details.url, new URL(details.url).origin);
		if (details.tabId && details.tabId !== TAB_ID_NONE) {
			const aurl = new URL(details.url);
			const title = aurl.protocol === "http:" || aurl.protocol === "https:" ? ", try ⟳ refreshing the page" : "";
			if (tabs.has(details.tabId)) {
				const tab = tabs.get(details.tabId);
				if (tab.details && tab.details.statusLine) {
					const url = new URL(tab.details.url);
					if (url.origin === aurl.origin) {
						updateIcon(details.tabId, tab);
						// console.log(`Success: ${details.tabId}`, changeInfo.url);
					} else {
						const tabInfo = await browser.tabs.get(details.tabId);
						// https://bugzilla.mozilla.org/show_bug.cgi?id=1455060
						if (tabInfo.isInReaderMode) {
							updateIcon(details.tabId, tab);
						} else {
							const tab = { details: null, securityInfo: null, requests: new Map() };
							tabs.set(details.tabId, tab);
							// certificateIcons[5]
							setIcon(details.tabId, icons[1], `${TITLE}  \nAccess denied for this “${aurl.protocol}” page${title}`, null, null);
							console.debug("Access denied", aurl.protocol, aurl.origin, url.origin);
						}
					}
				} else if (tab.error) {
					setIcon(details.tabId, icons[1], `${TITLE}  \nError occurred for this “${aurl.protocol}” page: ${tab.error}`, null, null);
					console.debug("Error occurred", aurl.protocol, aurl.origin, tab.error);
				} else {
					setIcon(details.tabId, tab.details ? icons[0] : icons[1], `${TITLE}  \nUnavailable${tab.details ? "" : " or Access denied"} for this “${aurl.protocol}” page${title}`, null, null);
					console.debug("Unavailable or Access denied", aurl.protocol, aurl.origin);
				}
			} else {
				setIcon(details.tabId, icons[0], `${TITLE}  \nUnavailable for this “${aurl.protocol}” page${title}`, null, null);
				// console.log(`Error: ${details.tabId}`, changeInfo.url);
				console.debug("Unavailable", aurl.protocol, aurl.origin);
			}
		} else {
			setIcon(details.tabId, icons[0], `${TITLE}  \nUnavailable for this page`, null, null);
		}
	}
}

browser.webNavigation.onCommitted.addListener(updateActiveTab);

/**
 * Tab close handler.
 *
 * @param {number} tabId
 * @returns {void}
 */
function tabCloseHandler(tabId) {
	tabs.delete(tabId);
}

browser.tabs.onRemoved.addListener(tabCloseHandler);

/**
 * Save request details.
 *
 * @param {Object} details
 * @returns {void}
 */
function beforeRequest(details) {
	// console.log(details);
	if (details.tabId && details.tabId !== TAB_ID_NONE) {
		const aurl = new URL(details.url);

		if (details.type === "main_frame") {
			tabs.set(details.tabId, { details, requests: new Map() });
			// console.log("beforeRequest", details);
		} else if (!tabs.has(details.tabId)) {
			tabs.set(details.tabId, { details: null, requests: new Map() });
			// certificateIcons[5]
			setIcon(details.tabId, icons[1], `${TITLE}  \nAccess denied for this “${aurl.protocol}” page`, null, null);
			console.debug("Access denied", details.tabId, aurl.origin);
		}

		const tab = tabs.get(details.tabId);

		if (!tab.requests.has(aurl.hostname)) {
			tab.requests.set(aurl.hostname, new Map());
		}

		const requests = tab.requests.get(aurl.hostname);
		requests.set(details.requestId, { details });
	}
}

browser.webRequest.onBeforeRequest.addListener(beforeRequest,
	{ urls: ["<all_urls>"] },
	// Blocking needed to show requests at browser startup: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#requests_at_browser_startup
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1749871
	["blocking"]
);

/**
 * Save request details and security info.
 *
 * @param {Object} details
 * @returns {Promise<void>}
 */
async function headersReceived(details) {
	// console.log(details);
	if (details.tabId && details.tabId !== TAB_ID_NONE) {
		try {
			const main_frame = details.type === "main_frame";
			const securityInfo = await browser.webRequest.getSecurityInfo(
				details.requestId,
				{ certificateChain: main_frame, rawDER: main_frame }
			);
			// console.log(securityInfo);

			const aurl = new URL(details.url);
			const tab = tabs.get(details.tabId);

			if (!tab) {
				console.error(details.tabId, aurl.origin);
				return;
			}

			if (main_frame) {
				tab.details = details;
				tab.securityInfo = securityInfo;
				// console.log("headersReceived", details);
			}

			const requests = tab.requests.get(aurl.hostname);

			if (!requests || !requests.has(details.requestId)) {
				console.error(details.tabId, aurl.hostname, details.requestId, aurl.origin);
				return;
			}

			requests.set(details.requestId, { details, securityInfo });

			sendSettings(details, tab);
		} catch (error) {
			console.error(error);
		}
	}
}

browser.webRequest.onHeadersReceived.addListener(headersReceived,
	{ urls: ["<all_urls>"] },
	["blocking", "responseHeaders"]
);

/**
 * Save completed.
 *
 * @param {Object} details
 * @returns {void}
 */
/* function completed(details) {
	if (details.tabId && details.tabId !== TAB_ID_NONE) {
		const aurl = new URL(details.url);
		const tab = tabs.get(details.tabId);

		if (!tab) {
			console.error(details.tabId, aurl.origin);
			return;
		}

		if (details.type === "main_frame") {
			// tab.error = details.error;
			// console.log("completed", details);
		}

		const requests = tab.requests.get(aurl.hostname);

		if (!requests || !requests.has(details.requestId)) {
			console.error(details.tabId, aurl.hostname, details.requestId, aurl.origin);
			// return;
		}

		// const request = requests.get(details.requestId);
		// request.error = details.error;
	}
}

browser.webRequest.onCompleted.addListener(completed,
	{ urls: ["<all_urls>"] }
); */

/**
 * Save error.
 * Firefox error codes: https://searchfox.org/mozilla-central/rev/f6a2ef2f028b8f1eb82fa5dc5cb1e39a3baa8feb/js/xpconnect/src/xpc.msg
 *
 * @param {Object} details
 * @returns {void}
 */
function errorOccurred(details) {
	if (details.tabId && details.tabId !== TAB_ID_NONE) {
		const aurl = new URL(details.url);
		const tab = tabs.get(details.tabId);

		if (!tab) {
			console.error(details.tabId, aurl.origin);
			return;
		}

		if (details.type === "main_frame") {
			tab.error = details.error;
			// console.log("errorOccurred", details);
		}

		const requests = tab.requests.get(aurl.hostname);

		if (!requests || !requests.has(details.requestId)) {
			console.error(details.tabId, aurl.hostname, details.requestId, aurl.origin);
			return;
		}

		const request = requests.get(details.requestId);
		request.error = details.error;

		sendSettings(details, tab);
	}
}

browser.webRequest.onErrorOccurred.addListener(errorOccurred,
	{ urls: ["<all_urls>"] }
);

/**
 * Convert hostname to lowercase and Punycode: https://en.wikipedia.org/wiki/Punycode.
 *
 * @param {string} hostname
 * @returns {string}
 */
function punycode(hostname) {
	return new URL(`https://${hostname}`).hostname;
}

/**
 * Get the public suffix list.
 *
 * @param {number} date
 * @param {number} [retry]
 * @returns {Promise<void>}
 */
function getPSL(date, retry = 0) {
	console.time(label);
	const url = "https://publicsuffix.org/list/public_suffix_list.dat";
	console.log(url);
	return fetch(url).then(async (response) => {
		if (response.ok) {
			const text = await response.text();
			// console.log(text);

			console.timeLog(label);

			const PSL = Object.freeze(text.split("\n").map((r) => r.trim()).filter((r) => r.length && !r.startsWith("//")));
			console.log(PSL.length, date);

			browser.storage.local.set({ PSL: { PSL, date } });

			console.timeLog(label);

			parsePSL(PSL);
		} else {
			console.error(response);
		}

		console.timeEnd(label);
	}).catch(async (error) => {
		if (retry >= 2) {
			throw error;
		}
		console.error(error);
		await delay((1 << retry) * 1000);
		return getPSL(date, retry + 1);
	});
}

/**
 * Traverse Trie tree of objects to create RegEx.
 *
 * @param {Object.<string, Object|boolean>} tree
 * @returns {string}
 */
function createRegEx(tree) {
	const alternatives = [];
	const characterClass = [];

	for (const char in tree) {
		if (char) {
			if (!("" in tree[char] && Object.keys(tree[char]).length === 1)) {
				const recurse = createRegEx(tree[char]);
				alternatives.push(recurse + char);
			} else {
				characterClass.push(char);
			}
		}
	}

	if (characterClass.length) {
		alternatives.push(characterClass.length === 1 ? characterClass[0] : `[${characterClass.join("")}]`);
	}

	let result = alternatives.length === 1 ? alternatives[0] : `(?:${alternatives.join("|")})`;

	if ("" in tree) {
		if (characterClass.length || alternatives.length > 1) {
			result += "?";
		} else {
			result = `(?:${result})?`;
		}
	}

	return result;
}

/**
 * Convert public suffix list into Trie tree of objects.
 *
 * @param {string[]} arr
 * @returns {string}
 */
function createTree(arr) {
	const tree = {};

	arr.sort((a, b) => b.length - a.length);

	for (const str of arr) {
		let temp = tree;

		for (const char of Array.from(punycode(str.replaceAll("*", "---")).replaceAll("---", "*")).reverse()) {
			if (!(char in temp)) {
				temp[char] = {};
			}
			temp = temp[char];
		}

		// Leaf node
		temp[""] = true;
	}

	Object.freeze(tree);
	return createRegEx(tree).replaceAll(".", "\\.").replaceAll("*", "[^.]+");
}

/**
 * Parse public suffix list and create regular expressions.
 *
 * @param {readonly string[]} PSL
 * @returns {void}
 */
function parsePSL(PSL) {
	const start = performance.now();
	suffixes = [];
	exceptions = [];

	for (const r of PSL) {
		if (r.startsWith("!")) {
			exceptions.push(r.slice(1));
		} else {
			suffixes.push(r);
		}
	}

	// console.log(suffixes, exceptions);

	suffixes = createTree(suffixes);
	exceptions = createTree(exceptions);

	console.log(suffixes, exceptions);

	suffixes = new RegExp(String.raw`(?:^|\.)(${suffixes})$`, "u");
	exceptions = new RegExp(String.raw`(?:^|\.)(${exceptions})$`, "u");

	// console.log(suffixes, exceptions);
	const end = performance.now();
	console.log(`The PSL was parsed in ${end - start} ms.`);
}

/**
 * Get the geolocation databases.
 *
 * @param {number} date
 * @returns {Promise<void>}
 */
async function getGeoLoc(date) {
	setIcon(null, icons[7], `${TITLE}  \nUpdating geolocation databases`, null, null);

	const message = {
		type: WORKER,
		date,
		languages: await browser.i18n.getAcceptLanguages()
	};
	// console.log(message);
	worker.postMessage(message);
}

/**
 * Get the geolocation.
 *
 * @param {string} address
 * @returns {Promise<Object|null>}
 */
function getGeoIP(address) {
	const message = {
		type: LOCATION,
		addresses: [address]
	};
	// console.log(message);

	return new Promise((resolve) => {
		const channel = new MessageChannel();

		channel.port1.onmessage = (event) => {
			channel.port1.close();
			resolve(event.data.locations[0]);
		};

		worker.postMessage(message, [channel.port2]);
	});
}

browser.privacy.network.httpsOnlyMode.onChange.addListener((details) => {
	console.log(details);
	httpsOnlyMode = details.value;
});

/**
 * Handle idle state change.
 *
 * @param {string} state
 * @returns {void}
 */
function newState(state) {
	// console.log(`New state: ${state}`);
	if (settings.updateidle) {
		// console.log(new Date(), state);
		if (state === "locked" || state === "idle") {
			if (date) {
				getGeoLoc(date);
				date = null;
			}
		}
	}
}

browser.idle.onStateChanged.addListener(newState);

/**
 * Handle alarm.
 *
 * @param {Object} alarmInfo
 * @returns {Promise<void>}
 */
async function handleAlarm(alarmInfo) {
	if (alarmInfo.name === ALARM1) {
		getPSL(alarmInfo.scheduledTime);
	} else if (alarmInfo.name === ALARM2) {
		if (settings.updateidle) {
			const state = await browser.idle.queryState(settings.idle);
			if (state === "locked" || state === "idle") {
				getGeoLoc(alarmInfo.scheduledTime);
			} else {
				date = alarmInfo.scheduledTime;
			}
		} else {
			getGeoLoc(alarmInfo.scheduledTime);
		}
	}
}

browser.alarms.onAlarm.addListener(handleAlarm);

/**
 * Send settings to popup.
 *
 * @param {Object} details
 * @param {Object} tab
 * @returns {void}
 */
function sendSettings(details, tab) {
	if (popup && details.tabId === popup) {
		const response = {
			type: POPUP,
			WARNDAYS: settings.warndays,
			FULLIPv6: settings.fullipv6,
			COMPACTIPv6: settings.compactipv6,
			OPEN: settings.open,
			BLOCKED: settings.blocked,
			HTTPS: settings.https || httpsOnlyMode === "always" || httpsOnlyMode === "private_browsing" && details.incognito,
			DNS: settings.dns,
			SUFFIX: settings.suffix,
			GeoDB: settings.GeoDB,
			MAP: settings.map,
			LOOKUP: settings.lookup,
			SEND: settings.send,
			details,
			tab
		};
		// console.log(response);

		browser.runtime.sendMessage(response).catch((error) => {
			// console.error(error);
			popup = null;
		});
	}
}

/**
 * Set settings.
 *
 * @param {Object} asettings
 * @returns {void}
 */
function setSettings(asettings) {
	settings.warndays = asettings.warndays;
	settings.fullipv6 = asettings.fullipv6;
	settings.compactipv6 = asettings.compactipv6;
	settings.open = asettings.open;
	settings.blocked = asettings.blocked;
	settings.https = asettings.https;
	const GeoDB = Number.parseInt(asettings.GeoDB, 10);
	settings.update = Number.parseInt(asettings.update, 10);
	settings.updateidle = asettings.updateidle;
	settings.idle = asettings.idle;
	settings.map = Number.parseInt(asettings.map, 10);
	settings.lookup = Number.parseInt(asettings.lookup, 10);
	settings.icon = Number.parseInt(asettings.icon, 10);
	settings.dns = asettings.dns;
	settings.blacklist = asettings.blacklist;
	settings.domainblacklists = [asettings.domainblacklist];
	settings.ipv4blacklists = [asettings.ipv4blacklist];
	settings.ipv6blacklists = [asettings.ipv6blacklist];
	settings.color = asettings.color;
	settings.send = asettings.send;

	browser.idle.setDetectionInterval(settings.idle);

	// browser.alarms.clearAll();

	if (asettings.suffix) {
		if (asettings.suffix !== settings.suffix) {
			settings.suffix = asettings.suffix;

			browser.storage.local.get(["PSL"]).then((item) => {
				console.log(item);
				const d = new Date();
				const PSL = item.PSL;

				if (PSL) {
					parsePSL(PSL.PSL);

					d.setTime(PSL.date);
				} else {
					getPSL(d.getTime());
				}

				d.setDate(d.getDate() + 1);

				setTimeout(() => {
					browser.alarms.create(ALARM1, {
						when: d.getTime(),
						periodInMinutes: 60 * 24
					});
				}, wait * 1000);
			});
		}
	} else {
		settings.suffix = asettings.suffix;

		browser.alarms.clear(ALARM1);
	}

	if (GeoDB) {
		if (GeoDB !== settings.GeoDB) {
			settings.GeoDB = GeoDB;

			setIcon(null, icons[6], `${TITLE}  \nProcessing geolocation databases`, null, null);

			if (!worker) {
				worker = new Worker("worker.js");

				worker.addEventListener("message", (event) => {
					const message = event.data;
					// console.log(message);

					switch (message.type) {
						case NOTIFICATION: {
							notification(message.title, message.message, message.date);
							break;
						}
						case WORKER: {
							setIcon(null, icons[0], null, null, null);

							for (const [tabId, tab] of tabs) {
								if (tab.details && tab.details.statusLine) {
									updateIcon(tabId, tab);
								}
							}
							break;
						}
						case BACKGROUND: {
							setIcon(null, icons[6], `${TITLE}  \nProcessing geolocation databases`, null, null);

							browser.storage.local.set({ GEOIP: message.GEOIP });
							break;
						}
						// No default
					}
				});
			}

			// await browser.storage.local.remove(["GEOIP"]);
			browser.storage.local.get(["GEOIP"]).then(async (item) => {
				console.log(item);
				const d = new Date();
				const GEOIP = item.GEOIP;

				const message = {
					type: BACKGROUND,
					GeoDB: settings.GeoDB,
					languages: await browser.i18n.getAcceptLanguages()
				};

				if (GEOIP && GEOIP.GeoDB === settings.GeoDB) {
					message.GEOIP = GEOIP;

					d.setTime(GEOIP.date);
				} else {
					message.date = d.getTime();
				}

				// console.log(message);
				worker.postMessage(message);

				const days = settings.update === 1 ? 1 : settings.update === 2 ? 7 : settings.update === 3 ? 30 : 365;
				d.setDate(d.getDate() + days);

				setTimeout(() => {
					browser.alarms.create(ALARM2, {
						when: d.getTime(),
						periodInMinutes: 60 * 24 * days
					});
				}, wait * 1000);
			});
		}
	} else {
		settings.GeoDB = GeoDB;

		browser.alarms.clear(ALARM2);

		if (worker) {
			worker.terminate();
			worker = null;
		}
	}
}

/**
 * Init.
 *
 * @returns {Promise<void>}
 */
async function init() {
	const platformInfo = await browser.runtime.getPlatformInfo();
	IS_ANDROID = platformInfo.os === "android";
	IS_LINUX = platformInfo.os === "linux";

	[icons, certificateIcons, statusIcons, digitIcons] = [emojis, certificateEmojis, statusEmojis, digitEmojis].map((emoji) => Object.freeze(emoji.map((e) => getIcons(e))));

	browser.browserAction.setIcon({
		imageData: icons[0]
	});

	browser.privacy.network.httpsOnlyMode.get({}).then((got) => {
		console.log(got);
		httpsOnlyMode = got.value;
	});

	const asettings = await AddonSettings.get("settings");

	setSettings(asettings);
}

init();

browser.runtime.onMessage.addListener((message, sender) => {
	// console.log(message);
	switch (message.type) {
		case POPUP: {
			popup = message.tabId;
			const tab = tabs.get(message.tabId);
			const response = {
				type: POPUP,
				WARNDAYS: settings.warndays,
				FULLIPv6: settings.fullipv6,
				COMPACTIPv6: settings.compactipv6,
				OPEN: settings.open,
				BLOCKED: settings.blocked,
				HTTPS: settings.https || httpsOnlyMode === "always" || httpsOnlyMode === "private_browsing" && tab.details.incognito,
				DNS: settings.dns,
				BLACKLIST: settings.blacklist,
				DOMAINBLACKLISTS: settings.domainblacklists,
				IPv4BLACKLISTS: settings.ipv4blacklists,
				IPv6BLACKLISTS: settings.ipv6blacklists,
				SUFFIX: settings.suffix,
				suffixes,
				exceptions,
				GeoDB: settings.GeoDB,
				MAP: settings.map,
				LOOKUP: settings.lookup,
				SEND: settings.send,
				tab
			};
			// console.log(response);
			return Promise.resolve(response);
		}
		case LOCATION: {
			return new Promise((resolve) => {
				const channel = new MessageChannel();

				channel.port1.onmessage = (event) => {
					channel.port1.close();
					resolve(event.data);
				};

				worker.postMessage(message, [channel.port2]);
			});
		}
		case BACKGROUND: {
			setSettings(message.optionValue);

			for (const [tabId, tab] of tabs) {
				if (tab.details && tab.details.statusLine) {
					updateIcon(tabId, tab);
				}
			}
			break;
		}
		case CONTENT: {
			const tab = tabs.get(sender.tab.id);
			if (tab) {
				tab.performance = message.performance;
			}
			console.log(message);
			if (settings.icon === 7) {
				updateIcon(sender.tab.id, tab);
			}
			break;
		}
		// No default
	}
});

browser.runtime.onInstalled.addListener((details) => {
	console.log(details);
	const manifest = browser.runtime.getManifest();
	switch (details.reason) {
		case "install":
			notification(`🎉 ${manifest.name} installed`, `Thank you for installing the “${TITLE}” add-on!\nVersion: ${manifest.version}\n\nOpen the options/preferences page to configure this extension.`);
			break;
		case "update":
			if (settings.send) {
				browser.notifications.create({
					type: "basic",
					iconUrl: browser.runtime.getURL("icons/icon_128.png"),
					title: `✨ ${manifest.name} updated`,
					message: `The “${TITLE}” add-on has been updated to version ${manifest.version}. Click to see the release notes.\n\n❤️ Huge thanks to the generous donors that have allowed me to continue to work on this extension!`
				}).then(async (notificationId) => {
					if (browser.runtime.getBrowserInfo) {
						const browserInfo = await browser.runtime.getBrowserInfo();

						if (browserInfo.name !== "Thunderbird") {
							const url = `https://addons.mozilla.org/firefox/addon/server-status/versions/${manifest.version}`;
							notifications.set(notificationId, url);
						}
					}
				});
			}
			break;
	}
});

browser.runtime.setUninstallURL("https://forms.gle/hEPfPo2tRsfSHoxD7");
