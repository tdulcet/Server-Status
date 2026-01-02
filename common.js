"use strict";

// communication type
export const POPUP = "popup";
export const CONTENT = "content";
export const PERFORMANCE = "performance";
export const BACKGROUND = "background";
export const NOTIFICATION = "notification";
export const LOCATION = "location";
export const WORKER = "worker";

export const emojis = Object.freeze({ jigsaw_puzzle_piece: "🧩", information_source: "ℹ️", black_question_mark_ornament: "❓", globe_with_meridians: "🌐", heavy_check_mark: "✔️", heavy_multiplication_x: "✖️", hourglass_with_flowing_sand: "⏳", downwards_black_arrow: "⬇️" });
export const certificateEmojis = Object.freeze({ open_lock: "🔓", lock: "🔒", warning_sign: "⚠️", cross_mark: "❌", no_entry: "⛔", shield: "🛡️" });
export const statusEmojis = Object.freeze({ large_blue_square: "🟦", large_green_square: "🟩", large_yellow_square: "🟨", large_red_square: "🟥", large_blue_circle: "🔵", large_green_circle: "🟢", large_yellow_circle: "🟡", large_red_circle: "🔴", teapot: "🫖" });
// const digitEmojis = Object.freeze([...[...new Array(10)].map((x, i) => `${i}️`), ..."⓿❶❷❸❹❺❻❼❽❾", ..."⓪①②③④⑤⑥⑦⑧⑨"]);
export const digitEmojis = Object.freeze([...new Array(10)].map((_x, i) => `${i}️⃣`));

// https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
// https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
export const status_codes = Object.freeze({
	// Informational
	100: "Continue",
	101: "Switching Protocols",
	102: "Processing",
	103: "Early Hints",
	// Successful
	200: "OK",
	201: "Created",
	202: "Accepted",
	203: "Non-Authoritative Information",
	204: "No Content",
	205: "Reset Content",
	206: "Partial Content",
	207: "Multi-Status",
	208: "Already Reported",
	226: "IM Used",
	// Redirection
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found", // "Moved Temporarily"
	303: "See Other",
	304: "Not Modified",
	305: "Use Proxy",
	306: "(Unused)", // "Switch Proxy"
	307: "Temporary Redirect",
	308: "Permanent Redirect",
	// Client Error
	400: "Bad Request",
	401: "Unauthorized",
	402: "Payment Required",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	407: "Proxy Authentication Required",
	408: "Request Timeout",
	409: "Conflict",
	410: "Gone",
	411: "Length Required",
	412: "Precondition Failed",
	413: "Content Too Large",
	414: "URI Too Long",
	415: "Unsupported Media Type",
	416: "Range Not Satisfiable",
	417: "Expectation Failed",
	418: "I'm a teapot",
	421: "Misdirected Request",
	422: "Unprocessable Content",
	423: "Locked",
	424: "Failed Dependency",
	425: "Too Early",
	426: "Upgrade Required",
	428: "Precondition Required",
	429: "Too Many Requests",
	431: "Request Header Fields Too Large",
	451: "Unavailable For Legal Reasons",
	// Server Error
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	505: "HTTP Version Not Supported",
	506: "Variant Also Negotiates",
	507: "Insufficient Storage",
	508: "Loop Detected",
	510: "Not Extended",
	511: "Network Authentication Required"
});

const suffix_power_char = Object.freeze(["", "K", "M", "G", "T", "P", "E", "Z", "Y", "R", "Q"]);

// Ascii85:  !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstu
// Z85:      0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#
// RFC 1924: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~
const base85 = Object.freeze(Array.from("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~"));

