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

let IS_ANDROID = null;
let IS_LINUX = null;

let icons = null;
let certificateIcons = null;
let statusIcons = null;
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
			"type": "basic",
			"iconUrl": browser.runtime.getURL("icons/icon_128.png"),
			"title": title,
			"message": message,
			"eventTime": date
		});
	}
}

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

	ctx.font = `${size * (IS_LINUX && !IS_CHROME ? 63 / 64 : (IS_ANDROID ? 57 / 64 : 7 / 8))}px serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	// draw the emoji
	ctx.fillText(emoji, size / 2, size * (IS_CHROME && !IS_ANDROID ? 37 / 64 : (IS_LINUX ? 59 / 96 : 13 / 24)));

	return ctx.getImageData(0, 0, size, size);
}

/**
 * Create icons.
 *
 * @param {string} emoji
 * @returns {Object}
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
 * @param {number} tabId
 * @param {ImageData} icon
 * @param {string} title
 * @param {string} text
 * @param {string} backgroundColor
 * @returns {void}
 */
function setIcon(tabId, icon, title, text, backgroundColor) {
	// console.log(tabId, icon, title, text, backgroundColor);
	browser.browserAction.setIcon({
		imageData: icon,
		"tabId": tabId
	});
	browser.browserAction.setTitle({
		"title": title,
		"tabId": tabId
	});
	browser.browserAction.setBadgeText({
		"text": text,
		"tabId": tabId
	});
	browser.browserAction.setBadgeBackgroundColor({
		"color": backgroundColor,
		"tabId": tabId
	});
}

/**
 * Update the browserAction icon.
 *
 * @param {number} tabId
 * @param {Object} details
 * @param {Object} securityInfo
 * @returns {void}
 */
async function updateIcon(tabId, { details, securityInfo }) {
	// console.log(tabId, details, securityInfo);
	let icon = null;
	const title = [`Status:  ${details.statusLine}`];
	let text = null;
	let backgroundColor = null;

	if (details.ip) {
		title.push(`IP address:  ${details.ip}`);
	}

	if (settings.GeoDB) {
		if (details.ip) {
			const info = await getGeoIP(details.ip);
			console.log(details.ip, info);

			const country = info?.country;
			title.push(`Server location:  ${country ? `${outputlocation(info)} ${countryCode(country)}${info.lon != null ? ` ${earth(info.lon)}` : ""}` : "Unknown"}`);

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
		title.push("Error: Geolocation database disabled");
		icon = certificateIcons[3];
	}

	if (securityInfo.state === "insecure") {
		title.push("Insecure");
		if (settings.icon === 2 || settings.icon === 3) {
			icon = certificateIcons[0];
		}
	} else {
		if (securityInfo.certificates.length) {
			const certificate = securityInfo.certificates[0];
			// const start = certificate.validity.start;
			const end = certificate.validity.end;
			const sec = Math.floor(end / 1000) - Math.floor(details.timeStamp / 1000);
			const days = Math.floor(sec / 86400);
			const issuer = certificate.issuer;
			const aissuer = getissuer(issuer);
			// console.log(end, days, new Date(end));
			// sec > 0 ? outputdateRange(start, end) : outputdate(end)
			title.push(`Certificate:  ${sec > 0 ? "Expires" : "Expired"} ${rtf.format(days, "day")} (${dateTimeFormat4.format(new Date(end))})`);
			title.push(`Issuer:  ${aissuer.O || aissuer.CN || issuer}${aissuer.L ? `, ${aissuer.L}` : ""}${aissuer.S ? `, ${aissuer.S}` : ""}${aissuer.C ? `, ${regionNames.of(aissuer.C)} ${countryCode(aissuer.C)}` : ""}`);
			if (settings.icon === 2 || settings.icon === 3) {
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
				if (settings.icon === 2) {
					text = days === 0 ? `< ${numberFormat.format(1)}` : numberFormat.format(days);
				} else {
					text = securityInfo.protocolVersion.startsWith("TLS") ? securityInfo.protocolVersion.slice(3) : securityInfo.protocolVersion;
					backgroundColor = settings.color;
				}
			}
		}
		if (securityInfo.state === "broken" || securityInfo.isUntrusted || securityInfo.isNotValidAtThisTime || securityInfo.isDomainMismatch) {
			const message = getmessage(securityInfo);
			if (message) {
				title.push(message);
			}
			if (settings.icon === 2 || settings.icon === 3) {
				icon = certificateIcons[3];
				backgroundColor = "red";
			}
		}
		let atitle = "HSTS:  ";
		if (details.responseHeaders) {
			// console.log(details.responseHeaders);
			const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
			if (header) {
				const aheader = getHSTS(header.value);
				// console.log(header, aheader);
				atitle += `Yes (${outputseconds(parseInt(aheader["max-age"], 10))})`;
			} else {
				atitle += securityInfo.hsts ? "Yes" : "No";
			}
			console.assert(!!header === securityInfo.hsts, "Error: HSTS", header, securityInfo.hsts);
		} else {
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1778454
			/* if (securityInfo.hsts) {
				atitle += "Yes";
				if (details.responseHeaders) {
					// console.log(details.responseHeaders);
					const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
					if (header) {
						const aheader = getHSTS(header.value);
						// console.log(header, aheader);
						atitle += ` ${outputseconds(parseInt(aheader["max-age"], 10))})`;
					}
				}
			} else {
				atitle += "No";
			} */
			atitle += securityInfo.hsts ? "Yes" : "No";
		}
		title.push(atitle);
	}

	if (settings.icon === 4 || settings.icon === 5) {
		const statusCode = details.statusCode;
		if (statusCode >= 100 && statusCode < 200) {
			icon = statusIcons[0];
			backgroundColor = "green";
		} else if (statusCode >= 200 && statusCode < 300) {
			icon = statusIcons[1];
			backgroundColor = "green";
		} else if (statusCode >= 300 && statusCode < 400) {
			icon = statusIcons[2];
			backgroundColor = "yellow";
		} else {
			// I'm a teapot
			icon = statusCode === 418 ? statusIcons[4] : statusIcons[3];
			backgroundColor = "red";
		}
		if (settings.icon === 4) {
			text = statusCode.toString();
		} else {
			// Get HTTP version
			const re = /^HTTP\/(\S+) ((\d{3})(?: .+)?)$/;
			const regexResult = re.exec(details.statusLine);
			console.assert(regexResult, "Error: Unknown Status", details.statusLine);
			text = regexResult ? regexResult[1] : details.statusLine;
			backgroundColor = settings.color;
		}
	}
	setIcon(tabId, icon, title.join("  \n"), text, backgroundColor);
}

/**
 * Update active tab.
 *
 * @param {Object} details
 * @returns {void}
 */
function updateActiveTab(details) {
	if (details.frameId === 0) {
		// console.log(details.url);
		// console.log("tabs.onUpdated:", details.url, new URL(details.url).origin);
		if (details.tabId && details.tabId !== TAB_ID_NONE) {
			const aurl = new URL(details.url);
			if (tabs.has(details.tabId)) {
				const tab = tabs.get(details.tabId);
				if (tab.details && tab.details.statusLine) {
					const url = new URL(tab.details.url);
					if (url.origin === aurl.origin) {
						updateIcon(details.tabId, tab);
						// console.log(`Success: ${details.tabId}`, changeInfo.url);
					} else {
						const tab = { "details": null, "securityInfo": null, "requests": new Map() };
						tabs.set(details.tabId, tab);
						// certificateIcons[5]
						setIcon(details.tabId, icons[1], `${TITLE}  \nAccess denied for this ???${aurl.protocol}??? page`, null, null);
						console.debug(aurl.protocol, aurl.origin, url.origin);
					}
				} else if (tab.error) {
					setIcon(details.tabId, icons[1], `${TITLE}  \nError occurred for this ???${aurl.protocol}??? page`, null, null);
					console.debug(aurl.protocol, aurl.origin, tab.error);
				} else {
					setIcon(details.tabId, tab.details ? icons[2] : icons[1], `${TITLE}  \nUnavailable${tab.details ? "" : " or Access denied"} for this ???${aurl.protocol}??? page`, null, null);
					console.debug(aurl.protocol, aurl.origin);
				}
			} else {
				setIcon(details.tabId, icons[0], `${TITLE}  \nUnavailable for this ???${aurl.protocol}??? page`, null, null);
				// console.log(`Error: ${details.tabId}`, changeInfo.url);
				console.debug(aurl.protocol, aurl.origin);
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
			tabs.set(details.tabId, { "details": details, "requests": new Map() });
			// console.log("beforeRequest", details);
		} else if (!tabs.has(details.tabId)) {
			tabs.set(details.tabId, { "details": null, "requests": new Map() });
			// certificateIcons[5]
			setIcon(details.tabId, icons[1], `${TITLE}  \nAccess denied for this ???${aurl.protocol}??? page`, null, null);
			console.debug(details.tabId, aurl.origin);
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
	{ urls: ["<all_urls>"] }
);

/**
 * Save request details and security info.
 *
 * @param {Object} details
 * @returns {void}
 */
async function headersReceived(details) {
	// console.log(details);
	if (details.tabId && details.tabId !== TAB_ID_NONE) {
		try {
			const main_frame = details.type === "main_frame";
			const securityInfo = await browser.webRequest.getSecurityInfo(
				details.requestId,
				{ "certificateChain": main_frame, "rawDER": main_frame }
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
 * @returns {Promise}
 */
function getPSL(date) {
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

			browser.storage.local.set({ "PSL": { PSL, date } });

			console.timeLog(label);

			parsePSL(PSL);

			console.timeEnd(label);
		} else {
			console.error(response);
			console.timeEnd(label);
		}
	});
}

/**
 * Find common prefix.
 *
 * @param {string[]} strs
 * @returns {string}
 */
function prefix(strs) {
	let prefix = "";

	for (const char of strs[0]) {
		const aprefix = prefix + char;
		for (const str of strs) {
			if (!str.startsWith(aprefix)) {
				return prefix;
			}
		}
		prefix = aprefix;
	}

	return prefix;
}

/**
 * Find common suffix.
 *
 * @param {string[]} strs
 * @returns {string}
 */
function suffix(strs) {
	let suffix = "";

	for (const char of Array.from(strs[0]).reverse()) {
		const asuffix = char + suffix;
		for (const str of strs) {
			if (!str.endsWith(asuffix)) {
				return suffix;
			}
		}
		suffix = asuffix;
	}

	return suffix;
}

/**
 * Traverse tree of objects to create RegEx.
 *
 * @param {Object} obj
 * @returns {string}
 */
function traverse(obj) {
	const array = [];

	for (const s in obj) {
		if (s !== "leaf") {
			const length = Object.keys(obj[s]).length;
			let temp = "";

			if (length > 1 || (length === 1 && !obj[s].leaf)) {
				if (obj[s].leaf) {
					temp += String.raw`(?:${traverse(obj[s])}\.)?`;
				} else {
					temp += String.raw`${traverse(obj[s])}\.`;
				}
			}

			temp += s.replace("---", "[^.]+");
			array.push(temp);
		}
	}

	if (array.length > 1) {
		const aprefix = prefix(array);
		const asuffix = suffix(array);

		if (aprefix.length > 1 || asuffix.length > 1) {
			return `${aprefix}(?:${array.map((x) => x.slice(aprefix.length, asuffix ? -asuffix.length : x.length)).join("|")})${asuffix}`;
		}

		return `(?:${array.join("|")})`;
	}

	return array.join("|");
}

/**
 * Convert public suffix list into tree of objects.
 *
 * @param {string[]} arr
 * @returns {string}
 */
function createRegEx(arr) {
	const tree = {};

	for (const s of arr) {
		let temp = tree;

		for (const l of punycode(s.replaceAll("*", "---")).split(".").reverse()) {
			if (!(l in temp)) {
				temp[l] = {};
			}
			temp = temp[l];
		}

		// Leaf node
		temp.leaf = true;
	}

	Object.freeze(tree);
	return traverse(tree);
}

/**
 * Parse public suffix list and create regular expressions.
 *
 * @param {string[]} PSL
 * @returns {void}
 */
function parsePSL(PSL) {
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

	suffixes = createRegEx(suffixes);
	exceptions = createRegEx(exceptions);

	console.log(suffixes, exceptions);

	suffixes = new RegExp(String.raw`(?:^|\.)(${suffixes})$`);
	exceptions = new RegExp(String.raw`(?:^|\.)(${exceptions})$`);

	// console.log(suffixes, exceptions);
}

/**
 * Get the geolocation databases.
 *
 * @param {number} date
 * @returns {void}
 */
async function getGeoLoc(date) {
	setIcon(null, icons[7], `${TITLE}  \nUpdating geolocation databases`, null, null);

	const message = {
		"type": WORKER,
		"date": date,
		"languages": await browser.i18n.getAcceptLanguages()
	};
	// console.log(message);
	worker.postMessage(message);
}

/**
 * Get the geolocation.
 *
 * @param {string} address
 * @returns {Object}
 */
function getGeoIP(address) {
	const message = {
		"type": LOCATION,
		"addresses": [address]
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
 * @returns {void}
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
			"type": POPUP,
			"WARNDAYS": settings.warndays,
			"FULLIPv6": settings.fullipv6,
			"BLOCKED": settings.blocked,
			"HTTPS": settings.https || httpsOnlyMode === "always" || (httpsOnlyMode === "private_browsing" && details.incognito),
			"DNS": settings.dns,
			"SUFFIX": settings.suffix,
			"GeoDB": settings.GeoDB,
			"MAP": settings.map,
			"LOOKUP": settings.lookup,
			"SEND": settings.send,
			"details": details,
			"tab": tab
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
	settings.blocked = asettings.blocked;
	settings.https = asettings.https;
	const GeoDB = parseInt(asettings.GeoDB, 10);
	settings.update = parseInt(asettings.update, 10);
	settings.updateidle = asettings.updateidle;
	settings.idle = asettings.idle;
	settings.map = parseInt(asettings.map, 10);
	settings.lookup = parseInt(asettings.lookup, 10);
	settings.icon = parseInt(asettings.icon, 10);
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

					if (message.type === NOTIFICATION) {
						notification(message.title, message.message, message.date);
					} else if (message.type === WORKER) {
						setIcon(null, icons[0], null, null, null);

						for (const [tabId, tab] of tabs) {
							if (tab.details && tab.details.statusLine) {
								updateIcon(tabId, tab);
							}
						}
					} else if (message.type === BACKGROUND) {
						setIcon(null, icons[6], `${TITLE}  \nProcessing geolocation databases`, null, null);

						browser.storage.local.set({ "GEOIP": message.GEOIP });
					}
				});
			}

			// await browser.storage.local.remove(["GEOIP"]);
			browser.storage.local.get(["GEOIP"]).then(async (item) => {
				console.log(item);
				const d = new Date();
				const GEOIP = item.GEOIP;

				const message = {
					"type": BACKGROUND,
					"GeoDB": settings.GeoDB,
					"languages": await browser.i18n.getAcceptLanguages()
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
 * @returns {void}
 */
async function init() {
	const platformInfo = await browser.runtime.getPlatformInfo();
	IS_ANDROID = platformInfo.os === "android";
	IS_LINUX = platformInfo.os === "linux";

	[icons, certificateIcons, statusIcons] = [emojis, certificateEmojis, statusEmojis].map((emoji) => Object.freeze(emoji.map(getIcons)));

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
	if (message.type === POPUP) {
		popup = message.tabId;
		const tab = tabs.get(message.tabId);
		const response = {
			"type": POPUP,
			"WARNDAYS": settings.warndays,
			"FULLIPv6": settings.fullipv6,
			"BLOCKED": settings.blocked,
			"HTTPS": settings.https || httpsOnlyMode === "always" || (httpsOnlyMode === "private_browsing" && tab.details.incognito),
			"DNS": settings.dns,
			"BLACKLIST": settings.blacklist,
			"DOMAINBLACKLISTS": settings.domainblacklists,
			"IPv4BLACKLISTS": settings.ipv4blacklists,
			"IPv6BLACKLISTS": settings.ipv6blacklists,
			"SUFFIX": settings.suffix,
			"suffixes": suffixes,
			"exceptions": exceptions,
			"GeoDB": settings.GeoDB,
			"MAP": settings.map,
			"LOOKUP": settings.lookup,
			"SEND": settings.send,
			"tab": tab
		};
		// console.log(response);
		return Promise.resolve(response);
	} else if (message.type === LOCATION) {
		return new Promise((resolve) => {
			const channel = new MessageChannel();

			channel.port1.onmessage = (event) => {
				channel.port1.close();
				resolve(event.data);
			};

			worker.postMessage(message, [channel.port2]);
		});
	} else if (message.type === BACKGROUND) {
		setSettings(message.optionValue);

		for (const [tabId, tab] of tabs) {
			if (tab.details && tab.details.statusLine) {
				updateIcon(tabId, tab);
			}
		}
	}
});
