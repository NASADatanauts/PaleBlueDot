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
var defaultGoalLongitude = 19; // starting value is Europe

//_ Global variables
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
function getImageURL(row, col, thumb) {
  var mdate = moment(nasaarray[row].d, "YYYY-MM-DD");
  var imageName = nasaarray[row].i[col];

  return 'https://nasa-kj58yy565gqqhv2gx.netdna-ssl.com/images/'
    + mdate.format('YYYY') + '/' + mdate.format('MM') + '/' + mdate.format('DD')
    + '/' + imageName + (thumb ? '-thumb' : '') + '.jpg';
}

function getRowURL(row) {
  var mdate = moment(nasaarray[row].d, "YYYY-MM-DD");

  return 'https://nasa-kj58yy565gqqhv2gx.netdna-ssl.com/images/'
    + mdate.format('YYYY') + '/' + mdate.format('MM') + '/' + mdate.format('DD')
    + '/' + mdate.format('YYYY') + '-' + mdate.format('MM') + '-' + mdate.format('DD') + '.jpg';
}

function noop() {}

var canvasSingleton = new (function CanvasSingleton() {
  var canvasContext = null; // filled by document ready

  this.setContext = (function(newContext) {
    if (canvasContext) {
      console.error("canvascontext supposed to be set only once at program start");
    }

    canvasContext = newContext;
  }).bind(this);

  this.displayImage = (function(imgEvent) {
    canvasContext.clearRect(0, 0, 1024, 1024);
    canvasContext.drawImage(imgEvent.target, 0, 0, 1024, 1024);
  }).bind(this);

  this.displayImagePart = (function(imgEvent, x, y, w, h) {
    canvasContext.clearRect(0, 0, 1024, 1024);
    canvasContext.drawImage(imgEvent.target, x, y, w, h, 0, 0, 1024, 1024);
  }).bind(this);
});

function AsyncImage(onload) {
  var self = this;
  this.onload = function (event) {
    self._phase = "loaded";
    onload(event);
  };
  this.img = null;
  this._phase = "noimage";
}

AsyncImage.prototype.cancel = function() {
  if (this.img) {
    this.img.onload = noop;
    this.img.src = "";
  }
  this._phase = "noimage";
  this.img = null;
};

AsyncImage.prototype.start = function(url, imgProps) {
  if (this.img)
    console.error("We can't start a new download before you cancel the previous one");

  this._phase = "loading";
  this.img = new Image();
  Object.assign(this.img, imgProps);
  this.img.onload = this.onload;
  this.img.src = url;
};

AsyncImage.prototype.getPhase = function() {
  return this._phase;
};

var showImageSingleton = new (function ShowImageSingleton() {
  var prevRow = null;
  var prevCol = null;

  var fullImage = new AsyncImage(canvasSingleton.displayImage);

  var onRowLoad = function(event) {
    console.log("Row load finished", event);
  };
  var rowImage = new AsyncImage(onRowLoad);

  var onThumbLoad = function(event) {
    canvasSingleton.displayImage(event);
    fullImage.start(getImageURL(event.target.row, event.target.col, false));
    if (rowImage.getPhase() === "noimage") rowImage.start(getRowURL(event.target.row));
  };

  var thumbImage = new AsyncImage(onThumbLoad);
  
  this.show = (function(row, col) {
    var rowChanged = true;
    
    if (row === prevRow && col === prevCol) return;
    prevCol = col;
    if (prevRow === row) rowChanged = false;
    prevRow = row;

    // cancel already inflight thumbnail
    thumbImage.cancel();

    // cancel already inflight full image
    fullImage.cancel();

    // cancel and forget already cached row if row changed
    if (rowChanged) rowImage.cancel();

    if (rowImage.getPhase() === "loaded") {
      canvasSingleton.displayImagePart({ target: rowImage.img }, 0, col * 256, 256, 256);
      fullImage.start(getImageURL(row, col, false));
    } else {
      thumbImage.start(getImageURL(row, col, true), { row: row, col: col });
    }

  }).bind(this);
});

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
  showImageSingleton.show(newRow, selectedColumn);
  $("#dotContainer").empty();
  for (var i = 0; i < nasaarray[newRow].n; i++) {
    $("#dotContainer").append("<label class='dot clickable'>&#x25CB</label>");
  }

  $('.dot').click(rotateEarthWithDotClick);

  highlightSelectedDot(selectedColumn, newRow);
}

function rotateEarthWithDotClick(event) {
  var indexOfDot = $('.dot').index(this);
  selectedColumn = nasaarray[selectedRow].n - indexOfDot - 1;
  gotoColumn(selectedColumn);
  pushURL();
}

function gotoColumn(newColumn) {
  goalLongitude = nasaarray[selectedRow].l[newColumn];
  showImageSingleton.show(selectedRow, newColumn);
  highlightSelectedDot(newColumn, selectedRow);
}

