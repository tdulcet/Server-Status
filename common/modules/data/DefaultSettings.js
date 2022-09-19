/**
 * Specifies the default settings of the add-on.
 *
 * @module data/DefaultSettings
 */

/**
 * An object of all default settings.
 *
 * @private
 * @const
 * @type {Object}
 */
const defaultSettings = {
	settings: {
		icon: "1",
		color: "#0000ff", // Blue
		warndays: 3, // Days
		dns: true,
		fullipv6: false,
		compactipv6: false,
		blocked: true,
		GeoDB: "7",
		update: "1",
		updateidle: true,
		idle: 60, // Seconds
		map: "0",
		lookup: "0",
		suffix: true,
		https: false,
		blacklist: false,
		domainblacklist: "dbl.spamhaus.org",
		ipv4blacklist: "zen.spamhaus.org",
		ipv6blacklist: "zen.spamhaus.org",
		send: true
	}
};

// freeze the inner objects, this is strongly recommend
Object.values(defaultSettings).map(Object.freeze);

/**
 * Export the default settings to be used.
 *
 * @public
 * @const
 * @type {Object}
 */
export const DEFAULT_SETTINGS = Object.freeze(defaultSettings);
