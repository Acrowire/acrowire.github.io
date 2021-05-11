(function ($) {
    var ver = "2.88";
    if ($.support == undefined) {
        $.support = {
            opacity: !($.browser.msie)
        };
    }

    function debug(s) {
        if ($.fn.cycle.debug) {
            log(s);
        }
    }

    function log() {
        if (window.console && window.console.log) {
            window.console.log("[cycle] " + Array.prototype.join.call(arguments, " "));
        }
    }
    $.fn.cycle = function (options, arg2) {
        var o = {
            s: this.selector,
            c: this.context
        };
        if (this.length === 0 && options != "stop") {
            if (!$.isReady && o.s) {
                log("DOM not ready, queuing slideshow");
                $(function () {
                    $(o.s, o.c).cycle(options, arg2);
                });
                return this;
            }
            log("terminating; zero elements found by selector" + ($.isReady ? "" : " (DOM not ready)"));
            return this;
        }
        return this.each(function () {
            var opts = handleArguments(this, options, arg2);
            if (opts === false) {
                return;
            }
            opts.updateActivePagerLink = opts.updateActivePagerLink || $.fn.cycle.updateActivePagerLink;
            if (this.cycleTimeout) {
                clearTimeout(this.cycleTimeout);
            }
            this.cycleTimeout = this.cyclePause = 0;
            var $cont = $(this);
            var $slides = opts.slideExpr ? $(opts.slideExpr, this) : $cont.children();
            var els = $slides.get();
            if (els.length < 2) {
                log("terminating; too few slides: " + els.length);
                return;
            }
            var opts2 = buildOptions($cont, $slides, els, opts, o);
            if (opts2 === false) {
                return;
            }
            var startTime = opts2.continuous ? 10 : getTimeout(els[opts2.currSlide], els[opts2.nextSlide], opts2, !opts2.rev);
            if (startTime) {
                startTime += (opts2.delay || 0);
                if (startTime < 10) {
                    startTime = 10;
                }
                debug("first timeout: " + startTime);
                this.cycleTimeout = setTimeout(function () {
                    go(els, opts2, 0, (!opts2.rev && !opts.backwards));
                }, startTime);
            }
        });
    };

    function handleArguments(cont, options, arg2) {
        if (cont.cycleStop == undefined) {
            cont.cycleStop = 0;
        }
        if (options === undefined || options === null) {
            options = {};
        }
        if (options.constructor == String) {
            switch (options) {
                case "destroy":
                case "stop":
                    var opts = $(cont).data("cycle.opts");
                    if (!opts) {
                        return false;
                    }
                    cont.cycleStop++;
                    if (cont.cycleTimeout) {
                        clearTimeout(cont.cycleTimeout);
                    }
                    cont.cycleTimeout = 0;
                    $(cont).removeData("cycle.opts");
                    if (options == "destroy") {
                        destroy(opts);
                    }
                    return false;
                case "toggle":
                    cont.cyclePause = (cont.cyclePause === 1) ? 0 : 1;
                    checkInstantResume(cont.cyclePause, arg2, cont);
                    return false;
                case "pause":
                    cont.cyclePause = 1;
                    return false;
                case "resume":
                    cont.cyclePause = 0;
                    checkInstantResume(false, arg2, cont);
                    return false;
                case "prev":
                case "next":
                    var opts = $(cont).data("cycle.opts");
                    if (!opts) {
                        log('options not found, "prev/next" ignored');
                        return false;
                    }
                    $.fn.cycle[options](opts);
                    return false;
                default:
                    options = {
                        fx: options
                    };
            }
            return options;
        } else {
            if (options.constructor == Number) {
                var num = options;
                options = $(cont).data("cycle.opts");
                if (!options) {
                    log("options not found, can not advance slide");
                    return false;
                }
                if (num < 0 || num >= options.elements.length) {
                    log("invalid slide index: " + num);
                    return false;
                }
                options.nextSlide = num;
                if (cont.cycleTimeout) {
                    clearTimeout(cont.cycleTimeout);
                    cont.cycleTimeout = 0;
                }
                if (typeof arg2 == "string") {
                    options.oneTimeFx = arg2;
                }
                go(options.elements, options, 1, num >= options.currSlide);
                return false;
            }
        }
        return options;

        function checkInstantResume(isPaused, arg2, cont) {
            if (!isPaused && arg2 === true) {
                var options = $(cont).data("cycle.opts");
                if (!options) {
                    log("options not found, can not resume");
                    return false;
                }
                if (cont.cycleTimeout) {
                    clearTimeout(cont.cycleTimeout);
                    cont.cycleTimeout = 0;
                }
                go(options.elements, options, 1, (!opts.rev && !opts.backwards));
            }
        }
    }

    function removeFilter(el, opts) {
        if (!$.support.opacity && opts.cleartype && el.style.filter) {
            try {
                el.style.removeAttribute("filter");
            } catch (smother) {}
        }
    }

    function destroy(opts) {
        if (opts.next) {
            $(opts.next).unbind(opts.prevNextEvent);
        }
        if (opts.prev) {
            $(opts.prev).unbind(opts.prevNextEvent);
        }
        if (opts.pager || opts.pagerAnchorBuilder) {
            $.each(opts.pagerAnchors || [], function () {
                this.unbind().remove();
            });
        }
        opts.pagerAnchors = null;
        if (opts.destroy) {
            opts.destroy(opts);
        }
    }

    function buildOptions($cont, $slides, els, options, o) {
        var opts = $.extend({}, $.fn.cycle.defaults, options || {}, $.metadata ? $cont.metadata() : $.meta ? $cont.data() : {});
        if (opts.autostop) {
            opts.countdown = opts.autostopCount || els.length;
        }
        var cont = $cont[0];
        $cont.data("cycle.opts", opts);
        opts.$cont = $cont;
        opts.stopCount = cont.cycleStop;
        opts.elements = els;
        opts.before = opts.before ? [opts.before] : [];
        opts.after = opts.after ? [opts.after] : [];
        opts.after.unshift(function () {
            opts.busy = 0;
        });
        if (!$.support.opacity && opts.cleartype) {
            opts.after.push(function () {
                removeFilter(this, opts);
            });
        }
        if (opts.continuous) {
            opts.after.push(function () {
                go(els, opts, 0, (!opts.rev && !opts.backwards));
            });
        }
        saveOriginalOpts(opts);
        if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg) {
            clearTypeFix($slides);
        }
        if ($cont.css("position") == "static") {
            $cont.css("position", "relative");
        }
        if (opts.width) {
            $cont.width(opts.width);
        }
        if (opts.height && opts.height != "auto") {
            $cont.height(opts.height);
        }
        if (opts.startingSlide) {
            opts.startingSlide = parseInt(opts.startingSlide);
        } else {
            if (opts.backwards) {
                opts.startingSlide = els.length - 1;
            }
        }
        if (opts.random) {
            opts.randomMap = [];
            for (var i = 0; i < els.length; i++) {
                opts.randomMap.push(i);
            }
            opts.randomMap.sort(function (a, b) {
                return Math.random() - 0.5;
            });
            opts.randomIndex = 1;
            opts.startingSlide = opts.randomMap[1];
        } else {
            if (opts.startingSlide >= els.length) {
                opts.startingSlide = 0;
            }
        }
        opts.currSlide = opts.startingSlide || 0;
        var first = opts.startingSlide;
        $slides.css({
            position: "absolute",
            top: 0,
            left: 0
        }).hide().each(function (i) {
            var z;
            if (opts.backwards) {
                z = first ? i <= first ? els.length + (i - first) : first - i : els.length - i;
            } else {
                z = first ? i >= first ? els.length - (i - first) : first - i : els.length - i;
            }
            $(this).css("z-index", z);
        });
        $(els[first]).css("opacity", 1).show();
        removeFilter(els[first], opts);
        if (opts.fit && opts.width) {
            $slides.width(opts.width);
        }
        if (opts.fit && opts.height && opts.height != "auto") {
            $slides.height(opts.height);
        }
        var reshape = opts.containerResize && !$cont.innerHeight();
        if (reshape) {
            var maxw = 0,
                maxh = 0;
            for (var j = 0; j < els.length; j++) {
                var $e = $(els[j]),
                    e = $e[0],
                    w = $e.outerWidth(),
                    h = $e.outerHeight();
                if (!w) {
                    w = e.offsetWidth || e.width || $e.attr("width");
                }
                if (!h) {
                    h = e.offsetHeight || e.height || $e.attr("height");
                }
                maxw = w > maxw ? w : maxw;
                maxh = h > maxh ? h : maxh;
            }
            if (maxw > 0 && maxh > 0) {
                $cont.css({
                    width: maxw + "px",
                    height: maxh + "px"
                });
            }
        }
        if (opts.pause) {
            $cont.hover(function () {
                this.cyclePause++;
            }, function () {
                this.cyclePause--;
            });
        }
        if (supportMultiTransitions(opts) === false) {
            return false;
        }
        var requeue = false;
        options.requeueAttempts = options.requeueAttempts || 0;
        $slides.each(function () {
            var $el = $(this);
            this.cycleH = (opts.fit && opts.height) ? opts.height : ($el.height() || this.offsetHeight || this.height || $el.attr("height") || 0);
            this.cycleW = (opts.fit && opts.width) ? opts.width : ($el.width() || this.offsetWidth || this.width || $el.attr("width") || 0);
            if ($el.is("img")) {
                var loadingIE = ($.browser.msie && this.cycleW == 28 && this.cycleH == 30 && !this.complete);
                var loadingFF = ($.browser.mozilla && this.cycleW == 34 && this.cycleH == 19 && !this.complete);
                var loadingOp = ($.browser.opera && ((this.cycleW == 42 && this.cycleH == 19) || (this.cycleW == 37 && this.cycleH == 17)) && !this.complete);
                var loadingOther = (this.cycleH == 0 && this.cycleW == 0 && !this.complete);
                if (loadingIE || loadingFF || loadingOp || loadingOther) {
                    if (o.s && opts.requeueOnImageNotLoaded && ++options.requeueAttempts < 100) {
                        log(options.requeueAttempts, " - img slide not loaded, requeuing slideshow: ", this.src, this.cycleW, this.cycleH);
                        setTimeout(function () {
                            $(o.s, o.c).cycle(options);
                        }, opts.requeueTimeout);
                        requeue = true;
                        return false;
                    } else {
                        log("could not determine size of image: " + this.src, this.cycleW, this.cycleH);
                    }
                }
            }
            return true;
        });
        if (requeue) {
            return false;
        }
        opts.cssBefore = opts.cssBefore || {};
        opts.animIn = opts.animIn || {};
        opts.animOut = opts.animOut || {};
        $slides.not(":eq(" + first + ")").css(opts.cssBefore);
        if (opts.cssFirst) {
            $($slides[first]).css(opts.cssFirst);
        }
        if (opts.timeout) {
            opts.timeout = parseInt(opts.timeout);
            if (opts.speed.constructor == String) {
                opts.speed = $.fx.speeds[opts.speed] || parseInt(opts.speed);
            }
            if (!opts.sync) {
                opts.speed = opts.speed / 2;
            }
            var buffer = opts.fx == "shuffle" ? 500 : 250;
            while ((opts.timeout - opts.speed) < buffer) {
                opts.timeout += opts.speed;
            }
        }
        if (opts.easing) {
            opts.easeIn = opts.easeOut = opts.easing;
        }
        if (!opts.speedIn) {
            opts.speedIn = opts.speed;
        }
        if (!opts.speedOut) {
            opts.speedOut = opts.speed;
        }
        opts.slideCount = els.length;
        opts.currSlide = opts.lastSlide = first;
        if (opts.random) {
            if (++opts.randomIndex == els.length) {
                opts.randomIndex = 0;
            }
            opts.nextSlide = opts.randomMap[opts.randomIndex];
        } else {
            if (opts.backwards) {
                opts.nextSlide = opts.startingSlide == 0 ? (els.length - 1) : opts.startingSlide - 1;
            } else {
                opts.nextSlide = opts.startingSlide >= (els.length - 1) ? 0 : opts.startingSlide + 1;
            }
        }
        if (!opts.multiFx) {
            var init = $.fn.cycle.transitions[opts.fx];
            if ($.isFunction(init)) {
                init($cont, $slides, opts);
            } else {
                if (opts.fx != "custom" && !opts.multiFx) {
                    log("unknown transition: " + opts.fx, "; slideshow terminating");
                    return false;
                }
            }
        }
        var e0 = $slides[first];
        if (opts.before.length) {
            opts.before[0].apply(e0, [e0, e0, opts, true]);
        }
        if (opts.after.length > 1) {
            opts.after[1].apply(e0, [e0, e0, opts, true]);
        }
        if (opts.next) {
            $(opts.next).bind(opts.prevNextEvent, function () {
                return advance(opts, opts.rev ? -1 : 1);
            });
        }
        if (opts.prev) {
            $(opts.prev).bind(opts.prevNextEvent, function () {
                return advance(opts, opts.rev ? 1 : -1);
            });
        }
        if (opts.pager || opts.pagerAnchorBuilder) {
            buildPager(els, opts);
        }
        exposeAddSlide(opts, els);
        return opts;
    }

    function saveOriginalOpts(opts) {
        opts.original = {
            before: [],
            after: []
        };
        opts.original.cssBefore = $.extend({}, opts.cssBefore);
        opts.original.cssAfter = $.extend({}, opts.cssAfter);
        opts.original.animIn = $.extend({}, opts.animIn);
        opts.original.animOut = $.extend({}, opts.animOut);
        $.each(opts.before, function () {
            opts.original.before.push(this);
        });
        $.each(opts.after, function () {
            opts.original.after.push(this);
        });
    }

    function supportMultiTransitions(opts) {
        var i, tx, txs = $.fn.cycle.transitions;
        if (opts.fx.indexOf(",") > 0) {
            opts.multiFx = true;
            opts.fxs = opts.fx.replace(/\s*/g, "").split(",");
            for (i = 0; i < opts.fxs.length; i++) {
                var fx = opts.fxs[i];
                tx = txs[fx];
                if (!tx || !txs.hasOwnProperty(fx) || !$.isFunction(tx)) {
                    log("discarding unknown transition: ", fx);
                    opts.fxs.splice(i, 1);
                    i--;
                }
            }
            if (!opts.fxs.length) {
                log("No valid transitions named; slideshow terminating.");
                return false;
            }
        } else {
            if (opts.fx == "all") {
                opts.multiFx = true;
                opts.fxs = [];
                for (p in txs) {
                    tx = txs[p];
                    if (txs.hasOwnProperty(p) && $.isFunction(tx)) {
                        opts.fxs.push(p);
                    }
                }
            }
        }
        if (opts.multiFx && opts.randomizeEffects) {
            var r1 = Math.floor(Math.random() * 20) + 30;
            for (i = 0; i < r1; i++) {
                var r2 = Math.floor(Math.random() * opts.fxs.length);
                opts.fxs.push(opts.fxs.splice(r2, 1)[0]);
            }
            debug("randomized fx sequence: ", opts.fxs);
        }
        return true;
    }

    function exposeAddSlide(opts, els) {
        opts.addSlide = function (newSlide, prepend) {
            var $s = $(newSlide),
                s = $s[0];
            if (!opts.autostopCount) {
                opts.countdown++;
            }
            els[prepend ? "unshift" : "push"](s);
            if (opts.els) {
                opts.els[prepend ? "unshift" : "push"](s);
            }
            opts.slideCount = els.length;
            $s.css("position", "absolute");
            $s[prepend ? "prependTo" : "appendTo"](opts.$cont);
            if (prepend) {
                opts.currSlide++;
                opts.nextSlide++;
            }
            if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg) {
                clearTypeFix($s);
            }
            if (opts.fit && opts.width) {
                $s.width(opts.width);
            }
            if (opts.fit && opts.height && opts.height != "auto") {
                $slides.height(opts.height);
            }
            s.cycleH = (opts.fit && opts.height) ? opts.height : $s.height();
            s.cycleW = (opts.fit && opts.width) ? opts.width : $s.width();
            $s.css(opts.cssBefore);
            if (opts.pager || opts.pagerAnchorBuilder) {
                $.fn.cycle.createPagerAnchor(els.length - 1, s, $(opts.pager), els, opts);
            }
            if ($.isFunction(opts.onAddSlide)) {
                opts.onAddSlide($s);
            } else {
                $s.hide();
            }
        };
    }
    $.fn.cycle.resetState = function (opts, fx) {
        fx = fx || opts.fx;
        opts.before = [];
        opts.after = [];
        opts.cssBefore = $.extend({}, opts.original.cssBefore);
        opts.cssAfter = $.extend({}, opts.original.cssAfter);
        opts.animIn = $.extend({}, opts.original.animIn);
        opts.animOut = $.extend({}, opts.original.animOut);
        opts.fxFn = null;
        $.each(opts.original.before, function () {
            opts.before.push(this);
        });
        $.each(opts.original.after, function () {
            opts.after.push(this);
        });
        var init = $.fn.cycle.transitions[fx];
        if ($.isFunction(init)) {
            init(opts.$cont, $(opts.elements), opts);
        }
    };

    function go(els, opts, manual, fwd) {
        if (manual && opts.busy && opts.manualTrump) {
            debug("manualTrump in go(), stopping active transition");
            $(els).stop(true, true);
            opts.busy = false;
        }
        if (opts.busy) {
            debug("transition active, ignoring new tx request");
            return;
        }
        var p = opts.$cont[0],
            curr = els[opts.currSlide],
            next = els[opts.nextSlide];
        if (p.cycleStop != opts.stopCount || p.cycleTimeout === 0 && !manual) {
            return;
        }
        if (!manual && !p.cyclePause && !opts.bounce && ((opts.autostop && (--opts.countdown <= 0)) || (opts.nowrap && !opts.random && opts.nextSlide < opts.currSlide))) {
            if (opts.end) {
                opts.end(opts);
            }
            return;
        }
        var changed = false;
        if ((manual || !p.cyclePause) && (opts.nextSlide != opts.currSlide)) {
            changed = true;
            var fx = opts.fx;
            curr.cycleH = curr.cycleH || $(curr).height();
            curr.cycleW = curr.cycleW || $(curr).width();
            next.cycleH = next.cycleH || $(next).height();
            next.cycleW = next.cycleW || $(next).width();
            if (opts.multiFx) {
                if (opts.lastFx == undefined || ++opts.lastFx >= opts.fxs.length) {
                    opts.lastFx = 0;
                }
                fx = opts.fxs[opts.lastFx];
                opts.currFx = fx;
            }
            if (opts.oneTimeFx) {
                fx = opts.oneTimeFx;
                opts.oneTimeFx = null;
            }
            $.fn.cycle.resetState(opts, fx);
            if (opts.before.length) {
                $.each(opts.before, function (i, o) {
                    if (p.cycleStop != opts.stopCount) {
                        return;
                    }
                    o.apply(next, [curr, next, opts, fwd]);
                });
            }
            var after = function () {
                $.each(opts.after, function (i, o) {
                    if (p.cycleStop != opts.stopCount) {
                        return;
                    }
                    o.apply(next, [curr, next, opts, fwd]);
                });
            };
            debug("tx firing; currSlide: " + opts.currSlide + "; nextSlide: " + opts.nextSlide);
            opts.busy = 1;
            if (opts.fxFn) {
                opts.fxFn(curr, next, opts, after, fwd, manual && opts.fastOnEvent);
            } else {
                if ($.isFunction($.fn.cycle[opts.fx])) {
                    $.fn.cycle[opts.fx](curr, next, opts, after, fwd, manual && opts.fastOnEvent);
                } else {
                    $.fn.cycle.custom(curr, next, opts, after, fwd, manual && opts.fastOnEvent);
                }
            }
        }
        if (changed || opts.nextSlide == opts.currSlide) {
            opts.lastSlide = opts.currSlide;
            if (opts.random) {
                opts.currSlide = opts.nextSlide;
                if (++opts.randomIndex == els.length) {
                    opts.randomIndex = 0;
                }
                opts.nextSlide = opts.randomMap[opts.randomIndex];
                if (opts.nextSlide == opts.currSlide) {
                    opts.nextSlide = (opts.currSlide == opts.slideCount - 1) ? 0 : opts.currSlide + 1;
                }
            } else {
                if (opts.backwards) {
                    var roll = (opts.nextSlide - 1) < 0;
                    if (roll && opts.bounce) {
                        opts.backwards = !opts.backwards;
                        opts.nextSlide = 1;
                        opts.currSlide = 0;
                    } else {
                        opts.nextSlide = roll ? (els.length - 1) : opts.nextSlide - 1;
                        opts.currSlide = roll ? 0 : opts.nextSlide + 1;
                    }
                } else {
                    var roll = (opts.nextSlide + 1) == els.length;
                    if (roll && opts.bounce) {
                        opts.backwards = !opts.backwards;
                        opts.nextSlide = els.length - 2;
                        opts.currSlide = els.length - 1;
                    } else {
                        opts.nextSlide = roll ? 0 : opts.nextSlide + 1;
                        opts.currSlide = roll ? els.length - 1 : opts.nextSlide - 1;
                    }
                }
            }
        }
        if (changed && opts.pager) {
            opts.updateActivePagerLink(opts.pager, opts.currSlide, opts.activePagerClass);
        }
        var ms = 0;
        if (opts.timeout && !opts.continuous) {
            ms = getTimeout(els[opts.currSlide], els[opts.nextSlide], opts, fwd);
        } else {
            if (opts.continuous && p.cyclePause) {
                ms = 10;
            }
        }
        if (ms > 0) {
            p.cycleTimeout = setTimeout(function () {
                go(els, opts, 0, (!opts.rev && !opts.backwards));
            }, ms);
        }
    }
    $.fn.cycle.updateActivePagerLink = function (pager, currSlide, clsName) {
        $(pager).each(function () {
            $(this).children().removeClass(clsName).eq(currSlide).addClass(clsName);
        });
    };

    function getTimeout(curr, next, opts, fwd) {
        if (opts.timeoutFn) {
            var t = opts.timeoutFn.call(curr, curr, next, opts, fwd);
            while ((t - opts.speed) < 250) {
                t += opts.speed;
            }
            debug("calculated timeout: " + t + "; speed: " + opts.speed);
            if (t !== false) {
                return t;
            }
        }
        return opts.timeout;
    }
    $.fn.cycle.next = function (opts) {
        advance(opts, opts.rev ? -1 : 1);
    };
    $.fn.cycle.prev = function (opts) {
        advance(opts, opts.rev ? 1 : -1);
    };

    function advance(opts, val) {
        var els = opts.elements;
        var p = opts.$cont[0],
            timeout = p.cycleTimeout;
        if (timeout) {
            clearTimeout(timeout);
            p.cycleTimeout = 0;
        }
        if (opts.random && val < 0) {
            opts.randomIndex--;
            if (--opts.randomIndex == -2) {
                opts.randomIndex = els.length - 2;
            } else {
                if (opts.randomIndex == -1) {
                    opts.randomIndex = els.length - 1;
                }
            }
            opts.nextSlide = opts.randomMap[opts.randomIndex];
        } else {
            if (opts.random) {
                opts.nextSlide = opts.randomMap[opts.randomIndex];
            } else {
                opts.nextSlide = opts.currSlide + val;
                if (opts.nextSlide < 0) {
                    if (opts.nowrap) {
                        return false;
                    }
                    opts.nextSlide = els.length - 1;
                } else {
                    if (opts.nextSlide >= els.length) {
                        if (opts.nowrap) {
                            return false;
                        }
                        opts.nextSlide = 0;
                    }
                }
            }
        }
        var cb = opts.onPrevNextEvent || opts.prevNextClick;
        if ($.isFunction(cb)) {
            cb(val > 0, opts.nextSlide, els[opts.nextSlide]);
        }
        go(els, opts, 1, val >= 0);
        return false;
    }

    function buildPager(els, opts) {
        var $p = $(opts.pager);
        $.each(els, function (i, o) {
            $.fn.cycle.createPagerAnchor(i, o, $p, els, opts);
        });
        opts.updateActivePagerLink(opts.pager, opts.startingSlide, opts.activePagerClass);
    }
    $.fn.cycle.createPagerAnchor = function (i, el, $p, els, opts) {
        var a;
        if ($.isFunction(opts.pagerAnchorBuilder)) {
            a = opts.pagerAnchorBuilder(i, el);
            debug("pagerAnchorBuilder(" + i + ", el) returned: " + a);
        } else {
            a = '<a href="#">' + (i + 1) + "</a>";
        }
        if (!a) {
            return;
        }
        var $a = $(a);
        if ($a.parents("body").length === 0) {
            var arr = [];
            if ($p.length > 1) {
                $p.each(function () {
                    var $clone = $a.clone(true);
                    $(this).append($clone);
                    arr.push($clone[0]);
                });
                $a = $(arr);
            } else {
                $a.appendTo($p);
            }
        }
        opts.pagerAnchors = opts.pagerAnchors || [];
        opts.pagerAnchors.push($a);
        $a.bind(opts.pagerEvent, function (e) {
            e.preventDefault();
            opts.nextSlide = i;
            var p = opts.$cont[0],
                timeout = p.cycleTimeout;
            if (timeout) {
                clearTimeout(timeout);
                p.cycleTimeout = 0;
            }
            var cb = opts.onPagerEvent || opts.pagerClick;
            if ($.isFunction(cb)) {
                cb(opts.nextSlide, els[opts.nextSlide]);
            }
            go(els, opts, 1, opts.currSlide < i);
        });
        if (!/^click/.test(opts.pagerEvent) && !opts.allowPagerClickBubble) {
            $a.bind("click.cycle", function () {
                return false;
            });
        }
        if (opts.pauseOnPagerHover) {
            $a.hover(function () {
                opts.$cont[0].cyclePause++;
            }, function () {
                opts.$cont[0].cyclePause--;
            });
        }
    };
    $.fn.cycle.hopsFromLast = function (opts, fwd) {
        var hops, l = opts.lastSlide,
            c = opts.currSlide;
        if (fwd) {
            hops = c > l ? c - l : opts.slideCount - l;
        } else {
            hops = c < l ? l - c : l + opts.slideCount - c;
        }
        return hops;
    };

    function clearTypeFix($slides) {
        debug("applying clearType background-color hack");

        function hex(s) {
            s = parseInt(s).toString(16);
            return s.length < 2 ? "0" + s : s;
        }

        function getBg(e) {
            for (; e && e.nodeName.toLowerCase() != "html"; e = e.parentNode) {
                var v = $.css(e, "background-color");
                if (v.indexOf("rgb") >= 0) {
                    var rgb = v.match(/\d+/g);
                    return "#" + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
                }
                if (v && v != "transparent") {
                    return v;
                }
            }
            return "#ffffff";
        }
        $slides.each(function () {
            $(this).css("background-color", getBg(this));
        });
    }
    $.fn.cycle.commonReset = function (curr, next, opts, w, h, rev) {
        $(opts.elements).not(curr).hide();
        opts.cssBefore.opacity = 1;
        opts.cssBefore.display = "block";
        if (w !== false && next.cycleW > 0) {
            opts.cssBefore.width = next.cycleW;
        }
        if (h !== false && next.cycleH > 0) {
            opts.cssBefore.height = next.cycleH;
        }
        opts.cssAfter = opts.cssAfter || {};
        opts.cssAfter.display = "none";
        $(curr).css("zIndex", opts.slideCount + (rev === true ? 1 : 0));
        $(next).css("zIndex", opts.slideCount + (rev === true ? 0 : 1));
    };
    $.fn.cycle.custom = function (curr, next, opts, cb, fwd, speedOverride) {
        var $l = $(curr),
            $n = $(next);
        var speedIn = opts.speedIn,
            speedOut = opts.speedOut,
            easeIn = opts.easeIn,
            easeOut = opts.easeOut;
        $n.css(opts.cssBefore);
        if (speedOverride) {
            if (typeof speedOverride == "number") {
                speedIn = speedOut = speedOverride;
            } else {
                speedIn = speedOut = 1;
            }
            easeIn = easeOut = null;
        }
        var fn = function () {
            $n.animate(opts.animIn, speedIn, easeIn, cb);
        };
        $l.animate(opts.animOut, speedOut, easeOut, function () {
            if (opts.cssAfter) {
                $l.css(opts.cssAfter);
            }
            if (!opts.sync) {
                fn();
            }
        });
        if (opts.sync) {
            fn();
        }
    };
    $.fn.cycle.transitions = {
        fade: function ($cont, $slides, opts) {
            $slides.not(":eq(" + opts.currSlide + ")").css("opacity", 0);
            opts.before.push(function (curr, next, opts) {
                $.fn.cycle.commonReset(curr, next, opts);
                opts.cssBefore.opacity = 0;
            });
            opts.animIn = {
                opacity: 1
            };
            opts.animOut = {
                opacity: 0
            };
            opts.cssBefore = {
                top: 0,
                left: 0
            };
        }
    };
    $.fn.cycle.ver = function () {
        return ver;
    };
    $.fn.cycle.defaults = {
        fx: "fade",
        timeout: 4000,
        timeoutFn: null,
        continuous: 0,
        speed: 1000,
        speedIn: null,
        speedOut: null,
        next: null,
        prev: null,
        onPrevNextEvent: null,
        prevNextEvent: "click.cycle",
        pager: null,
        onPagerEvent: null,
        pagerEvent: "click.cycle",
        allowPagerClickBubble: false,
        pagerAnchorBuilder: null,
        before: null,
        after: null,
        end: null,
        easing: null,
        easeIn: null,
        easeOut: null,
        shuffle: null,
        animIn: null,
        animOut: null,
        cssBefore: null,
        cssAfter: null,
        fxFn: null,
        height: "auto",
        startingSlide: 0,
        sync: 1,
        random: 0,
        fit: 0,
        containerResize: 1,
        pause: 0,
        pauseOnPagerHover: 0,
        autostop: 0,
        autostopCount: 0,
        delay: 0,
        slideExpr: null,
        cleartype: !$.support.opacity,
        cleartypeNoBg: false,
        nowrap: 0,
        fastOnEvent: 0,
        randomizeEffects: 1,
        rev: 0,
        manualTrump: true,
        requeueOnImageNotLoaded: true,
        requeueTimeout: 250,
        activePagerClass: "activeSlide",
        updateActivePagerLink: null,
        backwards: false
    };
})(jQuery);

