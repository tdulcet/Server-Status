/**
 * Starter module for addon settings site.
 *
 * @requires modules/OptionHandler
 */

import * as AddonSettings from "/common/modules/AddonSettings/AddonSettings.js";
import * as AutomaticSettings from "/common/modules/AutomaticSettings/AutomaticSettings.js";

import * as CustomOptionTriggers from "./modules/CustomOptionTriggers.js";

document.getElementById("shortcut").addEventListener("click", (event) => {
	event.target.disabled = true;

	if (browser.commands.openShortcutSettings) {
		browser.commands.openShortcutSettings().finally(() => {
			event.target.disabled = false;
		});
	} else {
		alert("Unable to automatically open the Shortcut Settings (requires Firefox 137 or greater).");
	}
});

// init modules
CustomOptionTriggers.registerTrigger();
AutomaticSettings.setDefaultOptionProvider(AddonSettings.getDefaultValue);
AutomaticSettings.init();
