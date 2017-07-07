// moment -> Future({ e: [earth], d: date })
function getEarths(moment) {
  return $.getJSON("https://epic.gsfc.nasa.gov/api/natural/date/" + moment.format("YYYY-MM-DD") + "?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo").then(
    function (ret) {
      return { e: ret, d: moment.format("YYYY MMMM DD") };
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
		      // longitude: longitude
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

  return cont(moment());
}

// [moment] -> Future({ e: [earth], d: date })
function getEarthses(moments) {
  return Promise.all($.map(moments, getEarths));
}

// int -> Future([[earth], date])
function getEarthsesFromNow(how_many) {
  var moments = []
  for (var i = 0; i < how_many ; i++) {
    moments.push(moment().subtract(i, 'days'));
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
    if (best_earth == null) console.log("no best earth");
    else console.log("Closest found with name: '" + best_earth.image + "' with value " + best_earth.centroid_coordinates.lon);
    return { e: best_earth, d: date };
  };
}

// object -> void, but adds 'selectedThumbnail' class to object
function loadHistory(thumbnail_object) {
  $(".selectedThumbnail").removeClass("selectedThumbnail");
  thumbnail_object.addClass('selectedThumbnail');
  console.log("Load history to left side");
  putOutImagesOnTheLeft(thumbnail_object.data().longitude);
}

// object -> void, but removes 'highlightedThumbnail' class from object
function removeHighlight(thumbnail_object) {
  thumbnail_object.removeClass('highlightedThumbnail');
}

// object -> void, but adds 'highlightedThumbnail' class to object
// and changes main image
// This function has to be called with a jquery object
function highlightAndChangeImage(thumbnail_object) {
  // console.log(thumbnail_object.data());
  $("#targetImage").attr("src", thumbnail_object.attr("src"));
  $("#dateLabel").text(thumbnail_object.data().date);
  $(".highlightedThumbnail").removeClass("highlightedThumbnail");
  thumbnail_object.addClass('highlightedThumbnail');
}

function putOutImagesOnTheLeft(longitude) {
  // Thumbnails for left side: Europe now and for previous days
  getEarthsesFromNow(20).then(function(earthses_and_dates) {
    var best_earths_with_dates = $.map(earthses_and_dates, getBestEarth(longitude));
    best_earths_with_dates = best_earths_with_dates.filter(function (x) { return x['e'] != null; });
    var images_with_dates = $.map(best_earths_with_dates, function (x) { return { e: x['e'].image, d: x['d'] }; });
    var thumbnails = $.map(images_with_dates, getLeftThumbnailImg);
    $("#leftThumbnailContainer").empty();
    $("#leftThumbnailContainer").prepend(thumbnails);
    if (thumbnails.length > 0) highlightAndChangeImage(thumbnails[0]);
  });
}

function putOutImagesOnTheTop() {
  // Thumbnails for top: latest Earth images from every direction
  getEarthsLatest().then(function(earths_and_date) {
    var earths = earths_and_date['e'];
    var date = earths_and_date['d'];
    var thumbnails = $.map(earths, getTopThumbnailImg(date));
    $("#topThumbnailContainer").empty();
    $("#topThumbnailContainer").prepend(thumbnails);
  });
}

$(document).ready(function () {
  putOutImagesOnTheLeft(19);
  putOutImagesOnTheTop();
});
