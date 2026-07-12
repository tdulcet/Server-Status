"use strict";

import { POPUP, CONTENT, PERFORMANCE, LOCATION, emojis, certificateEmojis, status_codes, dateTimeFormat1, dateTimeFormat3, dateTimeFormat4, numberFormat4, numberFormat5, numberFormat6, numberFormat, rtf, regionNames, IPv4_RE, IPv6, IPv6_RE, outputunit, outputbase85, expandipv6, ipv6toint, inttoipv4, embeddedipv6, outputseconds, outputdate, outputdateRange, outputstatus, outputlocation, earth, getcertname, getHSTS, getmessage, countryCode } from "/common.js";

const { TAB_ID_NONE } = browser.tabs;

const durationFormat = new Intl.DurationFormat([], { style: "long" });

const formatter2 = new Intl.ListFormat([], { style: "short" });

const aIPv6_RE = new RegExp(String.raw`^\[${IPv6}\]$`, "u");

let WARNDAYS = 3;
let OPEN = true;
let BLOCKED = true;
let FULLIPv6 = false;
let COMPACTIPv6 = false;
let NAT64PREFIXES = new Set();
let HTTPS = false;
let SUFFIX = true;
let GeoDB = 1;
let MAP = 0;
let LOOKUPIP = 0;
let LOOKUPHOST = 0;
let DNS = true;
let SKEW = false;
let BLACKLIST = false;
let SEND = true;

let COLUMNS = {
	download: true,
	upload: true,
	classification: true,
	security: true,
	expiration: true,
	tlsversion: true,
	hsts: true,
	ech: true,
	httpversion: true,
	httpstatus: true
};

let DOMAINBLACKLISTS = [];
let IPv4BLACKLISTS = [];
let IPv6BLACKLISTS = [];

let pasteSymbol = null;

let suffixes_pattern = null;
let exceptions_pattern = null;

let timeoutID = null;
let tabId = null;
let running = false;

const timer = document.getElementById("timer");

/**
 * Create notification.
 *
 * @param {string} title
 * @param {string} message
 * @returns {void}
 */
function notification(title, message) {
	console.log(title, message);
	if (SEND) {
		browser.notifications.create({
			type: "basic",
			iconUrl: browser.runtime.getURL("icons/icon_128.png"),
			title,
			message
		});
	}
}

/**
 * Output duration.
 *
 * @param {number} sec
 * @returns {string}
 */
function outputduration(sec) {
	// console.log(now);
	const days = Math.trunc(sec / 86400);
	const hours = Math.trunc(sec % 86400 / 3600);
	const minutes = Math.trunc(sec % 3600 / 60);
	const seconds = sec % 60;
	return durationFormat.format({ days, hours, minutes, seconds }) || numberFormat4.format(seconds);
}

/**
 * Output timer.
 *
 * @param {number} time
 * @param {number} now
 * @returns {void}
 */
function outputtimer(time, now) {
	const sec = Math.floor((time - now) / 1000);
	const days = Math.floor(sec / 86400);
	let text;
	let color;
	if (sec > 0) {
		text = outputduration(sec);
		color = days > WARNDAYS ? "green" : "yellow";
	} else {
		text = "Expired";
		color = "red";
	}
	timer.classList.remove("green", "yellow", "red");
	timer.classList.add(color);
	timer.textContent = text;
}

/**
 * Timer tick.
 *
 * @param {number} time
 * @returns {void}
 */
function timerTick(time) {
	const now = Date.now();
	const delay = 1000 - now % 1000;

	timeoutID = setTimeout(() => {
		outputtimer(time, now + delay);
		if (time > now) {
			timerTick(time);
		}
	}, delay);
}

/**
 * Output duration in milliseconds.
 *
 * @param {number} msec
 * @returns {string}
 */
function outputmsduration(msec) {
	const seconds = Math.trunc(msec / 1000);
	const milliseconds = msec % 1000;
	return durationFormat.format({ seconds, milliseconds }) || numberFormat5.format(milliseconds);
}

/**
 * Output time in milliseconds.
 *
 * @param {number} msec
 * @param {HTMLElement} element
 * @returns {void}
 */
function outputms(msec, element) {
	element.title = outputmsduration(msec);
	element.textContent = numberFormat6.format(msec);
}

/**
 * Create link.
 *
 * @param {string} link
 * @returns {HTMLAnchorElement}
 */
function createlink(link) {
	const a = document.createElement("a");
	a.href = link;
	a.target = "_blank";
	return a;
}

/**
 * Output map link.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Array.<HTMLElement|string>}
 */
function map(latitude, longitude) {
	let url = "";
	switch (MAP) {
		case 1:
			url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`;
			break;
		case 2:
			url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
			break;
		case 3:
			url = `https://bing.com/maps/?cp=${latitude}~${longitude}`;
			break;
		case 4:
			url = `https://www.mapquest.com/latlng/${latitude},${longitude}`;
			break;
		case 5:
			url = `https://maps.apple.com/?q=${latitude},${longitude}`;
			break;
		// No default
	}
	const a = createlink(url);
	a.title = "Click to View Map";
	a.textContent = "🗺️";
	a.classList.add("button");
	return ["(", a, ")"];
}

/**
 * Output IP address lookup link.
 *
 * @param {string} hostname
 * @param {string} address
 * @returns {Array.<HTMLElement|string>}
 */
function lookupip(hostname, address) {
	let url = "";
	switch (LOOKUPIP) {
		case 1:
			// https://iplookup.flagfox.net/?ip={IPaddress}&host={domainName}
			url = `https://iplookup.flagfox.net/?ip=${address}&host=${hostname}`;
			break;
		case 2:
			url = `https://www.ip2location.com/${address}`;
			break;
		case 3:
			url = `https://browserleaks.com/ip/${address}`;
			break;
		// No default
	}
	const a = createlink(url);
	a.title = "Click to Lookup IP address";
	a.textContent = "🔍";
	a.classList.add("button");
	return ["(", a, ")"];
}

/**
 * Output hostname lookup link.
 *
 * @param {string} hostname
 * @returns {Array.<HTMLElement|string>}
 */
function lookuphost(hostname) {
	let url = "";
	switch (LOOKUPHOST) {
		case 1:
			url = `https://browserleaks.com/ip/${hostname}`;
			break;
		case 2:
			url = `https://hosting-checker.net/websites/${hostname}`;
			break;
		// No default
	}
	const a = createlink(url);
	a.title = "Click to Lookup hostname";
	a.textContent = "🔍";
	a.classList.add("button");
	return ["(", a, ")"];
}

