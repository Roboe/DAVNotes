/**
 * This file is part of DAVNotes, a free software for taking notes right
 * in your browser, and everywhere else where a browser can be run.
 * @author Roberto M.F. (Roboe)
 *
 * DAVNotes is free software: you can redistribute it and/or
 * modify it under the terms of the MIT License.
 * You should have received a copy of the MIT Open Source License
 * along with DAVNotes. If not, see <http://opensource.org/licenses/MIT>.
 */

if (!window.cf || !cf.roboe || !cf.roboe.davNav || !cf.roboe.davIndexedDB) {
	throw 'Class cf.roboe.davNav or cf.roboe.davIndexedDB not found. Dependency error.';
}

// An instance of davIndexedDB, my IndexedDB Connector library containing the IndexedDB database logic.
var davIndexedDB = new cf.roboe.davIndexedDB();

// An instance of davNav, my hash navigation library.
var davNav = new cf.roboe.davNav();

// Markdown parser instance.
var Markdown = new Markdown.getSanitizingConverter();

// DAVNotes instance (inline class declaration) and functions.
var davnotes = new function (idb, nav, md, tw) {
	'use strict';

	/*
	 * Enable extra info on console.
	 * @type Boolean
	 */
	var verbose = false;

	/**
	 * Shows extra info on console.
	 * @param msg The info to show. Can be multiple.
	 */
	var v = function (msg) {
		if (verbose) {
			console.log.apply(console, ["DAVNOTES"].concat(arguments));
		}
	};

	/**
	 * Instance of IDBDatabase.
	 */
	var db = null;

	/**
	 * @class An object that represents a note.
	 * @param {String} title Title of the note
	 * @param {String} text Content of the note
	 */
	this.Note = function (title, text) {
		/**
		 * Date when the note was created. It's used as an unique identifier.
		 */
		Object.defineProperty(this, 'timeStamp', {
			value: new Date().getTime(),
			writable: true,
			enumerable: true,
			configurable: false
		});

		/**
		 * Date when the note was modified for last time. For version control purposes (when sync).
		 */
		Object.defineProperty(this, 'lastModified', {
			value: new Date().getTime(),
			writable: true,
			enumerable: true,
			configurable: false
		});

		var _title = (title.trim() != "") ? title : new Date().toLocaleString();

		/**
		 * Title of the note. When changed, automatically updates lastModified.
		 */
		Object.defineProperty(this, 'title', {
			get: function () {
				v("GETting title");
				return _title;
			},
			set: function (value) {
				_title = value;
				this.lastModified = new Date().getTime();
				v("SETting title, lastModified set to " + this.lastModified);
			},
			enumerable: true,
			configurable: false
		});

		var _text = text;
		/**
		 * Content of the note. When changed, automatically updates lastModified.
		 */
		Object.defineProperty(this, 'text', {
			get: function () {
				v("GETting text");
				return _text;
			},
			set: function (value) {
				_text = value;
				this.lastModified = new Date().getTime();
				v("SETting text, lastModified set to " + this.lastModified);
			},
			enumerable: true,
			configurable: false
		});
	};

	/**
	 * Open the DAVNotes database.
	 */
	this.init = function () {
		var onUpgradeNeeded, onSuccess, onNoIDBSupport;

		idb.open(
			"DAVNotes",
			1,
			onUpgradeNeeded = function (evt) {
				var db = evt.target.result;

				evt.target.transaction.onerror = console.error;

				if (db.objectStoreNames.contains("note")) {
					db.deleteObjectStore("note");
				}

				var store = db.createObjectStore("note", {
					keyPath: "timeStamp"
				});
			},
			onSuccess = function (evt) {
				db = evt.target.result;
				davnotes.getAllNotes(davnotes.showNote);
			},
			onNoIDBSupport = function (evt) {
				alert("Your device seems to be incompatible with this application, :(");
			}
		);


		// Object containing the initialization function per screen.
		nav.whenLoading = {
			isFirstRun: true,
			"index": function () {
				// Avoiding currentToRight animation in first load.
				if (this.isFirstRun) {
					var indexStyle = document.querySelector("#index").style;
					indexStyle.zIndex = 20;
					setTimeout(function () {
						indexStyle.zIndex = "";
					}, 500);
					this.isFirstRun = false;
				}
			},
			"search": function () {
				var criteria = document.querySelector("#search-criteria");
				if (nav.previous === "#index") {
					criteria.value = "";
				}
				davnotes.getAllNotes(davnotes.filterShow, "#search-note-list");
				criteria.focus();
			},
			"viewer": function () {
				if (nav.urlParts[2]) {
					document.querySelector("#viewer-btn-edit").href = "#editor" + "=" + nav.urlParts[2];

					davnotes.getNote(nav.urlParts[2], function (note) {
						document.querySelector("#viewer-note-title").textContent = note.title;
						document.querySelector("#viewer-note-text").innerHTML = md.makeHtml(note.text).replace(/\n/g, "<br>");
						tw.parse(document.body);
					});
				}
			},
			"editor": function () {
				var title = document.getElementById("editor-note-title");
				var text = document.getElementById("editor-note-text");

				text.focus();

				if (nav.urlParts[2]) {
					davnotes.getNote(nav.urlParts[2], function (note) {
						title.value = note.title;
						text.value = note.text;
					});
				} else {
					title.value = "";
					text.value = "";
				}
			}
		};

		// Adding event listenings to buttons and inputs.
		document.querySelector('#editor-btn-save').addEventListener('click', function (evt) {
			var title = document.getElementById("editor-note-title").value.trim();
			var text = document.getElementById("editor-note-text").value;

			if (nav.previous.indexOf("viewer") > -1) { // Edit note
				davnotes.editNote(
					nav.urlParts[2],
					title,
					text
				);
				window.history.go(-2);
			} else if (nav.previous.indexOf("index") > -1) { // New note
				davnotes.addNote(new davnotes.Note(
					title,
					text
				));
				window.history.go(-1);
			}

		}, false);
		document.querySelector('#viewer-btn-delete').addEventListener('click', function (evt) {
			if (nav.urlParts[2] && confirm("Are you sure you want to delete this note?")) {
				davnotes.deleteNote(nav.urlParts[2]);
				nav.back();
			}
		}, false);
		document.querySelector("#search-clear").addEventListener("click", function (evt) {
			document.querySelector("#search-criteria").value = "";
		}, false);
		document.querySelector("#search-criteria").addEventListener("input", function (evt) {
			var crtr = evt.target.value;
			v("Search term: ", evt.target.value);
			davnotes.getAllNotes(davnotes.filterShow, "#search-note-list");
		}, false);

		var sections = document.querySelector("body").querySelectorAll("section");
		for (var i = 0; i < sections.length; i++) {
			var back = document.getElementById(sections[i].id + '-btn-back');
			if (back) {
				back.onclick = function () {
					return false;
				}; // Removing default click functionality.
				back.addEventListener("click", nav.back, false);
			}
		}

		// Setting the event listening for hash change and launching it.
		window.addEventListener("hashchange", nav.onhashchange, false);
		nav.onhashchange();

		// Twemoji configuration
		tw.base = "img/";
		tw.size = "36x36";
		tw.parse(document.body);
	};

	/**
	 * Add a Note object to the database. If success, calls davnotes.showNote().
	 * @param {Note} note
	 */
	this.addNote = function (note) {
		// Create here the note? Instead of passing it as argument that commonly seems to be a call to the constructor.
		idb.addObj(db, "note", note, function () {
			davnotes.showNote(note, true);
		});
	};

	/**
	 * Update a Note object on the database. If success, calls davnotes.showNote().
	 * @param {Note} note
	 */
	this.editNote = function (id, title, text) {
		this.getNote(
			id,
			function (note) {
				note.title = (title.trim() != "") ? title : new Date(note.timeStamp).toLocaleString();
				note.text = text;
				note.lastModified = new Date().getTime();
				idb.addObj(db, "note", note, function () {
					davnotes.showNote(note);
				});
			}
		);
	};

	/**
	 * Queries the database for finding one Note by its ID.
	 * @param {String | Number} id Identifier of the UI note element or Note.timeStamp (when the note was created).
	 */
	this.getNote = function (id, onSuccess) {
		idb.getObjById(
			db,
			"note",
			id,
			onSuccess
		);
	};

	/**
	 * Queries the database for all the Notes and shows them in the UI.
	 */
	this.getAllNotes = function (onSuccess, listID, onError) {
		listID = listID || "#index-note-list";

		var notes = document.querySelector(listID);
		notes.innerHTML = "";

		idb.getAllObj(db, "note", "prev", function (note) {
			onSuccess(note, false, listID);
		}, onError);
	};

	/**
	 * Deletes a Note from UI and database.
	 * @param {String | Number} id Identifier of the UI note element or Note.timeStamp (when the note was created).
	 */
	this.deleteNote = function (id) {
		idb.delObj(
			db,
			"note",
			id,
			function (e) {
				v("Hello");
				document.querySelector("#index-note-list").removeChild(document.getElementById("i" + id));
				davnotes.increaseCounter(-1);
				window.history.go(-2);
			}
		);
	};

	/**
	 * Shows the given Note object in the UI as a list item.
	 * If note already exists in the list, this updates it.
	 * @param {davnotes.Note} objNote
	 * @param {String} listID (optional)
	 */
	this.showNote = function (objNote, isFirstItem, listID) {
		v("Rendering Note: ", objNote, "adding first: " + isFirstItem, listID);
		if (!listID) {
			listID = "#index-note-list";
		}

		var note = document.querySelector("#" + listID.charAt(1) + objNote.timeStamp);
		if (!note) {
			var notes = document.querySelector(listID);
			note = document.createElement("li");
			note.id = listID.charAt(1) + objNote.timeStamp;
			var a = document.createElement("a");
			a.href = "#viewer" + "=" + objNote.timeStamp;
			var p = document.createElement("p");
			var t = document.createTextNode(objNote.title);

			p.appendChild(t);
			a.appendChild(p);
			note.appendChild(a);
			if (isFirstItem) {
				notes.insertBefore(note, notes.firstChild);
			} else {
				notes.appendChild(note);
			}

			if (listID === "#index-note-list") {
				davnotes.increaseCounter(1);
			}
		} else {
			note.firstChild.firstChild.textContent = objNote.title;
		}

		tw.parse(note);
	};

	this.filterShow = function (note, isFirstItem, listID) {
		var crtr = document.querySelector("#search-criteria").value;
		if (note.title.indexOf(crtr) != -1 || note.text.indexOf(crtr) != -1) {
			davnotes.showNote(note, isFirstItem, listID);
		}
	};
	/**
	 * Increase notes counter in header.
	 * @param {Number} number Number of notes no increment.
	 */
	this.increaseCounter = function (number) {
		var counter = document.querySelector("#index-total");
		counter.textContent = parseInt(counter.textContent) + number;
	}

	// Cached notes... no longer using it
	/*
  this.onbeforeunload = function() {
    var notes = document.querySelector("#index-note-list").innerHTML;
    localStorage.setItem("cached-notes", notes);
  };

  this.cachedNotes = function() {
    var cachedNotes = localStorage.getItem("cached-notes");
    if (cachedNotes) {
      document.querySelector("#index-note-list").innerHTML = cachedNotes;
    }
  };
  */
}(davIndexedDB, davNav, Markdown, twemoji); // Dependency injection! ;)

window.addEventListener("DOMContentLoaded", davnotes.init, false);

// Cached notes... no longer using it
// window.onbeforeunload = davnotes.onbeforeunload;

// Assign davNav.back() to back buttons on the page. Support for Android physical back button.

/* Quick workaround for disabling center mouse click (scroll)... Yes, I know
window.onmousedown = function(evt) {
console.log(evt);
return !(evt.buttons === 4 && evt.button === 1);
};*/
