/**
 * A IndexedDB Connector library for JavaScript.
 * Compatibility: http://caniuse.com/#search=storage
 * For better browser compatibility, use IndexedDBShim or any other IndexedDB-WebSQL adapter
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

if (cf.roboe.davIndexedDB !== undefined) {
	throw 'Class name cf.roboe.davNav already taken.';
}

cf.roboe.davIndexedDB = function () {
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
	this.v = function (msg) {
		if (verbose) {
			console.log.apply(console, ["DAVINDEXEDDB"].concat(arguments));
		}
	};

	/**
	 * Handles the opening of the database.
	 */
	this.open = function (dbName, dbVersion, onUpgradeNeeded, onSuccess, onNoIDBSupport) {

		// Supporting prefixed indexedDBs
		if (!window.indexedDB) window.indexedDB = window.webkitIndexedDB || window.msIndexedDB || window.mozIndexedDB;
		if (!window.IDBTransaction) window.IDBTransaction = window.webkitIDBTransaction || window.msIDBTransaction; // Mozilla has never
		if (!window.IDBKeyRange) window.IDBKeyRange = window.webkitIDBKeyRange || window.msIDBKeyRange; // prefixed window.mozIDB*

		if (window.indexedDB && window.IDBTransaction && window.IDBKeyRange) {
			if (!dbVersion) dbVersion = 1;
			var request = window.indexedDB.open(dbName, dbVersion);

			/**
			 * Catches the event when database version differs, and upgrades the database.
			 * @param {Object} e Event
			 */
			request.onupgradeneeded = onUpgradeNeeded;

			/**
			 * Catches the event when database is opened with success.
			 * @param {Object} e Event
			 */
			request.onsuccess = onSuccess;

			/**
			 * Catches the error event.
			 * @param {Object} e Event
			 */
			request.onerror = function (e) {
				console.error("Error opening database:", e);
			};
		} else if (onNoIDBSupport) {
			onNoIDBSupport();
		} else {
			console.error("Browser does not have support for IndexedDB.");
		}
	};

	/**
	 * Add new object, or update existing one if key already exists.
	 */
	this.addObj = function (database, objectStore, object, onSuccess, onError) {
		var db = database;
		var trans = db.transaction([objectStore], "readwrite");
		var store = trans.objectStore(objectStore);
		var request = store.put(object);

		/**
		 * Catches the success event.type.
		 * @param {Object} evt Event
		 */
		request.onsuccess = onSuccess || function (evt) {
			davIndexedDB.v("Object added without onsuccess callback:", evt);
		};

		/**
		 * Catches the error event.type.
		 * @param {Object} e Event
		 */
		request.onerror = onError || function (evt) {
			console.error("Error adding: ", evt);
		};
	};

	/**
	 * Delete an object by its key.
	 */
	this.delObj = function (database, objectStore, objectId, onSuccess, onError) {
		var db = database;
		var trans = db.transaction([objectStore], "readwrite");
		var store = trans.objectStore(objectStore);

		var request = store.delete(parseInt(objectId));

		request.onsuccess = onSuccess || function (evt) {
			davIndexedDB.v("Object removed without onsuccess callback:", evt);
		};;

		request.onerror = onError || function (e) {
			console.error("Error deleting: ", e);
		};
	};

	/** TODO ifNOtFOund really working?
	 * Queries the database by an object key (objectId).
	 */
	this.getObjById = function (database, objectStore, objectId, onSuccess, ifNotFound) {
		var db = database;
		var trans = db.transaction([objectStore], "readwrite");
		var store = trans.objectStore(objectStore);

		var keyRange = IDBKeyRange.only(parseInt(objectId));
		var cursorRequest = store.openCursor(keyRange);
		var found = false;

		cursorRequest.onsuccess = function (evt) {
			var result = evt.target.result;
			if (!!result == false) { // Same as "result === false || result === undefined" ????
				if (!found && ifNotFound) ifNotFound();
				return;
			} else {
				found = true;
				if (onSuccess) onSuccess(result.value);
			}
		};

		cursorRequest.onerror = function (e) {
			console.error("Error getting stored notes:", e);
		};
	};

	/**
	 * Queries the database for all the objects that should be treated separatedly on the onSuccess callback.
	 * TODO this is dangerous for really big DBs and should (in the future) do consecutive calls using bookmark keys.
	 */
	this.getAllObj = function (database, objectStore, cursorDirection, onSuccess, onError) {
		var db = database;
		var trans = db.transaction([objectStore], "readwrite");
		var store = trans.objectStore(objectStore);

		var cursorRequest = store.openCursor(IDBKeyRange.lowerBound(0), cursorDirection || "next");

		cursorRequest.onsuccess = function (evt) {
			var result = evt.target.result;
			if (!!result == false) { // Same as "result === false || result === undefined" ????
				return;
			}

			if (onSuccess) onSuccess(result.value);
			result.continue();
		};

		cursorRequest.onerror = onError || function (e) {
			console.error("Error getting stored notes:", e);
		};
	};
};
