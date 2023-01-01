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
 * @returns {Promise<[Array<number|bigint|string|null>[], string|null]>}
 */
function agetGeoIP(url, v, cache) {
	const alabel = `${label}${v}`;
	console.time(alabel);
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

			let GEOIP = text.split("\n").filter((r) => r.length).map((r) => r.split(/("[^"]+"|[^",]*)(?:,|$)/u).filter((x, i) => i % 2 !== 0).map((x) => x[0] === '"' && x[-1] === '"' ? x.slice(1, -1) : x));
			// console.log(GEOIP);

			console.timeLog(alabel);

			switch (settings.GeoDB) {
				case 1:
				case 2:
				case 3:
				case 4:
				case 5:
					GEOIP = v === 4 ? Object.freeze(GEOIP.map(([start, end, country]) => [Number.parseInt(start, 10), Number.parseInt(end, 10), country])) : Object.freeze(GEOIP.map(([start, end, country]) => [BigInt(start), BigInt(end), country]));
					break;
				case 6:
				case 7:
					GEOIP = v === 4 ? Object.freeze(GEOIP.map(([start, end, country, state1, city, lat, lon]) => [Number.parseInt(start, 10), Number.parseInt(end, 10), country, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null])) : Object.freeze(GEOIP.map(([start, end, country, state1, city, lat, lon]) => [BigInt(start), BigInt(end), country, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null]));
					break;
				case 8:
					GEOIP = v === 4 ? Object.freeze(GEOIP.map(([start, end, country, state2, state1, city, lat, lon]) => [Number.parseInt(start, 10), Number.parseInt(end, 10), country, state2, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null])) : Object.freeze(GEOIP.map(([start, end, country, state2, state1, city, lat, lon]) => [BigInt(start), BigInt(end), country, state2, state1, city, lat ? Number.parseFloat(lat) : null, lon ? Number.parseFloat(lon) : null]));
					break;
			}

			console.timeLog(alabel);

			const modified = response.headers.get("Last-Modified");
			// console.log(Array.from(response.headers.entries()), modified);
			return [GEOIP, modified];
		}
		console.error(response);
		console.timeEnd(alabel);
		return Promise.reject();

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
	const URL = "https://gitlab.com/tdulcet/ip-geolocation-dbs/-/raw/main/";
	let url4 = null;
	let url6 = null;

	switch (settings.GeoDB) {
		case 1:
			url4 = `${URL}geo-whois-asn-country/ipv4.csv?inline=false`;
			url6 = `${URL}geo-whois-asn-country/ipv6.csv?inline=false`;
			break;
		case 2:
			url4 = `${URL}iptoasn-country/ipv4.csv?inline=false`;
			url6 = `${URL}iptoasn-country/ipv6.csv?inline=false`;
			break;
		case 3:
			url4 = `${URL}dbip-country/ipv4.csv?inline=false`;
			url6 = `${URL}dbip-country/ipv6.csv?inline=false`;
			break;
		case 4:
			url4 = `${URL}ip2location-country/ipv4.csv?inline=false`;
			url6 = `${URL}ip2location-country/ipv6.csv?inline=false`;
			break;
		case 5:
			url4 = `${URL}geolite2-country/ipv4.csv?inline=false`;
			url6 = `${URL}geolite2-country/ipv6.csv?inline=false`;
			break;
		case 6:
			url4 = `${URL}dbip-city/ipv4.csv?inline=false`;
			url6 = `${URL}dbip-city/ipv6.csv?inline=false`;
			break;
		case 7:
			url4 = `${URL}ip2location-city/ipv4.csv?inline=false`;
			url6 = `${URL}ip2location-city/ipv6.csv?inline=false`;
			break;
		case 8: {
			// English, Simplified Chinese, Spanish, Brazilian Portuguese, Russian, Japanese, French, and German
			const locales = ["de", "en", "es", "fr", "ja", "pt-BR", "ru", "zh-CN"];

			// const languages = await browser.i18n.getAcceptLanguages();
			const locale = languages.find((e) => locales.includes(e)) || locales[1];
			console.log(languages, locale);

			url4 = `${URL}geolite2-city/ipv4-${locale}.csv?inline=false`;
			url6 = `${URL}geolite2-city/ipv6-${locale}.csv?inline=false`;
			break;
		}
	}

	if (!cache) {
		notification(`${emojis[7]} Updating geolocation databases`, "Checking for updated IP geolocation databases.\nYour browser may briefly slowdown after the download while it is processing the databases.");
	}

	const promise4 = agetGeoIP(url4, 4, cache);
	const promise6 = agetGeoIP(url6, 6, cache);

	await Promise.all([promise4, promise6]).then(([[GeoIPv4, modified4], [GeoIPv6, modified6]]) => {
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1674342
		// console.log(GeoIPv4, GeoIPv6, date);
		console.log(GeoIPv4.length, GeoIPv6.length, date);

		const message = {
			type: BACKGROUND
		};

		// The full location databases are too large to store in local storage, which is limited to 255 MiB
		message.GEOIP = settings.GeoDB >= 1 && settings.GeoDB <= 5 ? { GeoIPv4, GeoIPv6, GeoDB: settings.GeoDB, date } : { GeoDB: settings.GeoDB, date };

		postMessage(message);

		parseGeoLoc(GeoIPv4, GeoIPv6);

		if (!cache) {
			notification(`${emojis[7]} Geolocation databases updated`, `The IP geolocation databases were successfully updated.\n\nIPv4 ${modified4 ? `updated: ${outputdate(modified4)}, ` : ""}rows: ${numberFormat.format(GeoIPv4.length)}\nIPv6 ${modified6 ? `updated: ${outputdate(modified6)}, ` : ""}rows: ${numberFormat.format(GeoIPv6.length)}`);
		}

		console.timeEnd(`${label}4`);
		console.timeEnd(`${label}6`);
	});
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
		const GEOIP = message.GEOIP;

		if (GEOIP && GEOIP.GeoDB === settings.GeoDB) {
			if (GEOIP.GeoIPv4 && GEOIP.GeoIPv6) {
				parseGeoLoc(GEOIP.GeoIPv4, GEOIP.GeoIPv6);
			} else {
				/* await */ getGeoLoc(GEOIP.date, message.languages, "force-cache");
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
