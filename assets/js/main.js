$(document).ready(function () {

	// get the action filter option item on page load
	var $filterType = $('#filterOptions li.active a').attr('class');

	// get and assign the ourHolder element to the
	// $holder varible for use later
	var $holder = $('ul.ourHolder');

	// clone all items within the pre-assigned $holder element
	var $data = $holder.clone();

	// attempt to call Quicksand when a filter option
	// item is clicked
	$('#filterOptions li a').click(function (e) {
		// reset the active class on all the buttons
		$('#filterOptions li').removeClass('active');

		// assign the class of the clicked filter option
		// element to our $filterType variable
		var $filterType = $(this).attr('class');
		$(this).parent().addClass('active');

		if ($filterType == 'all') {
			// assign all li items to the $filteredData var when
			// the 'All' filter option is clicked
			var $filteredData = $data.find('li');
		} else {
			// find all li elements that have our required $filterType
			// values for the data-type element
			var $filteredData = $data.find('li[data-type=' + $filterType + ']');
		}

		// call quicksand and assign transition parameters
		$holder.quicksand($filteredData, {
			duration: 800,
			easing: 'easeInOutQuad'
		});
		return false;
	});
});

$(function () {
	$("#accordion").accordion({
		heightStyle: content,
		collapsible: true,
		active: false
	});
});



$(function () {
	var icons = {
		header: "ui-icon-plus",
		activeHeader: "ui-icon-circle-arrow-s"
	};
	$("#accordion").accordion({
		icons: icons
	});
	$("#toggle").button().click(function () {
		if ($("#accordion").accordion("option", "icons")) {
			$("#accordion").accordion("option", "icons", null);
		} else {
			$("#accordion").accordion("option", "icons", icons);
		}
	});
});


$(function () {
	$('.cycle-testimonial').cycle({
		timeout: 9000, // (0 to disable auto advance)
		fx: 'scrollVert', // choose your transition type, ex: fade, scrollUp, shuffle, etc...   
		pause: true, // true to enable "pause on hover"
		prev: '.next', // selector for element to use as click trigger for previous slide 
		next: '.prev', // selector for element to use as click trigger for previous slide 
		cleartypeNoBg: true, // set to true to disable extra cleartype fixing (leave false to force background color setting on slides)
		pauseOnPagerHover: 0 // true to pause when hovering over pager link
	});
});

$(document).ready(function () {
	$("#footer-col .equal").equalHeights();
});

$('.button, button, .box-grey, .bgwhite, .nav-testimonial, #nav-slide').corner("4px");
$(document).ready(function () {
	$(".signup").colorbox({
		width: "465px",
		inline: true,
		href: "#signup-content"
	});
	$(".login").colorbox({
		width: "465px",
		inline: true,
		href: "#login-content"
	});
});
$(function () {
	$("#accordion").accordion({
		heightStyle: "content",
		collapsible: true,
		active: false
	});
});

$(function () {
	var icons = {
		header: "ui-icon-plus",
		activeHeader: "ui-icon-circle-arrow-s"
	};
	$("#accordion").accordion({
		icons: icons
	});
	$("#toggle").button().click(function () {
		if ($("#accordion").accordion("option", "icons")) {
			$("#accordion").accordion("option", "icons", null);
		} else {
			$("#accordion").accordion("option", "icons", icons);
		}
	});
});