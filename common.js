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
const statusEmojis = Object.freeze(["🟦", "🟩", "🟨", "🟥", /* "🔵", "🟢", "🟡", "🔴", */ "🫖"]);
// const digitEmojis = Object.freeze([...[...new Array(10)].map((x, i) => `${i}️`), ..."⓿❶❷❸❹❺❻❼❽❾", ..."⓪①②③④⑤⑥⑦⑧⑨"]);
const digitEmojis = Object.freeze([...new Array(10)].map((x, i) => `${i}️⃣`));

const suffix_power_char = Object.freeze(["", "K", "M", "G", "T", "P", "E", "Z", "Y", "R", "Q"]);

// Ascii85:  !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstu
// Z85:      0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#
// RFC 1924: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~
const base85 = Object.freeze(Array.from("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~"));

const dateTimeFormat1 = new Intl.DateTimeFormat([], { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
// const dateTimeFormat2 = new Intl.DateTimeFormat([], { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
const dateTimeFormat3 = new Intl.DateTimeFormat([], { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
const dateTimeFormat4 = new Intl.DateTimeFormat([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });

const numberFormat1 = new Intl.NumberFormat([], { style: "unit", unit: "day", unitDisplay: "long" });
const numberFormat2 = new Intl.NumberFormat([], { style: "unit", unit: "hour", unitDisplay: "long" });
const numberFormat3 = new Intl.NumberFormat([], { style: "unit", unit: "minute", unitDisplay: "long" });
const numberFormat4 = new Intl.NumberFormat([], { style: "unit", unit: "second", unitDisplay: "long" });
const numberFormat5 = new Intl.NumberFormat([], { style: "unit", unit: "millisecond", unitDisplay: "long" });
const numberFormat6 = new Intl.NumberFormat([], { style: "unit", unit: "millisecond", unitDisplay: "short" });

const formatter1 = new Intl.ListFormat();

const numberFormat = new Intl.NumberFormat();
const rtf = new Intl.RelativeTimeFormat([], { numeric: "auto" });
const regionNames = new Intl.DisplayNames([], { type: "region" });

// IPv4 address regular expression
const IPv4 = String.raw`(?:(?:25[0-5]|(?:2[0-4]|[01]?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|[01]?[0-9])?[0-9])`;
const IPv4RE = new RegExp(`^${IPv4}$`, "u");

// IPv6 address regular expression
// \p{ASCII_Hex_Digit}
const IPv6 = String.raw`(?:(?:(?:\p{AHex}{1,4}:){6}|::(?:\p{AHex}{1,4}:){5}|(?:\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){4}|(?:(?:\p{AHex}{1,4}:)?\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){3}|(?:(?:\p{AHex}{1,4}:){0,2}\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:){2}|(?:(?:\p{AHex}{1,4}:){0,3}\p{AHex}{1,4})?::(?:\p{AHex}{1,4}:)|(?:(?:\p{AHex}{1,4}:){0,4}\p{AHex}{1,4})?::)(?:\p{AHex}{1,4}:\p{AHex}{1,4}|${IPv4})|(?:(?:\p{AHex}{1,4}:){0,5}\p{AHex}{1,4})?::\p{AHex}{1,4}|(?:(?:\p{AHex}{1,4}:){0,6}\p{AHex}{1,4})?::)`;
const IPv6RE = new RegExp(`^${IPv6}$`, "u");

/**
 * Auto-scale number to unit.
 * Adapted from: https://github.com/tdulcet/Numbers-Tool/blob/master/numbers.cpp
 *
 * @param {number} number
 * @param {boolean} scale
 * @returns {string}
 */
function outputunit(number, scale) {
	let str = "";

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

	str += `\u00A0${power < suffix_power_char.length ? suffix_power_char[power] : "(error)"}`;

	if (!scale && power > 0) {
		str += "i";
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
function outputbase85(number) {
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
function expand(address) {
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
function IPv4toInt(address) {
	const octets = address.split(".").map((x) => Number.parseInt(x, 10));
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
function outputdate(date) {
	return dateTimeFormat1.format(new Date(date));
}

/**
 * Output date range.
 *
 * @param {number} date1
 * @param {number} date2
 * @returns {string}
 */
function outputdateRange(date1, date2) {
	return dateTimeFormat4.formatRange(new Date(date1), new Date(date2));
}

/**
 * Output location.
 *
 * @param {{country: string, state2?: string, state1?: string, city?: string}} info
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
 * @returns {Object.<string, string|void>}
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
 * @returns {Object.<string, string|void>}
 */
function getHSTS(header) {
	// console.log(header);
	const aheader = {};
	for (const item of header.split(/([\w-]+(?:=(?:"[^"]+"|[^";\s]*))?)(?:\s*;\s*|$)/u).filter((x, i) => i % 2 !== 0)) {
		const [type, value] = item.split("=");
		aheader[type.toLowerCase()] = value && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
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

/**
 * Delay.
 *
 * @param {number} delay
 * @returns {Promise<void>}
 */
function delay(delay) {
	return new Promise((resolve) => {
		setTimeout(resolve, delay);
	});
}
