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
var matchesDisplay = undefined;
var searchBox = undefined;

// listen for keyboard shortcuts we defined as commands in the manifest
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
    if (command === 'clear') {
        clearOldMatches();
    }
    else {
        moveMatch(command);
    }
}

// handle when find button is pressed (or Enter key)
function onFindPressed(event) {
    searchString = searchBox.value;
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
        currentMatch = response['current-match'];

        // response may only contain an updated current match, in which case we don't want to update total matches
        if (response.hasOwnProperty('match-count')) {
            totalMatches = response['match-count'];
        }
        updateMatchesDisplay(response);
    }
}

// updates the 'x of y matches' display when current or total matches changes
function updateMatchesDisplay(response) {
    if (currentMatch === 0 && totalMatches === 0) {
        matchesDisplay.textContent = 'No matches';
    }
    else {
        // add 1 to currentMatch as it is an array index
        matchesDisplay.textContent = `${currentMatch + 1} of ${totalMatches} matches`;
    }
}

// update our regex booleans when checkboxes are modified
function onRegexChange() {
    matchCase = document.getElementById('match-case').checked;
    wholeWords = document.getElementById('whole-words').checked;
    onInputChange();
}

// called whenever content of the search box changes to launch a fresh search
function onInputChange() {
    var searchString = document.getElementById('search-string').value;
    if (searchString) {
        var searchParams = createSearch(searchString);
        doSearch(searchParams);
    }
    else {
        // when the search box has become empty we want to clear old matches
        clearOldMatches();
    }
}

// send a 'clear' message to content.js so it clears old matches
function clearOldMatches() {
    searchBox.value = '';
    matchesDisplay.textContent = 'No matches';
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { 'type' : 'clear' });
    });
}

// send a 'move' message to content.js to move to the next or previous match
function moveMatch(command) {
    var moveCommand = {
        'type': 'move',
        'cmd': command
    }

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, moveCommand, updateMatchValues);
    });
}

// used to make the ENTER key toggle the regex checkboxes on and off as only SPACE does this by default
function detectEnterKey(event) {
    if (event.key === 'Enter') {
        event.target.click();
    }
}

// handles clicking the buttons for moving to next or previous match
function onMovePressed(event) {
    onCommand(event.target.id);
}

// set up event listeners and put cursor in input box
function initialize() {
    var matchCaseCheckbox = document.querySelector('#match-case');
    matchCaseCheckbox.addEventListener('keydown', detectEnterKey);
    matchCaseCheckbox.addEventListener('change', onRegexChange);

    var wholeWordsCheckbox = document.querySelector('#whole-words');
    wholeWordsCheckbox.addEventListener('keydown', detectEnterKey);
    wholeWordsCheckbox.addEventListener('change', onRegexChange);

    document.querySelector('#search-string').addEventListener('input', onInputChange);
    document.getElementById('find-on-page').addEventListener('submit', onFindPressed);

    searchBox = document.getElementById('search-string');
    searchBox.focus();

    document.getElementById('next').addEventListener('click', onMovePressed);
    document.getElementById('previous').addEventListener('click', onMovePressed);
    document.getElementById('clear').addEventListener('click', clearOldMatches);

    matchesDisplay = document.getElementById('matches-display');
    matchesDisplay.style.fontStyle = 'italic';

    /* clear old matches when we begin a new search */
    clearOldMatches();
}
