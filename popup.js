"use strict";

const TAB_ID_NONE = browser.tabs.TAB_ID_NONE;

const formatter2 = new Intl.ListFormat([], { style: "short" });

const aIPv6RE = new RegExp(String.raw`^\[${IPv6}\]$`, "u");

let WARNDAYS = 3;
let OPEN = true;
let BLOCKED = true;
let FULLIPv6 = false;
let COMPACTIPv6 = false;
let HTTPS = false;
let SUFFIX = true;
let GeoDB = 1;
let MAP = 0;
let LOOKUP = 0;
let DNS = true;
let BLACKLIST = false;
let SEND = true;

let DOMAINBLACKLISTS = [];
let IPv4BLACKLISTS = [];
let IPv6BLACKLISTS = [];

let pasteSymbol = null;

let suffixes = null;
let exceptions = null;

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
 * Get seconds as digital clock.
 *
 * @param {number} sec_num
 * @returns {string}
 */
function getSecondsAsDigitalClock(sec_num) {
	// console.log(now);
	const d = Math.floor(sec_num / 86400);
	const h = Math.floor(sec_num % 86400 / 3600);
	const m = Math.floor(sec_num % 3600 / 60);
	const s = sec_num % 60;
	let text = "";
	if (d > 0) {
		// text += d.toLocaleString() + '\xa0days ';
		text += `${numberFormat1.format(d)} `;
	}
	if (d > 0 || h > 0) {
		// text += ((h < 10) ? '0' + h : h) + '\xa0hours ';
		text += `${numberFormat2.format(h)} `;
	}
	if (d > 0 || h > 0 || m > 0) {
		// text += ((m < 10) ? '0' + m : m) + '\xa0minutes ';
		text += `${numberFormat3.format(m)} `;
	}
	if (d > 0 || h > 0 || m > 0 || s > 0) {
		// text += ((s < 10) ? '0' + s : s) + '\xa0seconds';
		text += numberFormat4.format(s);
	}
	return text;
}

/**
 * Output timer.
 *
 * @param {number} time
 * @param {number} now
 * @returns {void}
 */
