//_ Comments
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

//_ Settings
var mouseDragColumnWidth = 100; // user has to drag this many pixels with the mouse to start rotating Earth
var fingerSwipeDistance = 40; // on mobile, user has to swipe this many pixels to start rotating Earth
var defaultGoalLongitude = 19; // starting value is Europe

// Global variables
// index in nasaarray[____]
var selectedRow = nasaarray.length - 1;
// index in nasaarray[selectedRow].{i,l}[____]
var selectedColumn;
// goal longitude of the user
var goalLongitude;

//_ nasaarray accessor functions
// given a row index, gives us the best column index in that row according to goalLongitude
function getColumnFromLongitude(row) {
  var longitudes = nasaarray[row].l;
  var longitudeDistances = $.map(longitudes,
				 function(value) {
				   return Math.min(Math.abs(value - goalLongitude), 360 - Math.abs(value - goalLongitude));
				 });
  return longitudeDistances.indexOf(Math.min(...longitudeDistances));
}

function getRowForDate(date) {
  for (var i = nasaarray.length - 1; i >= 0; --i) {
    if (nasaarray[i].d <= date) {
      return i;
    }
  }
  return 0;
}

//_ URL handling
var canvasContext = null; // filled by document ready
function noop() {};
lastImage = null;
function showImage(row, col) {
  if (lastImage) {
    lastImage.onload = noop;
    lastImage.src = "";
  }

  var newimage = new Image();

  var mdate = moment(nasaarray[row].d, "YYYY-MM-DD");
  var imageName = nasaarray[row].i[col];
  newimage.onload = function() {
    canvasContext.clearRect(0, 0, 1024, 1024);
    canvasContext.drawImage(newimage, 0, 0, 1024, 1024);
  }

  newimage.src = 'https://nasa-kj58yy565gqqhv2gx.netdna-ssl.com/images/'
    + mdate.format('YYYY') + '/' + mdate.format('MM') + '/' + mdate.format('DD')
    + '/' + imageName + '.jpg';

  lastImage = newimage;
}

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

  selectedRow = getRowForDate(date);
  goalLongitude = longit;
  gotoRow(selectedRow);
  if (replace) {
    replaceURL()
  } else {
    pushURL();
  }
}

function generateURL() {
  return window.location.pathname + "#" + nasaarray[selectedRow].d + "/" + goalLongitude;
}

function pushURL() {
  window.history.pushState(null, "", generateURL());
}

function replaceURL() {
  window.history.replaceState(null, "", generateURL());
}

//_ UI change
function highlightSelectedDot(col, row) {
  // remove previously highlighted
  $(".highlighted").removeClass("highlighted");

  // add the new one
  $("#dotContainer label:nth-of-type(" + (nasaarray[row].n - col) + ")").addClass('highlighted');
}

function gotoRow(newRow) {
  selectedColumn = getColumnFromLongitude(newRow);

  $("#dateLabel").text(moment(nasaarray[newRow].d).format("YYYY MMMM DD"));
  showImage(newRow, selectedColumn);
  $("#dotContainer").empty();
  for (var i = 0; i < nasaarray[newRow].n; i++) {
    $("#dotContainer").append("<label class='dot clickable'>&#x25CB</label>");
  }

  $('.dot').click(function() {
    rotateEarthWithDotClick($('.dot').index(this));
  });

  highlightSelectedDot(selectedColumn, newRow);
}

function rotateEarthWithDotClick(indexOfDot) {
  selectedColumn = nasaarray[selectedRow].n - indexOfDot - 1;
  gotoColumn(selectedColumn);
  pushURL();
}

function gotoColumn(newColumn) {
  goalLongitude = nasaarray[selectedRow].l[newColumn];
  showImage(selectedRow, newColumn);
  highlightSelectedDot(newColumn, selectedRow);
}

//_ Rotate earth
// desktop dragdrop api -> rotateEarthApi converter
var desktopHorizontalMouseAt = null;
function desktopHorizontalDragStart(mouseAt) {
  desktopHorizontalMouseAt = mouseAt;
}

function desktopHorizontalDragMove(mouseAt) {
  if (desktopHorizontalMouseAt == null) return;
  rotateEarthAPIMove(Math.round((mouseAt - desktopHorizontalMouseAt) / mouseDragColumnWidth));
}

function desktopHorizontalDragEnd(mouseAt) {
  desktopHorizontalMouseAt = null;
  rotateEarthAPIEnd((mouseAt - desktopHorizontalMouseAt) / mouseDragColumnWidth);
}
// end of desktop dragdrop api -> rotateEarthApi converter

// --- Rotate API with it's own global variable
var newSelectedColumn;
function rotateEarthAPIMove(distance) {
  newSelectedColumn = selectedColumn + distance;
  if (newSelectedColumn < 0) newSelectedColumn = 0;
  if (newSelectedColumn > nasaarray[selectedRow].n - 1) newSelectedColumn = nasaarray[selectedRow].n - 1;
  gotoColumn(newSelectedColumn);
}

