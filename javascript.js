var currentDateIndex = nasaarray.length - 1; // today
var currentLongitude = 19; // Europe

// string -> string (url of image)
function getImageUrl(imageName) {
  return 'https://epic.gsfc.nasa.gov/epic-archive/jpg/' + imageName + '.jpg';
}

// longitude and array of nasa Objects from ONE day -> index of element that shows earth closest to given longitude
function getBestEarth(longitude, imagesOfADay) {
  var longitudes = imagesOfADay.l;
  var best_earth = 0;
  $.each(longitudes, function (index, earth) {
    if (Math.abs(longitudes[index] - longitude) < Math.abs(longitudes[best_earth] - longitude)) {
      best_earth = index;
    }
  });
  if (Math.abs(longitudes[best_earth] - longitude) > 9) {
    console.warn("Even best image found is way off. Requested closest to %i and found %i.", longitude, longitudes[best_earth]);
  }
  return best_earth;
}
  
function showLoading() {
  $("#loading").removeClass("hidden");
}

function hideLoading() {
  $("#loading").addClass("hidden");
}

function changeDateOnUI(newDate) {
  $("#dateLabel").text(moment(newDate).format("YYYY MMMM DD"));
}

// shows the closest earth rotation to previous on given date
function gotoDate(dateIndex) {
  changeDateOnUI(nasaarray[dateIndex].d);
  var earthRotation = getBestEarth(currentLongitude, nasaarray[dateIndex]);
  $("#targetImage").attr("src", getImageUrl(nasaarray[dateIndex].i[earthRotation]));
  $("#targetImage").one('load', function() {
    hideLoading();
  });
}

// rotates earth to index within the day that is currently selected
function rotateEarth(lonIndex) {
  changeDateOnUI(nasaarray[currentDateIndex].d); // this shouldn't be needed, just here for debug
  currentLongitude = nasaarray[currentDateIndex].l[lonIndex];
  $("#targetImage").attr("src", getImageUrl(nasaarray[currentDateIndex].i[lonIndex]));
  $("#targetImage").one('load', function() {
    hideLoading();
  });
}

function rotateEarthWithMouseMove(event) {
  mouseX = event.pageX;

  var calibration = $(window).width() / nasaarray[currentDateIndex].n;
  var imageX = Math.floor(mouseX / calibration);

  showLoading();
  rotateEarth(imageX);
}

function gotoDateWithScroll(event) {
  if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
    // scoll up
    if (currentDateIndex < nasaarray.length - 1) {
      currentDateIndex = currentDateIndex + 1;
      showLoading();
      gotoDate(currentDateIndex);
    }
  } else {
    // scroll down
    if (currentDateIndex > 0) {
      currentDateIndex = currentDateIndex - 1;
      showLoading();
      gotoDate(currentDateIndex);
    }
  }
}

$(document).ready(function () {
  // TODO: today might not have pictures yet. Find the first date that has any.
  gotoDate(currentDateIndex);
  
  $(window).mousemove(rotateEarthWithMouseMove);

  $(window).bind('mousewheel DOMMouseScroll', gotoDateWithScroll);
});