/**
 * Output IP address.
 *
 * @param {string} address
 * @param {string} hostname
 * @param {string|null} [current]
 * @returns {Array.<HTMLElement|string>}
 */
function outputaddress(address, hostname, current) {
	let ipv4 = IPv4_RE.test(address);
	let ipv6 = IPv6_RE.test(address);
	let embedded = false;
	const aipv6 = ipv6 && ipv6toint(address);
	if (ipv6) {
		if (NAT64PREFIXES.has(aipv6 >> 32n)) {
			ipv4 = true;
			ipv6 = false;
			embedded = true;
		}
	}
	console.assert(ipv4 || ipv6, "Error: Unknown IP address", address);

	let aaddress;
	if (ipv6) {
		aaddress = FULLIPv6 ? expandipv6(address).join(":") : COMPACTIPv6 ? outputbase85(aipv6) : address;
	} else if (embedded) {
		aaddress = FULLIPv6 ? embeddedipv6(expandipv6(address).join(":"), aipv6) : COMPACTIPv6 ? outputbase85(aipv6) : embeddedipv6(address, aipv6);
	} else if (ipv4) {
		aaddress = address;
	}
	const a = createlink(`http${HTTPS ? "s" : ""}://${ipv6 || embedded ? `[${address}]` : address}`);
	if (address === current) {
		const strong = document.createElement("strong");
		strong.textContent = aaddress;
		a.append(strong);
	} else {
		a.textContent = aaddress;
	}
	a.classList.add(ipv6 ? "ipv6" : "ipv4");
	const text = [a];
	if (LOOKUPIP) {
		text.push("\u{A0}", ...lookupip(hostname, address));
	}
	return text;
}

/**
 * Output list of IP addresses.
 *
 * @param {string[]} addresses
 * @param {string} hostname
 * @param {string} current
 * @returns {string}
 */
function outputaddresses(addresses, hostname, current) {
	return formatter2.format(addresses.map((x) => {
		const span = document.createElement("span");
		span.append(...outputaddress(x, hostname, current));
		return span.innerHTML;
	}));
	// .join(', ')
}

/**
 * Output hostname.
 *
 * @param {string} hostname
 * @param {string} protocol
 * @returns {Array.<HTMLElement|string>}
 */
function outputhost(hostname, protocol) {
	let ipv4 = IPv4_RE.test(hostname);
	let ipv6 = aIPv6_RE.test(hostname);
	if (ipv6) {
		const aipv6 = ipv6toint(hostname.slice(1, -1));
		if (NAT64PREFIXES.has(aipv6 >> 32n)) {
			ipv4 = true;
			ipv6 = false;
			hostname = `[${embeddedipv6(hostname.slice(1, -1), aipv6)}]`;
		}
	}

	if (SUFFIX && suffixes_pattern && !ipv4 && !ipv6) {
		const suffixResult = suffixes_pattern.exec(hostname);
		const exceptionResult = exceptions_pattern.exec(hostname);
		const labels = hostname.split(".");
		const alabels = exceptionResult ? exceptionResult[1].split(".").slice(1) : suffixResult ? suffixResult[1].split(".") : labels.slice(-1);
		if (labels.length > alabels.length) {
			const domain = labels.slice(-(alabels.length + 1)).join("\u{200B}.");
			const subdomain = labels.slice(0, -(alabels.length + 1)).join("\u{200B}.");
			const a = createlink(`${protocol}//${hostname}`);
			const strong = document.createElement("strong");
			strong.textContent = domain;
			if (subdomain) {
				a.textContent = `${subdomain}\u{200B}.`;
			}
			a.append(strong);
			const text = [a];
			if (LOOKUPHOST) {
				text.push("\u{A0}", ...lookuphost(hostname));
			}
			return text;
		}
		console.error("Error: Hostname has invalid suffix", hostname);
	}

	const a = createlink(`${protocol}//${hostname}`);
	a.textContent = hostname;
	const text = [a];
	if (LOOKUPHOST && !ipv4 && !ipv6) {
		text.push("\u{A0}", ...lookuphost(hostname));
	}
	return text;
}

/**
 * Get emoji and URL classification.
 *
 * @param {object} details
 * @returns {{emojis: string[], classifications: string[]}}
 */
function getClassification(details) {
	const emojis = [];
	// let classifications = urlClassification.firstParty.concat(urlClassification.thirdParty);
	let classifications = details.thirdParty ? details.urlClassification.thirdParty : details.urlClassification.firstParty;
	if (classifications.length) {
		if (classifications.some((c) => c.startsWith("fingerprinting"))) {
			emojis.push("👣"); // 🫆
		}
		if (classifications.some((c) => c.startsWith("cryptomining"))) {
			emojis.push("⚒️");
		}
		if (classifications.some((c) => c.startsWith("tracking") && c !== "tracking_social")) {
			/* if (classifications.includes("tracking_ad")) {
				emojis.push("🖼️");
			} else if (classifications.includes("tracking_analytics")) {
				emojis.push("📈");
			} */
			emojis.push("👁️");
		}
		if (classifications.includes("any_social_tracking")) {
			emojis.push("👥");
		}
		classifications = classifications.filter((c) => !c.startsWith("any_"));
	}
	return { emojis, classifications };
}

/**
 * Get emoji and security state.
 *
 * @param {object} tab
 * @param {object} tab.securityInfo
 * @param {string} [tab.error]
 * @returns {{emoji: string[], state: string}}
 */
function getstate({ securityInfo, error }) {
	const emoji = [];
	let state = "";
	if (securityInfo) {
		if (securityInfo.state === "insecure") {
			emoji.push(certificateEmojis.open_lock);
			state = "Insecure";
		} else if (securityInfo.state === "broken" || securityInfo.isUntrusted || securityInfo.isNotValidAtThisTime || securityInfo.isDomainMismatch) {
			emoji.push(certificateEmojis.cross_mark);
			state = getmessage(securityInfo);
		} else if (securityInfo.state === "weak") {
			emoji.push(certificateEmojis.lock, certificateEmojis.warning_sign);
			state = `Weak${securityInfo.weaknessReasons ? ` (${securityInfo.weaknessReasons})` : ""}`;
		} else if (securityInfo.state === "secure") {
			emoji.push(certificateEmojis.lock);
			state = "Secure";
		}
	}
	if (error) {
		emoji.push(certificateEmojis.no_entry);
		if (state) {
			state += `, error: ${error}`;
		} else {
			state = `Error: ${error}`;
		}
	}
	return { emoji, state };
}