function outputtimer(time, now) {
	const sec_num = Math.floor(time / 1000) - Math.floor(now / 1000);
	const days = Math.floor(sec_num / 86400);
	let text = "";
	let color = "";
	if (sec_num > 0) {
		text = getSecondsAsDigitalClock(sec_num);
		if (days > WARNDAYS) {
			color = "green";
		} else {
			color = "gold"; // "yellow"
		}
	} else {
		text = "Expired";
		color = "red";
	}
	timer.style.color = color;
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
 * Output time in seconds.
 *
 * @param {number} time
 * @returns {string}
 */
function outputtime(time) {
	const s = Math.floor(time / 1000);
	const ms = time % 1000;
	let text = "";
	if (s > 0) {
		text += `${numberFormat4.format(s)} `;
	}
	if (s > 0 || ms > 0) {
		text += numberFormat5.format(ms);
	}
	return text;
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
 * Output lookup link.
 *
 * @param {string} hostname
 * @param {string} address
 * @returns {Array.<HTMLElement|string>}
 */
function lookup(hostname, address) {
	let url = "";
	switch (LOOKUP) {
		case 1:
			// https://iplookup.flagfox.net/?ip={IPaddress}&host={domainName}
			url = `https://iplookup.flagfox.net/?ip=${address}&host=${hostname}`;
			break;
		case 2:
			url = `https://www.ip2location.com/${address}`;
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
 * Output IP address.
 *
 * @param {string} address
 * @param {string} hostname
 * @param {string|null} [current]
 * @param {boolean} [ipv4]
 * @param {boolean} [ipv6]
 * @returns {Array.<HTMLElement|string>}
 */
function outputaddress(address, hostname, current, ipv4, ipv6) {
	ipv4 ??= IPv4RE.test(address);
	ipv6 ??= IPv6RE.test(address);
	console.assert(ipv4 || ipv6, "Error: Unknown IP address", address);

	const aaddress = ipv6 ? FULLIPv6 ? expand(address).join(":") : COMPACTIPv6 ? outputbase85(IPv6toInt(expand(address).join(""))) : address : address;
	const a = createlink(`http${HTTPS ? "s" : ""}://${ipv6 ? `[${address}]` : address}`);
	if (address === current) {
		const strong = document.createElement("strong");
		strong.textContent = aaddress;
		a.append(strong);
	} else {
		a.textContent = aaddress;
	}
	a.classList.add(ipv6 ? "ipv6" : "ipv4");
	const text = [a];
	if (LOOKUP) {
		text.push("\u00A0", ...lookup(hostname, address));
	}
	return text;
}

/**
 * Output list of IP addresses.
 *
 * @param {string[]} addresses
 * @param {string} hostname
 * @param {string} current
 * @param {boolean} ipv4
 * @param {boolean} ipv6
 * @returns {string}
 */
function outputaddresses(addresses, hostname, current, ipv4, ipv6) {
	return formatter2.format(addresses.map((x) => {
		const span = document.createElement("span");
		span.append(...outputaddress(x, hostname, current, ipv4, ipv6));
		return span.innerHTML;
	}));
	// .join(', ')
}

/**
 * Output hostname.
 *
 * @param {string} hostname
 * @param {string} protocol
 * @param {boolean} [ipv4]
 * @param {boolean} [ipv6]
 * @returns {HTMLAnchorElement}
 */
function outputhost(hostname, protocol, ipv4, ipv6) {
	ipv4 ??= IPv4RE.test(hostname);
	ipv6 ??= aIPv6RE.test(hostname);

	if (SUFFIX && suffixes && !ipv4 && !ipv6) {
		const regexResult = suffixes.exec(hostname);
		const aregexResult = exceptions.exec(hostname);
		const labels = hostname.split(".");
		const alabels = aregexResult ? aregexResult[1].split(".").slice(1) : regexResult ? regexResult[1].split(".") : labels.slice(-1);
		if (labels.length > alabels.length) {
			const domain = labels.slice(-(alabels.length + 1)).join(".");
			const subdomain = labels.slice(0, -(alabels.length + 1)).join(".");
			const a = createlink(`${protocol}//${hostname}`);
			const strong = document.createElement("strong");
			strong.textContent = domain;
			if (subdomain) {
				a.textContent = `${subdomain}.`;
			}
			a.append(strong);
			return a;
		}
		console.error("Error: Hostname has invalid suffix", hostname);
	}

	const a = createlink(`${protocol}//${hostname}`);
	a.textContent = hostname;
	return a;
}

/**
 * Handle error.
 *
 * @param {string} error
 * @returns {void}
 */
function handleError(error) {
	console.error(`Error: ${error}`);
}

/**
 * Convert HTTP statue code to emoji.
 *
 * @param {number} statusCode
 * @returns {string}
 */
function status(statusCode) {
	let emoji = "";
	if (statusCode >= 100 && statusCode < 200) {
		emoji = statusEmojis[0];
	} else if (statusCode >= 200 && statusCode < 300) {
		emoji = statusEmojis[1];
	} else if (statusCode >= 300 && statusCode < 400) {
		emoji = statusEmojis[2];
	} else {
		// I'm a teapot, RFC 2324: https://datatracker.ietf.org/doc/html/rfc2324
		emoji = statusCode === 418 ? statusEmojis[4] : statusEmojis[3];
	}
	return emoji;
}

/**
 * Get emoji and URL classification.
 *
 * @param {Object} details
 * @returns {{emojis: string[], classifications: string[]}}
 */
function getClassification(details) {
	const emojis = [];
	// let classifications = urlClassification.firstParty.concat(urlClassification.thirdParty);
	let classifications = details.thirdParty ? details.urlClassification.thirdParty : details.urlClassification.firstParty;
	if (classifications.length) {
		if (classifications.some((c) => c.startsWith("fingerprinting"))) {
			emojis.push("👣");
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
 * @param {Object} tab
 * @param {Object} tab.securityInfo
 * @param {string} tab.error
 * @returns {{emoji: string, state: string}}
 */
function getstate({ securityInfo, error }) {
	let emoji = "";
	let state = "";
	if (error) {
		emoji = certificateEmojis[4];
		state = `Error: ${error}`;
	} else if (securityInfo.state === "insecure") {
		emoji = certificateEmojis[0];
		state = "Insecure";
	} else if (securityInfo.state === "broken" || securityInfo.isUntrusted || securityInfo.isNotValidAtThisTime || securityInfo.isDomainMismatch) {
		emoji = certificateEmojis[3];
		state = getmessage(securityInfo);
	} else if (securityInfo.state === "weak") {
		emoji = certificateEmojis[1] + certificateEmojis[2];
		state = `Weak${securityInfo.weaknessReasons ? ` (${securityInfo.weaknessReasons})` : ""}`;
	} else if (securityInfo.state === "secure") {
		emoji = certificateEmojis[1];
		state = "Secure";
	}
	return { emoji, state };
}

/**
 * Count instances of values in array.
 *
 * @param {string[]} array
 * @returns {Object.<string, number>}
 */
function count(array) {
	return array.reduce((aarray, item) => {
		if (item) {
			if (item in aarray) {
				++aarray[item];
			} else {
				aarray[item] = 1;
			}
		}
		return aarray;
	}, {});
}

/**
 * Output tooltip/title.
 *
 * @param {string[]} array
 * @param {string} [str]
 * @returns {string}
 */
function outputtitle(array, str) {
	const obj = count(array);
	return Object.keys(obj).length > 1 ? Object.entries(obj).map(([key, value]) => `${numberFormat.format(value)}: ${key}`).join("\n") : str || Object.keys(obj)[0];
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
		if (record.addresses.length) {
			document.getElementById("blacklist").innerText += `🚫\u00A0${address ? `IP address (${address})` : "domain"} is listed in the "${blacklist}" blacklist (${record.addresses.join(" ")})\n`;
			document.querySelector(".blacklist").classList.remove("hidden");
		}
	}).catch(() => { });
}

/**
 * Check Blacklists.
 *
 * @param {string} hostname
 * @param {string[]} [ipv4s]
 * @param {string[]} [ipv6s]
 * @returns {void}
 */
async function checkblacklists(hostname, ipv4s, ipv6s) {
	const ipv4 = IPv4RE.test(hostname);
	const ipv6 = aIPv6RE.test(hostname);
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
		} else if (ipv4s) {
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
		} else if (ipv6s) {
			addresses = ipv6s;
		}
		for (const address of addresses) {
			// Expand and reverse IPv6 address
			const reverse = expand(address).join("").split("").reverse().join(".");
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
function copyToClipboard(text/* , link */) {
	// https://github.com/mdn/webextensions-examples/blob/master/context-menu-copy-link-with-types/clipboard-helper.js
	/* const atext = encodeXML(text);
	const alink = encodeXML(link);

	const html = `<a href="${alink}">${atext}</a>`; */

	navigator.clipboard.writeText(text);
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
	const url = event.target.href;
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
 * Update performance data.
 *
 * @param {Object} performance
 * @returns {void}
 */
function updatePerformance(performance) {
	const [navigation] = performance.navigation;
	const start = navigation.redirectCount ? navigation.redirectStart : navigation.fetchStart;
	const load = document.getElementById("load");
	load.title = outputtime(navigation.loadEventStart - start);
	load.textContent = numberFormat6.format(navigation.loadEventStart - start);

	const ttfb = document.getElementById("ttfb");
	ttfb.title = outputtime(navigation.responseStart - start);
	ttfb.textContent = numberFormat6.format(navigation.responseStart - start);

	const fcp = performance.paint.find((x) => x.name === "first-contentful-paint");
	const paint = document.getElementById("paint");
	paint.title = fcp ? outputtime(fcp.startTime) : "";
	paint.textContent = fcp ? numberFormat6.format(fcp.startTime) : "None";

	const size = navigation.transferSize;
	document.getElementById("size").textContent = size === 0 && navigation.decodedBodySize > 0 ? "Cached" : `${outputunit(size, false)}B${size >= 1000 ? ` (${outputunit(size, true)}B)` : ""}`;

	for (const element of document.querySelectorAll(".content")) {
		element.classList.remove("hidden");
	}
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
			const arequests = Array.from(request.values());
			const arequest = arequests.filter((x) => x.details.statusLine);

			if (arequest.length || BLOCKED) {
				const row = table.insertRow();

				let cell = row.insertCell();
				const connections = arequest.length;
				const blocked = request.size - connections;
				cell.title = `${numberFormat.format(connections)} connection${connections === 1 ? "" : "s"}${BLOCKED ? `\n${numberFormat.format(blocked)} connection${blocked === 1 ? "" : "s"} blocked` : ""}`;
				cell.textContent = `${numberFormat.format(connections)}${BLOCKED ? `/${numberFormat.format(blocked)}` : ""}`;

				cell = row.insertCell();
				const classification = arequests.map((obj) => getClassification(obj.details));
				const classifications = classification.flatMap((obj) => obj.classifications).map((c) => c.split("_").map(([h, ...t]) => h.toUpperCase() + t.join("")).join(" "));
				const aemojis = classification.flatMap((obj) => obj.emojis);
				cell.title = classifications.length ? outputtitle(classifications) : "No known trackers";
				cell.textContent = aemojis.length ? Array.from(new Set(aemojis)).join("") : "–";

				// const { emoji, state } = getstate(securityInfo);
				const states = arequests.filter((x) => x.details.statusLine || x.error).map((obj) => getstate(obj));
				cell = row.insertCell();
				cell.title = states.length ? outputtitle(states.map((obj) => obj.state)/* , state */) : "Blocked";
				cell.textContent = states.length ? Array.from(new Set(states.map((obj) => obj.emoji))).join("") : certificateEmojis[5];

				if (arequest.length) {
					const { details, securityInfo } = arequest.at(-1);

					if (securityInfo.state !== "insecure" && securityInfo.certificates.length) {
						const { details } = arequest[0];
						const [certificate] = securityInfo.certificates;
						const start = certificate.validity.start;
						const end = certificate.validity.end;
						const sec = Math.floor(end / 1000) - Math.floor(details.timeStamp / 1000);
						const days = Math.floor(sec / 86400);
						let title = "";
						let color = "";
						if (sec > 0) {
							// title += 'expires in ' + days.toLocaleString() + ' days';
							title += `Expires ${rtf.format(days, "day")} (${outputdateRange(start, end)})`;
							if (days > WARNDAYS) {
								color = "green";
							} else {
								color = "gold"; // "yellow"
							}
						} else {
							title += `Expired ${rtf.format(days, "day")} (${outputdate(end)})`;
							color = "red";
						}
						cell = row.insertCell();
						cell.title = title;
						cell.style.color = color;
						cell.textContent = sec > 0 && days === 0 ? `<${numberFormat.format(1)}` : numberFormat.format(days);

						cell = row.insertCell();
						cell.title = outputtitle(arequest.map((obj) => obj.securityInfo).map((obj) => `${obj.protocolVersion}${obj.secretKeyLength ? `, ${obj.secretKeyLength} bits` : ""}, ${obj.cipherSuite}`));
						cell.textContent = Array.from(new Set(arequest.map((obj) => obj.securityInfo.protocolVersion).map((str) => str?.startsWith("TLS") ? str.slice("TLS".length) : str))).join("\n");

						cell = row.insertCell();
						if (details.responseHeaders) {
							const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
							// const header = arequest.find((obj) => obj.details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security"))?.details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
							if (header) {
								const aheader = getHSTS(header.value);
								const sec = Number.parseInt(aheader["max-age"], 10);
								const days = Math.floor(sec / 86400);
								cell.title = `HSTS: Yes (${outputseconds(sec)})`;
								cell.textContent = sec > 0 && days === 0 ? `<${numberFormat.format(1)}` : numberFormat.format(days);
							} else {
								cell.title = `HSTS: ${securityInfo.hsts ? "Yes (Unable to find header)" : "No"}`;
								cell.textContent = securityInfo.hsts ? emojis[4] : emojis[5];
							}
						} else {
							cell.title = `HSTS: ${securityInfo.hsts ? "Yes" : "No"}`;
							cell.textContent = securityInfo.hsts ? emojis[4] : emojis[5];
						}
					} else {
						cell = row.insertCell();
						cell.textContent = "–";
						cell = row.insertCell();
						cell.textContent = "–";
						cell = row.insertCell();
						cell.textContent = "–";
					}

					cell = row.insertCell();
					cell.title = outputtitle(arequest.map((obj) => obj.details.statusLine), details.statusLine);
					cell.textContent = Array.from(new Set(arequest.map((obj) => obj.details.statusCode)), (key) => status(key)).join("");

					cell = row.insertCell();
					cell.append(outputhost(hostname, `http${HTTPS ? "s" : ""}:`));

					const addresses = Array.from(new Set(arequest.map((obj) => obj.details.ip).filter(Boolean)));
					cell = row.insertCell();
					if (addresses.length) {
						cell.append(...addresses.flatMap((x, i) => [...i ? ["\n"] : [], ...outputaddress(x, hostname, details.ip)]));
					} else if (details.fromCache) {
						const { details } = arequest[0];
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
									cell.replaceChildren(...Array.from(new Set(infos), (x, i) => x?.country ? [...i ? [" "] : [], countryCode(x.country), ...x.lat != null && x.lon != null ? map(x.lat, x.lon) : []] : [emojis[2]]).flat());
								} else {
									cell.textContent = Array.from(new Set(infos.map((x) => x?.country)), (x) => x ? countryCode(x) : emojis[2]).join("");
								}
							}));
						} else if (details.fromCache) {
							cell.textContent = "–";
						} else {
							cell.title = "Unknown Location";
							cell.textContent = emojis[2];
						}
					}
				} else if (BLOCKED) {
					cell = row.insertCell();
					cell.textContent = "–";
					cell = row.insertCell();
					cell.textContent = "–";
					cell = row.insertCell();
					cell.textContent = "–";
					cell = row.insertCell();
					cell.textContent = "–";

					cell = row.insertCell();
					cell.append(outputhost(hostname, `http${HTTPS ? "s" : ""}:`));

					cell = row.insertCell();
					cell.textContent = "–";

					if (GeoDB && requests.size > 1) {
						cell = row.insertCell();
					}

					row.style.opacity = "0.5";
				}
			}
		}

		document.getElementById("number").textContent = numberFormat.format(table.rows.length);

		Promise.all(promises).then(() => {
			document.getElementById("requests").replaceChildren(table);
		});
	}
}

