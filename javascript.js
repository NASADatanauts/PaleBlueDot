// moment -> Future([earth])
function getEarths(moment) {
  return $.getJSON("https://epic.gsfc.nasa.gov/api/natural/date/" + moment.format("YYYY-MM-DD") + "?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo");
}

// string -> string (url of image)
function getThumbnail(imageName) {
  return 'https://epic.gsfc.nasa.gov/epic-archive/jpg/' + imageName + '.jpg';
}

// string -> img html tag
function getTopThumbnailImg(imageName) {
  var url = getThumbnail(imageName);
  return $('<img>',{src: url, onmouseover: 'highlightAndChangeImage($(this))', onclick: 'loadHistory($(this))', onmouseout: 'removeHighlight($(this))'});
}

// string -> img html tag
function getLeftThumbnailImg(imageName) {
  var url = getThumbnail(imageName);
  return $('<img>',{src: url, onmouseover: 'highlightAndChangeImage($(this))', onmouseout: 'removeHighlight($(this))'});
}

// string -> prints string in dateLabel
function displayDate(date) {
  $("#dateLabel").text(date);
}

function displayDateFromThumbnail(source) {
  var b_ = source.indexOf("1b_");
  var datePart = source.substring(b_ + 3, b_ + 11);
  displayDate(moment(datePart).format("YYYY MMMM DD"));
}

// Returns Earth images for the latest day that has some.
// () -> Future([earth])
function getEarthsLatest() {
  var cont = function(now) {
    return getEarths(now).then(function (data) {
      if (data.length != 0) {
	return Promise.resolve(data);
      } else {
	return cont(now.subtract(1, 'days'));
      }
    });
  }

  return cont(moment());
}

// [moment] -> Future([[earth]])
function getEarthses(moments) {
  return Promise.all($.map(moments, getEarths));
}

// int -> Future([[earth]])
function getEarthsesFromNow(how_many) {
  var moments = []
  for (var i = 0; i < how_many ; i++) {
    moments.push(moment().subtract(i, 'days'));
  }
  return getEarthses(moments);
}

// [earth] -> earth_or_null (that shows Europe)
function getBestEarth(earths) {
  var best_earth = null;
  $.each(earths, function (_index, earth) {
    var lon = earth.centroid_coordinates.lon;
    if (lon > 13 && lon < 25 && (best_earth == null || Math.abs(lon - 19) < best_earth.centroid_coordinates.lon)) {
      best_earth = earth;
    }
  });
  if (best_earth == null) console.log("no best earth");
  else console.log("Closest found with name: '" + best_earth.image + "' with value " + best_earth.centroid_coordinates.lon);
  return best_earth;
}

// object -> void, but adds 'selectedThumbnail' class to object
function loadHistory(thumbnail_object) {
  $(".selectedThumbnail").removeClass("selectedThumbnail");
  thumbnail_object.addClass('selectedThumbnail');
  console.log("Load history to left side");
}

// object -> void, but removes 'highlightedThumbnail' class from object
function removeHighlight(thumbnail_object) {
  thumbnail_object.removeClass('highlightedThumbnail');
}

// object -> void, but adds 'highlightedThumbnail' class to object
// and changes main image
// This function has to be called with a jquery object
function highlightAndChangeImage(thumbnail_object) {
  $("#targetImage").attr("src", thumbnail_object.attr("src"));
  displayDateFromThumbnail(thumbnail_object.attr("src"));
  $(".highlightedThumbnail").removeClass("highlightedThumbnail");
  thumbnail_object.addClass('highlightedThumbnail');
}

// Thumbnails for left side: Europe now and for previous days
getEarthsesFromNow(10).then(function(earthses) {
  var best_earths = $.map(earthses, getBestEarth);
  best_earths.filter(function (x) { return x != null; });
  var images = $.map(best_earths, function (x) { return x.image; });
  var thumbnails = $.map(images, getLeftThumbnailImg);
  $("#leftThumbnailContainer").prepend(thumbnails);
  if (thumbnails.length > 0) highlightAndChangeImage(thumbnails[0]);
});

// Thumbnails for top: lates Earth images from every direction
getEarthsLatest().then(function(earths) {
  var images = $.map(earths, function (x) { return x.image; });
  var thumbnails = $.map(images, getTopThumbnailImg);
  $("#topThumbnailContainer").prepend(thumbnails);
});