(function ($) {
    $.fn.cycle.transitions.none = function ($cont, $slides, opts) {
        opts.fxFn = function (curr, next, opts, after) {
            $(next).show();
            $(curr).hide();
            after();
        };
    };
    $.fn.cycle.transitions.scrollUp = function ($cont, $slides, opts) {
        $cont.css("overflow", "hidden");
        opts.before.push($.fn.cycle.commonReset);
        var h = $cont.height();
        opts.cssBefore = {
            top: h,
            left: 0
        };
        opts.cssFirst = {
            top: 0
        };
        opts.animIn = {
            top: 0
        };
        opts.animOut = {
            top: -h
        };
    };
    $.fn.cycle.transitions.scrollDown = function ($cont, $slides, opts) {
        $cont.css("overflow", "hidden");
        opts.before.push($.fn.cycle.commonReset);
        var h = $cont.height();
        opts.cssFirst = {
            top: 0
        };
        opts.cssBefore = {
            top: -h,
            left: 0
        };
        opts.animIn = {
            top: 0
        };
        opts.animOut = {
            top: h
        };
    };
    $.fn.cycle.transitions.scrollLeft = function ($cont, $slides, opts) {
        $cont.css("overflow", "hidden");
        opts.before.push($.fn.cycle.commonReset);
        var w = $cont.width();
        opts.cssFirst = {
            left: 0
        };
        opts.cssBefore = {
            left: w,
            top: 0
        };
        opts.animIn = {
            left: 0
        };
        opts.animOut = {
            left: 0 - w
        };
    };
    $.fn.cycle.transitions.scrollRight = function ($cont, $slides, opts) {
        $cont.css("overflow", "hidden");
        opts.before.push($.fn.cycle.commonReset);
        var w = $cont.width();
        opts.cssFirst = {
            left: 0
        };
        opts.cssBefore = {
            left: -w,
            top: 0
        };
        opts.animIn = {
            left: 0
        };
        opts.animOut = {
            left: w
        };
    };
    $.fn.cycle.transitions.scrollHorz = function ($cont, $slides, opts) {
        $cont.css("overflow", "hidden").width();
        opts.before.push(function (curr, next, opts, fwd) {
            $.fn.cycle.commonReset(curr, next, opts);
            opts.cssBefore.left = fwd ? (next.cycleW - 1) : (1 - next.cycleW);
            opts.animOut.left = fwd ? -curr.cycleW : curr.cycleW;
        });
        opts.cssFirst = {
            left: 0
        };
        opts.cssBefore = {
            top: 0
        };
        opts.animIn = {
            left: 0
        };
        opts.animOut = {
            top: 0
        };
    };
    $.fn.cycle.transitions.scrollVert = function ($cont, $slides, opts) {
        $cont.css("overflow", "hidden");
        opts.before.push(function (curr, next, opts, fwd) {
            $.fn.cycle.commonReset(curr, next, opts);
            opts.cssBefore.top = fwd ? (1 - next.cycleH) : (next.cycleH - 1);
            opts.animOut.top = fwd ? curr.cycleH : -curr.cycleH;
        });
        opts.cssFirst = {
            top: 0
        };
        opts.cssBefore = {
            left: 0
        };
        opts.animIn = {
            top: 0
        };
        opts.animOut = {
            left: 0
        };
    };
    $.fn.cycle.transitions.slideX = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $(opts.elements).not(curr).hide();
            $.fn.cycle.commonReset(curr, next, opts, false, true);
            opts.animIn.width = next.cycleW;
        });
        opts.cssBefore = {
            left: 0,
            top: 0,
            width: 0
        };
        opts.animIn = {
            width: "show"
        };
        opts.animOut = {
            width: 0
        };
    };
    $.fn.cycle.transitions.slideY = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $(opts.elements).not(curr).hide();
            $.fn.cycle.commonReset(curr, next, opts, true, false);
            opts.animIn.height = next.cycleH;
        });
        opts.cssBefore = {
            left: 0,
            top: 0,
            height: 0
        };
        opts.animIn = {
            height: "show"
        };
        opts.animOut = {
            height: 0
        };
    };
    $.fn.cycle.transitions.shuffle = function ($cont, $slides, opts) {
        var i, w = $cont.css("overflow", "visible").width();
        $slides.css({
            left: 0,
            top: 0
        });
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, true, true, true);
        });
        if (!opts.speedAdjusted) {
            opts.speed = opts.speed / 2;
            opts.speedAdjusted = true;
        }
        opts.random = 0;
        opts.shuffle = opts.shuffle || {
            left: -w,
            top: 15
        };
        opts.els = [];
        for (i = 0; i < $slides.length; i++) {
            opts.els.push($slides[i]);
        }
        for (i = 0; i < opts.currSlide; i++) {
            opts.els.push(opts.els.shift());
        }
        opts.fxFn = function (curr, next, opts, cb, fwd) {
            var $el = fwd ? $(curr) : $(next);
            $(next).css(opts.cssBefore);
            var count = opts.slideCount;
            $el.animate(opts.shuffle, opts.speedIn, opts.easeIn, function () {
                var hops = $.fn.cycle.hopsFromLast(opts, fwd);
                for (var k = 0; k < hops; k++) {
                    fwd ? opts.els.push(opts.els.shift()) : opts.els.unshift(opts.els.pop());
                }
                if (fwd) {
                    for (var i = 0, len = opts.els.length; i < len; i++) {
                        $(opts.els[i]).css("z-index", len - i + count);
                    }
                } else {
                    var z = $(curr).css("z-index");
                    $el.css("z-index", parseInt(z) + 1 + count);
                }
                $el.animate({
                    left: 0,
                    top: 0
                }, opts.speedOut, opts.easeOut, function () {
                    $(fwd ? this : curr).hide();
                    if (cb) {
                        cb();
                    }
                });
            });
        };
        opts.cssBefore = {
            display: "block",
            opacity: 1,
            top: 0,
            left: 0
        };
    };
    $.fn.cycle.transitions.turnUp = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, true, false);
            opts.cssBefore.top = next.cycleH;
            opts.animIn.height = next.cycleH;
        });
        opts.cssFirst = {
            top: 0
        };
        opts.cssBefore = {
            left: 0,
            height: 0
        };
        opts.animIn = {
            top: 0
        };
        opts.animOut = {
            height: 0
        };
    };
    $.fn.cycle.transitions.turnDown = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, true, false);
            opts.animIn.height = next.cycleH;
            opts.animOut.top = curr.cycleH;
        });
        opts.cssFirst = {
            top: 0
        };
        opts.cssBefore = {
            left: 0,
            top: 0,
            height: 0
        };
        opts.animOut = {
            height: 0
        };
    };
    $.fn.cycle.transitions.turnLeft = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, false, true);
            opts.cssBefore.left = next.cycleW;
            opts.animIn.width = next.cycleW;
        });
        opts.cssBefore = {
            top: 0,
            width: 0
        };
        opts.animIn = {
            left: 0
        };
        opts.animOut = {
            width: 0
        };
    };
    $.fn.cycle.transitions.turnRight = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, false, true);
            opts.animIn.width = next.cycleW;
            opts.animOut.left = curr.cycleW;
        });
        opts.cssBefore = {
            top: 0,
            left: 0,
            width: 0
        };
        opts.animIn = {
            left: 0
        };
        opts.animOut = {
            width: 0
        };
    };
    $.fn.cycle.transitions.zoom = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, false, false, true);
            opts.cssBefore.top = next.cycleH / 2;
            opts.cssBefore.left = next.cycleW / 2;
            opts.animIn = {
                top: 0,
                left: 0,
                width: next.cycleW,
                height: next.cycleH
            };
            opts.animOut = {
                width: 0,
                height: 0,
                top: curr.cycleH / 2,
                left: curr.cycleW / 2
            };
        });
        opts.cssFirst = {
            top: 0,
            left: 0
        };
        opts.cssBefore = {
            width: 0,
            height: 0
        };
    };
    $.fn.cycle.transitions.fadeZoom = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, false, false);
            opts.cssBefore.left = next.cycleW / 2;
            opts.cssBefore.top = next.cycleH / 2;
            opts.animIn = {
                top: 0,
                left: 0,
                width: next.cycleW,
                height: next.cycleH
            };
        });
        opts.cssBefore = {
            width: 0,
            height: 0
        };
        opts.animOut = {
            opacity: 0
        };
    };
    $.fn.cycle.transitions.blindX = function ($cont, $slides, opts) {
        var w = $cont.css("overflow", "hidden").width();
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts);
            opts.animIn.width = next.cycleW;
            opts.animOut.left = curr.cycleW;
        });
        opts.cssBefore = {
            left: w,
            top: 0
        };
        opts.animIn = {
            left: 0
        };
        opts.animOut = {
            left: w
        };
    };
    $.fn.cycle.transitions.blindY = function ($cont, $slides, opts) {
        var h = $cont.css("overflow", "hidden").height();
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts);
            opts.animIn.height = next.cycleH;
            opts.animOut.top = curr.cycleH;
        });
        opts.cssBefore = {
            top: h,
            left: 0
        };
        opts.animIn = {
            top: 0
        };
        opts.animOut = {
            top: h
        };
    };
    $.fn.cycle.transitions.blindZ = function ($cont, $slides, opts) {
        var h = $cont.css("overflow", "hidden").height();
        var w = $cont.width();
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts);
            opts.animIn.height = next.cycleH;
            opts.animOut.top = curr.cycleH;
        });
        opts.cssBefore = {
            top: h,
            left: w
        };
        opts.animIn = {
            top: 0,
            left: 0
        };
        opts.animOut = {
            top: h,
            left: w
        };
    };
    $.fn.cycle.transitions.growX = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, false, true);
            opts.cssBefore.left = this.cycleW / 2;
            opts.animIn = {
                left: 0,
                width: this.cycleW
            };
            opts.animOut = {
                left: 0
            };
        });
        opts.cssBefore = {
            width: 0,
            top: 0
        };
    };
    $.fn.cycle.transitions.growY = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, true, false);
            opts.cssBefore.top = this.cycleH / 2;
            opts.animIn = {
                top: 0,
                height: this.cycleH
            };
            opts.animOut = {
                top: 0
            };
        });
        opts.cssBefore = {
            height: 0,
            left: 0
        };
    };
    $.fn.cycle.transitions.curtainX = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, false, true, true);
            opts.cssBefore.left = next.cycleW / 2;
            opts.animIn = {
                left: 0,
                width: this.cycleW
            };
            opts.animOut = {
                left: curr.cycleW / 2,
                width: 0
            };
        });
        opts.cssBefore = {
            top: 0,
            width: 0
        };
    };
    $.fn.cycle.transitions.curtainY = function ($cont, $slides, opts) {
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, true, false, true);
            opts.cssBefore.top = next.cycleH / 2;
            opts.animIn = {
                top: 0,
                height: next.cycleH
            };
            opts.animOut = {
                top: curr.cycleH / 2,
                height: 0
            };
        });
        opts.cssBefore = {
            left: 0,
            height: 0
        };
    };
    $.fn.cycle.transitions.cover = function ($cont, $slides, opts) {
        var d = opts.direction || "left";
        var w = $cont.css("overflow", "hidden").width();
        var h = $cont.height();
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts);
            if (d == "right") {
                opts.cssBefore.left = -w;
            } else {
                if (d == "up") {
                    opts.cssBefore.top = h;
                } else {
                    if (d == "down") {
                        opts.cssBefore.top = -h;
                    } else {
                        opts.cssBefore.left = w;
                    }
                }
            }
        });
        opts.animIn = {
            left: 0,
            top: 0
        };
        opts.animOut = {
            opacity: 1
        };
        opts.cssBefore = {
            top: 0,
            left: 0
        };
    };
    $.fn.cycle.transitions.uncover = function ($cont, $slides, opts) {
        var d = opts.direction || "left";
        var w = $cont.css("overflow", "hidden").width();
        var h = $cont.height();
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, true, true, true);
            if (d == "right") {
                opts.animOut.left = w;
            } else {
                if (d == "up") {
                    opts.animOut.top = -h;
                } else {
                    if (d == "down") {
                        opts.animOut.top = h;
                    } else {
                        opts.animOut.left = -w;
                    }
                }
            }
        });
        opts.animIn = {
            left: 0,
            top: 0
        };
        opts.animOut = {
            opacity: 1
        };
        opts.cssBefore = {
            top: 0,
            left: 0
        };
    };
    $.fn.cycle.transitions.toss = function ($cont, $slides, opts) {
        var w = $cont.css("overflow", "visible").width();
        var h = $cont.height();
        opts.before.push(function (curr, next, opts) {
            $.fn.cycle.commonReset(curr, next, opts, true, true, true);
            if (!opts.animOut.left && !opts.animOut.top) {
                opts.animOut = {
                    left: w * 2,
                    top: -h / 2,
                    opacity: 0
                };
            } else {
                opts.animOut.opacity = 0;
            }
        });
        opts.cssBefore = {
            left: 0,
            top: 0
        };
        opts.animIn = {
            left: 0
        };
    };
    $.fn.cycle.transitions.wipe = function ($cont, $slides, opts) {
        var w = $cont.css("overflow", "hidden").width();
        var h = $cont.height();
        opts.cssBefore = opts.cssBefore || {};
        var clip;
        if (opts.clip) {
            if (/l2r/.test(opts.clip)) {
                clip = "rect(0px 0px " + h + "px 0px)";
            } else {
                if (/r2l/.test(opts.clip)) {
                    clip = "rect(0px " + w + "px " + h + "px " + w + "px)";
                } else {
                    if (/t2b/.test(opts.clip)) {
                        clip = "rect(0px " + w + "px 0px 0px)";
                    } else {
                        if (/b2t/.test(opts.clip)) {
                            clip = "rect(" + h + "px " + w + "px " + h + "px 0px)";
                        } else {
                            if (/zoom/.test(opts.clip)) {
                                var top = parseInt(h / 2);
                                var left = parseInt(w / 2);
                                clip = "rect(" + top + "px " + left + "px " + top + "px " + left + "px)";
                            }
                        }
                    }
                }
            }
        }
        opts.cssBefore.clip = opts.cssBefore.clip || clip || "rect(0px 0px 0px 0px)";
        var d = opts.cssBefore.clip.match(/(\d+)/g);
        var t = parseInt(d[0]),
            r = parseInt(d[1]),
            b = parseInt(d[2]),
            l = parseInt(d[3]);
        opts.before.push(function (curr, next, opts) {
            if (curr == next) {
                return;
            }
            var $curr = $(curr),
                $next = $(next);
            $.fn.cycle.commonReset(curr, next, opts, true, true, false);
            opts.cssAfter.display = "block";
            var step = 1,
                count = parseInt((opts.speedIn / 13)) - 1;
            (function f() {
                var tt = t ? t - parseInt(step * (t / count)) : 0;
                var ll = l ? l - parseInt(step * (l / count)) : 0;
                var bb = b < h ? b + parseInt(step * ((h - b) / count || 1)) : h;
                var rr = r < w ? r + parseInt(step * ((w - r) / count || 1)) : w;
                $next.css({
                    clip: "rect(" + tt + "px " + rr + "px " + bb + "px " + ll + "px)"
                });
                (step++ <= count) ? setTimeout(f, 13): $curr.css("display", "none");
            })();
        });
        opts.cssBefore = {
            display: "block",
            opacity: 1,
            top: 0,
            left: 0
        };
        opts.animIn = {
            left: 0
        };
        opts.animOut = {
            left: 0
        };
    };
})(jQuery);