/**
 * Output tooltip/title.
 *
 * @param {string[]} array
 * @param {string} [str]
 * @returns {string}
 */
function outputtitle(array, str) {
	const obj = Object.groupBy(array, (value) => value);
	return Object.keys(obj).length > 1 ? Object.entries(obj).map(([key, value]) => `${numberFormat.format(value.length)}: ${key}`).join("\n") : str || Object.keys(obj)[0];
}

/**
 * Check Blacklist.
 *
 * @param {string} domain
 * @param {string} blacklist
 * @param {string} [address]
 * @returns {Promise<void>}
 */
function checkblacklist(domain, blacklist, address) {
	return browser.dns.resolve(domain, ["disable_trr"]).then((record) => {
		// console.log(record);
		if (!record.addresses.length) {
			return;
		}

		document.getElementById("blacklist").innerText += `🚫\u{A0}${address ? `IP address (${address})` : "domain"} is listed in the "${blacklist}" blacklist (${record.addresses.join(" ")})\n`;
		document.querySelector(".blacklist").classList.remove("hidden");
	}).catch(() => {});
}

/**
 * Check Blacklists.
 *
 * @param {string} hostname
 * @param {string[]|null} [addresses]
 * @returns {Promise<void>}
 */
async function checkblacklists(hostname, addresses) {
	let ipv4 = IPv4_RE.test(hostname);
	let ipv6 = aIPv6_RE.test(hostname);
	if (ipv6) {
		const aipv6 = ipv6toint(hostname.slice(1, -1));
		if (NAT64PREFIXES.has(aipv6 >> 32n)) {
			ipv4 = true;
			ipv6 = false;
			hostname = inttoipv4(aipv6);
		}
	}

	const ipv4s = [];
	const ipv6s = [];
	if (addresses) {
		for (const address of addresses) {
			if (IPv4_RE.test(address)) {
				ipv4s.push(address);
			} else if (IPv6_RE.test(address)) {
				const aipv6 = ipv6toint(address);
				if (NAT64PREFIXES.has(aipv6 >> 32n)) {
					ipv4s.push(inttoipv4(aipv6));
				} else {
					ipv6s.push(address);
				}
			}
		}
	}

	// Check Domain Blacklists
	if (!ipv4 && !ipv6) {
		for (const bl of DOMAINBLACKLISTS) {
			await checkblacklist(`${hostname}.${bl}`, bl);
		}
	}
	// Check IPv4 Blacklists
	if (!ipv6) {
		let addresses = [];
		if (ipv4) {
			addresses = [hostname];
		} else if (ipv4s.length) {
			addresses = ipv4s;
		}
		for (const address of addresses) {
			// Reverse IPv4 address
			const reverse = address.split(".").reverse().join(".");
			for (const bl of IPv4BLACKLISTS) {
				await checkblacklist(`${reverse}.${bl}`, bl, address);
			}
		}
	}
	// Check IPv6 Blacklists
	if (!ipv4) {
		let addresses = [];
		if (ipv6) {
			addresses = [hostname.slice(1, -1)];
		} else if (ipv6s.length) {
			addresses = ipv6s;
		}
		for (const address of addresses) {
			// Expand and reverse IPv6 address
			const reverse = expandipv6(address).join("").split("").reverse().join(".");
			for (const bl of IPv6BLACKLISTS) {
				await checkblacklist(`${reverse}.${bl}`, bl, address);
			}
		}
	}
}

/**
 * Get the geolocation.
 *
 * @param {string[]} addresses
 * @returns {Promise<Array<{start: number|bigint, end: number|bigint, country: string, state2?: string, state1?: string, city?: string, lat?: number, lon?: number}|null>>}
 */
function getGeoIP(addresses) {
	return browser.runtime.sendMessage({ type: LOCATION, addresses }).then((message) => {
		if (message.type === LOCATION) {
			// console.log(message);
			return message.locations;
		}
	});
}

/**
 * Copy link to clipboard.
 *
 * @param {string} text
 * @param {string} link
 * @returns {void}
 */
function copyToClipboard(text, link) {
	if (navigator.clipboard.write) {
		const a = createlink(link);
		a.textContent = text;

		navigator.clipboard.write([new ClipboardItem({
			"text/plain": new Blob([text], { type: "text/plain" }),
			"text/html": new Blob([a.outerHTML], { type: "text/html" })
		})]);
	} else {
		navigator.clipboard.writeText(text);
	}
}

/**
 * Copy URI/IRI to clipboard and show notification when unable to open tab/window directly.
 *
 * @param {string} uri
 * @returns {void}
 */
function copy(uri) {
	copyToClipboard(uri, uri);
	const url = new URL(uri);
	notification(`📋 Press ${pasteSymbol}-V and Enter ↵`, `Add-ons are currently unable to open “${url.protocol}” links directly, so it has been copied to your clipboard.\nPlease press ${pasteSymbol}-V and Enter ↵ to go.`);
}

/**
 * Attempt to open link in a new tab.
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function click(event) {
	const url = event.currentTarget.href;
	// console.log(url);

	browser.tabs.create({ url, openerTabId: tabId }).catch((error) => {
		console.error(error);

		browser.tabs.create({ openerTabId: tabId });
		copy(url);
	}).finally(() => {
		setTimeout(() => {
			close();
		}, 1000);
	});
}

/**
 * Update transfer size.
 *
 * @param {object} tab
 * @param {number} tab.requestSize
 * @param {number} tab.responseSize
 * @returns {void}
 */
function updateTransfer({ requestSize, responseSize }) {
	document.getElementById("download").textContent = `${outputunit(responseSize, false)}B${responseSize >= 1000 ? ` (${outputunit(responseSize, true)}B)` : ""}`;
	document.getElementById("upload").textContent = `${outputunit(requestSize, false)}B${requestSize >= 1000 ? ` (${outputunit(requestSize, true)}B)` : ""}`;
	document.querySelector(".size").classList.remove("hidden");
}

/**
 * Update performance data.
 *
 * @param {object} performance
 * @returns {void}
 */
