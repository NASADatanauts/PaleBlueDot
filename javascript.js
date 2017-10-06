// Invariants:
//   - selectedColumn is the index of the closest earth rotation according to goalLongitude in selectedRow
//   - on the UI the date shown is always nasaarray[selectedRow].d
//   - on the UI the shown image is always the one pointed by selectedRow,selectedColumn in nasaarray

// nasaarray is a global variable coming from a javascript file that
// is loaded via script src before this file, this contains the data
// about the available images.

// Every item in nasaarray represents one day and is a dictionary of:
//   n: the number of earth images (with different rotation) this day
//   d: date
//   i: list of image urls (size n)
//   l: list of longitudesx (size n)
// nasaarray is ordered ascending by d.

// Settings
var userIdleDelay = 400; // once the user is idle, we start caching and we push the URL history
var cacheNearRows = 5;
var loadingDisplayInterval = 200; // TODO: remove precaching
var mouseDragColumnWidth = 100; // user has to drag this many pixels with the mouse to start rotating Earth
var fingerSwipeColumnWidth = 40; // on mobile, this is the swipe width of one column rotation
var defaultGoalLongitude = 19; // starting value is Europe

// Global variables
// index in nasaarray[____]
var selectedRow = nasaarray.length - 1;
// index in nasaarray[selectedrow].{i,l}[____]
var selectedColumn;
// goal longitude of the user
var goalLongitude;

// TODO: is this different on desktop?
// While finger swipe is in progress (on mobile), it stores the currently shown column's
// id (earth rotation). The variable 'selectedColumn' is updated with this value when the
// swipe ends.
var newSelectedColumn;

// selectedCenterDragMouseX is not null if and only if dragging is in progress.
// When dragging is in progress, it stores the X coordinate of the mouse on the
// screen for which the currently selectedColumn is exactly in the middle.
var selectedCenterDragMouseX = null;

// class Preload
var preloadedImages = {}; // don't let Chrome cancel the images!
var inFlightImages = 0;
function preloadImage(row, col) {
  var url = getImageURL(row, col);
  if (!preloadedImages[url]) {
    var img = new Image();
    img.onload = function() {
      // We set preloadedImages back to undefined even on successful
      // load, because this way if the image gets out of disk cache
      // (which we have no idea of), the next time we preload it
      // again.  If it's still in the disk cache, then this
      // unnecessary preload is fast anyway.
      preloadedImages[url] = undefined;
      inFlightImages--;
    }
    img.onabort = function() {
      inFlightImages--;
    }
    img.onerror = img.onabort;
    inFlightImages++;
    img.src = url;
    preloadedImages[url] = img;
  }
}

function preloadCancelImage(row, col) {
  var url = getImageURL(row, col);
  var pre = preloadedImages[url];
  if (pre) {
    pre.src = "http://placekitten.com/200/300";
    preloadedImages[url] = undefined;
  }
}

// This is like a thread a little bit.
setInterval(function () {
  if (inFlightImages > 0) {
    $("#loading").removeClass("hidden");
    $("#loading").text("Loading... (" + inFlightImages + ")");
  } else {
    $("#loading").addClass("hidden");
  }
}, loadingDisplayInterval);
// end of class

function getImageURL(row, col) {
  var mdate = moment(nasaarray[row].d, "YYYY-MM-DD");
  var imageName = nasaarray[row].i[col];
  return 'https://epic.gsfc.nasa.gov/archive/natural/'
    + mdate.format('YYYY') + '/' + mdate.format('MM') + '/' + mdate.format('DD')
    + '/jpg/' + imageName + '.jpg';
}

function preloadImagesForSelectedRow() {
  // we preload the whole current row horizontally
  for (var col = 0; col < nasaarray[selectedRow].n; col++) preloadImage(selectedRow, col);

  // vertically, we preload +-5 images for the current column
  for (var currentRow = selectedRow - cacheNearRows;
       currentRow <= selectedRow + cacheNearRows;
       currentRow++) {
    if (currentRow == selectedRow || currentRow >= nasaarray.length || currentRow < 0)
      continue;

    preloadImage(currentRow, getColumnFromLongitude(currentRow));
  }
}

function preloadCancelForSelectedRow() {
  // we only cancel horizontally
  for (var col = 0; col < nasaarray[selectedRow].n; col++) preloadCancelImage(selectedRow, col);
}

var timerPreloadImagesForSelectedPoint = null;
function preloadImagesForSelectedPoint() {
  if (timerPreloadImagesForSelectedPoint) {
    clearTimeout(timerPreloadImagesForSelectedPoint);
    timerPreloadImagesForSelectedPoint = null;
  }

  timerPreloadImagesForSelectedPoint = setTimeout(preloadImagesForSelectedRow, userIdleDelay);
}

