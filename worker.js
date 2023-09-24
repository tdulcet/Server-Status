"use strict";

// https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
importScripts("common.js");

const label = "GeoIPv";

const settings = {
	GeoDB: null
};

let GeoIPv4 = null;
let GeoIPv6 = null;

/**
 * Create notification.
 *
 * @param {string} title
 * @param {string} message
 * @returns {void}
 */
function notification(title, message) {
	const response = {
		type: NOTIFICATION,
		title,
		message
	};
	// console.log(response);

	postMessage(response);
}

/**
 * Get the geolocation database.
 *
 * @param {string} url
 * @param {4|6} v
 * @param {string} [cache]
 * @param {number} [retry]
 * @returns {Promise<[Array<number|bigint|string|null>[], string|null, number|null]>}
 */
function agetGeoIP(url, v, cache, retry = 0) {
	const alabel = `${label}${v}`;
	console.log(url);
	const fetchInfo = {
		method: "GET"
	};
	if (cache) {
		fetchInfo.cache = cache;
	}
	return fetch(url, fetchInfo).then(async (response) => {
		if (response.ok) {
			const text = await response.text();
			// console.log(text);

			console.timeLog(alabel);

			let GEOIP = text.split("\n").filter((r) => r.length);

			// Use TSV format starting in 2024
			if (Date.UTC(2024) <= Date.now()) {
				GEOIP = GEOIP.map((r) => r.split("\t"));
				// console.log(GEOIP);

				console.timeLog(alabel);

				switch (settings.GeoDB) {
					case 1:
					case 2:
					case 9:
					case 3:
					case 4:
					case 5:
						GEOIP = Object.freeze(GEOIP.map(v === 4 ? ([start, end, country]) => [Number.parseInt(start, 16), Number.parseInt(end, 16), country] : ([start, end, country]) => [BigInt(`0x${start}`), BigInt(`0x${end}`), country]));
						break;
					case 6:
					case 7:
						GEOIP = Object.freeze(GEOIP.map(v === 4 ? ([start, end, country, state1, city, lat, lon]) => [Number.parseInt(start, 16), Number.parseInt(end, 16), country, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null] : ([start, end, country, state1, city, lat, lon]) => [BigInt(`0x${start}`), BigInt(`0x${end}`), country, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null]));
						break;
					case 8:
						GEOIP = Object.freeze(GEOIP.map(v === 4 ? ([start, end, country, state2, state1, city, lat, lon]) => [Number.parseInt(start, 16), Number.parseInt(end, 16), country, state2, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null] : ([start, end, country, state2, state1, city, lat, lon]) => [BigInt(`0x${start}`), BigInt(`0x${end}`), country, state2, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null]));
						break;
				}
			} else {
				GEOIP = GEOIP.map((r) => r.split(/("[^"]+"|[^",]*)(?:,|$)/u).filter((x, i) => i % 2 !== 0).map((x) => x.startsWith('"') && x.endsWith('"') ? x.slice(1, -1) : x));
				// console.log(GEOIP);

				console.timeLog(alabel);

				switch (settings.GeoDB) {
					case 1:
					case 2:
					case 9:
					case 3:
					case 4:
					case 5:
						GEOIP = Object.freeze(GEOIP.map(v === 4 ? ([start, end, country]) => [Number.parseInt(start, 10), Number.parseInt(end, 10), country] : ([start, end, country]) => [BigInt(start), BigInt(end), country]));
						break;
					case 6:
					case 7:
						GEOIP = Object.freeze(GEOIP.map(v === 4 ? ([start, end, country, state1, city, lat, lon]) => [Number.parseInt(start, 10), Number.parseInt(end, 10), country, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null] : ([start, end, country, state1, city, lat, lon]) => [BigInt(start), BigInt(end), country, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null]));
						break;
					case 8:
						GEOIP = Object.freeze(GEOIP.map(v === 4 ? ([start, end, country, state2, state1, city, lat, lon]) => [Number.parseInt(start, 10), Number.parseInt(end, 10), country, state2, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null] : ([start, end, country, state2, state1, city, lat, lon]) => [BigInt(start), BigInt(end), country, state2, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null]));
						break;
				}
			}

			console.timeLog(alabel);

			const modified = response.headers.get("Last-Modified");
			let length = response.headers.get("Content-Length");
			length &&= Number.parseInt(length, 10);
			console.log(Array.from(response.headers.entries()), modified, text.length, length);
			return [GEOIP, modified, length];
		}

		console.error(response);
		console.timeEnd(alabel);
		return Promise.reject();
	}).catch(async (error) => {
		if (retry >= 2) {
			throw error;
		}
		console.error(error);
		await delay((1 << retry) * 1000);
		return agetGeoIP(url, v, cache, retry + 1);
	});
}