function updatePerformance(performance) {
	const [navigation] = performance.navigation;
	const start = navigation.redirectCount ? navigation.redirectStart : navigation.fetchStart;
	outputms(navigation.loadEventStart - start, document.getElementById("load"));

	outputms(navigation.responseStart - start, document.getElementById("ttfb"));

	const redirection = navigation.redirectCount ? navigation.redirectEnd - navigation.redirectStart : null;
	const redirect = document.getElementById("redirect");
	redirect.title = navigation.redirectCount ? outputmsduration(redirection) : "";
	redirect.textContent = navigation.redirectCount ? numberFormat6.format(redirection) : "None";

	outputms(navigation.fetchStart - navigation.workerStart, document.getElementById("worker"));
	outputms(navigation.domainLookupEnd - navigation.domainLookupStart, document.getElementById("lookup"));
	outputms(navigation.connectEnd - navigation.connectStart, document.getElementById("connect"));
	outputms(navigation.responseStart - navigation.requestStart, document.getElementById("request"));
	outputms(navigation.responseEnd - navigation.responseStart, document.getElementById("response"));
	outputms(navigation.domInteractive - navigation.responseEnd, document.getElementById("parse"));
	outputms(navigation.domContentLoadedEventStart - navigation.domInteractive, document.getElementById("scripts"));
	outputms(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, document.getElementById("loaded"));
	outputms(navigation.domComplete - navigation.domContentLoadedEventEnd, document.getElementById("sub-resources"));
	// outputms(navigation.loadEventEnd - navigation.loadEventStart, document.getElementById("load"));

	if (navigation.serverTiming.length) {
		const table = document.createElement("table");

		for (const entry of navigation.serverTiming) {
			const row = table.insertRow();

			{
				const cell = row.insertCell();
				cell.title = entry.description;
				const code = document.createElement("code");
				code.textContent = entry.name;
				cell.append(code);
			}

			{
				const cell = row.insertCell();
				cell.textContent = numberFormat.format(entry.duration);
			}
		}

		document.getElementById("number-server-times").textContent = numberFormat.format(table.rows.length);

		document.getElementById("server-times").replaceChildren(table);
	} else {
		document.getElementById("server-times").textContent = "None";
	}

	const fcp = performance.paint?.find((x) => x.name === "first-contentful-paint");
	const apaint = document.getElementById("paint");
	apaint.title = fcp ? outputmsduration(fcp.startTime) : "";
	apaint.textContent = fcp ? numberFormat6.format(fcp.startTime) : "None";

	if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
		const lcp = performance.lcp?.at(-1);
		const alcp = document.getElementById("lcp");
		alcp.title = lcp ? outputmsduration(lcp.startTime) : "";
		alcp.textContent = lcp ? numberFormat6.format(lcp.startTime) : "None";
		document.querySelector(".lcp").classList.remove("hidden");
	}

	/* const size = navigation.transferSize;
	document.getElementById("size").textContent = size === 0 && navigation.decodedBodySize > 0 ? "Cached" : `${outputunit(size, false)}B${size >= 1000 ? ` (${outputunit(size, true)}B)` : ""}`;

	for (const element of document.querySelectorAll(".performance")) {
		element.classList.remove("hidden");
	} */
	document.querySelector(".performance").classList.remove("hidden");
}

/**
 * Update requests table.
 *
 * @param {Map} requests
 * @returns {void}
 */
