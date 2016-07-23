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
chrome.runtime.onConnect.addListener( port => {
    if (port.name == "disconnect-sender") {
        port.onDisconnect.addListener( () => {
            clearOldMatches();
        });
    }
});

// listener for messages from our popup
chrome.runtime.onMessage.addListener( (message, sender, sendResponse) => {
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
            node => {
                return node.nodeValue.match(regex) !== null ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        );

        // only call setCurrentMatch if at least one match was found
        if ( highlightMatches(nodeIterator, message.text, regex) ) {
            setCurrentMatch();
        }
        // invoke callback in search.js to display total number of matches to the user
        sendResponse( { 'match-count': markedStrings.length, 'current-match': currentMatch } );

    }
    else if (message.type === 'move') {
        moveHighlightedMatch(message.cmd);
        // invoke callback in search.js to display current match number to the user
        sendResponse( { 'current-match': currentMatch } );
    }
    else if (message.type === 'clear') {
        clearOldMatches();
    }
});

// set the current match to a special class to highlight it as current (orange)
// goes from: <span>contentBefore <mark class="">searchString</mark> contentAfter</span>
// to : <span>contentBefore <mark class="current_match">searchString</mark> contentAfter</span>
function setCurrentMatch() {
    if (markedStrings.length > 0) {
        var currentMark = markedStrings[currentMatch];
        currentMark.className = 'current_match';

        if (!isVisible(currentMark)) {
            scrollToCurrentMatch(currentMark);
        }
    }
}

// clears all the highlighted matches from the last search
function clearOldMatches() {
    markedStrings.forEach( mark => {
        mark.parentNode.replaceChild(mark.firstChild, mark);
    });
    markedStrings = [];
    currentMatch = 0;

    // call Node#normalize to join the text nodes split apart by the previous search
    // after the <mark> tags are removed, the search string is still in a separate text node
    // e.g. consider a search for 'dev' on a page containing the node <p>"The developer"</p>
    // after mark tags have been removed the node looks like: <p>"The " "dev" "eloper"</p>
    // and a search for 'devel' will now fail as no text node holds this string
    // after a call to normalize the node looks like: <p>"The developer"</p>
    document.body.normalize();
}

// visits all nodes, highlighting the search string with a <mark> tag
// goes from: <span>contentBefore searchString contentAfter</span>
// to: <span>contentBefore <mark class="">searchString</mark> contentAfter</span>
// algorithm inspired by http://www.the-art-of-web.com/javascript/search-highlight/
function highlightMatches(iterator, searchString, regex) {
    var currentNode, allNodes = [];
    while(currentNode = iterator.nextNode()) {
        allNodes.push(currentNode);
    }

    if (allNodes.length === 0) {
        return false;
    }

    allNodes.forEach( currentNode => {
        var textContent = currentNode.nodeValue;
        var parent = currentNode.parentNode;
        // todo: refactor call to String#match out - perhaps get the regex match from the node iterator?
        var match = textContent.match(regex);

        // skips nodes of type SCRIPT and NOSCRIPT as these are not relevant
        if (parent.nodeName.includes('SCRIPT')) {
            return;
        }

        var start = textContent.indexOf(match);         // start index of search string
        var end = start + match[0].length;              // end index of search string

        // create text node for the content before the search string, and replace the current node with it
        var contentBefore = document.createTextNode(textContent.substring(0, start));
        parent.replaceChild(contentBefore, currentNode);

        // create a <mark> tag and place the search string inside it, inserting in the parent after the contentBefore node
        var mark = document.createElement('mark');
        mark.appendChild(document.createTextNode(match[0]));
        parent.insertBefore(mark, contentBefore.nextSibling);
        markedStrings.push(mark);                                   // put <mark> node in our array

        // create text node for the content before the search string, inserting in the parent after the <mark> node
        var contentAfter = document.createTextNode(textContent.substring(end));
        parent.insertBefore(contentAfter, mark.nextSibling);
    });
    return true;
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
function moveHighlightedMatch(direction) {
    markedStrings[currentMatch].className = '';
    currentMatch = direction === 'next' ? getNextMatch() : getPreviousMatch();
    setCurrentMatch();
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

function scrollToCurrentMatch(currentMark) {
    var y_position = getCurrentMatchPosition(currentMark);
    // subtract 25 from y_position so there is a bit of 'padding' and the text is easily visible on screen
    window.scrollTo(0, y_position - 25);
}

function getCurrentMatchPosition(currentMark) {
    var curtop = 0;
    if (currentMark.offsetParent) {
        do {
            curtop += currentMark.offsetTop;
        } while (currentMark = currentMark.offsetParent);
        return [curtop];
    }
}


function isVisible(match) {
  var rect = match.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}