/**
 * Update popup.
 *
 * @param {number} tabId
 * @param {Object} tab
 * @param {Object} tab.details
 * @param {Object} tab.securityInfo
 * @param {Map} tab.requests
 * @param {string} tab.error
 * @param {Object} [tab.performance]
 * @returns {void}
 */
function updatePopup(tabId, tab) {
	const { details, securityInfo, requests, error } = tab;
	// console.log(tabId, details, securityInfo);

	document.getElementById("content").textContent = "Loading…";

	browser.tabs.sendMessage(tabId, { type: CONTENT }).then((message) => {
		if (message.type === CONTENT) {
			// console.log(message);
		}
	}).catch(handleError).finally(() => {
		document.querySelector(".no-content").classList.add("hidden");
	});
	if (tab.performance) {
		updatePerformance(tab.performance);
	}

	const url = new URL(details.url);
	const ipv4 = IPv4RE.test(url.hostname);
	const ipv6 = aIPv6RE.test(url.hostname);

	if (!running) {
		running = true;

		if (details.statusLine && (!details.ip || url.hostname !== details.ip) && !ipv4 && !ipv6) {
			const ipv4 = details.ip && IPv4RE.test(details.ip);
			const ipv6 = details.ip && IPv6RE.test(details.ip);
			if (details.ip) {
				if (ipv4) {
					document.getElementById("ipv4").replaceChildren(...outputaddress(details.ip, url.hostname, null, ipv4, ipv6));
					document.querySelector(".ipv4").classList.remove("hidden");
				} else if (ipv6) {
					document.getElementById("ipv6").replaceChildren(...outputaddress(details.ip, url.hostname, null, ipv4, ipv6));
					document.querySelector(".ipv6").classList.remove("hidden");
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
					const ipv4s = record.addresses.filter((value) => IPv4RE.test(value));
					const ipv6s = record.addresses.filter((value) => IPv6RE.test(value));
					console.assert(ipv4s.length + ipv6s.length == record.addresses.length, "Error: Parsing IP addresses", record.addresses);

					if (ipv4s.length) {
						document.getElementById("ipv4").innerHTML = outputaddresses(ipv4s, url.hostname, details.ip, true, false);
						document.querySelector(".ipv4").classList.remove("hidden");
					}
					if (ipv6s.length) {
						document.getElementById("ipv6").innerHTML = outputaddresses(ipv6s, url.hostname, details.ip, false, true);
						document.querySelector(".ipv6").classList.remove("hidden");
					}
					document.querySelector(".cache").classList.add("hidden");

					if (BLACKLIST) {
						checkblacklists(url.hostname, ipv4s, ipv6s);
					}
					// console.log(ipv4, ipv6);
				}).catch((error) => {
					// console.error(error);
					if (BLACKLIST) {
						checkblacklists(url.hostname, ipv4 && [details.ip], ipv6 && [details.ip]);
					}
				});
			}
			document.querySelector(".ip").classList.remove("hidden");
		} else if (DNS && BLACKLIST) {
			checkblacklists(url.hostname);
		}
	}

	document.getElementById("code").textContent = details.statusLine ? status(details.statusCode) : emojis[1];
	document.getElementById("line").textContent = details.statusLine || (error ? "Error occurred for this page" : "Access denied for this page");
	document.getElementById("host").replaceChildren(outputhost(url.hostname, HTTPS ? "https:" : url.protocol, ipv4, ipv6));
	if (details.responseHeaders) {
		// console.log(details.responseHeaders);
		const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "server");
		const aheader = details.responseHeaders.find((e) => e.name.toLowerCase() === "x-powered-by");
		if (header || aheader) {
			let text = "";
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
					const text = `${outputlocation(info)}\u00A0${countryCode(info.country)}${info.lon != null ? `\u00A0${earth(info.lon)}` : ""}`;
					if (MAP && info.lat != null && info.lon != null) {
						location.replaceChildren(`${text}\u00A0\u00A0`, ...map(info.lat, info.lon));
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

	if (details.statusLine || error) {
		const { emoji, state } = getstate(tab);
		document.getElementById("state").textContent = `${emoji}\u00A0${state}`;

		if (details.statusLine && securityInfo.state !== "insecure" && securityInfo.certificates.length) {
			const [certificate] = securityInfo.certificates;
			const start = certificate.validity.start;
			const end = certificate.validity.end;
			const sec = Math.floor(end / 1000) - Math.floor(details.timeStamp / 1000);
			const issuer = certificate.issuer;
			const aissuer = getissuer(issuer);
			// console.log(issuer, aissuer);
			// console.log(end, days, new Date(end));
			const temp = document.getElementById("issuer");
			temp.title = issuer;
			temp.textContent = `${aissuer.O || aissuer.CN || issuer}${aissuer.L ? `, ${aissuer.L}` : ""}${aissuer.S ? `, ${aissuer.S}` : ""}${aissuer.C ? `, ${regionNames.of(aissuer.C)} ${countryCode(aissuer.C)}` : ""}`;
			if (certificate.rawDER) {
				const a = createlink(`about:certificate?${new URLSearchParams(securityInfo.certificates.map((cert) => ["cert", encodeURIComponent(btoa(String.fromCharCode(...cert.rawDER)))]))}`);
				a.title = "Click to View Certificate";
				a.textContent = "🔗";
				a.classList.add("button");
				a.addEventListener("click", click);
				document.getElementById("link").replaceChildren(a);
			}
			let emoji = "";
			if (sec > 0) {
				const days = Math.floor(sec / 86400);
				/* if (days > WARNDAYS) {
					emoji = certificateEmojis[1];
				} else { */
				if (days <= WARNDAYS) {
					emoji = certificateEmojis[2];
				}
			} else {
				emoji = certificateEmojis[3];
			}
			const expiration = document.getElementById("expiration");
			const date1 = new Date(start);
			const date2 = new Date(end);
			expiration.title = dateTimeFormat1.formatRange(date1, date2);
			expiration.textContent = `${emoji ? `${emoji}\u00A0` : ""}${dateTimeFormat4.formatRange(date1, date2)}`;
			if (timeoutID) {
				clearTimeout(timeoutID);
				timeoutID = null;
			}
			outputtimer(end, Date.now());

			timerTick(end);

			const protocol = document.getElementById("protocol");
			protocol.title = securityInfo.cipherSuite;
			protocol.textContent = securityInfo.protocolVersion + (securityInfo.secretKeyLength ? `, ${securityInfo.secretKeyLength} bit keys` : "");
			const hsts = document.getElementById("hsts");
			if (details.responseHeaders) {
				// console.log(details.responseHeaders);
				const header = details.responseHeaders.find((e) => e.name.toLowerCase() === "strict-transport-security");
				if (header) {
					const aheader = getHSTS(header.value);
					// console.log(header, aheader);
					hsts.title = header.value;
					// "preload" in aheader ? ", preloaded" : ""
					hsts.textContent = `${emojis[4]}\u00A0Yes\u00A0\u00A0(${outputseconds(Number.parseInt(aheader["max-age"], 10))})`;
				} else {
					hsts.textContent = securityInfo.hsts ? `${emojis[4]}\u00A0Yes` : `${certificateEmojis[3]}\u00A0No`;
				}
				// console.assert(Boolean(header) === securityInfo.hsts, "Error: HSTS", url.hostname, header, securityInfo.hsts);
			} else {
				hsts.textContent = securityInfo.hsts ? `${emojis[5]}\u00A0Yes` : `${certificateEmojis[3]}\u00A0No`;
			}

			for (const element of document.querySelectorAll(".certificate")) {
				element.classList.remove("hidden");
			}
		}
	} else {
		document.getElementById("state").textContent = `${certificateEmojis[5]}\u00A0Blocked`;
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
		if (message.type === POPUP) {
			const data = document.getElementById("data");

			if (message.tab) {
				if (message.tab.details) {
					WARNDAYS = message.WARNDAYS;
					FULLIPv6 = message.FULLIPv6;
					COMPACTIPv6 = message.COMPACTIPv6;
					OPEN = message.OPEN;
					BLOCKED = message.BLOCKED;
					HTTPS = message.HTTPS;
					DNS = message.DNS;
					BLACKLIST = message.BLACKLIST;
					DOMAINBLACKLISTS = message.DOMAINBLACKLISTS;
					IPv4BLACKLISTS = message.IPv4BLACKLISTS;
					IPv6BLACKLISTS = message.IPv6BLACKLISTS;
					SUFFIX = message.SUFFIX;
					suffixes = message.suffixes;
					exceptions = message.exceptions;
					GeoDB = message.GeoDB;
					MAP = message.MAP;
					LOOKUP = message.LOOKUP;
					SEND = message.SEND;

					updatePopup(tabId, message.tab);
				} else {
					data.innerText = `${emojis[1]} Unavailable or Access denied for this page.\nNote that this add-on only works on standard HTTP/HTTPS webpages.`;
					console.debug("Unavailable or Access denied", message);
				}
			} else {
				data.textContent = `${emojis[1]} Unavailable for this page.`;
				// console.log(`Error: ${tabId}`);
				console.debug("Unavailable", message);
			}
			// console.log(message);
		}
	}, handleError);
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

	pasteSymbol = platformInfo.os === "mac" ? "\u2318" : "Ctrl";
}