function updateTable(requests) {
	if (requests.size) {
		const promises = [];

		const table = document.createElement("table");

		for (const [hostname, request] of requests) {
			const arequests = Array.from(request.connections.values());
			let connections = 0;
			let completed = 0;
			let redirected = 0;
			let blocked = 0;
			let errored = 0;
			for (const arequest of arequests) {
				if (arequest.error) {
					++errored;
				} else if (arequest.blocked) {
					++blocked;
				} else if (arequest.redirected) {
					++redirected;
				} else if (arequest.completed) {
					++completed;
				} else {
					++connections;
				}
			}

			if (connections || completed || redirected || BLOCKED) {
				const row = table.insertRow();

				const cell = row.insertCell();
				cell.title = `${numberFormat.format(completed)} connection${completed === 1 ? "" : "s"} completed${redirected ? `\n${numberFormat.format(redirected)} connection${redirected === 1 ? "" : "s"} redirected to a different domain` : ""}${BLOCKED ? `${blocked ? `\n${numberFormat.format(blocked)} connection${blocked === 1 ? "" : "s"} blocked by browser/another add-on` : ""}${!blocked || errored ? `\n${numberFormat.format(errored)} connection${errored === 1 ? "" : "s"} blocked/errored` : ""}` : ""}\n${numberFormat.format(connections)} active connection${connections === 1 ? "" : "s"}`;
				cell.textContent = `${numberFormat.format(completed + redirected)}${BLOCKED ? `/${numberFormat.format(blocked + errored)}` : ""}/${numberFormat.format(connections)}`;
				if (connections) {
					cell.classList.add("highlight");
				}

				if (COLUMNS.download) {
					const cell = row.insertCell();
					const { responseSize } = request;
					cell.title = `Download/Response: ${outputunit(responseSize, false)}B${responseSize >= 1000 ? ` (${outputunit(responseSize, true)}B)` : ""}`;
					cell.textContent = `${outputunit(responseSize, false)}B`;
					let aclass;
					if (responseSize < 1024) {
						aclass = "b";
					} else if (responseSize < 1024 ** 2) {
						aclass = "kib";
					} else if (responseSize < 1024 ** 3) {
						aclass = "mib";
					} else {
						aclass = "gib";
					}
					cell.classList.add(aclass, "right");
				}

				if (COLUMNS.upload) {
					const cell = row.insertCell();
					const { requestSize } = request;
					cell.title = `Upload/Request: ${outputunit(requestSize, false)}B${requestSize >= 1000 ? ` (${outputunit(requestSize, true)}B)` : ""}`;
					cell.textContent = `${outputunit(requestSize, false)}B`;
					let aclass;
					if (requestSize < 1024) {
						aclass = "b";
					} else if (requestSize < 1024 ** 2) {
						aclass = "kib";
					} else if (requestSize < 1024 ** 3) {
						aclass = "mib";
					} else {
						aclass = "gib";
					}
					cell.classList.add(aclass, "right");
				}

				if (COLUMNS.classification) {
					const cell = row.insertCell();
					const classification = arequests.map((obj) => getClassification(obj.details));
					const classifications = classification.flatMap((obj) => obj.classifications).map((c) => c.split("_").map(([h, ...t]) => h.toUpperCase() + t.join("")).join(" "));
					const aemojis = classification.flatMap((obj) => obj.emojis);
					cell.title = classifications.length ? outputtitle(classifications) : "No known trackers";
					cell.textContent = aemojis.length ? Array.from(new Set(aemojis)).join("") : "–";
				}

				if (COLUMNS.security) {
					// const { emoji, state } = getstate(securityInfo);
					const states = arequests.filter((x) => x.details.statusLine || x.error).map((obj) => getstate(obj));
					const cell = row.insertCell();
					cell.title = states.length ? outputtitle(states.map((obj) => obj.state)/* , state */) : blocked ? "Blocked by the browser or another add-on" : "Waiting for connection…";
					cell.textContent = states.length ? Array.from(new Set(states.flatMap((obj) => obj.emoji))).join("") : blocked ? certificateEmojis.shield : emojis.hourglass_with_flowing_sand;
				}

				const arequest = arequests.filter((x) => x.details.statusLine);

				if (arequest.length) {
					const { details, securityInfo } = arequest.at(-1);

					if (securityInfo.state !== "insecure" && securityInfo.certificates.length) {
						const [{ details }] = arequest;
						if (COLUMNS.expiration) {
							const [certificate] = securityInfo.certificates;
							const { start, end } = certificate.validity;
							const sec = Math.floor((end - details.timeStamp) / 1000);
							const days = Math.floor(sec / 86400);
							let title;
							let color;
							if (sec > 0) {
								// title += 'expires in ' + days.toLocaleString() + ' days';
								title = `Expires ${rtf.format(days, "day")} (${outputdateRange(start, end)})`;
								color = days > WARNDAYS ? "green" : "yellow";
							} else {
								title = `Expired ${rtf.format(days, "day")} (${outputdate(end)})`;
								color = "red";
							}
							const cell = row.insertCell();
							cell.title = title;
							const span = document.createElement("span");
							span.classList.add(color);
							span.textContent = sec > 0 && days === 0 ? `<${numberFormat.format(1)}` : numberFormat.format(days);
							cell.append(span);
						}

						if (COLUMNS.tlsversion || COLUMNS.ech) {
							const cell = row.insertCell();
							cell.title = `${COLUMNS.tlsversion ? outputtitle(arequest.map((obj) => obj.securityInfo).map((obj) => `${obj.protocolVersion}, ${obj.secretKeyLength} bits, ${obj.cipherSuite}`)) : ""}\n${COLUMNS.ech ? `ECH: ${securityInfo.usedEch ? "Yes" : "No"}` : ""}`;
							cell.append(...COLUMNS.tlsversion ? Array.from(new Set(arequest.map((obj) => obj.securityInfo.protocolVersion)), (version, index) => {
								const span = document.createElement("span");
								if (version?.startsWith("TLSv")) {
									const [major, minor] = version.slice("TLSv".length).split(".").map((x) => Number.parseInt(x, 10));
									let color;
									if (major === 1) {
										if (minor === 0 || minor === 1) {
											color = "red";
										} else if (minor === 2) {
											color = "blue";
										} else if (minor >= 3) {
											color = "green";
										}
									} else if (major > 1) {
										color = "green";
									}
									span.classList.add(color);
									span.textContent = version.slice("TLS".length);
								} else {
									span.textContent = version;
								}
								return index ? ["\n", span] : [span];
							}).flat() : [], ...COLUMNS.ech ? [securityInfo.usedEch ? emojis.heavy_check_mark : emojis.heavy_multiplication_x] : []);
						}

						if (COLUMNS.hsts) {
							const cell = row.insertCell();
							if (details.responseHeaders) {
								const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
								// const header = arequest.find((obj) => obj.details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security"))?.details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
								if (header) {
									const aheader = getHSTS(header.value);
									if ("max-age" in aheader) {
										const sec = Number.parseInt(aheader["max-age"], 10);
										const days = Math.floor(sec / 86400);
										cell.title = `HSTS: Yes (${outputseconds(sec)})`;
										cell.textContent = sec > 0 && days === 0 ? `<${numberFormat.format(1)}` : numberFormat.format(days);
									} else {
										cell.title = "HSTS: Bad header";
										cell.textContent = certificateEmojis.warning_sign;
									}
								} else {
									cell.title = `HSTS: ${securityInfo.hsts ? "Yes (Unable to find header)" : "No"}`;
									cell.textContent = securityInfo.hsts ? emojis.heavy_check_mark : emojis.heavy_multiplication_x;
								}
							} else {
								cell.title = `HSTS: ${securityInfo.hsts ? "Yes" : "No"}`;
								cell.textContent = securityInfo.hsts ? emojis.heavy_check_mark : emojis.heavy_multiplication_x;
							}
						}
					} else {
						if (COLUMNS.expiration) {
							const cell = row.insertCell();
							cell.textContent = "–";
						}
						if (COLUMNS.tlsversion || COLUMNS.ech) {
							const cell = row.insertCell();
							cell.textContent = "–";
						}
						if (COLUMNS.hsts) {
							const cell = row.insertCell();
							cell.textContent = "–";
						}
					}

					if (COLUMNS.httpversion) {
						const cell = row.insertCell();
						cell.title = outputtitle(arequest.map((obj) => obj.details.statusLine), details.statusLine);
						// Get HTTP version
						const re = /^HTTP\/(\d+(?:\.\d+)?) (\d{3})(?: .*)?$/u;
						cell.append(...Array.from(new Set(arequest.map((obj) => {
							const regexResult = re.exec(obj.details.statusLine);
							console.assert(regexResult, "Error: Unknown HTTP Status", obj.details.statusLine);
							return regexResult && regexResult[1];
						})), (version, index) => {
							const span = document.createElement("span");
							if (version) {
								const [major, minor] = version.split(".").map((x) => Number.parseInt(x, 10));
								let color;
								switch (major) {
									case 0:
										color = "red";
										break;
									case 1:
										color = minor === 0 ? "red" : "blue";
										break;
									case 2:
										color = "teal";
										break;
									default: if (major >= 3) {
										color = "green";
									}
								}
								span.classList.add(color);
								span.textContent = version;
							} else {
								span.textContent = emojis.black_question_mark_ornament;
							}
							return index ? ["\n", span] : [span];
						}).flat());
					}

					if (COLUMNS.httpstatus) {
						const cell = row.insertCell();
						cell.title = outputtitle(arequest.map((obj) => obj.details.statusLine + (obj.details.statusCode in status_codes ? `  (${status_codes[obj.details.statusCode]})` : "")), details.statusLine + (details.statusCode in status_codes ? `  (${status_codes[details.statusCode]})` : ""));
						cell.textContent = Array.from(new Set(arequest.map((obj) => obj.details.statusCode)), (key) => outputstatus(key)).join("");
					}

					let cell = row.insertCell();
					cell.append(...outputhost(hostname, `http${HTTPS ? "s" : ""}:`));
					cell.classList.add("host");

					const addresses = Array.from(new Set(arequest.map((obj) => obj.details.ip).filter(Boolean)));
					cell = row.insertCell();
					if (addresses.length) {
						cell.title = `Private DNS: ${securityInfo.usedPrivateDns ? "Yes" : "No"}`;
						cell.append(securityInfo.usedPrivateDns ? certificateEmojis.shield : "", ...addresses.flatMap((x, i) => [...i ? ["\n"] : [], ...outputaddress(x, hostname, details.ip)]));
					} else if (details.fromCache) {
						const [{ details }] = arequest;
						if (details.responseHeaders) {
							const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "date");
							if (header) {
								cell.title = outputdate(header.value);
							}
						}
						cell.textContent = "(Cached)";
					}

					if (GeoDB) {
						cell = row.insertCell();
						if (addresses.length) {
							cell.title = "Loading…";
							cell.textContent = "…";
							promises.push(getGeoIP(addresses).then((infos) => {
								// console.log(details.ip, addresses, infos);

								cell.title = outputtitle(infos.map((x) => x?.country ? outputlocation(x) : "Unknown Location"));
								if (MAP) {
									cell.replaceChildren(...Array.from(new Set(infos), (x, i) => x?.country ? [...i ? [" "] : [], countryCode(x.country), ...x.lat != null && x.lon != null ? map(x.lat, x.lon) : []] : [emojis.black_question_mark_ornament]).flat());
								} else {
									cell.textContent = Array.from(new Set(infos.map((x) => x?.country)), (x) => x ? countryCode(x) : emojis.black_question_mark_ornament).join("");
								}
							}));
						} else if (details.fromCache) {
							cell.textContent = "–";
						} else {
							cell.title = "Unknown Location";
							cell.textContent = emojis.black_question_mark_ornament;
						}
					}
				} else if (BLOCKED) {
					if (COLUMNS.expiration) {
						const cell = row.insertCell();
						cell.textContent = "–";
					}
					if (COLUMNS.tlsversion || COLUMNS.ech) {
						const cell = row.insertCell();
						cell.textContent = "–";
					}
					if (COLUMNS.hsts) {
						const cell = row.insertCell();
						cell.textContent = "–";
					}
					if (COLUMNS.httpversion) {
						const cell = row.insertCell();
						cell.textContent = "–";
					}
					if (COLUMNS.httpstatus) {
						const cell = row.insertCell();
						cell.textContent = "–";
					}

					let cell = row.insertCell();
					cell.append(...outputhost(hostname, `http${HTTPS ? "s" : ""}:`));
					cell.classList.add("host");

					cell = row.insertCell();
					cell.textContent = "–";

					if (GeoDB && requests.size > 1) {
						/* cell =  */row.insertCell();
					}

					row.classList.add("blocked");
				}
			}
		}

		document.getElementById("number-requests").textContent = numberFormat.format(table.rows.length);

		Promise.all(promises).then(() => {
			document.getElementById("requests").replaceChildren(table);
		});
	} else {
		document.getElementById("requests").textContent = "None";
	}
}