//_ Rotate Earth
// desktop dragdrop api -> rotateEarthAPI converter
var desktopDragToRotateEarthConverter = new (function DesktopDragToRotateEarthConverter() {
  var mouseDragColumnWidth = 100; // user has to drag this many pixels with the mouse to start rotating Earth
  var desktopHorizontalMouseAt = null;

  this.start = (function(event) {
    desktopHorizontalMouseAt = event.pageX;
  }).bind(this);

  this.move = (function(event) {
    if (desktopHorizontalMouseAt == null) return;
    rotateEarthAPI.move(Math.round((event.pageX - desktopHorizontalMouseAt) / mouseDragColumnWidth));
  }).bind(this);

  this.end = (function(event) {
    desktopHorizontalMouseAt = null;
    rotateEarthAPI.end();
  }).bind(this);
});
// end of desktop dragdrop api -> rotateEarthAPI converter

// --- Rotate API
var rotateEarthAPI = new (function RotateEarthAPI() {
  var newSelectedColumn = null;

  this.move = (function(distance) {
    newSelectedColumn = (selectedColumn + distance) % nasaarray[selectedRow].n;
    if (newSelectedColumn < 0) newSelectedColumn += nasaarray[selectedRow].n;

    gotoColumn(newSelectedColumn);
  }).bind(this);

  this.end = (function() {
    selectedColumn = newSelectedColumn;
    pushURL();
  }).bind(this);
});
// --- End of Rotate API

//_ Scroll Earth
var scrollHistoryConverter = new (function ScrollHistoryConverter() {
  var scrollEndDelay = 400; // once the user is idle, the scroll is "finished"
  var scrollDistance = 0;

  var scrollEnd = (function() {
    historyAPI.end();
    scrollDistance = 0;
  }).bind(this);

  var timerScrollEndDelayed = null;
  var scrollEndDelayed = (function() {
    if (timerScrollEndDelayed) {
      clearTimeout(timerScrollEndDelayed);
      timerScrollEndDelayed = null;
    }
    timerScrollEndDelayed = setTimeout(scrollEnd, scrollEndDelay);
  }).bind(this);

  this.scrollHandler = (function(event) {
    if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
      // scroll up
      scrollDistance += 1;
    } else {
      // scroll down
      scrollDistance -= 1;
    }
    historyAPI.move(scrollDistance);

    scrollEndDelayed();
  }).bind(this);
});

var historyAPI = new (function HistoryAPI() {
  var newSelectedRow = null;

  this.move = (function(distance) {
    this.newSelectedRow = selectedRow + distance;
    if (this.newSelectedRow < 0) this.newSelectedRow = 0;
    if (this.newSelectedRow > nasaarray.length - 1) this.newSelectedRow = nasaarray.length - 1;
    gotoRow(this.newSelectedRow);
  }).bind(this);

  this.end = (function() {
    selectedRow = this.newSelectedRow;
    pushURL();
  }).bind(this);
});

//_ TouchLib
var ourTouchLib = new (function OurTouchLib() {
  var fingerSwipeDistance = 40; // on mobile, user has to swipe this many pixels to start rotating Earth
  var inTouch = false; // can be false, "inprogress", then "horizontal" or "vertical"
  var baseX = null;
  var baseY = null;

  this.main = (function (handlers) {
    return function(event) {
      if (event.touches.length > 0) {
	if (inTouch === false) {
	  inTouch = "inprogress";
	  baseX = event.touches[0].screenX;
	  baseY = event.touches[0].screenY;
	}

	if (inTouch === "inprogress") {
	  if (Math.abs(event.touches[0].screenX - baseX) > (fingerSwipeDistance / 2)) {
  	    inTouch = "horizontal";
	  } else if (Math.abs(event.touches[0].screenY - baseY) > (fingerSwipeDistance / 2)) {
  	    inTouch = "vertical";
	  }
	}

	if (inTouch === "horizontal") {
	  var move = Math.round((event.touches[0].screenX - baseX) / fingerSwipeDistance);
	  handlers.horizontalMove(move);
	}

	if (inTouch === "vertical") {
	  var move = Math.round((event.touches[0].screenY - baseY) / fingerSwipeDistance);
	  handlers.verticalMove(move);
	}
      }

      // 0 means that no finger is touching the screen => swipe ended
      if (event.touches.length === 0) {
	var prevInTouch = inTouch;
	inTouch = false;
	baseX = null;
	baseY = null;
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
  }).bind(this);
});

//_ Main
function absorbEvent(event) {
  event.preventDefault();
  return false;
}

$(document).ready(function () {
  // used by showImageSingleton.show
  canvasSingleton.setContext($("#targetImage")[0].getContext('2d'));

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
  $("#imageContainer").mousedown(desktopDragToRotateEarthConverter.start);
  $("#imageContainer").mousemove(desktopDragToRotateEarthConverter.move);
  $("#imageContainer").mouseup(desktopDragToRotateEarthConverter.end);

  // scrolling vertically with mouse
  $(window).bind('mousewheel DOMMouseScroll', scrollHistoryConverter.scrollHandler);

  // swiping vertically/horizontally with finger on mobile
  imgs = $("#imageContainer").bind('touchstart touchend touchcancel touchmove',
  				   ourTouchLib.main(
				     {
				       horizontalMove: rotateEarthAPI.move,
				       horizontalEnd: rotateEarthAPI.end,
				       verticalMove: historyAPI.move,
				       verticalEnd: historyAPI.end
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