init();

browser.runtime.onMessage.addListener((message, sender) => {
	if (message.type === POPUP) {
		const { details, tab } = message;

		if (details.tabId === tabId) {
			WARNDAYS = message.WARNDAYS;
			FULLIPv6 = message.FULLIPv6;
			COMPACTIPv6 = message.COMPACTIPv6;
			OPEN = message.OPEN;
			BLOCKED = message.BLOCKED;
			HTTPS = message.HTTPS;
			DNS = message.DNS;
			SUFFIX = message.SUFFIX;
			GeoDB = message.GeoDB;
			MAP = message.MAP;
			LOOKUP = message.LOOKUP;
			SEND = message.SEND;
			// console.log(message);

			if (details.type === "main_frame") {
				updatePopup(tabId, tab);
			} else {
				updateTable(tab.requests);
			}

			return Promise.resolve();
		}
	} else if (message.type === CONTENT) {
		if (sender.tab.id === tabId) {
			updatePerformance(message.performance);
			// console.log(message);
		}
	}
});

browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
	if (tabs[0]) {
		tabId = tabs[0].id;

		const data = document.getElementById("data");

		if (tabId && tabId !== TAB_ID_NONE) {
			data.textContent = "Loading…";
			getstatus(tabId);
		} else {
			data.textContent = `${emojis[1]} Unavailable for this page.`;
		}
	}
});