/**
 * Get the geolocation databases.
 *
 * @param {number} date
 * @param {string[]} languages
 * @param {string} [cache]
 * @returns {Promise<void>}
 */
async function getGeoLoc(date, languages, cache) {
	let dir = null;
	let file4 = "ipv4.csv";
	let file6 = "ipv6.csv";

	switch (settings.GeoDB) {
		case 1:
			dir = "geo-whois-asn-country";
			break;
		case 2:
			dir = "iptoasn-country";
			break;
		case 9:
			dir = "ipinfo-country";
			break;
		case 3:
			dir = "dbip-country";
			break;
		case 4:
			dir = "ip2location-country";
			break;
		case 5:
			dir = "geolite2-country";
			break;
		case 6:
			dir = "dbip-city";
			break;
		case 7:
			dir = "ip2location-city";
			break;
		case 8: {
			// English, Simplified Chinese, Spanish, Brazilian Portuguese, Russian, Japanese, French, and German
			const locales = ["de", "en", "es", "fr", "ja", "pt-BR", "ru", "zh-CN"];

			// const languages = await browser.i18n.getAcceptLanguages();
			const locale = languages.find((e) => locales.includes(e)) || locales[1];
			console.log(languages, locale);

			dir = "geolite2-city";
			file4 = `ipv4-${locale}.csv`;
			file6 = `ipv6-${locale}.csv`;
			break;
		}
	}

	const url = "https://gitlab.com/tdulcet/ip-geolocation-dbs/-/raw/main/";
	const url4 = `${url}${dir}/${file4}?inline=false`;
	const url6 = `${url}${dir}/${file6}?inline=false`;

	if (!cache) {
		notification("⬇️ Updating geolocation databases", "Checking for updated IP geolocation databases.\nYour browser may briefly slowdown after the download while it is processing the databases.");
	}

	const label4 = `${label}4`;
	const label6 = `${label}6`;
	console.time(label4);
	console.time(label6);

	const start = performance.now();

	await agetGeoIP(url4, 4, cache).then((value) => Promise.all([value, agetGeoIP(url6, 6, cache)])).then(([[GeoIPv4, modified4, length4], [GeoIPv6, modified6, length6]]) => {
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1674342
		// console.log(GeoIPv4, GeoIPv6, new Date(date));
		console.log(GeoIPv4.length, GeoIPv6.length, new Date(date));

		const message = {
			type: BACKGROUND
		};

		// The full location databases are too large to store in local storage, which is limited to 255 MiB
		message.GEOIP = [1, 2, 9, 3, 4, 5].includes(settings.GeoDB) ? { GeoIPv4, GeoIPv6, GeoDB: settings.GeoDB, date } : { GeoDB: settings.GeoDB, date };

		postMessage(message);

		parseGeoLoc(GeoIPv4, GeoIPv6);

		const end = performance.now();
		const time = outputseconds(Math.floor((end - start) / 1000));

		if (!cache) {
			notification("⬇️ Geolocation databases updated", `The IP geolocation databases were successfully updated in ${time}.\n\nIPv4 ${modified4 ? `updated: ${outputdate(modified4)}, ` : ""}rows: ${numberFormat.format(GeoIPv4.length)}${length4 ? `, size: ${outputunit(length4, false)}B` : ""}\nIPv6 ${modified6 ? `updated: ${outputdate(modified6)}, ` : ""}rows: ${numberFormat.format(GeoIPv6.length)}${length6 ? `, size: ${outputunit(length6, false)}B` : ""}`);
		}

		console.log(`The geolocation databases were updated in ${time}.`);
	}).catch((error) => {
		console.error(error);

		notification(`❌ Unable to ${cache ? "load" : "update"} geolocation databases`, `Error: Unable to ${cache ? "load" : "update"} the IP geolocation databases: ${error}.`);
	});

	console.timeEnd(label4);
	console.timeEnd(label6);
}

/**
 * Parse the geolocation databases.
 *
 * @param {Array<[number, number, string]|[number, number, string, string, string, number|null, number|null]|[number, number, string, string, string, string, number|null, number|null]>} IPv4
 * @param {Array<[bigint, bigint, string]|[bigint, bigint, string, string, string, number|null, number|null]|[bigint, bigint, string, string, string, string, number|null, number|null]>} IPv6
 * @returns {void}
 */