/**
 * Update popup.
 *
 * @param {number} tabId
 * @param {object} tab
 * @param {object} tab.details
 * @param {object} tab.securityInfo
 * @param {Map} tab.requests
 * @param {string} [tab.error]
 * @param {boolean} [tab.blocked]
 * @param {object} [tab.performance]
 * @returns {void}
 */
function updatePopup(tabId, tab) {
	const { details, securityInfo, requests, error, blocked } = tab;
	// console.log(tabId, details, securityInfo);

	document.getElementById("performance").textContent = "Loading…";

	browser.tabs.sendMessage(tabId, { type: CONTENT }).then((message) => {
		if (message.type !== CONTENT) {
			return;
		}

		if (message.authors) {
			document.getElementById("authors").textContent = formatter2.format(message.authors);
			document.querySelector(".authors").classList.remove("hidden");
		}
		if (message.creators) {
			document.getElementById("creators").textContent = formatter2.format(message.creators);
			document.querySelector(".creators").classList.remove("hidden");
		}
		if (message.publishers) {
			document.getElementById("publishers").textContent = formatter2.format(message.publishers);
			document.querySelector(".publishers").classList.remove("hidden");
		}
		if (message.generators) {
			document.getElementById("generators").textContent = formatter2.format(message.generators);
			document.querySelector(".generators").classList.remove("hidden");
		}
		if (message.descriptions) {
			const descriptions = document.getElementById("descriptions");
			descriptions.title = message.descriptions.join("\n");
			descriptions.innerHTML = formatter2.format(message.descriptions.map((description) => {
				const q = document.createElement("q");
				q.textContent = description;
				return q.outerHTML;
			}));
			document.querySelector(".descriptions").classList.remove("hidden");
		}

		if (message.authors || message.creators || message.publishers || message.generators || message.descriptions) {
			document.querySelector(".info").classList.remove("hidden");
		}
		// console.log(message);
	}).catch((error) => {
		console.error(`Error: ${error}`);
	});

	browser.tabs.sendMessage(tabId, { type: PERFORMANCE }).then((message) => {
		if (message.type === PERFORMANCE) {
			// console.log(message);
		}
	}).catch((error) => {
		console.error(`Error: ${error}`);
	}).finally(() => {
		document.querySelector(".no-performance").classList.add("hidden");
	});
	if (tab.performance) {
		updatePerformance(tab.performance);
	}

	const url = new URL(details.url);
	let ipv4 = IPv4_RE.test(url.hostname);
	let ipv6 = aIPv6_RE.test(url.hostname);
	if (ipv6) {
		const aipv6 = ipv6toint(url.hostname.slice(1, -1));
		if (NAT64PREFIXES.has(aipv6 >> 32n)) {
			ipv4 = true;
			ipv6 = false;
		}
	}

	if (!running) {
		running = true;

		if (details.statusLine && (!details.ip || url.hostname !== details.ip) && !ipv4 && !ipv6) {
			if (details.ip) {
				let ipv4 = IPv4_RE.test(details.ip);
				let ipv6 = IPv6_RE.test(details.ip);
				if (ipv6) {
					const aipv6 = ipv6toint(details.ip);
					if (NAT64PREFIXES.has(aipv6 >> 32n)) {
						ipv4 = true;
						ipv6 = false;
					}
				}

				if (ipv6) {
					document.getElementById("ipv6").replaceChildren(securityInfo.usedPrivateDns ? certificateEmojis.shield : "", ...outputaddress(details.ip, url.hostname));
					document.querySelector(".ipv6").classList.remove("hidden");
				} else if (ipv4) {
					document.getElementById("ipv4").replaceChildren(securityInfo.usedPrivateDns ? certificateEmojis.shield : "", ...outputaddress(details.ip, url.hostname));
					document.querySelector(".ipv4").classList.remove("hidden");
				}
			} else if (details.fromCache) {
				const ip = document.getElementById("ip");
				let text = "Cached";
				if (details.responseHeaders) {
					const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "date");
					if (header) {
						const date = new Date(header.value);
						ip.title = dateTimeFormat1.format(date);
						text += ` (${dateTimeFormat4.format(date)})`;
					}
				}
				ip.textContent = text;
				document.querySelector(".cache").classList.remove("hidden");
			}
			if (DNS) {
				browser.dns.resolve(url.hostname, ["offline"]).then((record) => {
					// console.log(record);
					const ipv4s = [];
					const ipv6s = [];
					for (const address of record.addresses) {
						if (IPv4_RE.test(address)) {
							ipv4s.push(address);
						} else if (IPv6_RE.test(address)) {
							const aipv6 = ipv6toint(address);
							if (NAT64PREFIXES.has(aipv6 >> 32n)) {
								ipv4s.push(address);
							} else {
								ipv6s.push(address);
							}
						}
					}
					console.assert(ipv4s.length + ipv6s.length === record.addresses.length, "Error: Parsing IP addresses", record.addresses);

					if (ipv4s.length) {
						document.getElementById("ipv4").innerHTML = (record.isTRR ? certificateEmojis.shield : "") + outputaddresses(ipv4s, url.hostname, details.ip);
						document.querySelector(".ipv4").classList.remove("hidden");
					}
					if (ipv6s.length) {
						document.getElementById("ipv6").innerHTML = (record.isTRR ? certificateEmojis.shield : "") + outputaddresses(ipv6s, url.hostname, details.ip);
						document.querySelector(".ipv6").classList.remove("hidden");
					}
					document.querySelector(".cache").classList.add("hidden");

					if (BLACKLIST) {
						checkblacklists(url.hostname, record.addresses);
					}
					// console.log(ipv4, ipv6);
				}).catch((/* error */) => {
					// console.error(error);
					if (BLACKLIST) {
						checkblacklists(url.hostname, details.ip && [details.ip]);
					}
				});
			}
			document.querySelector(".ip").classList.remove("hidden");
		} else if (DNS && BLACKLIST) {
			checkblacklists(url.hostname);
		}
	}

	document.getElementById("code").textContent = details.statusLine ? outputstatus(details.statusCode) : emojis.information_source;
	document.getElementById("line").textContent = details.statusLine ? details.statusLine + (details.statusCode in status_codes ? `  (${status_codes[details.statusCode]})` : "") : error ? "Error occurred for this page" : "Unavailable for this page";
	document.getElementById("host").replaceChildren(...outputhost(url.hostname, HTTPS ? "https:" : url.protocol));
	if (details.responseHeaders) {
		// console.log(details.responseHeaders);
		const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "server");
		const aheader = details.responseHeaders.find((e) => e.name.toLowerCase() === "x-powered-by");
		if (header || aheader) {
			let text;
			if (header) {
				text = header.value;
				if (aheader) {
					text += ` (${aheader.value})`;
				}
			} else {
				text = aheader.value;
			}
			const server = document.getElementById("server");
			server.textContent = text;
			document.querySelector(".server").classList.remove("hidden");
		}
	}

	if (GeoDB) {
		if (details.ip) {
			const location = document.getElementById("location");
			location.textContent = "Loading…";

			getGeoIP([details.ip]).then(([info]) => {
				// console.log(details.ip, info);
				if (info?.country) {
					const text = `${outputlocation(info)}\u{A0}${countryCode(info.country)}${info.lon == null ? "" : `\u{A0}${earth(info.lon)}`}`;
					if (MAP && info.lat != null && info.lon != null) {
						location.replaceChildren(`${text}\u{A0}\u{A0}`, ...map(info.lat, info.lon));
					} else {
						location.textContent = text;
					}
				} else {
					location.textContent = "Unknown";
					document.querySelector(".location").classList.add("hidden");
				}
			});
			document.querySelector(".location").classList.remove("hidden");
		}
	}

	updateTransfer(tab);

	if (details.responseHeaders) {
		// console.log(details.responseHeaders);
		const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "last-modified");
		if (header) {
			const modified = document.getElementById("modified");
			const date = new Date(header.value);
			modified.title = dateTimeFormat1.format(date);
			modified.textContent = dateTimeFormat3.format(date);
			document.querySelector(".modified").classList.remove("hidden");
		}
	}

	if (SKEW && !details.fromCache && details.responseHeaders) {
		const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "date");
		if (header) {
			const date = document.getElementById("date");
			const adate = new Date(header.value);
			const duration = Math.trunc((details.timeStamp - adate.getTime()) / 1000);
			date.title = dateTimeFormat1.format(adate);
			date.textContent = outputduration(duration);
			document.querySelector(".date").classList.remove("hidden");
		}
	}

	if (details.statusLine || error) {
		const { emoji, state } = getstate(tab);
		document.getElementById("state").textContent = `${emoji.join("")}\u{A0}${state}`;

		if (details.statusLine && securityInfo.state !== "insecure" && securityInfo.certificates.length) {
			const [certificate] = securityInfo.certificates;
			const { start, end } = certificate.validity;
			const sec = Math.floor((end - details.timeStamp) / 1000);
			const { issuer } = certificate;
			const aissuer = getcertname(issuer);
			// console.log(issuer, aissuer);
			// console.log(end, days, new Date(end));
			const temp = document.getElementById("issuer");
			temp.title = issuer;
			temp.textContent = `${aissuer.O || aissuer.CN || issuer}${aissuer.L ? `, ${aissuer.L}` : ""}${aissuer.S ? `, ${aissuer.S}` : ""}${aissuer.C ? `, ${regionNames.of(aissuer.C)} ${countryCode(aissuer.C)}` : ""}`;
			if (certificate.rawDER) {
				const a = createlink(`about:certificate?${new URLSearchParams(securityInfo.certificates.map((cert) => ["cert", encodeURIComponent(btoa(String.fromCharCode(...cert.rawDER)))]))}`);
				a.title = `Click to View Certificate\nIf the opened tab is blank, press ${pasteSymbol}-V and Enter ↵`;
				a.textContent = "🔗";
				a.classList.add("button");
				a.addEventListener("click", click);
				document.getElementById("link").replaceChildren(a);
			}
			let emoji = "";
			if (sec > 0) {
				const days = Math.floor(sec / 86400);
				/* if (days > WARNDAYS) {
					emoji = certificateEmojis.lock;
				} else { */
				if (days <= WARNDAYS) {
					emoji = certificateEmojis.warning_sign;
				}
			} else {
				emoji = certificateEmojis.cross_mark;
			}
			const expiration = document.getElementById("expiration");
			const date1 = new Date(start);
			const date2 = new Date(end);
			expiration.title = dateTimeFormat1.formatRange(date1, date2);
			expiration.textContent = `${emoji ? `${emoji}\u{A0}` : ""}${dateTimeFormat4.formatRange(date1, date2)}`;
			if (timeoutID) {
				clearTimeout(timeoutID);
				timeoutID = null;
			}
			outputtimer(end, Date.now());

			timerTick(end);

			const protocol = document.getElementById("protocol");
			protocol.title = securityInfo.cipherSuite;
			protocol.textContent = `${securityInfo.protocolVersion}, ${securityInfo.secretKeyLength} bit keys`;
			document.getElementById("ech").textContent = securityInfo.usedEch ? `${emojis.heavy_check_mark}\u{A0}Yes` : `${certificateEmojis.cross_mark}\u{A0}No`;
			const hsts = document.getElementById("hsts");
			if (details.responseHeaders) {
				// console.log(details.responseHeaders);
				const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
				if (header) {
					const aheader = getHSTS(header.value);
					// console.log(header, aheader);
					hsts.title = header.value;
					// "preload" in aheader ? ", preloaded" : ""
					hsts.textContent = "max-age" in aheader ? `${emojis.heavy_check_mark}\u{A0}Yes\u{A0}\u{A0}(${outputseconds(Number.parseInt(aheader["max-age"], 10))})` : `${certificateEmojis.warning_sign}\u{A0}Bad header`;
				} else {
					hsts.textContent = securityInfo.hsts ? `${emojis.heavy_check_mark}\u{A0}Yes` : `${certificateEmojis.cross_mark}\u{A0}No`;
				}
				// console.assert(Boolean(header) === securityInfo.hsts, "Error: HSTS", url.hostname, header, securityInfo.hsts);
			} else {
				hsts.textContent = securityInfo.hsts ? `${emojis.heavy_check_mark}\u{A0}Yes` : `${certificateEmojis.cross_mark}\u{A0}No`;
			}

			for (const element of document.querySelectorAll(".certificate")) {
				element.classList.remove("hidden");
			}
		}
	} else {
		document.getElementById("state").textContent = blocked ? `${certificateEmojis.shield}\u{A0}Blocked by the browser or another add-on` : `${emojis.hourglass_with_flowing_sand}\u{A0}Waiting for the connection to complete…`;
	}

	document.querySelector(".no-data").classList.add("hidden");
	document.querySelector(".data").classList.remove("hidden");

	document.getElementById("requests").textContent = "Loading…";
	updateTable(requests);

	if (OPEN) {
		document.getElementById("details").open = true;
	}
}

