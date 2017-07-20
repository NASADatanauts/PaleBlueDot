var currentDateIndex;
var currentLongitude = 19; // Europe
var alreadyCachedDateIndex = nasaarray.length;

function preloadImages(dateIndex) {
  var array = getAllImageUrls(nasaarray[dateIndex].d, nasaarray[dateIndex].i);
  if (!preloadImages.list) {
    preloadImages.list = [];
  }
  var list = preloadImages.list;
  for (var i = 0; i < array.length; i++) {
    var img = new Image();
    img.onload = function() {
      var index = list.indexOf(this);
      if (index !== -1) {
        // remove image from the array once it's loaded for memory consumption reasons
        list.splice(index, 1);
      }
    }
    list.push(img);
    img.src = array[i];
  }
  if (dateIndex < alreadyCachedDateIndex) {
    alreadyCachedDateIndex = dateIndex;
  }
}

function preloadImagesForPreviousDays(howMany) {
  for (var i = currentDateIndex - 1; i > currentDateIndex - howMany - 1; i--) {
    preloadImages(i);
  }
}

// date, array of strings -> array of image urls
function getAllImageUrls(date, imageNames) {
  var ret = [];
  $.each(imageNames, function (index, image) {
    ret.push(getImageUrl(date, image));
  });
  return ret;
}

// date, string -> string (url of image)
function getImageUrl(date, imageName) {
  var mdate = moment(date, "YYYY-MM-DD");
  return 'https://epic.gsfc.nasa.gov/archive/natural/'
    + mdate.format('YYYY') + '/' + mdate.format('MM') + '/' + mdate.format('DD')
    + '/jpg/' + imageName + '.jpg?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo';
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
  
function changeDateOnUI(newDate) {
  $("#dateLabel").text(moment(newDate).format("YYYY MMMM DD"));
}

// shows the closest earth rotation to previous on given date
function gotoDate(dateIndex) {
  var currentDate = nasaarray[dateIndex].d;
  changeDateOnUI(currentDate);
  
  var earthRotation = getBestEarth(currentLongitude, nasaarray[dateIndex]);
  $("#targetImage").attr("src", getImageUrl(currentDate, nasaarray[dateIndex].i[earthRotation]));
}

// rotates earth to index within the day that is currently selected
function rotateEarth(lonIndex) {
  var currentDate = nasaarray[currentDateIndex].d;
  changeDateOnUI(currentDate); // this shouldn't be needed, just here for debug

  currentLongitude = nasaarray[currentDateIndex].l[lonIndex];
  $("#targetImage").attr("src", getImageUrl(currentDate, nasaarray[currentDateIndex].i[lonIndex]));
}

function rotateEarthWithMouseMove(event) {
  mouseX = event.pageX;

  var calibration = $(window).width() / nasaarray[currentDateIndex].n;
  var imageX = Math.floor(mouseX / calibration);

  rotateEarth(imageX);
}

function gotoDateWithScroll(event) {
  if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
    // scoll up
    if (currentDateIndex < nasaarray.length - 1) {
      currentDateIndex = currentDateIndex + 1;
      gotoDate(currentDateIndex);
    }
  } else {
    // scroll down
    if (currentDateIndex > 0) {
      currentDateIndex = currentDateIndex - 1;
      gotoDate(currentDateIndex);
 //     if (currentDateIndex - alreadyCachedDateIndex == 2) {
//	preloadImagesForPreviousDays(10);
 //     }
    }
  }
}

$(document).ready(function () {
  // Find the most recent day that has images
  var day = nasaarray.length - 1;
  while (nasaarray[day].length == 0) {
    day = day - 1;
  }
  currentDateIndex = day;
  
  // load that day's image (rotation is currentLongitude)
  gotoDate(currentDateIndex);

  // pre-load all images for that day
  preloadImages(currentDateIndex);

  // start pre-loading all images for previous 3 days (from currentDateIndex)
  preloadImagesForPreviousDays(3);
  
  $(window).mousemove(rotateEarthWithMouseMove);

  $(window).bind('mousewheel DOMMouseScroll', gotoDateWithScroll);
});
