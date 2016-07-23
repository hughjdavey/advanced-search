# advanced-search
Chrome extension providing more advanced 'find on page' functionality.

Searches are performed as you type, and there are regex options to further filter results. These are currently 'match case' and 'whole words'. I intend to allow more customizable regexes in future versions.

CTRL + 🠆 to go to next match; CTRL + 🠄 to go to previous.

Known Issues:
* Search will match hidden elements such as those in unexpanded dropdowns. This causes the total matches count to be inaccurate as well as giving the impression that scrolling to the current match is not working.
* Regex choice is limited to two options and not customizable.
* Next and Previous buttons would be nice to have alongside the existing keyboard shortcuts.