export const dateTimeFormat1 = new Intl.DateTimeFormat([], { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
// export const dateTimeFormat2 = new Intl.DateTimeFormat([], { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
export const dateTimeFormat3 = new Intl.DateTimeFormat([], { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
export const dateTimeFormat4 = new Intl.DateTimeFormat([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

export const numberFormat1 = new Intl.NumberFormat([], { style: "unit", unit: "day", unitDisplay: "long" });
export const numberFormat2 = new Intl.NumberFormat([], { style: "unit", unit: "hour", unitDisplay: "long" });
export const numberFormat3 = new Intl.NumberFormat([], { style: "unit", unit: "minute", unitDisplay: "long" });
export const numberFormat4 = new Intl.NumberFormat([], { style: "unit", unit: "second", unitDisplay: "long" });
export const numberFormat5 = new Intl.NumberFormat([], { style: "unit", unit: "millisecond", unitDisplay: "long" });
export const numberFormat6 = new Intl.NumberFormat([], { style: "unit", unit: "millisecond", unitDisplay: "short" });

const formatter1 = new Intl.ListFormat();

export const numberFormat = new Intl.NumberFormat();
export const rtf = new Intl.RelativeTimeFormat([], { numeric: "auto" });
export const regionNames = new Intl.DisplayNames([], { type: "region" });

// IPv4 address regular expression
const IPv4 = String.raw`(?:(?:25[0-5]|(?:2[0-4]|[01]?\d)?\d)\.){3}(?:25[0-5]|(?:2[0-4]|[01]?\d)?\d)`;
export const IPv4RE = new RegExp(`^${IPv4}$`, "u");

// IPv6 address regular expression
// \p{ASCII_Hex_Digit}
export const IPv6 = String.raw`(?:(?:(?:\p{AHex}{1,4}:){6}|::(?:\p{AHex}{1,4}:){5}|\p{AHex}{0,4}::(?:\p{AHex}{1,4}:){4}|(?:(?:\p{AHex}{1,4}:)?\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){3}|(?:(?:\p{AHex}{1,4}:){0,2}\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){2}|(?:(?:\p{AHex}{1,4}:){0,3}\p{AHex}{1,4})?::\p{AHex}{1,4}:|(?:(?:\p{AHex}{1,4}:){0,4}\p{AHex}{1,4})?::)(?:\p{AHex}{1,4}:\p{AHex}{1,4}|${IPv4})|(?:(?:\p{AHex}{1,4}:){0,5}\p{AHex}{1,4})?::\p{AHex}{1,4}|(?:(?:\p{AHex}{1,4}:){0,6}\p{AHex}{1,4})?::)`;
export const IPv6RE = new RegExp(`^${IPv6}$`, "u");

/**
 * Auto-scale number to unit.
 * Adapted from: https://github.com/tdulcet/Numbers-Tool/blob/master/numbers.cpp
 *
 * @param {number} number
 * @param {boolean} scale
 * @returns {string}
 */
export function outputunit(number, scale) {
	let str;

	const scale_base = scale ? 1000 : 1024;

	let power = 0;
	while (Math.abs(number) >= scale_base) {
		++power;
		number /= scale_base;
	}

	let anumber = Math.abs(number);
	anumber += anumber < 10 ? 0.0005 : anumber < 100 ? 0.005 : anumber < 1000 ? 0.05 : 0.5;

	if (number !== 0 && anumber < 1000 && power > 0) {
		str = numberFormat.format(number);

		const length = 5 + (number < 0 ? 1 : 0);
		if (str.length > length) {
			const prec = anumber < 10 ? 3 : anumber < 100 ? 2 : 1;
			str = number.toLocaleString([], { maximumFractionDigits: prec });
		}
	} else {
		str = number.toLocaleString([], { maximumFractionDigits: 0 });
	}

	if (power > 0) {
		str += `\u00A0${power < suffix_power_char.length ? suffix_power_char[power] : "(error)"}`;

		if (!scale) {
			str += "i";
		}
	}

	return str;
}

/**
 * Output IP address in base 85
 * RFC 1924: https://datatracker.ietf.org/doc/html/rfc1924
 *
 * @param {bigint} number
 * @returns {string}
 */
export function outputbase85(number) {
	const base = 85n;
	let str = "";

	do {
		str = base85[number % base] + str;

		number /= base;
	} while (number > 0n);

	return str;
}

/**
 * Expand IPv6 address.
 *
 * @param {string} address
 * @returns {string[]}
 */
export function expand(address) {
	const blocks = address.split(":");
	for (const [i, block] of blocks.entries()) {
		if (block.length === 0) {
			blocks.splice(i, 1, ...new Array(9 - blocks.length).fill("0000"));
		} else {
			blocks[i] = block.padStart(4, "0");
		}
	}
	return blocks;
}

/**
 * Convert IPv4 address to integer.
 *
 * @param {string} address
 * @returns {number}
 */
export function IPv4toInt(address) {
	const octets = address.split(".").map((x) => Number.parseInt(x, 10));
	return (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3] >>> 0;
}

/**
 * Convert IPv6 address to BigInt.
 *
 * @param {string} address
 * @returns {bigint}
 */
export function IPv6toInt(address) {
	return BigInt(`0x${address}`);
}

/**
 * Output seconds.
 *
 * @param {number} sec
 * @returns {string}
 */
export function outputseconds(sec) {
	// console.log(sec);
	const d = Math.trunc(sec / 86400);
	const h = Math.trunc(sec % 86400 / 3600);
	const m = Math.trunc(sec % 3600 / 60);
	const s = sec % 60;
	const text = [];
	if (d) {
		text.push(numberFormat1.format(d));
	}
	if (h) {
		text.push(numberFormat2.format(h));
	}
	if (m) {
		text.push(numberFormat3.format(m));
	}
	if (s || !text.length) {
		text.push(numberFormat4.format(s));
	}

	return formatter1.format(text);
}

/**
 * Output date.
 *
 * @param {number|string} date
 * @returns {string}
 */
export function outputdate(date) {
	return dateTimeFormat1.format(new Date(date));
}

/**
 * Output date range.
 *
 * @param {number} date1
 * @param {number} date2
 * @returns {string}
 */
export function outputdateRange(date1, date2) {
	return dateTimeFormat4.formatRange(new Date(date1), new Date(date2));
}

/**
 * Output location.
 *
 * @param {{country: string, state2?: string, state1?: string, city?: string}} info
 * @returns {string}
 */
export function outputlocation(info) {
	return `${info.city ? `${info.city}, ` : ""}${info.state2 ? `${info.state2}, ` : ""}${info.state1 ? `${info.state1}, ` : ""}${regionNames.of(info.country)}`;
}

/**
 * Convert latitude and longitude to corresponding earth emoji.
 *
 * @param {number} longitude
 * @returns {string}
 */
export function earth(longitude) {
	let text = "";
	if (longitude < -30) {
		text = "🌎";
	} else if (longitude >= -30 && longitude <= 60) {
		text = "🌍";
	} else if (longitude > 60) {
		text = "🌏";
	}
	return text;
}

/**
 * Get certificate issuer or subject.
 *
 * @param {string} name
 * @returns {Object.<string, string|void>}
 */
export function getcertname(name) {
	// console.log(name);
	const aname = {};
	for (const item of name.split(/([A-Z]+=(?:"[^"]+"|[^",]*))(?:,|$)/u).filter((_x, i) => i % 2 !== 0)) {
		const [type, value] = item.split("=");
		aname[type] = value;
	}
	return aname;
}

/**
 * Get HSTS header directives.
 *
 * @param {string} header
 * @returns {Object.<string, string|void>}
 */
export function getHSTS(header) {
	// console.log(header);
	const aheader = {};
	for (const item of header.split(/([\w-]+(?:=(?:"[^"]+"|[^";\s]*))?)(?:\s*;\s*|$)/u).filter((_x, i) => i % 2 !== 0)) {
		const [type, value] = item.split("=");
		aheader[type.toLowerCase()] = value?.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
	}
	return aheader;
}

/**
 * Get security error message.
 *
 * @param {Object} securityInfo
 * @returns {string}
 */
export function getmessage(securityInfo) {
	let message = "";
	if (securityInfo.state === "broken") {
		message = securityInfo.errorMessage;
	} else if (securityInfo.isUntrusted) {
		message = "The certificate is untrusted";
	} else if (securityInfo.isNotValidAtThisTime) {
		message = "The certificate has expired";
	} else if (securityInfo.isDomainMismatch) {
		message = "The certificate is not valid for this domain";
	}
	return message;
}

/**
 * Convert country code to corresponding flag emoji.
 *
 * @param {string} country
 * @returns {string}
 */
export function countryCode(country) {
	return Array.from(country.toUpperCase(), (c) => String.fromCodePoint(c.codePointAt() + 0x1F1A5)).join("");
}

/**
 * Delay.
 *
 * @param {number} delay
 * @returns {Promise<void>}
 */
export function delay(delay) {
	return new Promise((resolve) => {
		setTimeout(resolve, delay);
	});
}
