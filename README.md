[![Actions Status](https://github.com/tdulcet/Server-Status/workflows/CI/badge.svg?branch=main)](https://github.com/tdulcet/Server-Status/actions)

# Server Status
Quickly view basic info about every webpage

Copyright © 2021 Teal Dulcet

![](icons/logo.png)

Firefox add-on/WebExtension to quickly view basic information about every HTTP/HTTPS webpage that browsers either do not show or make difficult to find. The popup includes:

* Server location
* IP address(es)
* HTTP status code and version
* Load time, time to first byte and first paint
* Transfer size
* \*Last modified
* Certificate issuer and expiration date
* SSL/TLS protocol
* [HTTP Strict Transport Security](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security) (HSTS) status
* Number of requests and a Requests table with a row for each hostname/domain:
	* Number of connections
	* Icon(s) representing the classification by Firefox's [Enhanced Tracking Protection](https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop) (ETP) feature
	* Icon representing the security state
	* Days left until certificate expiration
	* SSL/TLS version
	* HSTS max age in days
	* Icon representing the HTTP status code(s)
	* Hostname/Domain
	* IP address(es)
	* Flag for country of server location(s)

Users can hover over almost everything in the popup, especially in the Requests table, to see tooltips with much more information. Toolbar icon can show:

* Flag for country of server location (default)
	* Badge: Country code
* Internet Protocol version
* Days left until certificate expiration
* SSL/TLS version
* HTTP status code
* HTTP version

Users can hover over the toolbar icon to see a tooltip with the HTTP status line, IP address, Server location, Certificate issuer and expiration date, SSL/TLS protocol and HSTS status.

To monitor the status of one or more servers, please see the [Remote Servers Status Monitoring](https://github.com/tdulcet/Remote-Servers-Status) script.

❤️ Please visit [tealdulcet.com](https://www.tealdulcet.com/) to support this extension and my other software development.

⬇️ Download from [Addons.mozilla.org](https://addons.mozilla.org/firefox/addon/server-status/) (AMO).

\* On servers which provide this information

## Features

* Supports using eight different IP [geolocation](https://en.wikipedia.org/wiki/Internet_geolocation) databases to lookup the server location
	* Including both country only and full location (state/providence/region and city) databases
	* Users can select the database with the most accuracy for their locations of interest
	* All databases support both [IPv4](https://en.wikipedia.org/wiki/IPv4) and [IPv6](https://en.wikipedia.org/wiki/IPv6) addresses
	* Supports IPv4-mapped, IPv4-compatible and IPv4-embedded IPv6 addresses
	* They are prepossessed into a constant [CSV format](https://en.wikipedia.org/wiki/Comma-separated_values) by my [IP Geolocation Databases](https://gitlab.com/tdulcet/ip-geolocation-dbs) repository
	* Updates are provided either daily, weekly or monthly depending on the database
	* One of the full location databases is localized in eight languages
	* The database runs in a separate thread to improve performance
* Highlights the suffix for hostnames in the popup using Mozilla's [Public Suffix List](https://publicsuffix.org/) (PSL)
* The IP databases and PSL are automatically downloaded and updated directly, without needing to update the entire extension
	* This allows users to enjoy much faster and more frequent updates and thus more accurate information
* Use a keyboard shortcut to quickly open the popup (by default <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd>)
* Shows failed and blocked requests/connections in the Requests table
* Shows certificate start/end dates and a countdown
* Button to view the full certificate chain in Firefox's `about:certificate` [certificate viewer](https://github.com/april/certainly-something)
* Supports showing whether the hostname or IP addresses are blacklisted
* Respects your privacy and does not send data anywhere, all information is determined locally in your browser
* Supports the light/dark mode of your system automatically
* Settings automatically synced between all browser instances and devices
* Uses Unicode [Emojis](https://unicode.org/emoji/charts/full-emoji-list.html) for all icons
* Follows the [Firefox Photon Design](https://design.firefox.com/photon)
* Compatible with Firefox for Android

## Icons/Emojis

Meaning of the emojis used for the toolbar icon and/or in the popup.

### Server location

Emoji | Description
--- | ---
🏳️ | Flag for the country of the server location (supports all Unicode country flag emojis, currently 258)
🌐 | The browser cached the page, so no actual connection was made (try refreshing it)
❓ | Location unknown (try selecting a different IP geolocation database)
ℹ️ | The page failed to load, was blocked or access was denied (Firefox blocks access to some [Mozilla domains](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts))
🧩 | Unavailable for the page (it only works on standard HTTP/HTTPS webpages and you would need to refresh any existing pages after installing the add-on)

### Security/Connection state

Emojis | Description
--- | ---
🔒 | Secure
🔒⚠️ | Weak cipher
❌ | Broken (e.g. the certificate is untrusted, has expired or is not valid for the domain)
🔓 | Insecure (HTTP connection)
⛔ | Error (e.g. the page failed to load or was blocked)
🛡️ | Blocked (e.g. by ETP [SmartBlock](https://support.mozilla.org/kb/smartblock-enhanced-tracking-protection) or another add-on)

The ⚠️ emoji is also used when a certificate is about to expire (in less than three days by default).

### HTTP status

Emoji | HTTP status codes | Description
--- | --- | ---
🟦 | `100` - `199` | Informational
🟩 | `200` - `299` | Success
🟨 | `300` - `399` | Redirection
🟥 | `400` - `599` | Client/Server error

There is also an [Easter egg](https://en.wikipedia.org/wiki/Easter_egg_(media)) fifth emoji. See [here](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) for a full list of the possible HTTP status codes.

### ETP Classification

URL classification by Firefox's [Enhanced Tracking Protection](https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop) (ETP) feature.

Emoji | Description
--- | ---
👣 | Fingerprinting
⚒️ | Cryptomining
👁️ | Tracking (e.g. Ads, Analytics, etc.)
👥 | Social tracking (i.e. Facebook, LinkedIn and Twitter)

See the official documentation [here](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived#additional_objects) for the full list of possible classification flags.

## Other Extensions

* [Flagfox](https://flagfox.wordpress.com/) (Firefox)
	* Shows only the server country and IP address and only for the main frame/page (not all requests on the page)
* [IPvFoo](https://github.com/pmarks-net/ipvfoo) (Firefox and Chrome)
	* Shows only the IP addresses

## Contributing

Pull requests welcome! Ideas for contributions:

* Test the browserAction icon on more systems
	* ⭐ Help needed to test on macOS
* Convert to [Manifest V3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) (MV3)
* Refactor into more modules
* Improve the popup design
* Add more information to the popup
* Remove remaining uses of [`.innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML) from the popup
* Use the [TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics) interface to dynamically determine the font size for each emoji when generating the icons (see [bug 1692791](https://bugzilla.mozilla.org/show_bug.cgi?id=1692791#c8))
* Show the IP address and location for cached requests (see [bug 1395020](https://bugzilla.mozilla.org/show_bug.cgi?id=1395020))
* Get the suffixes directly from the browser instead of downloading the PSL (see [bug 1315558](https://bugzilla.mozilla.org/show_bug.cgi?id=1315558))
* Show requests intercepted by service workers (see [bug 1626831](https://bugzilla.mozilla.org/show_bug.cgi?id=1626831))
* Open the `about:certificate` page directly instead of requiring the user to manually paste the URI (see [bug 1777950](https://bugzilla.mozilla.org/show_bug.cgi?id=1777950))
* Show the certificate information in the popup after the user adds an exception (see [bug 1678492](https://bugzilla.mozilla.org/show_bug.cgi?id=1678492))
* Make the popup wider (see [bug 1395025](https://bugzilla.mozilla.org/show_bug.cgi?id=1395025))
* Show the classification for requests blocked by ETP (see [bug 1779770](https://bugzilla.mozilla.org/show_bug.cgi?id=1779770))
* Add support for more IP geolocation databases (see [here](https://gitlab.com/tdulcet/ip-geolocation-dbs#contributing))
* Improve the performance
* Show the server location on a globe
* Show a list of the number of connections for each country for all pages (see [bug 1796768](https://bugzilla.mozilla.org/show_bug.cgi?id=1796768), suggested by Daniel Connelly)
* Show requests that occurred outside a tab
* Allow installing in Firefox for Android from AMO (see [here](https://github.com/mozilla-mobile/fenix/issues/20736) and [bug 1796184](https://bugzilla.mozilla.org/show_bug.cgi?id=1796184)) and sync settings (see [bug 1625257](https://bugzilla.mozilla.org/show_bug.cgi?id=1625257))
* Add support for Chromium
	* `webRequest.getSecurityInfo()` is not yet supported (see [bug 628819](https://bugs.chromium.org/p/chromium/issues/detail?id=628819))
* Localize the add-on
