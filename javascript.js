// Invariants:
//   - selectedColumn is the index of the closest earth rotation according to goalLongitude in selectedRow
//   - on the UI the date shown is always nasaarray[selectedRow].d
//   - on the UI the shown image is always the one pointed by selectedRow,selectedColumn

// index in nasaarray[____]
var selectedRow = nasaarray.length - 1;
// index in nasaarray[selectedrow].{i,l}[____]
var selectedColumn;
// goal of the user, starting value is Europe
var goalLongitude = 19;

var dragging = false;
var mouseX = null;
var dragColumn;

// class Preload
var preloadedImages = {}; // don't let Chrome cancel the images!
var inFlightImages = 0;
function preloadImage(row, col) {
  var url = getImageURL(row, col);
  if (!preloadedImages[url]) {
    var img = new Image();
    img.onload = function() {
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

setInterval(function () {
  if (inFlightImages > 0) {
    $("#loading").removeClass("hidden");
    $("#loading").text("Loading... (" + inFlightImages + ")");
  } else {
    $("#loading").addClass("hidden");
  }
}, 200);
// end of class

function getImageURL(row, col) {
  var mdate = moment(nasaarray[row].d, "YYYY-MM-DD");
  var imageName = nasaarray[row].i[col];
  return 'https://epic.gsfc.nasa.gov/archive/natural/'
    + mdate.format('YYYY') + '/' + mdate.format('MM') + '/' + mdate.format('DD')
    + '/jpg/' + imageName + '.jpg';
}

function getSelectedImageURL() {
  return getImageURL(selectedRow, selectedColumn);
}

function preloadImagesForRow(row) {
  for (var col = 0; col < nasaarray[row].n; col++) preloadImage(row, col);
}

function preloadCancelForRow(row) {
  for (var col = 0; col < nasaarray[row].n; col++) preloadCancelImage(row, col);
}

function preloadCancelForSelectedRow() {
  preloadCancelForRow(selectedRow);
}

// around a row
function preloadImagesForColumn(row) {
  for (var i=-5; i<=5; i++) {
    var currentRow = row + i;
    if (currentRow == row || currentRow >= nasaarray.length || currentRow < 0)
      continue;

    preloadImage(currentRow, getColumnFromLongitude(currentRow));
  }
}

var timerPreloadImagesForSelectedPoint = null;
function preloadImagesForSelectedPoint() {
  if (timerPreloadImagesForSelectedPoint) {
    clearTimeout(timerPreloadImagesForSelectedPoint);
    timerPreloadImagesForSelectedPoint = null;
  }

  timerPreloadImagesForSelectedPoint = setTimeout(function () {
    preloadImagesForRow(selectedRow);
    preloadImagesForColumn(selectedRow);
  }, 400);
}

// given a row index, gives us the best column index in that row according to goalLongitude
function getColumnFromLongitude(row) {
  // TODO: map the longitudes with Math.abs(... - ...) and then simply choose the minIndex of the array
  var longitudes = nasaarray[row].l;
  var best_earth = 0;
  var best_value = Math.abs(longitudes[best_earth] - goalLongitude)
  $.each(longitudes, function (index, earth) {
    if (Math.abs(longitudes[index] - goalLongitude) < best_value) {
      best_earth = index;
      best_value = Math.abs(longitudes[index] - goalLongitude);
    }
  });
  if (Math.abs(longitudes[best_earth] - goalLongitude) > 9) {
    console.warn("Even best image found is way off. Requested closest to %i and found %i.", goalLongitude, longitudes[best_earth]);
  }
  return best_earth;
}

function setColumnFromLongitude() {
  selectedColumn = getColumnFromLongitude(selectedRow);
}

function activateSelectedRow() {
  var selectedDate = nasaarray[selectedRow].d;
  $("#dateLabel").text(moment(selectedDate).format("YYYY MMMM DD"));

  setColumnFromLongitude();
  $("#targetImage").attr("src", getSelectedImageURL());

  preloadImagesForSelectedPoint();
}

function rotateEarthWithMouseDrag(event) {
  if (dragging) {
    mouseAt = event.pageX;
    var distance = Math.abs(mouseX - mouseAt);
    var columnWidth = $(window).width() / nasaarray[selectedRow].n;
    var noOfColsToMove = Math.floor(distance / columnWidth);
    var movingRight = mouseAt > mouseX;

    if (movingRight) {
      if ((selectedColumn + noOfColsToMove) > nasaarray[selectedRow].n) return;
    } else {
      if ((selectedColumn - noOfColsToMove) < 1) return;
    }

    dragColumn = selectedColumn;

    if (movingRight) {
      dragColumn += noOfColsToMove;
    } else {
      dragColumn -= noOfColsToMove;
    }

    goalLongitude = nasaarray[selectedRow].l[dragColumn-1];

    $("#targetImage").attr("src", getImageURL(selectedRow, dragColumn-1));

    preloadImagesForSelectedPoint();
  }
}

function selectRowWithScroll(event) {
  if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
    // scoll up
    if (selectedRow < nasaarray.length - 1) {
      preloadCancelForSelectedRow();
      selectedRow = selectedRow + 1;
      activateSelectedRow();
    }
  } else {
    // scroll down
    if (selectedRow > 0) {
      preloadCancelForSelectedRow();
      selectedRow = selectedRow - 1;
      activateSelectedRow();
    }
  }
}

$(document).ready(function () {
  // load selectedRow's image (lates day with images and rotation goalLongitude)
  activateSelectedRow();

  $(window).mousedown(function() {
    dragging = true;
    mouseX = event.pageX;
  });
  $(document).mouseup(function() {
    selectedColumn = dragColumn;
    dragging = false;
    mouseX = null;
  });
  $(window).mousemove(rotateEarthWithMouseDrag);
  // prevent default image dragging by browser
  $("#targetImage").on('dragstart', function(event) { event.preventDefault(); });

  $(window).bind('mousewheel DOMMouseScroll', selectRowWithScroll);

});