function parseGeoLoc(IPv4, IPv6) {
	/* switch (settings.GeoDB) {
		case 1:
		case 2:
		case 9:
		case 3:
		case 4:
		case 5:
			GeoIPv4 = Object.freeze(IPv4.map(([start, end, country]) => Object.freeze({ start, end, country })));
			GeoIPv6 = Object.freeze(IPv6.map(([start, end, country]) => Object.freeze({ start, end, country })));
			break;
		case 6:
		case 7:
			GeoIPv4 = Object.freeze(IPv4.map(([start, end, country, state1, city, lat, lon]) => Object.freeze({ start, end, country, state1, city, lat, lon })));
			GeoIPv6 = Object.freeze(IPv6.map(([start, end, country, state1, city, lat, lon]) => Object.freeze({ start, end, country, state1, city, lat, lon })));
			break;
		case 8:
			GeoIPv4 = Object.freeze(IPv4.map(([start, end, country, state2, state1, city, lat, lon]) => Object.freeze({ start, end, country, state2, state1, city, lat, lon })));
			GeoIPv6 = Object.freeze(IPv6.map(([start, end, country, state2, state1, city, lat, lon]) => Object.freeze({ start, end, country, state2, state1, city, lat, lon })));
			break;
	} */

	GeoIPv4 = Object.freeze(IPv4);
	GeoIPv6 = Object.freeze(IPv6);

	postMessage({ type: WORKER });
}

/**
 * Search the geolocation database.
 *
 * @param {Array<[number|bigint, number|bigint, string]|[number|bigint, number|bigint, string, string, string, number|null, number|null]|[number|bigint, number|bigint, string, string, string, string, number|null, number|null]>} GeoIP
 * @param {number|bigint} address
 * @returns {{start: number|bigint, end: number|bigint, country: string, state2?: string, state1?: string, city?: string, lat?: number|null, lon?: number|null}|null}
 */
function searchGeoIP(GeoIP, address) {
	let min = 0;
	let max = GeoIP.length - 1;

	while (min <= max) {
		const guess = Math.floor((min + max) / 2);
		const [start, end] = GeoIP[guess];
		// console.log(min, max, guess, GeoIP[guess], address);

		if (end < address) {
			min = guess + 1;
		} else if (start > address) {
			max = guess - 1;
		} else /* if (start <= address && end >= address) */ {
			switch (settings.GeoDB) {
				case 1:
				case 2:
				case 9:
				case 3:
				case 4:
				case 5: {
					const [start, end, country] = GeoIP[guess];
					return Object.freeze({ start, end, country });
				}
				case 6:
				case 7: {
					const [start, end, country, state1, city, lat, lon] = GeoIP[guess];
					return Object.freeze({ start, end, country, state1, city, lat, lon });
				}
				case 8: {
					const [start, end, country, state2, state1, city, lat, lon] = GeoIP[guess];
					return Object.freeze({ start, end, country, state2, state1, city, lat, lon });
				}
			}
		}

	}

	return null;
}

/**
 * Get the geolocation.
 *
 * @param {string} address
 * @returns {{start: number|bigint, end: number|bigint, country: string, state2?: string, state1?: string, city?: string, lat?: number|null, lon?: number|null}|null}
 */
function getGeoIP(address) {
	if (GeoIPv4 && GeoIPv6) {
		if (IPv4RE.test(address)) {
			return searchGeoIP(GeoIPv4, IPv4toInt(address));
		} else if (IPv6RE.test(address)) {
			address = expand(address.toLowerCase()).join("");
			// IPv4-mapped, IPv4-compatible and IPv4-embedded IPv6 addresses
			if (address.startsWith("00000000000000000000ffff") || address.startsWith("000000000000000000000000") || address.startsWith("0064ff9b")) {
				return searchGeoIP(GeoIPv4, Number.parseInt(address.slice(-8), 16));
			}

			return searchGeoIP(GeoIPv6, IPv6toInt(address));
		}
	}

	return null;
}

/**
 * Set settings.
 *
 * @param {Object} message
 * @returns {void}
 */
function setSettings(message) {
	const asettings = message;

	settings.GeoDB = asettings.GeoDB;

	if (settings.GeoDB) {
		const { GEOIP } = message;

		if (GEOIP && GEOIP.GeoDB === settings.GeoDB) {
			if (GEOIP.GeoIPv4 && GEOIP.GeoIPv6) {
				parseGeoLoc(GEOIP.GeoIPv4, GEOIP.GeoIPv6);
			} else {
				// Use TSV format starting in 2024
				const y2024 = Date.UTC(2024);
				if (y2024 <= Date.now() && y2024 > GEOIP.date) {
					/* await */ getGeoLoc(GEOIP.date, message.languages);
				} else {
					/* await */ getGeoLoc(GEOIP.date, message.languages, "force-cache");
				}
			}
		} else {
			getGeoLoc(message.date, message.languages);
		}
	}
}

addEventListener("message", (event) => {
	const message = event.data;
	// console.log(message);

	switch (message.type) {
		case WORKER: {
			getGeoLoc(message.date, message.languages);
			break;
		}
		case LOCATION: {
			const response = {
				type: LOCATION,
				locations: message.addresses.map((x) => getGeoIP(x))
			};
			// console.log(response);
			event.ports[0].postMessage(response);
			break;
		}
		case BACKGROUND: {
			setSettings(message);
			break;
		}
		// No default
	}
});
