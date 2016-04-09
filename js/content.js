/*
    Copyright 2016 Hugh Davey

    This file is part of Advanced Search.

    Advanced Search is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Advanced Search is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Advanced Search.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

var markedStrings = [];
var currentMatch = 0;
var matchCase = false;
var wholeWords = false;
var port = undefined;

// listens for a port from the popup and adds a listener for when it disconnects
// (i.e. the popup is closed) so we can clear any highlights on the page
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name == "disconnect-sender") {
        port.onDisconnect.addListener(function() {
            clearOldMatches();
        });
    }
});

// listener for messages from our popup
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        console.log(message);
        if (!message) {
            return;
        }

        // a message from find button being pressed
        if (message.type === 'search') {
            clearOldMatches();
            matchCase = message.matchCase;
            wholeWords = message.wholeWords;

            var searchOpts = {
                'matchCase': matchCase,
                'wholeWords': wholeWords
            }
            var regex = getRegex(message.text, searchOpts);

            var nodeIterator = document.createNodeIterator(
                document.body,
                NodeFilter.SHOW_TEXT,
                function(node) {
                    return node.nodeValue.match(regex) !== null ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            );

            highlightMatches(nodeIterator, message.text, regex);
            setCurrentMatch(sendResponse);
        }
        else if (message.type === 'move') {
            moveHighlightedMatch(message.cmd);
            // invoke callback in search.js to display current match number to the user
            sendResponse( { 'current-match': currentMatch } );
        }
    }
);

// after all matches have been highlighted we set the first one as the current match
function setCurrentMatch(sendResponse) {
    if (markedStrings.length > 0) {
        markedStrings[0].className = 'current_match';
        // invoke callback in search.js to display total number of matches to the user
        sendResponse( { 'match-count': markedStrings.length, 'current-match': currentMatch } );
    }
}

// clears all the highlighted matches from the last search
function clearOldMatches() {
    for (var i = 0; i < markedStrings.length; i++) {
        var mark = markedStrings[i];
        mark.parentNode.replaceChild(mark.firstChild, mark);
    }
    markedStrings = [];
    currentMatch = 0;
}

// visits all nodes, highlighting the search string with a <mark> tag
// goes from: <span>contentBefore searchString contentAfter</span>
// to: <span>contentBefore <mark class="">searchString</mark> contentAfter</span>
function highlightMatches(iterator, searchString, regex) {
    var currentNode, allNodes = [];
    while(currentNode = iterator.nextNode()) {
        allNodes.push(currentNode);
        console.log(currentNode.nodeValue.trim() === '');
    }

    for (var i = 0; i < allNodes.length; i++) {
        var currentNode = allNodes[i];
        var textContent = currentNode.nodeValue;
        var parent = currentNode.parentNode;
        var match = textContent.match(regex);

        // skips nodes of type SCRIPT and NOSCRIPT as these are not relevant
        if (parent.nodeName.includes('SCRIPT')) {
            continue;
        }

        var start = textContent.indexOf(match);         // start index of search string
        var end = start + match[0].length;              // end index of search string

        // create text node for the content before the search string, and replace the current node with it
        var before = document.createTextNode(textContent.substring(0, start));
        parent.replaceChild(before, currentNode);

        // create a <mark> tag and place the search string inside it, inserting in the parent after the before node
        var mark = document.createElement('mark');
        mark.appendChild(document.createTextNode(match[0]));
        parent.insertBefore(mark, before.nextSibling);
        markedStrings.push(mark);                                   // put <mark> node in our array

        // create text node for the content before the search string, inserting in the parent after the <mark> node
        var after = document.createTextNode(textContent.substring(end));
        parent.insertBefore(after, mark.nextSibling);
    }
}

// returns the appropriate regex depending on which options have been checked
function getRegex(textToMatch, options) {
    if (options.wholeWords && options.matchCase) {
        return RegExp('(?:^|\\b)(' + textToMatch + ')(?=\\b|$)', 'g');
    }
    else if (options.wholeWords) {
        return RegExp('(?:^|\\b)(' + textToMatch + ')(?=\\b|$)', 'gi');
    }
    else if (options.matchCase) {
        return RegExp(textToMatch);
    }
    else {
        return RegExp(textToMatch, 'i');
    }
}

// moves highlighted match forward or back, rewriting class names to change colour
// todo: scroll page to jump to next match if it is out of view
function moveHighlightedMatch(direction) {
    markedStrings[currentMatch].className = '';
    currentMatch = direction === 'next' ? getNextMatch() : getPreviousMatch();

    // set a custom class so it becomes orange
    // goes from: <span>contentBefore <mark class="">searchString</mark> contentAfter</span>
    // to : <span>contentBefore <mark class="current_match">searchString</mark> contentAfter</span>
    markedStrings[currentMatch].className = 'current_match';
}

// return index of next match, wrapping around to the start of the array if needed
function getNextMatch() {
    var nextMatch = currentMatch + 1;
    return nextMatch === markedStrings.length ? 0 : nextMatch;
}

// return index of previous, wrapping around to the end of the array if needed
function getPreviousMatch() {
    var previousMatch = currentMatch - 1;
    return previousMatch === -1 ? markedStrings.length - 1 : previousMatch;
}
