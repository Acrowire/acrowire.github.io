$(function () {

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
	var Page = (function () {

		var $navArrows = $('#nav-arrows'),
			$nav = $('#nav-dots > span'),
			slitslider = $('#slider').slitslider({
				onBeforeChange: function (slide, pos) {

					$nav.removeClass('nav-dot-current');
					$nav.eq(pos).addClass('nav-dot-current');

				}
			}),

			init = function () {

				initEvents();

			},
			initEvents = function () {

				// add navigation events
				$navArrows.children(':last').on('click', function () {

					slitslider.next();
					return false;

				});

				$navArrows.children(':first').on('click', function () {

					slitslider.previous();
					return false;

				});

				$nav.each(function (i) {

					$(this).on('click', function (event) {

						var $dot = $(this);

						if (!slitslider.isActive()) {

							$nav.removeClass('nav-dot-current');
							$dot.addClass('nav-dot-current');

						}

						slitslider.jump(i + 1);
						return false;

					});

				});

			};

		return {
			init: init
		};

	})();

	Page.init();
});
$(function () {
	$('#con-cycle').cycle({
		timeout: 5000,
		fx: 'none',
		pager: '#pager',
		pause: true,
		cleartypeNoBg: false,
		pauseOnPagerHover: 0
	});
});

$(function () {
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
	$("#content-col .equal").equalHeights();
	$("#hosting-col .equal").equalHeights();
	$("#footer-col .equal").equalHeights();
});
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-19453986-1']);
_gaq.push(['_trackPageview']);

$(function () {
	var ga = document.createElement('script');
	ga.type = 'text/javascript';
	ga.async = true;
	ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') +
		'.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(ga, s);
});

var $ = jQuery.noConflict();
$(function () {
	/* for top navigation */
	$(" #menu ul").css({
		display: "none"
	}); // Opera Fix
	$(" #menu li").hover(function () {
		$(this).find('ul:first').css({
			visibility: "visible",
			display: "none"
		}).slideDown(200);
	}, function () {
		$(this).find('ul:first').css({
			visibility: "hidden"
		});
	});

});