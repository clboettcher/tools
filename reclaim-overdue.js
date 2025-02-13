// ==UserScript==
// @name         Reclaim Sum Times
// @namespace    http://tampermonkey.net/
// @version      2025-02-10
// @description  try to take over the world!
// @author       You
// @match        https://app.reclaim.ai/tasks/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reclaim.ai
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/luxon@3.5.0/build/global/luxon.min.js
// ==/UserScript==

(function() {
    'use strict';

    const menu_command_id_1 = GM_registerMenuCommand("Run", function(event) {
       run();
    }, {
        accessKey: "r",
        autoClose: true
    });

//     let intervalId = setInterval(() => {
//         GM_log('Checking');
//         let element = document.querySelector('[class*="GenericEventDetails_upcoming"] li .MuiGrid-container p');
//         if (element) {
//             console.log("Element found:", element);
//             clearInterval(intervalId); // Stop checking

//             run();
//         }
//     }, 1000);


//     GM_log("Checking started...");
})();


function run() {
    GM_log('Running');
    // elems contains dates followed by time string
    // e.g. "3 Mar", "9:00 - 11:00", ...
    const elems = [];
    document.querySelectorAll('[class*="GenericEventDetails_upcoming"] li .MuiGrid-container p').forEach(e => elems.push(e.innerHTML));

//    const rows = document.querySelectorAll('[class*="GenericEventDetails_upcoming"] li>div:first-child>div:first-child');


    const upcomingRows = document.querySelectorAll('[class*="GenericEventDetails_upcoming"]>[class*="TaskDetails_upcoming"]>div:first-child li>div:first-child>div:first-child');
    runForRows(upcomingRows);

    const pastRows = document.querySelectorAll('[class*="GenericEventDetails_upcoming"]>[class*="TaskDetails_upcoming"]>div:nth-of-type(2) li>div:first-child>div:first-child');
    runForRows(pastRows);
}

function runForRows(rows) {
    if(rows.length == 0) {
    return;
    }
    GM_log(`found ${rows.length} rows`);
    console.log(rows);

    let durationAfterDue = luxon.Duration.fromMillis(0);

    rows.forEach(row => {
        console.log('row:', row);
        const first = row.querySelector('div:nth-of-type(1)>p');
        console.log('first:', first);
        const day = first.innerHTML;
        console.log('day', day);
        const second = row.querySelector('div:nth-of-type(2)>p');
        const times = second.innerHTML;
        console.log('times', times);
        const dates = parseDates(day, times)

        const duration = getDuration(dates.start, dates.end);
        console.log('duration', prettyPrintDuration(duration));

        const parent = document.createElement('div');
        parent.className = 'MuiGrid-root MuiGrid-item reclaim-css-1wxaqej';

        const durationElem = document.createElement('p');
        durationElem.className = 'MuiTypography-root MuiTypography-body2 reclaim-css-i86sxq'
        durationElem.textContent = prettyPrintDuration(duration);
        durationElem.style.marginLeft = '10px';

        parent.appendChild(durationElem);
        row.appendChild(parent);

        const due = getDueDateTime();
        const interval = luxon.Interval.fromDateTimes(dates.start, dates.end);
        console.log('Processing interval', interval.toLocaleString(luxon.DateTime.DATETIME_SHORT));
        if(interval.isBefore(due)) {
            console.log('interval is before due');
        } else if (interval.isAfter(due)) {
            console.log('interval is after due');
            durationAfterDue = durationAfterDue.plus(interval.toDuration());
        } else if(interval.contains(due)) {
            console.log('interval contains due');
            console.log('diff start', due.diff(interval.start).toFormat('hh:mm'));
            console.log('diff end', interval.end.diff(due).toFormat('hh:mm'))
            durationAfterDue = durationAfterDue.plus(interval.end.diff(due));
        }
        console.log('---');
    });


    // console.log('totalRemainingMinutes', totalRemainingMinutes);
    //    const remainingHours = Math.floor(totalRemainingMinutes / 60);
    //  const remainingMinutes = totalRemainingMinutes % 60;

    const totalRemainingElem = document.createElement('h1');
    totalRemainingElem.textContent = 'After due: ' + durationAfterDue.toFormat('hh:mm');
    rows[0].parentNode.parentNode.parentNode.appendChild(totalRemainingElem);


/*     GM_log(`Found ${elems.length} elems`);
    GM_log(elems);

    const dateToStartAndEnd = [];

    for(let i = 0; i < elems.length - 1; i+=2) {
        const date = elems[i];
        const timeString = elems[i+1];

        GM_log(`for for date ${date} the time string ${timeString}`);
    } */
}