/**
 * Get data from background page.
 *
 * @param {number} tabId
 * @returns {void}
 */
function getstatus(tabId) {
	browser.runtime.sendMessage({ type: POPUP, tabId }).then((message) => {
		if (message.type !== POPUP) {
			return;
		}

		const data = document.getElementById("data");

		if (message.tab) {
			if (message.tab.details) {
				({
					WARNDAYS,
					FULLIPv6,
					COMPACTIPv6,
					NAT64PREFIXES,
					OPEN,
					BLOCKED,
					HTTPS,
					DNS,
					SKEW,
					BLACKLIST,
					DOMAINBLACKLISTS,
					IPv4BLACKLISTS,
					IPv6BLACKLISTS,
					SUFFIX,
					suffixes_pattern,
					exceptions_pattern,
					GeoDB,
					MAP,
					LOOKUPIP,
					LOOKUPHOST,
					SEND,
					COLUMNS
				} = message);

				updatePopup(tabId, message.tab);
			} else {
				data.innerText = `${emojis.information_source} Unavailable or Access denied for this page.\nNote that this add-on only works on standard HTTP/HTTPS webpages.`;
				console.debug("Unavailable or Access denied", message);
			}
		} else {
			data.textContent = `${emojis.information_source} Unavailable for this page.`;
			// console.log(`Error: ${tabId}`);
			console.debug("Unavailable", message);
		}
		// console.log(message);
	}, (error) => {
		console.error(`Error: ${error}`);
	});
}