function rotateEarthAPIEnd() {
  selectedColumn = newSelectedColumn;
  pushURL();
}
// --- End of Rotate API

//_ Scroll earth
// --- Scroll -> history API converter
var scrollEndDelay = 400; // once the user is idle, the scroll is "finished"
var scrollDistance = 0;

function scrollEnd() {
  historyAPIEnd();
  scrollDistance = 0;
}

var timerScrollEndDelayed = null;
function scrollEndDelayed() {
  if (timerScrollEndDelayed) {
    clearTimeout(timerScrollEndDelayed);
    timerScrollEndDelayed = null;
  }
  timerScrollEndDelayed = setTimeout(scrollEnd, scrollEndDelay);
}

function scrollHandler(event) {
  if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
    // scroll up
    scrollDistance += 1;
  } else {
    // scroll down
    scrollDistance -= 1;
  }
  historyAPIMove(scrollDistance);

  scrollEndDelayed();
}
// --- End of Scroll -> history API converter

// --- Vertical history API with it's own global variable
var newSelectedRow;
function historyAPIMove(distance) {
  newSelectedRow = selectedRow + distance;
  if (newSelectedRow < 0) newSelectedRow = 0;
  if (newSelectedRow > nasaarray.length - 1) newSelectedRow = nasaarray.length - 1;
  gotoRow(newSelectedRow);
}

function historyAPIEnd() {
  selectedRow = newSelectedRow;
  pushURL();
}
// --- End of Rotate API

//_ TouchLib
// --- beginning of our touch lib
var ourTouchLibState = {
  inTouch: false, // can be false, "inprogress", then "horizontal" or "vertical"
  baseX: null,
  baseY: null
};

function ourTouchLib(handlers) {
  return function(event) {
    // console.log("touch event", event.type, event.touches.length,
    // 	      (event.touches[0] ? event.touches[0].pageX : "no touch"),
    // 	      (event.touches[0] ? event.touches[0].pageY : "no touch"));

    if (event.touches.length > 0) {
      if (ourTouchLibState.inTouch === false) {
	ourTouchLibState.inTouch = "inprogress";
	ourTouchLibState.baseX = event.touches[0].screenX;
	ourTouchLibState.baseY = event.touches[0].screenY;
      }

      if (ourTouchLibState.inTouch === "inprogress") {
	if (Math.abs(event.touches[0].screenX - ourTouchLibState.baseX) > (fingerSwipeDistance / 2)) {
  	  ourTouchLibState.inTouch = "horizontal";
	} else if (Math.abs(event.touches[0].screenY - ourTouchLibState.baseY) > (fingerSwipeDistance / 2)) {
  	  ourTouchLibState.inTouch = "vertical";
	}
      }

      if (ourTouchLibState.inTouch === "horizontal") {
	var move = Math.round((event.touches[0].screenX - ourTouchLibState.baseX) / fingerSwipeDistance);
	handlers.horizontalMove(move);
      }

      if (ourTouchLibState.inTouch === "vertical") {
	var move = Math.round((event.touches[0].screenY - ourTouchLibState.baseY) / fingerSwipeDistance);
	handlers.verticalMove(move);
      }
    }

    if (event.touches.length === 0) {
      var prevInTouch = ourTouchLibState.inTouch;
      ourTouchLibState.inTouch = false;
      ourTouchLibState.baseX = null;
      ourTouchLibState.baseY = null;
      if (prevInTouch === "horizontal") {
	handlers.horizontalEnd();
	return false;
      }

      if (prevInTouch === "vertical") {
	handlers.verticalEnd();
	return false;
      }
    }

    // Allow default processing of clicks if they are not part of a valid swipe.
    return true;
  }
}
// --- end of our touch lib

//_ Main
function absorbEvent(event) {
  event.preventDefault();
  return false;
}

$(document).ready(function () {
  // used by showImage
  canvasContext = $("#targetImage")[0].getContext('2d');

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
  $("#imageContainer").mousedown(function(event) {
    desktopHorizontalDragStart(event.pageX);
  });

  $("#imageContainer").mousemove(function(event) {
    desktopHorizontalDragMove(event.pageX);
  });

  $("#imageContainer").mouseup(function(event) {
    desktopHorizontalDragEnd(event.pageX);
  });

  // scrolling vertically with mouse
  $(window).bind('mousewheel DOMMouseScroll', scrollHandler);

  imgs = $("#imageContainer").bind('touchstart touchend touchcancel touchmove',
  				   ourTouchLib(
				     {
				       horizontalMove: rotateEarthAPIMove,
				       horizontalEnd: rotateEarthAPIEnd,
				       verticalMove: historyAPIMove,
				       verticalEnd: historyAPIEnd
				     }
				   ));

  // prevent image selection on mobile
  var node = $('#targetImage')[0];
  node.ontouchstart = absorbEvent;
  node.ontouchmove = absorbEvent;
  node.ontouchend = absorbEvent;
  node.ontouchcancel = absorbEvent;

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

//_ Emacs vars
// Local Variables:
// mode: javascript
// allout-layout: (0 :)
// eval: (allout-mode)
// End:
