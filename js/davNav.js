/**
 * A hash navigation library for JavaScript.
 * Compatibility: http://caniuse.com/#feat=hashchange
 * @author Roberto M.F. (Roboe)
 *
 * @license The MIT License (MIT)
 */

/* Copyright (c) 2014 Roberto M.F. (Roboe)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// Create namespace if it does not exist yet.
if (window.cf === undefined) {
	/** @namespace */
	var cf = {};
}
if (cf.roboe === undefined) {
	/** @namespace */
	cf.roboe = {};
}

if (cf.roboe.davNav !== undefined) {
	throw 'Class name cf.roboe.davNav already taken.';
}

/**
 * @class
 */
cf.roboe.davNav = function () {
	'use strict';

	/**
  * Workaround for document.querySelector() to have forEach
  * @link https://gist.github.com/DavidBruant/1016007

  NodeList.prototype.forEach = Array.prototype.forEach;
  HTMLCollection.prototype.forEach = Array.prototype.forEach; // Because of https://bugzilla.mozilla.org/show_bug.cgi?id=14869
  */

	/*
	 * Enable extra info on console.
	 * @type Boolean
	 */
	var verbose = false;

	/**
	 * Shows extra info on console.
	 * @param msg The info to show. Can be multiple.
	 */
	this.v = function (msg) {
		if (verbose) {
			console.log.apply(console, ["DAVNAV"].concat(arguments));
		}
	};

	/**
	 * ID of the first screen that should be loaded in the webapp.
	 */
	Object.defineProperty(this, 'START_SCREEN', {
		value: "index",
		writable: false,
		enumerable: true,
		configurable: false
	});

	var _previous = this.START_SCREEN;
	/**
	 * Hash of the previous section visited.
	 */
	Object.defineProperty(this, "previous", {
		get: function () {
			return _previous;
		},
		set: function (url) {
			var index = url.indexOf("#");
			_previous = (index !== -1) ? url.substr(index) : davNav.START_SCREEN;
		},
		enumerable: true,
		configurable: false
	});

	/**
	 * Go to the last screen by executing history.back().
	 * @param {Integer} pagesToGoBack Number of pages to go back (optional).
	 * @returns false For overriding another link in the element.
	 */
	this.back = function (pagesToGoBack) {
		var section = document.querySelector("#" + davNav.urlParts[1]);
		section.className = section.dataset.position;

		if (pagesToGoBack = parseInt(pagesToGoBack) !== NaN) {
			window.history.go(Math.abs(pagesToGoBack) * -1);
		} else {
			window.history.back();
		}
		return false;
	};

	/**
	 * Go to the next screen by executing history.forward(). Not used ATM.
	 * @returns false For overriding another link in the element.
	 */
	this.forward = function () {
		history.forward();
		return false;
	};

	var _urlParts = new Array("#" + this.START_SCREEN, this.START_SCREEN, "");
	/**
	 * Array containing complete hash, splitted hash and splitted note id.
	 */
	Object.defineProperty(this, "urlParts", {
		get: function () {
			return _urlParts;
		},
		set: function (hash) {
			var result = hash.match(/^#(\w*)=?(\d*)\??.*$/);
			if (result && result.length === 3) {
				_urlParts = result;
			}
		},
		enumerable: true,
		configurable: false
	});

	/**
	 * Captures the event fired when hash changes and load that screen.
	 * Current valid hashes: #section, #section=noteid, #section=noteid?whatever
	 * section should be a word; noteid should be digits.
	 * @param {Object} evt Event
	 */
	this.onhashchange = function (evt) {
		davNav.v("New hash:", location.hash);

		if (location.hash && location.hash !== "") {
			davNav.urlParts = location.hash;
			davNav.previous = (evt && evt.oldURL) ? evt.oldURL : location.href;
		} else {
			location.hash = "#" + davNav.START_SCREEN;
		}

		davNav.gotoScreen(davNav.urlParts);
	};

	/**
	 * Change the current screen to the new one
	 * @param {String[]} urlParts
	 */
	this.gotoScreen = function (urlParts) {
		davNav.actual = document.querySelector("#" + urlParts[1]);
		/*
    document.querySelectorAll(".current").forEach(function(e) {
      davNav.v("Previous screen: ", e);
      e.className = e.dataset.position;
    });
    */
		davNav.actual.className = "current";

		davNav.v("New screen:", davNav.actual);

		davNav.loadScreen(urlParts[1]);
	};

	/**
	 *
	 * @param {String} screen
	 */
	this.loadScreen = function (screen) {
		davNav.v("Deleting .current from next screens", screen);
		var deleteCurrentClass = false;
		for (var e in davNav.whenLoading) {
			if (deleteCurrentClass) {
				var screenEl = document.querySelector("#" + e);
				screenEl.className = screenEl.dataset.position;
			} else {
				deleteCurrentClass = e === screen;
			}
		}
		if (typeof screen === "string" && davNav.whenLoading[screen]) {
			davNav.whenLoading[screen]();
		}
	};

	/**
	 * Contains specific code to execute on new screen loading.
	 * This should be override with screenIDs as property keys and functions as values.
	 */
	this.whenLoading = {};
};
