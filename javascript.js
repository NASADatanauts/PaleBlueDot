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
//   l: list of longitudes (size n)
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

// avoids the usage of an unnecessary date library
var monthNames = ["January", "February", "March", "April", "May", "June", "July",
		  "August", "September", "October", "November", "December"];

// start debug with .../pd/debug_location
var debug_location = "";
// store download times in these
var ms_big_image = new DownloadTimeCollector("big_image", 30);
var ms_thumbnail = new DownloadTimeCollector("thumbnail", 50);
var ms_daily_concat = new DownloadTimeCollector("daily_concat", 10);

//_ nasaarray accessor functions
// given a row index, gives us the best column index in that row according to goalLongitude
function getColumnFromLongitude(row) {
  var longitudes = nasaarray[row].l;
  var longitudeDistances = $.map(longitudes,
				 function(value) {
				   return Math.min(Math.abs(value - goalLongitude), 360 - Math.abs(value - goalLongitude));
				 });
  return longitudeDistances.indexOf(Math.min.apply(null, longitudeDistances));
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
  var date = nasaarray[row].d.split("-");
  var imageName = nasaarray[row].i[col];

  return 'https://nasa-kj58yy565gqqhv2gx.netdna-ssl.com/images/'
    + date[0] + '/' + date[1] + '/' + date[2] + '/' + imageName + (thumb ? '-thumb' : '') + '.jpg';
}