function parseDates(dayString, timeString) {
    console.log(`Parsing dayString '${dayString}' and timeString '${timeString}'`);

    let [startTime, endTime] = timeString.split(" - ");
    console.log(`startTime: '${startTime}', endTime: '${endTime}'`);


    // Fix dayString
    if(dayString === 'Now') {
      // Print today as "13 Feb" (see https://moment.github.io/luxon/#/parsing?id=table-of-tokens)
      dayString = luxon.DateTime.now().setLocale("en-gb").toFormat('d LLL');
    }

    // Try to parse "17 Feb 11:30"
    // Format:
    // d   = day of the month, no padding
    // MMM = month as an abbreviated localized string
    // H   = hour in 24-hour time, no padding
    // mm  = minute, padded to 2
    //
    // see https://moment.github.io/luxon/#/parsing?id=table-of-tokens
    const start = luxon.DateTime.fromFormat(dayString + ' ' + startTime, 'd MMM H:mm');
    const end = luxon.DateTime.fromFormat(dayString + ' ' + endTime, 'd MMM H:mm');
    console.log('luxon start', prettyPrintLocalDateTime(start), 'luxon end', prettyPrintLocalDateTime(end));

    return {start, end};
}

function getDuration(startDate, endDate) {
    return luxon.Interval.fromDateTimes(startDate, endDate).toDuration('minutes');
}

function prependZeroIfNeeded(hoursOrMins) {
    hoursOrMins = '' + hoursOrMins;
   if(hoursOrMins.length == 1) {
     return '0' + hoursOrMins;
   } else {
     return hoursOrMins;
   }
}

function prettyPrintTime(dateTime) {
    return dateTime.setLocale('de-DE').toLocaleString(luxon.DateTime.TIME_24_SIMPLE);
}

function prettyPrintDuration(duration) {
    const printedDuration = duration.as('milliseconds') >= 0 ? duration : duration.negate();
    return printedDuration.toFormat('hh:mm')
}

function prettyPrintLocalDate(dateTime) {
    return dateTime.setLocale('de-DE').toLocaleString(luxon.DateTime.DATE_SHORT);
}

function prettyPrintLocalDateTime(dateTime) {
    return dateTime.setLocale('de-DE').toLocaleString(luxon.DateTime.DATETIME_SHORT);
}

function getDueDateTime() {
    const dueContents = document.querySelectorAll('[class*="TaskDetails_dueContent"]');
    const dueContent = dueContents.length === 2 ? dueContents[1] : dueContents[0]; // schedule after is also classed with dueContent ...
    const dueText = dueContent.querySelector('p').textContent;


    // try parse full date
    console.log('trying to parse due text', dueText);
    const fullDateTime = luxon.DateTime.fromFormat(dueText, "EEE, d MMM 'at' HH:mm");
    if(fullDateTime.isValid) {
      return fullDateTime;
    } else {
        console.log('full date not valid, trying relative date');
        // try parse relative date, such as "Mon 15:00"
        return parseNextWeekdayTime(dueText);
    }
}

function parseNextWeekdayTime(dateStr) {
  const [dayStr, timeStr] = dateStr.split(" ");
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const targetWeekday = weekdays.indexOf(dayStr);
  if (targetWeekday === -1) throw new Error("Invalid weekday");

  const [hour, minute] = timeStr.split(":").map(Number);

  let now = luxon.DateTime.local();
  let targetDate = now.startOf("day");

  // Find the next occurrence of the target weekday
  while (targetDate.weekday !== targetWeekday) {
    targetDate = targetDate.plus({ days: 1 });
  }

  return targetDate.set({ hour, minute, second: 0, millisecond: 0 });
}

