"use strict";

// communication type
const POPUP = "popup";
const CONTENT = "content";
const BACKGROUND = "background";
const NOTIFICATION = "notification";
const LOCATION = "location";
const WORKER = "worker";

const emojis = Object.freeze(["🧩", "ℹ️", "❓", "🌐", "✔️", "✖️", "⏳", "⬇️"]);
const certificateEmojis = Object.freeze(["🔓", "🔒", "⚠️", "❌", "⛔", "🛡️"]);
const statusEmojis = Object.freeze(["🟦", "🟩", "🟨", "🟥", "🫖"]);

const dateTimeFormat1 = new Intl.DateTimeFormat([], { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
const dateTimeFormat2 = new Intl.DateTimeFormat([], { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
const dateTimeFormat3 = new Intl.DateTimeFormat([], { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
const dateTimeFormat4 = new Intl.DateTimeFormat([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

const numberFormat1 = new Intl.NumberFormat([], { style: "unit", unit: "day", unitDisplay: "long" });
const numberFormat2 = new Intl.NumberFormat([], { style: "unit", unit: "hour", unitDisplay: "long" });
const numberFormat3 = new Intl.NumberFormat([], { style: "unit", unit: "minute", unitDisplay: "long" });
const numberFormat4 = new Intl.NumberFormat([], { style: "unit", unit: "second", unitDisplay: "long" });

const formatter1 = new Intl.ListFormat();

const numberFormat = new Intl.NumberFormat();
const rtf = new Intl.RelativeTimeFormat([], { numeric: "auto" });
const regionNames = new Intl.DisplayNames([], { type: "region" });

// IPv4 address regular expression
const IPv4 = String.raw`(?:(?:25[0-5]|(?:2[0-4]|[01]?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|[01]?[0-9])?[0-9])`;
const IPv4RE = RegExp(`^${IPv4}$`, "u");

// IPv6 address regular expression
// \p{ASCII_Hex_Digit}
const IPv6 = String.raw`(?:(?:(?:\p{AHex}{1,4}:){6}|::(?:\p{AHex}{1,4}:){5}|(?:\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){4}|(?:(?:\p{AHex}{1,4}:)?\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){3}|(?:(?:\p{AHex}{1,4}:){0,2}\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){2}|(?:(?:\p{AHex}{1,4}:){0,3}\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:)|(?:(?:\p{AHex}{1,4}:){0,4}\p{AHex}{1,4})?::)(?:\p{AHex}{1,4}:\p{AHex}{1,4}|${IPv4})|(?:(?:\p{AHex}{1,4}:){0,5}\p{AHex}{1,4})?::\p{AHex}{1,4}|(?:(?:\p{AHex}{1,4}:){0,6}\p{AHex}{1,4})?::)`;
const IPv6RE = RegExp(`^${IPv6}$`, "u");

/**
 * Expand IPv6 address.
 *
 * @param {string} address
 * @returns {string[]}
 */
function expand(address) {
	const blocks = address.split(":");
	for (const [i, block] of blocks.entries()) {
		if (block.length === 0) {
			blocks.splice(i, 1, ...Array(9 - blocks.length).fill("0000"));
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
function IPv4toInt(address) {
	const octets = address.split(".").map((x) => parseInt(x, 10));
	return (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3] >>> 0;
}

/**
 * Convert IPv6 address to BigInt.
 *
 * @param {string} address
 * @returns {bigint}
 */
function IPv6toInt(address) {
	return BigInt(`0x${address}`);
}

/**
 * Output seconds.
 *
 * @param {number} sec_num
 * @returns {string}
 */
function outputseconds(sec_num) {
	// console.log(sec_num);
	const d = Math.floor(sec_num / 86400);
	const h = Math.floor(sec_num % 86400 / 3600);
	const m = Math.floor(sec_num % 86400 % 3600 / 60);
	const s = sec_num % 86400 % 3600 % 60;
	const text = [];
	if (d > 0) {
		text.push(numberFormat1.format(d));
	}
	if (h > 0) {
		text.push(numberFormat2.format(h));
	}
	if (m > 0) {
		text.push(numberFormat3.format(m));
	}
	if (s > 0) {
		text.push(numberFormat4.format(s));
	}
	return formatter1.format(text);
}

/**
 * Output date.
 *
 * @param {number} date
 * @returns {string}
 */
function outputdate(date) {
	return dateTimeFormat1.format(new Date(date));
}

/**
 * Output date range.
 *
 * @param {Date} date1
 * @param {Date} date2
 * @returns {string}
 */
function outputdateRange(date1, date2) {
	return dateTimeFormat4.formatRange(new Date(date1), new Date(date2));
}

/**
 * Output location.
 *
 * @param {Object} info
 * @returns {string}
 */
function outputlocation(info) {
	return `${info.city ? `${info.city}, ` : ""}${info.state2 ? `${info.state2}, ` : ""}${info.state1 ? `${info.state1}, ` : ""}${regionNames.of(info.country)}`;
}

/**
 * Convert latitude and longitude to corresponding earth emoji.
 *
 * @param {number} longitude
 * @returns {string}
 */
function earth(longitude) {
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
 * Get certificate issuer.
 *
 * @param {string} issuer
 * @returns {Object}
 */
function getissuer(issuer) {
	// console.log(issuer);
	const aissuer = {};
	for (const item of issuer.split(/([A-Z]+=(?:"[^"]+"|[^",]*))(?:,|$)/u).filter((x, i) => i % 2 !== 0)) {
		const [type, value] = item.split("=");
		aissuer[type] = value;
	}
	return aissuer;
}

/**
 * Get HSTS header directives.
 *
 * @param {string} header
 * @returns {Object}
 */
function getHSTS(header) {
	// console.log(header);
	const aheader = {};
	for (const item of header.split(/([\w-]+(?:=(?:"[^"]+"|[^";\s]*))?)(?:\s*;\s*|$)/u).filter((x, i) => i % 2 !== 0)) {
		const [type, value] = item.split("=");
		aheader[type.toLowerCase()] = value && value[0] === '"' && value[-1] === '"' ? value.slice(1, -1) : value;
	}
	return aheader;
}

/**
 * Get security error message.
 *
 * @param {Object} securityInfo
 * @returns {string}
 */
function getmessage(securityInfo) {
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
function countryCode(country) {
	return Array.from(country.toUpperCase(), (c) => String.fromCodePoint(c.codePointAt() + 127397)).join("");
}
