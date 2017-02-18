# advanced-search
Chrome extension providing more advanced 'find on page' functionality.

Searches are performed as you type, and there are regex options to further filter results. These are currently 'match case' and 'whole words'. I intend to allow more customizable regexes in future versions.

#### Usage

* `Ctrl + Shift + F` or extension button to launch search dialog
* `Ctrl + 🠆` or `🠆` button to go to next match
* `Ctrl + 🠄` or `🠄` button to go to previous match
* `Ctrl + Del` or `×` button to clear current search text and results

#### Contributing

* All contributions welcome - feel free to submit a PR!
* See the _Known Issues_ section below for inspiration, or work on anything else
* (Make sure you're happy contributing under a GPL 3 license)

#### Known Issues
* Regex choice is limited to two options and not customizable
* Search results are wiped if popup loses focus - maybe ought to be more like Chrome inbuilt finder and persist them so user can click off and scroll freely
* Marking locations of results in the scrollbar like Chrome inbuilt finder would be helpful in this regard
* UI is pretty basic and could look nicer