document.getElementById("settings").addEventListener("click", (event) => {
	event.target.disabled = true;

	browser.runtime.openOptionsPage().finally(() => {
		event.target.disabled = false;
	});
});

/**
 * Init.
 *
 * @public
 * @returns {Promise<void>}
 */
async function init() {
	const platformInfo = await browser.runtime.getPlatformInfo();

	pasteSymbol = platformInfo.os === "mac" ? "\u{2318}" : "Ctrl";
}

init();

browser.runtime.onMessage.addListener((message, sender) => {
	if (message.type === POPUP) {
		const { details, tab } = message;

		if (details.tabId === tabId) {
			({
				WARNDAYS,
				FULLIPv6,
				COMPACTIPv6,
				OPEN,
				BLOCKED,
				HTTPS,
				DNS,
				SUFFIX,
				GeoDB,
				MAP,
				LOOKUPIP,
				LOOKUPHOST,
				SEND
			} = message);
			// console.log(message);

			if (details.type === "main_frame") {
				updatePopup(tabId, tab);
			} else {
				updateTransfer(tab);
				updateTable(tab.requests);
			}

			return Promise.resolve();
		}
	} else if (message.type === PERFORMANCE) {
		if (sender.tab.id === tabId) {
			updatePerformance(message.performance);
			// console.log(message);
		}
	}
});

browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
	if (!tabs[0]) {
		return;
	}

	tabId = tabs[0].id;

	const data = document.getElementById("data");

	if (tabId && tabId !== TAB_ID_NONE) {
		data.textContent = "Loading…";
		getstatus(tabId);
	} else {
		data.textContent = `${emojis.information_source} Unavailable for this page.`;
	}
});
