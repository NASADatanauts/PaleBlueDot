var nasa_cache = {};
var today = moment(0, 'HH');
var todaysThumbnails;

// moment -> Future({ e: [earth], d: date })
function getEarths(moment) {
  if (nasa_cache[moment.unix()]) {
    return Promise.resolve(nasa_cache[moment.unix()]);
  }

  return $.getJSON("https://epic.gsfc.nasa.gov/api/natural/date/" + moment.format("YYYY-MM-DD") + "?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo").then(
    function (ret) {
      nasa_cache[moment.unix()] = { e: ret, d: moment.format("YYYY MMMM DD") };
      return nasa_cache[moment.unix()];
    });
}

// string -> string (url of image)
function getThumbnail(imageName) {
  return 'https://epic.gsfc.nasa.gov/epic-archive/jpg/' + imageName + '.jpg';
}

// string -> img html tag
function getTopThumbnailImg(date) {
  return function (earth) {
    var url = getThumbnail(earth.image);
    return $('<img>',{src: url, onmouseover: 'highlightAndChangeImage($(this))', onclick: 'loadHistory($(this))', onmouseout: 'removeHighlight($(this))',
		      data: {
			type: 'top',
			date: date,
			longitude: earth.centroid_coordinates.lon
		      }
		     }
	    );
  };
}

// string -> img html tag
function getLeftThumbnailImg(imageName_with_date) {
  var imageName = imageName_with_date['e'];
  var date = imageName_with_date['d'];
  var url = getThumbnail(imageName);
  return $('<img>',{src: url, onmouseover: 'highlightAndChangeImage($(this))', onmouseout: 'removeHighlight($(this))',
		    data: {
		      type: 'left',
		      date: date
		    }
		   });
}

// Returns Earth images for the latest day that has some.
// () -> Future({e: [earth], d: date })
function getEarthsLatest() {
  var cont = function(now) {
    return getEarths(now).then(function (data_and_date) {
      if (data_and_date['e'].length != 0) {
	return Promise.resolve(data_and_date);
      } else {
	return cont(now.subtract(1, 'days'));
      }
    });
  }

  return cont(today);
}

// [moment] -> Future({ e: [earth], d: date })
function getEarthses(moments) {
  return Promise.all($.map(moments, getEarths));
}

// int -> Future([[earth], date])
function getEarthsesFromNow(how_many) {
  var moments = []
  for (var i = 0; i < how_many ; i++) {
    moments.push(moment(today).subtract(i, 'days'));
  }
  return getEarthses(moments);
}

// [earth] -> earth_or_null (that shows earth turned closest to given longitude)
// getBestEarth :: longitude -> ([[earth], date] -> earth)
function getBestEarth(longitude) {
  return function (earths_and_date) {
    var earths = earths_and_date['e'];
    var date = earths_and_date['d'];
    var best_earth = null;
    $.each(earths, function (_index, earth) {
      var lon = earth.centroid_coordinates.lon;
      if (lon > (longitude - 7) && lon < (longitude + 7) && (best_earth == null || Math.abs(lon - longitude) < best_earth.centroid_coordinates.lon)) {
	best_earth = earth;
      }
    });
    return { e: best_earth, d: date };
  };
}

// object -> void, but adds 'selectedThumbnail' class to object
function loadHistory(thumbnail_object) {
  $(".selectedThumbnail").removeClass("selectedThumbnail");
  thumbnail_object.addClass('selectedThumbnail');
  putOutImagesOnTheLeft(thumbnail_object.data().longitude);
}

// object -> void, but removes 'highlightedThumbnail' class from object
function removeHighlight(thumbnail_object) {
  thumbnail_object.removeClass('highlightedThumbnail');
}

// object -> void, but adds 'highlightedThumbnail' class to object
// and updates the date label
// This function has to be called with a jquery object
function highlightThumbnail(thumbnail_object) {
  $("#dateLabel").text(thumbnail_object.data().date);
  $(".highlightedThumbnail").removeClass("highlightedThumbnail");
  thumbnail_object.addClass('highlightedThumbnail');
}

// object -> void but updates the big image on the screen
function changeImage(thumbnail_object) {
  $("#targetImage").attr("src", thumbnail_object.attr("src"));
}

function highlightAndChangeImage(thumbnail_object) {
  highlightThumbnail(thumbnail_object);
  changeImage(thumbnail_object);
}

// Thumbnails for left side: Europe now and for previous days
function putOutImagesOnTheLeft(longitude) {
  $("#leftThumbnailContainer").empty();
  getEarthsesFromNow(20).then(function(earthses_and_dates) {
    var best_earths_with_dates = $.map(earthses_and_dates, getBestEarth(longitude));
    best_earths_with_dates = best_earths_with_dates.filter(function (x) { return x['e'] != null; });
    var images_with_dates = $.map(best_earths_with_dates, function (x) { return { e: x['e'].image, d: x['d'] }; });
    var thumbnails = $.map(images_with_dates, getLeftThumbnailImg);
    $("#leftThumbnailContainer").prepend(thumbnails);
    
    // if any, select the first thumbnail and load it as main image
    if (thumbnails.length > 0) {
      highlightAndChangeImage(thumbnails[0]);
    };
  });
}

// Thumbnails for top: latest Earth images from every direction
function putOutImagesOnTheTop() {
  $("#topThumbnailContainer").empty();
  getEarthsLatest().then(function(earths_and_date) {
    var earths = earths_and_date['e'];
    var date = earths_and_date['d'];
    todaysThumbnails = $.map(earths, getTopThumbnailImg(date));
    $("#topThumbnailContainer").prepend(todaysThumbnails);
  });
}

function getMousePosition(event){
  mouseX = event.pageX;
  mouseY = event.pageY;
  
  if (todaysThumbnails) {
    if (mouseX > 100 && mouseY > 150) {
      var calibration = $(window).width() / todaysThumbnails.length;
      var imageX = Math.floor(mouseX / calibration);

      highlightAndChangeImage(todaysThumbnails[imageX]);
    }
  }
}

$(document).ready(function () {
  putOutImagesOnTheTop();
  putOutImagesOnTheLeft(19);

  $(window).mousemove(getMousePosition);
});