(function ($) {
    // Shortcuts (to increase compression)
    var colorbox = 'colorbox',
        hover = 'hover',
        TRUE = true,
        FALSE = false,
        cboxPublic,
        isIE = !$.support.opacity,
        isIE6 = isIE && !window.XMLHttpRequest,

        // Event Strings (to increase compression)
        cbox_open = 'cbox_open',
        cbox_load = 'cbox_load',
        cbox_complete = 'cbox_complete',
        cbox_cleanup = 'cbox_cleanup',
        cbox_closed = 'cbox_closed',
        cbox_resize = 'resize.cbox_resize',

        // Cached jQuery Object Variables
        $overlay,
        $cbox,
        $wrap,
        $content,
        $topBorder,
        $leftBorder,
        $rightBorder,
        $bottomBorder,
        $related,
        $window,
        $loaded,
        $loadingBay,
        $loadingOverlay,
        $loadingGraphic,
        $title,
        $current,
        $slideshow,
        $next,
        $prev,
        $close,

        // Variables for cached values or use across multiple functions
        interfaceHeight,
        interfaceWidth,
        loadedHeight,
        loadedWidth,
        element,
        bookmark,
        index,
        settings,
        open,
        active,

        // ColorBox Default Settings.	
        // See http://colorpowered.com/colorbox for details.
        defaults = {
            transition: "elastic",
            speed: 350,
            width: FALSE,
            height: FALSE,
            innerWidth: FALSE,
            innerHeight: FALSE,
            initialWidth: "400",
            initialHeight: "400",
            maxWidth: FALSE,
            maxHeight: FALSE,
            scalePhotos: TRUE,
            scrolling: TRUE,
            inline: FALSE,
            html: FALSE,
            iframe: FALSE,
            photo: FALSE,
            href: FALSE,
            title: FALSE,
            rel: FALSE,
            opacity: 0.9,
            preloading: TRUE,
            current: "",
            previous: "previous",
            next: "next",
            close: "close",
            open: FALSE,
            overlayClose: TRUE,

            slideshow: FALSE,
            slideshowAuto: TRUE,
            slideshowSpeed: 2500,
            slideshowStart: "start slideshow",
            slideshowStop: "stop slideshow",

            onOpen: FALSE,
            onLoad: FALSE,
            onComplete: FALSE,
            onCleanup: FALSE,
            onClosed: FALSE
        };

    // ****************
    // HELPER FUNCTIONS
    // ****************

    // Convert % values to pixels
    function setSize(size, dimension) {
        dimension = dimension === 'x' ? $window.width() : $window.height(); //document.documentElement.clientWidth : document.documentElement.clientHeight;
        return (typeof size === 'string') ? Math.round((size.match(/%/) ? (dimension / 100) * parseInt(size, 10) : parseInt(size, 10))) : size;
    }

    // Checks an href to see if it is a photo.
    // There is a force photo option (photo: true) for hrefs that cannot be matched by this regex.
    function isImage(url) {
        url = $.isFunction(url) ? url.call(element) : url;
        return settings.photo || url.match(/\.(gif|png|jpg|jpeg|bmp)(?:\?([^#]*))?(?:#(\.*))?$/i);
    }

    // Assigns functions results to their respective settings.  This allows functions to be used to set ColorBox options.
    function process() {
        for (var i in settings) {
            if ($.isFunction(settings[i]) && i.substring(0, 2) !== 'on') { // checks to make sure the function isn't one of the callbacks, they will be handled at the appropriate time.
                settings[i] = settings[i].call(element);
            }
        }
    }

    function launch(elem) {

        element = elem;

        settings = $(element).data(colorbox);

        process(); // Convert functions to their returned values.

        var rel = settings.rel || element.rel;

        if (rel && rel !== 'nofollow') {
            $related = $('.cboxElement').filter(function () {
                var relRelated = $(this).data(colorbox).rel || this.rel;
                return (relRelated === rel);
            });
            index = $related.index(element);

            // Check direct calls to ColorBox.
            if (index < 0) {
                $related = $related.add(element);
                index = $related.length - 1;
            }
        } else {
            $related = $(element);
            index = 0;
        }

        if (!open) {
            open = TRUE;

            active = TRUE; // Prevents the page-change action from queuing up if the visitor holds down the left or right keys.

            bookmark = element;

            bookmark.blur(); // Remove the focus from the calling element.

            // Set Navigation Key Bindings
            $().bind("keydown.cbox_close", function (e) {
                if (e.keyCode === 27) {
                    e.preventDefault();
                    cboxPublic.close();
                }
            }).bind("keydown.cbox_arrows", function (e) {
                if ($related.length > 1) {
                    if (e.keyCode === 37) {
                        e.preventDefault();
                        $prev.click();
                    } else if (e.keyCode === 39) {
                        e.preventDefault();
                        $next.click();
                    }
                }
            });

            if (settings.overlayClose) {
                $overlay.css({
                    "cursor": "pointer"
                }).one('click', cboxPublic.close);
            }

            $.event.trigger(cbox_open);
            if (settings.onOpen) {
                settings.onOpen.call(element);
            }

            $overlay.css({
                "opacity": settings.opacity
            }).show();

            // Opens inital empty ColorBox prior to content being loaded.
            settings.w = setSize(settings.initialWidth, 'x');
            settings.h = setSize(settings.initialHeight, 'y');
            cboxPublic.position(0);

            if (isIE6) {
                $window.bind('resize.cboxie6 scroll.cboxie6', function () {
                    $overlay.css({
                        width: $window.width(),
                        height: $window.height(),
                        top: $window.scrollTop(),
                        left: $window.scrollLeft()
                    });
                }).trigger("scroll.cboxie6");
            }
        }

        $current.add($prev).add($next).add($slideshow).add($title).hide();

        $close.html(settings.close).show();

        cboxPublic.slideshow();

        cboxPublic.load();
    }

    // ****************
    // PUBLIC FUNCTIONS
    // Usage format: $.fn.colorbox.close();
    // Usage from within an iframe: parent.$.fn.colorbox.close();
    // ****************

    cboxPublic = $.fn.colorbox = function (options, callback) {
        var $this = this;

        if (!$this.length) {
            if ($this.selector === '') { // empty selector means a direct call, ie: $.fn.colorbox();
                $this = $($this);
                options.open = TRUE;
            } else { // else the selector didn't match anything, and colorbox should go ahead and return.
                return this;
            }
        }

        $this.each(function () {
            var data = $.extend({}, $(this).data(colorbox) ? $(this).data(colorbox) : defaults, options);

            $(this).data(colorbox, data).addClass("cboxElement");

            if (callback) {
                $(this).data(colorbox).onComplete = callback;
            }
        });

        if (options && options.open) {
            launch($this);
        }

        return this;
    };

    // Initialize ColorBox: store common calculations, preload the interface graphics, append the html.
    // This preps colorbox for a speedy open when clicked, and lightens the burdon on the browser by only
    // having to run once, instead of each time colorbox is opened.
    cboxPublic.init = function () {

        // jQuery object generator to save a bit of space
        function $div(id) {
            return $('<div id="cbox' + id + '"/>');
        }

        // Create & Append jQuery Objects
        $window = $(window);
        $cbox = $('<div id="colorbox"/>');
        $overlay = $div("Overlay").hide();
        $wrap = $div("Wrapper");
        $content = $div("Content").append(
            $loaded = $div("LoadedContent").css({
                width: 0,
                height: 0
            }),
            $loadingOverlay = $div("LoadingOverlay"),
            $loadingGraphic = $div("LoadingGraphic"),
            $title = $div("Title"),
            $current = $div("Current"),
            $slideshow = $div("Slideshow"),
            $next = $div("Next"),
            $prev = $div("Previous"),
            $close = $div("Close")
        );
        $wrap.append( // The 3x3 Grid that makes up ColorBox
            $('<div/>').append(
                $div("TopLeft"),
                $topBorder = $div("TopCenter"),
                $div("TopRight")
            ),
            $('<div/>').append(
                $leftBorder = $div("MiddleLeft"),
                $content,
                $rightBorder = $div("MiddleRight")
            ),
            $('<div/>').append(
                $div("BottomLeft"),
                $bottomBorder = $div("BottomCenter"),
                $div("BottomRight")
            )
        ).children().children().css({
            'float': 'left'
        });

        $loadingBay = $("<div style='position:absolute; top:0; left:0; width:9999px; height:0;'/>");

        $('body').prepend($overlay, $cbox.append($wrap, $loadingBay));

        if (isIE) {
            $cbox.addClass('cboxIE');
            if (isIE6) {
                $overlay.css('position', 'absolute');
            }
        }

        // Add rollover event to navigation elements
        $content.children()
            .addClass(hover)
            .mouseover(function () {
                $(this).addClass(hover);
            })
            .mouseout(function () {
                $(this).removeClass(hover);
            });

        // Cache values needed for size calculations
        interfaceHeight = $topBorder.height() + $bottomBorder.height() + $content.outerHeight(TRUE) - $content.height(); //Subtraction needed for IE6
        interfaceWidth = $leftBorder.width() + $rightBorder.width() + $content.outerWidth(TRUE) - $content.width();
        loadedHeight = $loaded.outerHeight(TRUE);
        loadedWidth = $loaded.outerWidth(TRUE);

        // Setting padding to remove the need to do size conversions during the animation step.
        $cbox.css({
            "padding-bottom": interfaceHeight,
            "padding-right": interfaceWidth
        }).hide();

        // Setup button & key events.
        $next.click(cboxPublic.next);
        $prev.click(cboxPublic.prev);
        $close.click(cboxPublic.close);

        // Adding the 'hover' class allowed the browser to load the hover-state
        // background graphics.  The class can now can be removed.
        $content.children().removeClass(hover);

        $('.cboxElement').live('click', function (e) {
            if (e.button !== 0 && typeof e.button !== 'undefined') { // checks to see if it was a non-left mouse-click.
                return TRUE;
            } else {
                launch(this);
                return FALSE;
            }
        });
    };

    cboxPublic.position = function (speed, loadedCallback) {
        var
            animate_speed,
            winHeight = $window.height(),
            // keeps the top and left positions within the browser's viewport.
            posTop = Math.max(winHeight - settings.h - loadedHeight - interfaceHeight, 0) / 2 + $window.scrollTop(),
            posLeft = Math.max(document.documentElement.clientWidth - settings.w - loadedWidth - interfaceWidth, 0) / 2 + $window.scrollLeft();

        // setting the speed to 0 to reduce the delay between same-sized content.
        animate_speed = ($cbox.width() === settings.w + loadedWidth && $cbox.height() === settings.h + loadedHeight) ? 0 : speed;

        // this gives the wrapper plenty of breathing room so it's floated contents can move around smoothly,
        // but it has to be shrank down around the size of div#colorbox when it's done.  If not,
        // it can invoke an obscure IE bug when using iframes.
        $wrap[0].style.width = $wrap[0].style.height = "9999px";

        function modalDimensions(that) {
            // loading overlay size has to be sure that IE6 uses the correct height.
            $topBorder[0].style.width = $bottomBorder[0].style.width = $content[0].style.width = that.style.width;
            $loadingGraphic[0].style.height = $loadingOverlay[0].style.height = $content[0].style.height = $leftBorder[0].style.height = $rightBorder[0].style.height = that.style.height;
        }

        $cbox.dequeue().animate({
            width: settings.w + loadedWidth,
            height: settings.h + loadedHeight,
            top: posTop,
            left: posLeft
        }, {
            duration: animate_speed,
            complete: function () {
                modalDimensions(this);

                active = FALSE;

                // shrink the wrapper down to exactly the size of colorbox to avoid a bug in IE's iframe implementation.
                $wrap[0].style.width = (settings.w + loadedWidth + interfaceWidth) + "px";
                $wrap[0].style.height = (settings.h + loadedHeight + interfaceHeight) + "px";

                if (loadedCallback) {
                    loadedCallback();
                }
            },
            step: function () {
                modalDimensions(this);
            }
        });
    };

    cboxPublic.resize = function (object) {
        if (!open) {
            return;
        }

        var topMargin,
            prev,
            prevSrc,
            next,
            nextSrc,
            photo,
            timeout,
            speed = settings.transition === "none" ? 0 : settings.speed;

        $window.unbind(cbox_resize);

        if (!object) {
            timeout = setTimeout(function () { // timer allows IE to render the dimensions before attempting to calculate the height
                var $child = $loaded.wrapInner("<div style='overflow:auto'></div>").children(); // temporary wrapper to get an accurate estimate of just how high the total content should be.
                settings.h = $child.height();
                $loaded.css({
                    height: settings.h
                });
                $child.replaceWith($child.children()); // ditch the temporary wrapper div used in height calculation
                cboxPublic.position(speed);
            }, 1);
            return;
        }

        $loaded.remove();
        $loaded = $('<div id="cboxLoadedContent"/>').html(object);

        function getWidth() {
            settings.w = settings.w || $loaded.width();
            settings.w = settings.mw && settings.mw < settings.w ? settings.mw : settings.w;
            return settings.w;
        }

        function getHeight() {
            settings.h = settings.h || $loaded.height();
            settings.h = settings.mh && settings.mh < settings.h ? settings.mh : settings.h;
            return settings.h;
        }

        $loaded.hide()
            .appendTo($loadingBay) // content has to be appended to the DOM for accurate size calculations.  Appended to an absolutely positioned element, rather than BODY, which avoids an extremely brief display of the vertical scrollbar in Firefox that can occur for a small minority of websites.
            .css({
                width: getWidth(),
                overflow: settings.scrolling ? 'auto' : 'hidden'
            })
            .css({
                height: getHeight()
            }) // sets the height independently from the width in case the new width influences the value of height.
            .prependTo($content);

        $('#cboxPhoto').css({
            cssFloat: 'none'
        }); // floating the IMG removes the bottom line-height and fixed a problem where IE miscalculates the width of the parent element as 100% of the document width.

        // Hides SELECT elements in IE6 because they would otherwise sit on top of the overlay.
        if (isIE6) {
            $('select:not(#colorbox select)').filter(function () {
                return this.style.visibility !== 'hidden';
            }).css({
                'visibility': 'hidden'
            }).one(cbox_cleanup, function () {
                this.style.visibility = 'inherit';
            });
        }

        function setPosition(s) {
            cboxPublic.position(s, function () {
                if (!open) {
                    return;
                }

                if (isIE) {
                    //This fadeIn helps the bicubic resampling to kick-in.
                    if (photo) {
                        $loaded.fadeIn(100);
                    }
                    //IE adds a filter when ColorBox fades in and out that can cause problems if the loaded content contains transparent pngs.
                    $cbox[0].style.removeAttribute("filter");
                }

                //Waited until the iframe is added to the DOM & it is visible before setting the src.
                //This increases compatability with pages using DOM dependent JavaScript.
                if (settings.iframe) {
                    $loaded.append("<iframe id='cboxIframe'" + (settings.scrolling ? " " : "scrolling='no'") + " name='iframe_" + new Date().getTime() + "' frameborder=0 src='" + (settings.href || element.href) + "' " + (isIE ? "allowtransparency='true'" : '') + " />");
                }

                $loaded.show();

                $title.html(settings.title || element.title);

                $title.show();

                if ($related.length > 1) {
                    $current.html(settings.current.replace(/\{current\}/, index + 1).replace(/\{total\}/, $related.length)).show();
                    $next.html(settings.next).show();
                    $prev.html(settings.previous).show();

                    if (settings.slideshow) {
                        $slideshow.show();
                    }
                }

                $loadingOverlay.hide();
                $loadingGraphic.hide();

                $.event.trigger(cbox_complete);
                if (settings.onComplete) {
                    settings.onComplete.call(element);
                }

                if (settings.transition === 'fade') {
                    $cbox.fadeTo(speed, 1, function () {
                        if (isIE) {
                            $cbox[0].style.removeAttribute("filter");
                        }
                    });
                }

                $window.bind(cbox_resize, function () {
                    cboxPublic.position(0);
                });
            });
        }

        if ((settings.transition === 'fade' && $cbox.fadeTo(speed, 0, function () {
                setPosition(0);
            })) || setPosition(speed)) {}

        // Preloads images within a rel group
        if (settings.preloading && $related.length > 1) {
            prev = index > 0 ? $related[index - 1] : $related[$related.length - 1];
            next = index < $related.length - 1 ? $related[index + 1] : $related[0];
            nextSrc = $(next).data(colorbox).href || next.href;
            prevSrc = $(prev).data(colorbox).href || prev.href;

            if (isImage(nextSrc)) {
                $('<img />').attr('src', nextSrc);
            }

            if (isImage(prevSrc)) {
                $('<img />').attr('src', prevSrc);
            }
        }
    };

    cboxPublic.load = function () {
        var href, img, setResize, resize = cboxPublic.resize;

        active = TRUE;

        /*
         
        // I decided to comment this out because I can see it causing problems as users
        // really should just set the dimensions on their IMG elements instead,
        // but I'm leaving the code in as it may be useful to someone.
        // To use, uncomment the function and change 'if(textStatus === "success"){ resize(this); }'
        // to 'if(textStatus === "success"){ preload(this); }'
        
        // Preload loops through the HTML to find IMG elements and loads their sources.
        // This allows the resize method to accurately estimate the dimensions of the new content.
        function preload(html){
        	var
        	$ajax = $(html),
        	$imgs = $ajax.find('img'),
        	x = $imgs.length;
        	
        	function loadloop(){
        		var img = new Image();
        		x = x-1;
        		if(x >= 0){
        			img.onload = loadloop;
        			img.src = $imgs[x].src;
        		} else {
        			resize($ajax);
        		}
        	}
        	
        	loadloop();
        }
        */

        element = $related[index];

        settings = $(element).data(colorbox);

        //convert functions to static values
        process();

        $.event.trigger(cbox_load);
        if (settings.onLoad) {
            settings.onLoad.call(element);
        }

        // Evaluate the height based on the optional height and width settings.
        settings.h = settings.height ?
            setSize(settings.height, 'y') - loadedHeight - interfaceHeight :
            settings.innerHeight ?
            setSize(settings.innerHeight, 'y') :
            FALSE;
        settings.w = settings.width ?
            setSize(settings.width, 'x') - loadedWidth - interfaceWidth :
            settings.innerWidth ?
            setSize(settings.innerWidth, 'x') :
            FALSE;

        // Sets the minimum dimensions for use in image scaling
        settings.mw = settings.w;
        settings.mh = settings.h;

        // Re-evaluate the minimum width and height based on maxWidth and maxHeight values.
        // If the width or height exceed the maxWidth or maxHeight, use the maximum values instead.
        if (settings.maxWidth) {
            settings.mw = setSize(settings.maxWidth, 'x') - loadedWidth - interfaceWidth;
            settings.mw = settings.w && settings.w < settings.mw ? settings.w : settings.mw;
        }
        if (settings.maxHeight) {
            settings.mh = setSize(settings.maxHeight, 'y') - loadedHeight - interfaceHeight;
            settings.mh = settings.h && settings.h < settings.mh ? settings.h : settings.mh;
        }

        href = settings.href || $(element).attr("href");

        $loadingOverlay.show();
        $loadingGraphic.show();

        if (settings.inline) {
            // Inserts an empty placeholder where inline content is being pulled from.
            // An event is bound to put inline content back when ColorBox closes or loads new content.
            $('<div id="cboxInlineTemp" />').hide().insertBefore($(href)[0]).bind(cbox_load + ' ' + cbox_cleanup, function () {
                $(this).replaceWith($loaded.children());
            });
            resize($(href));
        } else if (settings.iframe) {
            // IFrame element won't be added to the DOM until it is ready to be displayed,
            // to avoid problems with DOM-ready JS that might be trying to run in that iframe.
            resize(" ");
        } else if (settings.html) {
            resize(settings.html);
        } else if (isImage(href)) {
            img = new Image();
            img.onload = function () {
                var percent;

                img.onload = null;

                img.id = 'cboxPhoto';

                $(img).css({
                    margin: 'auto',
                    border: 'none',
                    display: 'block',
                    cssFloat: 'left'
                });

                if (settings.scalePhotos) {
                    setResize = function () {
                        img.height -= img.height * percent;
                        img.width -= img.width * percent;
                    };
                    if (settings.mw && img.width > settings.mw) {
                        percent = (img.width - settings.mw) / img.width;
                        setResize();
                    }
                    if (settings.mh && img.height > settings.mh) {
                        percent = (img.height - settings.mh) / img.height;
                        setResize();
                    }
                }

                if (settings.h) {
                    img.style.marginTop = Math.max(settings.h - img.height, 0) / 2 + 'px';
                }

                resize(img);

                if ($related.length > 1) {
                    $(img).css({
                        cursor: 'pointer'
                    }).click(cboxPublic.next);
                }

                if (isIE) {
                    img.style.msInterpolationMode = 'bicubic';
                }
            };
            img.src = href;
        } else {
            $('<div />').appendTo($loadingBay).load(href, function (data, textStatus) {
                if (textStatus === "success") {
                    resize(this);
                } else {
                    resize($("<p>Request unsuccessful.</p>"));
                }
            });
        }
    };

    // Navigates to the next page/image in a set.
    cboxPublic.next = function () {
        if (!active) {
            index = index < $related.length - 1 ? index + 1 : 0;
            cboxPublic.load();
        }
    };

    cboxPublic.prev = function () {
        if (!active) {
            index = index > 0 ? index - 1 : $related.length - 1;
            cboxPublic.load();
        }
    };

    cboxPublic.slideshow = function () {
        var stop, timeOut, className = 'cboxSlideshow_';

        $slideshow.bind(cbox_closed, function () {
            $slideshow.unbind();
            clearTimeout(timeOut);
            $cbox.removeClass(className + "off" + " " + className + "on");
        });

        function start() {
            $slideshow
                .text(settings.slideshowStop)
                .bind(cbox_complete, function () {
                    timeOut = setTimeout(cboxPublic.next, settings.slideshowSpeed);
                })
                .bind(cbox_load, function () {
                    clearTimeout(timeOut);
                }).one("click", function () {
                    stop();
                    $(this).removeClass(hover);
                });
            $cbox.removeClass(className + "off").addClass(className + "on");
        }

        stop = function () {
            clearTimeout(timeOut);
            $slideshow
                .text(settings.slideshowStart)
                .unbind(cbox_complete + ' ' + cbox_load)
                .one("click", function () {
                    start();
                    timeOut = setTimeout(cboxPublic.next, settings.slideshowSpeed);
                    $(this).removeClass(hover);
                });
            $cbox.removeClass(className + "on").addClass(className + "off");
        };

        if (settings.slideshow && $related.length > 1) {
            if (settings.slideshowAuto) {
                start();
            } else {
                stop();
            }
        }
    };

    // Note: to use this within an iframe use the following format: parent.$.fn.colorbox.close();
    cboxPublic.close = function () {

        $.event.trigger(cbox_cleanup);
        if (settings.onCleanup) {
            settings.onCleanup.call(element);
        }

        open = FALSE;
        $().unbind("keydown.cbox_close keydown.cbox_arrows");
        $window.unbind(cbox_resize + ' resize.cboxie6 scroll.cboxie6');
        $overlay.css({
            cursor: 'auto'
        }).fadeOut('fast');

        $cbox
            .stop(TRUE, FALSE)
            .fadeOut('fast', function () {
                $loaded.remove();
                $cbox.css({
                    'opacity': 1
                });

                try {
                    bookmark.focus();
                } catch (er) {
                    // do nothing
                }

                $.event.trigger(cbox_closed);
                if (settings.onClosed) {
                    settings.onClosed.call(element);
                }
            });
    };

    // A method for fetching the current element ColorBox is referencing.
    // returns a jQuery object.
    cboxPublic.element = function () {
        return $(element);
    };

    cboxPublic.settings = defaults;

    // Initializes ColorBox when the DOM has loaded
    $(cboxPublic.init);

}(jQuery));

var $ = jQuery.noConflict();
$(document).ready(function () {
    /* for top navigation */
    $(" #menu ul ").css({
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


(function (a) {
    a.fn.equalHeights = function (c, b) {
        tallest = c ? c : 0;
        this.each(function () {
            if (a.browser.msie && a.browser.version.substr(0, 1) < 7) {
                if (this.offsetHeight > tallest) tallest = this.offsetHeight
            } else if (a(this).height() > tallest) tallest = a(this).height()
        });
        if (b && tallest > b) tallest = b;
        return this.each(function () {
            a.browser.msie && a.browser.version.substr(0, 1) < 7 ? a(this).height(tallest) : a(this).css({
                "*height": tallest,
                "min-height": tallest
            });
            $childElements = a(this).children(".autoPadDiv");
            $childElements.css({
                "*height": tallest,
                "min-height": tallest
            })
        })
    }
})(jQuery);