// given a row index, gives us the best column index in that row according to goalLongitude
function getColumnFromLongitude(row) {
  var longitudes = nasaarray[row].l;
  var longitudeDistances = $.map(longitudes,
				 function(value) {
				   return Math.min(Math.abs(value - goalLongitude), 360 - Math.abs(value - goalLongitude));
				 });
  return longitudeDistances.indexOf(Math.min(...longitudeDistances));
}

function highlightSelectedDot(col) {
  // remove previously highlighted
  $(".highlighted").removeClass("highlighted");

  // add the new one
  $("#dotContainer label:nth-of-type(" + (nasaarray[selectedRow].n - col) + ")").addClass('highlighted');
}

function getRowFromDate(date) {
  for (var i = nasaarray.length - 1; i >= 0; --i) {
    if (nasaarray[i].d <= date) {
      return i;
    }
  }
  return 0;
}

RedirectType = {
  IMMEDIATE_REPLACE: 0, // replace the current history entry, e.g. because it was faulty
  IMMEDIATE_PUSH: 1,    // push the history, immediately (user is navigating with clicks)
  DELAYED_PUSH: 2       // push the history if no further delayed pushes (user is navigating with scrolling)
};

function activateByURL(hash, replace) {
  // TODO: use a regex which checks the format AND splits out the parts
  // something like this: ^#([0-9]{4}-[0-9]{2}-[0-9]{2})[:/]([0-9.]+)$
  // if no match -> error
  // var date = matchobj.part(0)
  // var longits = matchobj.part(1)
  // var longit = float(longits); // and if this float is not correct -> error
  // in case of error: set a correct hash
  var date = hash.substring(1, 11);
  var longits = hash.substring(12);
  var longit = Number(longits);

  // TODO: something more complicated here:
  //   - if date is good, but longits is bad, then go to date + defaultGoalLongitude
  //   - if both is bad, then use the current solution
  if (!longits || longits === "" || Number.isNaN(longit)) {
    date = nasaarray[nasaarray.length-1].d;
    longit = defaultGoalLongitude;
  }
  
  selectedRow = getRowFromDate(date);
  goalLongitude = longit;
  if (replace) {
    activateSelectedRow(RedirectType.IMMEDIATE_REPLACE);
  } else {
    activateSelectedRow(RedirectType.IMMEDIATE_PUSH);
  }
}

function activateSelectedRow(redirectType) {
  selectedColumn = getColumnFromLongitude(selectedRow);

  $("#dateLabel").text(moment(nasaarray[selectedRow].d).format("YYYY MMMM DD"));
  $("#targetImage").attr("src", getImageURL(selectedRow, selectedColumn));
  $("#dotContainer").empty();
  for (var i = 0; i < nasaarray[selectedRow].n; i++) {
    $("#dotContainer").append("<label class='dot clickable'>&#x25CB</label>");
  }

  $('.dot').click(function() {
    rotateEarthWithDotClick($('.dot').index(this));
  });
  
  highlightSelectedDot(selectedColumn);
  
  preloadImagesForSelectedPoint();
  if (redirectType === RedirectType.IMMEDIATE_REPLACE) {
    replaceURL();
  } else if (redirectType === RedirectType.IMMEDIATE_PUSH) {
    pushURL();
  } else if (redirectType === RedirectType.DELAYED_PUSH) {
    pushURLonScroll();
  } else {
    console.error("invalid redirecttype");
  }
}

function rotateEarthWithMouseDrag(mouseAt) {
  var distance = mouseAt - selectedCenterDragMouseX;
  var columnWidth = mouseDragColumnWidth;
  var noOfColsToMove = Math.round(distance / columnWidth);
  var newColumn = selectedColumn + noOfColsToMove;
  if (newColumn == selectedColumn) return;
  if (newColumn >= nasaarray[selectedRow].n || newColumn < 0) return;

  selectedCenterDragMouseX += (newColumn - selectedColumn) * mouseDragColumnWidth;
  selectedColumn = newColumn;

  gotoColumn(selectedColumn);
  // URL is updated only on mouseup, so we don't pollute the history
}

function rotateEarthWithDotClick(indexOfDot) {
  selectedColumn = nasaarray[selectedRow].n - indexOfDot - 1;

  gotoColumn(selectedColumn);

  pushURL();
}

function pushURL() {
  var basename = window.location.pathname;
  window.history.pushState(null, "", basename + "#" + nasaarray[selectedRow].d + "/" + goalLongitude);
}

function replaceURL() {
  var basename = window.location.pathname;
  window.history.replaceState(null, "", basename + "#" + nasaarray[selectedRow].d + "/" + goalLongitude);
}

