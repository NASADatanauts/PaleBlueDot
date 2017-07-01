// moment -> Future([earth])
function getEarths(moment) {
  return $.getJSON("https://epic.gsfc.nasa.gov/api/natural/date/" + moment.format("YYYY-MM-DD") + "?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo");
}

// string -> <img> html tag
function getThumbnail(imageName) {
  var url = 'https://epic.gsfc.nasa.gov/epic-archive/jpg/' + imageName + '.jpg';
  return $('<img>',{src: url, onmouseover: 'change_image($(this))'});
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
function get_best_earth(earths) {
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

// object -> object with 'selectedTumbnail' class
// This function has to be called with a jquery object
function change_image(thumbnail_object) {
  $("#targetImage").attr("src", thumbnail_object.attr("src"));
  $(".selectedThumbnail").removeClass("selectedThumbnail");
  thumbnail_object.addClass('selectedThumbnail');
}

// Thumbnails for left side: Europe now and for previous days
getEarthsesFromNow(30).then(function(earthses) {
  var best_earths = $.map(earthses, get_best_earth);
  best_earths.filter(function (x) { return x != null; });
  var images = $.map(best_earths, function (x) { return x.image; });
  var thumbnails = $.map(images, getThumbnail);
  $("#leftThumbnailContainer").prepend(thumbnails);
  if (thumbnails.length > 0) change_image(thumbnails[0]);
});

// Thumbnails for top: lates Earth images from every direction
getEarthsLatest().then(function(earths) {
  var images = $.map(earths, function (x) { return x.image; });
  var thumbnails = $.map(images, getThumbnail);
  $("#topThumbnailContainer").prepend(thumbnails);
});
