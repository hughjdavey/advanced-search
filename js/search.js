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

var matchCase = false;
var wholeWords = false;
var searchString = '';
var currentMatch = 0;
var totalMatches = 0;

// passes a connection to content.js, which listens for us diconnecting
// (i.e. closing) so it knows to clear any highlights on the page
chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    var port = chrome.tabs.connect(tabs[0].id, {name: 'disconnect-sender'});
});

// listen for keyboard shortcuts we defined as commands int the manifest
chrome.commands.onCommand.addListener( command => {
    if (command) {
        onCommand(command);
    }
});

// listen for when DOM is loaded so we can initialize our popup box
document.addEventListener('DOMContentLoaded', () => {
    initialize();
});

// handle keyboard shortcuts by passing them to content.js
function onCommand(command) {
    var moveCommand = {
        'type': 'move',
        'cmd': command
    }

    // send forward or back command to content.js
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, moveCommand, updateMatchValues);
    });
}

// handle when find button is pressed (or Enter key)
function onFindPressed(event) {
    var textBox = document.getElementById('search-string');
    searchString = textBox.value;
    if (!searchString || searchString.length === 0) {
        return;
    }

    var searchParams = createSearch(searchString);
    doSearch(searchParams);

    // stop submission event here so form fields are not cleared/reset
    event.preventDefault();
}

// send search parameters to content.js
function doSearch(searchParams) {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, searchParams, updateMatchValues);
    });
}

function createSearch(searchString) {
    return {
        'type': 'search',
        'text': searchString,
        'matchCase': matchCase,
        'wholeWords': wholeWords
    }
}

// handles responses from content.js, containing latest current match and possibly a new total matches
var updateMatchValues = function(response) {
    if (response) {
        currentMatch = response['current-match'] || 0;
        totalMatches = response['match-count'] || 0;
        updateMatchesDisplay(response);
    }
}

// updates the 'x of y matches' display when current or total matches changes
function updateMatchesDisplay(response) {
    var matchesDisplay = document.getElementById('matches-display')

    // split on spaces to turn 'x of y matches' into a 4-element array
    // the filter is needed as the array comes out full of empty strings and newlines
    // array should end up looking like ['x', 'of', 'y', 'matches']
    var matchesString = matchesDisplay.textContent.split(' ').filter( elem => {
        return elem !== '' && elem !== '\n';
    });

    if (Object.keys(response).length == 2) {
        matchesString[2] = totalMatches;            // update total matches if we get a response with 2 attrs (i.e. a current and a total)
    }
    matchesString[0] = totalMatches == 0 ? 0 : currentMatch + 1;            // add 1 as it's an array index, but not if total is 0 (or it would read '1 of 0 matches')

    matchesDisplay.textContent = matchesString.join(' ');
    matchesDisplay.style.fontStyle = 'italic';
}

// update our regex booleans when checkboxes are modified
function onRegexChange() {
    matchCase = document.getElementById('match-case').checked;
    wholeWords = document.getElementById('whole-words').checked;
}

function onInputChange() {
    var searchString = document.getElementById('search-string').value;
    if (searchString) {
        var searchParams = createSearch(searchString);
        doSearch(searchParams);
    }
    else {
        // when the search box has become empty we want to clear old matches
        clearOldMatches();
        updateMatchValues( { 'match-count': 0, 'current-match': 0 } );
    }
}

function clearOldMatches() {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { 'type' : 'clear' });
    });
}

// set up event listeners and put cursor in input box
function initialize() {
    document.querySelector('#match-case').addEventListener('change', onRegexChange);
    document.querySelector('#whole-words').addEventListener('change', onRegexChange);
    document.querySelector('#search-string').addEventListener('input', onInputChange);
    document.getElementById('find-on-page').addEventListener('submit', onFindPressed);

    var searchBox = document.getElementById('search-string');
    searchBox.focus();
}
