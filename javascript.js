function get_images_for_date(date) {
  var images_futures = [];
  return $.getJSON("https://epic.gsfc.nasa.gov/api/natural/date/" + format_date(date) + "?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo").then(function(data) {
    $.each(data, function (index, image) {
      var next_image_name = image.image;
      images_futures.push(next_image_name);
    });
    console.log(images_futures);
    return Promise.all(images_futures);
  });
}

function get_images(how_many) {
  var today = new Date();
  var current_date = new Date();
  var best_images_futures = [];
  for(var i = 1; i < how_many; i++) {
    current_date.setDate(today.getDate() - i);
    var next_future = get_best_image("https://epic.gsfc.nasa.gov/api/natural/date/" + format_date(current_date) + "?api_key=ecRFCeUylG8hbW4edbzI6GQVu34xTYGfWWvlKOoo");
    best_images_futures.push(next_future);
  }
  return Promise.all(best_images_futures);
}

function format_date(date) {
  var dd = date.getDate();
  var mm = date.getMonth()+1; //January is 0!
  var yyyy = date.getFullYear();
  var ret = yyyy+'-'+mm+'-'+dd;
  return ret;
}

function get_best_image(url) {
  return $.getJSON(url).then(function(data) {
    var closest_lon = 1000;
    var closest_image = null; 
    $.each(data, function (index, image) {
      var next_image_name = image.image;
      var next_image_lon = image.centroid_coordinates.lon;
      if (next_image_lon > 13 && next_image_lon < 25 && (Math.abs(next_image_lon - 19) < closest_lon)) {
	closest_lon = next_image_lon;
	closest_image = next_image_name;
      }
    });
    console.log("Closest found with name: '" + closest_image + "' with value " + closest_lon);
    return closest_image;
  });
}

// This function has to be called with a jquery object
function change_image(thumbnail_object) {
  $("#targetImage").attr("src", thumbnail_object.attr("src"));
  $(".selectedThumbnail").removeClass("selectedThumbnail");
  thumbnail_object.addClass('selectedThumbnail');
}

// get_images(30).then(function(images) {
//   var initial_set = false;
//   var thumbnail_container = $("#thumbnailContainer");
//   for (var i = 0; i < images.length; i++) {
//     if (images[i] != null) {
//       var url = 'https://epic.gsfc.nasa.gov/epic-archive/jpg/' + images[i] + '.jpg';
//       var newThumbnail = $('<img>',{src: url, onmouseover: 'change_image($(this))'});
//       if (! initial_set) {
// 	change_image(newThumbnail);
// 	initial_set = true;
//       }
//       thumbnail_container.prepend(newThumbnail);
//     }
//   }
// });

var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

get_images_for_date(yesterday).then(function(images) {
  var initial_set = false;
  var thumbnail_container = $("#thumbnailContainer");
  console.log("images here" + images + ".");
  for (var i = 0; i < images.length; i++) {
    console.log("here" + images[i]);
    var url = 'https://epic.gsfc.nasa.gov/epic-archive/jpg/' + images[i] + '.jpg';
    var newThumbnail = $('<img>',{src: url, onmouseover: 'change_image($(this))'});
    if (! initial_set) {
      change_image(newThumbnail);
      initial_set = true;
    }
    thumbnail_container.prepend(newThumbnail);
  }
});
