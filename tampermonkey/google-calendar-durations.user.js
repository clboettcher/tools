// ==UserScript==
// @name         Google Calendar Zeitspannen-Summierer
// @description  Berechnet die Dauer von von-bis Zeitangaben im Google Calendar und fügt sie in Klammern hinzu.
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       https://github.com/clboettcher
// @match        https://calendar.google.com/*
// @grant        none
// @run-at       document-idle
// @downloadUrl  https://github.com/clboettcher/tools/raw/refs/heads/main/tampermonkey/google-calendar-durations.user.js
// @updateUrl    https://github.com/clboettcher/tools/raw/refs/heads/main/tampermonkey/google-calendar-durations.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Sucht nach "HH:MM bis HH:MM" oder "HH:MM - HH:MM".
    // Der hintere Teil (?!...) stellt sicher, dass nicht bereits berechnete Werte nochmals verarbeitet werden.
    const regex = /(\d{1,2}):(\d{2})\s*(?:bis|-)\s*(\d{1,2}):(\d{2})(?!\s*\(\d{2}:\d{2}\))/gi;

    function calculateDuration(match, h1, m1, h2, m2) {
        let start = parseInt(h1, 10) * 60 + parseInt(m1, 10);
        let end = parseInt(h2, 10) * 60 + parseInt(m2, 10);

        // Falls die Endzeit am nächsten Tag liegt (z.B. 23:00 bis 01:30)
        if (end < start) {
            end += 24 * 60;
        }

        const diff = end - start;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');

        return `${match} (${formattedHours}:${formattedMinutes})`;
    }

    function processTextNodes(element) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (regex.test(node.nodeValue)) {
                regex.lastIndex = 0; // Reset wegen globalem 'g' Flag im Regex
                node.nodeValue = node.nodeValue.replace(regex, calculateDuration);
            }
        }
    }

    // MutationObserver überwacht dynamische Änderungen im Google Calendar (z.B. Wochenwechsel)
    let timeout = null;
    const observer = new MutationObserver(() => {
        // Debounce: Verhindert, dass das Skript bei jeder winzigen CSS-Änderung feuert
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            observer.disconnect(); // Kurz abschalten, um Endlosschleifen bei eigener Textänderung zu vermeiden
            processTextNodes(document.body);
            observer.observe(document.body, { childList: true, subtree: true });
        }, 150);
    });

    // Initialer Start
    processTextNodes(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
})();