// push URL to history after a timeout
var timerPushURLonScroll = null;
function pushURLonScroll() {
  if (timerPushURLonScroll) {
    clearTimeout(timerPushURLonScroll);
    timerPushURLonScroll = null;
  }

  timerPushURLonScroll = setTimeout(pushURL, userIdleDelay);
}

function gotoRow(newRow) {
  if (newRow < nasaarray.length && newRow >= 0) {
    preloadCancelForSelectedRow();
    selectedRow = newRow;
    activateSelectedRow(RedirectType.DELAYED_PUSH);
  }
}

function gotoColumn(newColumn) {
  goalLongitude = nasaarray[selectedRow].l[newColumn];
  $("#targetImage").attr("src", getImageURL(selectedRow, newColumn));
  highlightSelectedDot(newColumn);
}

function selectRowWithScroll(event) {
  if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
    // scroll up
    gotoRow(selectedRow + 1);
  } else {
    // scroll down
    gotoRow(selectedRow - 1);
  }
}

function rotateEarthWithSwipe(event, phase, direction, distance) {
  if (phase == "end") {
    selectedColumn = newSelectedColumn;
    pushURL();
    return;
  }

  if (direction == "left") {
    newSelectedColumn = selectedColumn - Math.round(distance / fingerSwipeColumnWidth);
    if (newSelectedColumn < 0) newSelectedColumn = 0;
    gotoColumn(newSelectedColumn);
    return;
  }

  if (direction == "right") {
    newSelectedColumn = selectedColumn + Math.round(distance / fingerSwipeColumnWidth);
    if (newSelectedColumn >= nasaarray[selectedRow].n) newSelectedColumn = nasaarray[selectedRow].n - 1;
    gotoColumn(newSelectedColumn);
    return;
  }
}

function isThereTouchOnDevice() {
  try {
    document.createEvent("TouchEvent");
    return true;
  } catch(e) {
    return false;
  }
}

// prevent default image highlight and context menu on mobile
function absorbEvent_(event) {
  return false;
}

function preventLongPressMenu(node) {
  node.ontouchstart = absorbEvent_;
  node.ontouchmove = absorbEvent_;
  node.ontouchend = absorbEvent_;
  node.ontouchcancel = absorbEvent_;
}

function preventImageDraggingOnTouchScreen() {
  preventLongPressMenu(document.getElementById('targetImage'));
}

$(document).ready(function () {
  // Check if there is a specific path and load Earth accordingly
  var startHash = window.location.hash;
  if (!startHash) {
    startHash = "#" + nasaarray[nasaarray.length-1].d + "/" + defaultGoalLongitude;
  }
  activateByURL(startHash, true);

  // Catch path editing
  window.onpopstate = function () {
    activateByURL(window.location.hash, true);
  };

  // dragging horizontally with mouse
  $("#imageContainer").mousedown(function() {
    selectedCenterDragMouseX = event.pageX;
  });

  $("#imageContainer").mousemove(function() {
    if (selectedCenterDragMouseX == null) return;
    rotateEarthWithMouseDrag(event.pageX);
  });

  $("#imageContainer").mouseup(function() {
    selectedCenterDragMouseX = null;
    preloadImagesForSelectedPoint();
    pushURL();
  });

  // scrolling vertically with mouse
  $(window).bind('mousewheel DOMMouseScroll', selectRowWithScroll);

  // Swipe on mobile
  if (isThereTouchOnDevice() == true) {
    var swipeOptions = {
      triggerOnTouchEnd: true,
      swipeStatus: rotateEarthWithSwipe,
      allowPageScroll: "vertical",
      threshold: -1 // this makes sure that swipe phase "end" is always called
      // (there is no "canceled" swipe because of threshold)
    }

    $(function() {
      imgs = $("#imageContainer");
      imgs.swipe(swipeOptions);
    });
  }

  // prevent default image dragging by browser
  $("#targetImage").on('dragstart', function(event) { event.preventDefault(); }); // for desktop
  preventImageDraggingOnTouchScreen(); // for mobile

  $('#question-mark').hover(function() {
    $('#help-question').toggle("slide");
  });

  $('#dateLabel').click(function() {
    activateByURL("#" + nasaarray[nasaarray.length-1].d + "/" + goalLongitude, false);
  });

  $('#satellite-icon').hover(function() {
    $('#help-satellite').toggle("slide");
  });

  $('#dateUp').click(function() {
    if (selectedRow < nasaarray.length - 1) {
      activateByURL("#" + nasaarray[selectedRow + 1].d + "/" + goalLongitude, false);
    }
  });

  $('#dateDown').click(function() {
    if (selectedRow > 0) {
      activateByURL("#" + nasaarray[selectedRow - 1].d + "/" + goalLongitude, false);
    }
  });

});