function getRowURL(row) {
  var date = nasaarray[row].d.split("-");

  return 'https://nasa-kj58yy565gqqhv2gx.netdna-ssl.com/images/'
    + date[0] + '/' + date[1] + '/' + date[2] + '/' + nasaarray[row].d + '.jpg';
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

function eventTypesArray(imageName) {
  if (imageName.indexOf("thumb") > 0) {
    return ms_thumbnail;
  } else if (imageName.indexOf("epic_1b") > 0) {
    return ms_big_image;
  } else if ((imageName.indexOf("-") > 0) && (imageName.indexOf("jpg") > 0)) {
    return ms_daily_concat;
  } else {
    console.error("Program error: There is no event type for image name: ", imageName);
  }
}

function AsyncImage(onload) {
  var self = this;

  this.downloadStartTime = null;

  // If we were to make this function a proper class function in
  // prototype, then we would have to remember the onload parameter,
  // because that is different for constructor call.  Therefore it
  // would not be a big speedup and it's just easier to declare a new
  // onload function here for every instance.
  this.onload = function (event) {
    self._phase = "loaded";
    var downloadEndTime = new Date().getTime();
    var statisticsToPush = eventTypesArray(this.src);
    statisticsToPush.addData(downloadEndTime - self.downloadStartTime);
    trackJs.console.log({ "image name": this.src,
			  "download time (ms)": downloadEndTime - self.downloadStartTime });
    onload(event);
  };
  this.img = null;
  this._phase = "noimage";
}

AsyncImage.prototype.cancel = function() {
  if (this.img) {
    this.img.onload = noop;
    this.img.onerror = noop;
    this.img.src = "";
  }
  this._phase = "noimage";
  this.img = null;
};

AsyncImage.prototype.onerror = function(event) {
  console.error("Couldn't load image ", this.src);
};

AsyncImage.prototype.start = function(url, imgProps) {
  if (this.img)
    console.error("We can't start a new download before you cancel the previous one");

  this._phase = "loading";
  this.img = new Image();
  if (imgProps) {
    this.img.row = imgProps.row;
    this.img.col = imgProps.col;
  }
  this.img.onload = this.onload;
  this.img.onerror = this.onerror;
  this.img.src = url;
  this.downloadStartTime = new Date().getTime();
};

AsyncImage.prototype.getPhase = function() {
  return this._phase;
};

var showImageSingleton = new (function ShowImageSingleton() {
  var prevRow = null;
  var prevCol = null;

  var fullImage = new AsyncImage(canvasSingleton.displayImage);

  var rowImage = new AsyncImage(noop);

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

function goodFormatDate(d) {
  var date = d.split("-");
  var month = date[1];
  if (month.length == 1) month = "0" + month;
  var day = date[2];
  if (day.length == 1) day = "0" + day;
  return date[0] + "-" + month + "-" + day;
}

function checkAndFormatDate(d) {
  if (/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/.test(d)) {
    return goodFormatDate(d);
  };
  return false;
}

function isValidLongitude(l) {
  return (l != "") && (!isNaN(l)) && (l <= 180) && (l >= -180);
}

function activateByURL(hash, replace) {
  // remove the #
  hash = hash.slice(1);

  hashparts = hash.split("/");

  if (hashparts[hashparts.length - 1] === "debug") {
    hashparts.pop();
    console.error("trackjs debug push");
  }

  if (hashparts[hashparts.length - 2] === "pd") {
    $("body").addClass("perfdebug");
    debug_location = hashparts[hashparts.length - 1];
    hashparts.pop();
    hashparts.pop();
    console.error("perf debug enabled with name '" + debug_location + "'");
  }

  // get the date part
  var date = hashparts[0];
  date = checkAndFormatDate(date);

  if (!date) {
    date = nasaarray[nasaarray.length - 1].d;
  }

  // get the longitude part
  var stringLongitude = hashparts[hashparts.length-1];
  var longitude = Number(stringLongitude);

  if (!isValidLongitude(longitude)) {
    longitude = defaultGoalLongitude;
  }

  selectedRow = getRowForDate(date);
  goalLongitude = longitude;
  gotoRow(selectedRow);
  if (replace) {
    replaceURL()
  } else {
    pushURL();
  }
}

function generateTitle() {
  return "~ Pale Blue Dot ~ " + nasaarray[selectedRow].d + "/" + goalLongitude;
}

function generateURL() {
  return window.location.pathname + "#" + nasaarray[selectedRow].d + "/" + goalLongitude;
}

function pushURL() {
  document.title = generateTitle();
  window.history.pushState(null, "", generateURL());
}

function replaceURL() {
  document.title = generateTitle();
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

  var date = nasaarray[newRow].d.split("-");
  $("#dateLabel").text(date[0] + " " + monthNames[parseInt(date[1] - 1)] + " " + date[2]);

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
    var numberOfImagesThisRow = nasaarray[selectedRow].n;
    newSelectedColumn = ((selectedColumn + distance) % numberOfImagesThisRow + numberOfImagesThisRow) % numberOfImagesThisRow;
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
  var scrollEndDelay = 500; // once the user is idle, the scroll is "finished"
  var scrollDistanceWithWheelDelta = 240; // Chrome returns a scroll distance with 'delta'
  var scrollDistanceWithDetail = 2; // Firefox returns a scroll distance with 'detail'
  var scrollDistance = 0; // Different mice return different distances, so we normalize them to get how many days to scroll

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

  this.scrollHandlerWithWheelDelta = (function(event) {
    scrollDistance += event.originalEvent.wheelDelta;

    scrollRound = scrollDistance / scrollDistanceWithWheelDelta;
    scrollRound = scrollRound - scrollRound % 1;

    historyAPI.move(scrollRound);
    scrollEndDelayed();
  }).bind(this);

  this.scrollHandlerWithDetail = (function(event) {
    scrollDistance += event.originalEvent.detail;

    scrollRound = scrollDistance / scrollDistanceWithDetail;
    scrollRound = scrollRound - scrollRound % 1;

    historyAPI.move(-scrollRound);
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

//_ Statistics reporting monitoring metrics
function DownloadTimeCollector(typeName, sendAfterNo) {
  var self = this;

  this.eventType = typeName;
  this.download_times = [];
  this.send_after_this_many = sendAfterNo;
}

DownloadTimeCollector.prototype.addData = function(data) {
  this.download_times.push(data);
  if (this.download_times.length >= this.send_after_this_many) {
    this.sendEventsToTrakErr();
    this.download_times = [];
  }
}

DownloadTimeCollector.prototype.sendEventsToTrakErr = function() {
  this.download_times.sort(function(a, b) {return a - b;});
  var events = this.download_times;
  var slowest_event = events[events.length - 1];
  var fastest_event = events[0];
  var sum_of_events = 0;
  for (var i = 0; i < events.length; i++) {
    sum_of_events += events[i];
  }
  var avg_of_events = sum_of_events / events.length;
  var median_of_events = events[Math.round(events.length / 2) - 1];

  sendEventToTrakErr(this.eventType, events.length, slowest_event, fastest_event, avg_of_events, median_of_events);
}

// Send data to TrakErr.io. This is where image download time statistics is monitored.
function sendEventToTrakErr(eventType, no, slowest, fastest, avg, median) {
  if (trakerr) {
    var trakerrEvent = trakerr.createAppEvent();
    trakerrEvent.logLevel ='info';
    trakerrEvent.eventType = eventType;

    trakerrEvent.eventMessage = "" + eventType + ", " + no + " data, slowest: " + slowest + " ms";

    trakerrEvent.customProperties = {
      doubleData: {
	customData1: slowest,
	customData2: fastest,
	customData3: avg,
	customData4: median,
      }
    };

    if (debug_location) {
      trakerrEvent.classification = debug_location;
    }

    trakerr.sendEvent(trakerrEvent, function(error, data, response) {
      if (error) {
	console.error('Error Response: ' + error + ', data = ' + data + ', response = ' + JSON.stringify(response));
      }
    });
  }
}

//_ Main
function absorbEvent(event) {
  event.preventDefault();
  return false;
}

function isTouchDevice() {
  return 'ontouchstart' in window        // works on most browsers
    || navigator.maxTouchPoints;       // works on IE10/11 and Surface
};

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
  $(window).bind('mousewheel', scrollHistoryConverter.scrollHandlerWithWheelDelta);
  $(window).bind('DOMMouseScroll', scrollHistoryConverter.scrollHandlerWithDetail);

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

  if (isTouchDevice()) {
    $('#question-mark').hover(function() {
      $('#help-question-mobile').toggle("slide");
    });
  } else {
    $('#question-mark').hover(function() {
      $('#help-question-desktop').toggle("slide");
    });
  }

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
