(function ($, undefined) {
    var defaults = {defaultView: 'month', aspectRatio: 1.35, header: {left: 'title', center: '', right: 'today prev,next'}, weekends: true, allDayDefault: true, ignoreTimezone: true, lazyFetching: true, startParam: 'start', endParam: 'end', titleFormat: {month: 'MMMM yyyy', week: "MMM d[ yyyy]{ '&#8212;'[ MMM] d yyyy}", day: 'dddd, MMM d, yyyy'}, columnFormat: {month: 'ddd', week: 'ddd M/d', day: 'dddd M/d'}, timeFormat: {'': 'h(:mm)t'}, isRTL: false, firstDay: 0, monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], buttonText: {prev: '&nbsp;&#9668;&nbsp;', next: '&nbsp;&#9658;&nbsp;', prevYear: '&nbsp;&lt;&lt;&nbsp;', nextYear: '&nbsp;&gt;&gt;&nbsp;', today: 'today', month: 'month', week: 'week', day: 'day'}, theme: false, buttonIcons: {prev: 'circle-triangle-w', next: 'circle-triangle-e'}, unselectAuto: true, dropAccept: '*'};
    var rtlDefaults = {header: {left: 'next,prev today', center: '', right: 'title'}, buttonText: {prev: '&nbsp;&#9658;&nbsp;', next: '&nbsp;&#9668;&nbsp;', prevYear: '&nbsp;&gt;&gt;&nbsp;', nextYear: '&nbsp;&lt;&lt;&nbsp;'}, buttonIcons: {prev: 'circle-triangle-e', next: 'circle-triangle-w'}};
    var fc = $.fullCalendar = {version: "1.5.3"};
    var fcViews = fc.views = {};
    $.fn.fullCalendar = function (options) {
        if (typeof options == 'string') {
            var args = Array.prototype.slice.call(arguments, 1);
            var res;
            this.each(function () {
                var calendar = $.data(this, 'fullCalendar');
                if (calendar && $.isFunction(calendar[options])) {
                    var r = calendar[options].apply(calendar, args);
                    if (res === undefined) {
                        res = r
                    }
                    if (options == 'destroy') {
                        $.removeData(this, 'fullCalendar')
                    }
                }
            });
            if (res !== undefined) {
                return res
            }
            return this
        }
        var eventSources = options.eventSources || [];
        delete options.eventSources;
        if (options.events) {
            eventSources.push(options.events);
            delete options.events
        }
        options = $.extend(true, {}, defaults, (options.isRTL || options.isRTL === undefined && defaults.isRTL) ? rtlDefaults : {}, options);
        this.each(function (i, _element) {
            var element = $(_element);
            var calendar = new Calendar(element, options, eventSources);
            element.data('fullCalendar', calendar);
            calendar.render()
        });
        return this
    };
    function setDefaults(d) {
        $.extend(true, defaults, d)
    }

    function Calendar(element, options, eventSources) {
        var t = this;
        t.options = options;
        t.render = render;
        t.destroy = destroy;
        t.refetchEvents = refetchEvents;
        t.reportEvents = reportEvents;
        t.reportEventChange = reportEventChange;
        t.rerenderEvents = rerenderEvents;
        t.changeView = changeView;
        t.select = select;
        t.unselect = unselect;
        t.prev = prev;
        t.next = next;
        t.prevYear = prevYear;
        t.nextYear = nextYear;
        t.today = today;
        t.gotoDate = gotoDate;
        t.incrementDate = incrementDate;
        t.formatDate = function (format, date) {
            return formatDate(format, date, options)
        };
        t.formatDates = function (format, date1, date2) {
            return formatDates(format, date1, date2, options)
        };
        t.getDate = getDate;
        t.getView = getView;
        t.option = option;
        t.trigger = trigger;
        EventManager.call(t, options, eventSources);
        var isFetchNeeded = t.isFetchNeeded;
        var fetchEvents = t.fetchEvents;
        var _element = element[0];
        var header;
        var headerElement;
        var content;
        var tm;
        var currentView;
        var viewInstances = {};
        var elementOuterWidth;
        var suggestedViewHeight;
        var absoluteViewElement;
        var resizeUID = 0;
        var ignoreWindowResize = 0;
        var date = new Date();
        var events = [];
        var _dragElement;
        setYMD(date, options.year, options.month, options.date);
        function render(inc) {
            if (!content) {
                initialRender()
            } else {
                calcSize();
                markSizesDirty();
                markEventsDirty();
                renderView(inc)
            }
        }

        function initialRender() {
            tm = options.theme ? 'ui' : 'fc';
            element.addClass('fc');
            if (options.isRTL) {
                element.addClass('fc-rtl')
            }
            if (options.theme) {
                element.addClass('ui-widget')
            }
            content = $("<div class='fc-content' style='position:relative'/>").prependTo(element);
            header = new Header(t, options);
            headerElement = header.render();
            if (headerElement) {
                element.prepend(headerElement)
            }
            changeView(options.defaultView);
            $(window).resize(windowResize);
            if (!bodyVisible()) {
                lateRender()
            }
        }

        function lateRender() {
            setTimeout(function () {
                if (!currentView.start && bodyVisible()) {
                    renderView()
                }
            }, 0)
        }

        function destroy() {
            $(window).unbind('resize', windowResize);
            header.destroy();
            content.remove();
            element.removeClass('fc fc-rtl ui-widget')
        }

        function elementVisible() {
            return _element.offsetWidth !== 0
        }

        function bodyVisible() {
            return $('body')[0].offsetWidth !== 0
        }

        function changeView(newViewName) {
            if (!currentView || newViewName != currentView.name) {
                ignoreWindowResize++;
                unselect();
                var oldView = currentView;
                var newViewElement;
                if (oldView) {
                    (oldView.beforeHide || noop)();
                    setMinHeight(content, content.height());
                    oldView.element.hide()
                } else {
                    setMinHeight(content, 1)
                }
                content.css('overflow', 'hidden');
                currentView = viewInstances[newViewName];
                if (currentView) {
                    currentView.element.show()
                } else {
                    currentView = viewInstances[newViewName] = new fcViews[newViewName](newViewElement = absoluteViewElement = $("<div class='fc-view fc-view-" + newViewName + "' style='position:absolute'/>").appendTo(content), t)
                }
                if (oldView) {
                    header.deactivateButton(oldView.name)
                }
                header.activateButton(newViewName);
                renderView();
                content.css('overflow', '');
                if (oldView) {
                    setMinHeight(content, 1)
                }
                if (!newViewElement) {
                    (currentView.afterShow || noop)()
                }
                ignoreWindowResize--
            }
        }

        function renderView(inc) {
            if (elementVisible()) {
                ignoreWindowResize++;
                unselect();
                if (suggestedViewHeight === undefined) {
                    calcSize()
                }
                var forceEventRender = false;
                if (!currentView.start || inc || date < currentView.start || date >= currentView.end) {
                    currentView.render(date, inc || 0);
                    setSize(true);
                    forceEventRender = true
                } else if (currentView.sizeDirty) {
                    currentView.clearEvents();
                    setSize();
                    forceEventRender = true
                } else if (currentView.eventsDirty) {
                    currentView.clearEvents();
                    forceEventRender = true
                }
                currentView.sizeDirty = false;
                currentView.eventsDirty = false;
                updateEvents(forceEventRender);
                elementOuterWidth = element.outerWidth();
                header.updateTitle(currentView.title);
                var today = new Date();
                if (today >= currentView.start && today < currentView.end) {
                    header.disableButton('today')
                } else {
                    header.enableButton('today')
                }
                ignoreWindowResize--;
                currentView.trigger('viewDisplay', _element)
            }
        }

        function updateSize() {
            markSizesDirty();
            if (elementVisible()) {
                calcSize();
                setSize();
                unselect();
                currentView.clearEvents();
                currentView.renderEvents(events);
                currentView.sizeDirty = false
            }
        }

        function markSizesDirty() {
            $.each(viewInstances, function (i, inst) {
                inst.sizeDirty = true
            })
        }

        function calcSize() {
            if (options.contentHeight) {
                suggestedViewHeight = options.contentHeight
            } else if (options.height) {
                suggestedViewHeight = options.height - (headerElement ? headerElement.height() : 0) - vsides(content)
            } else {
                suggestedViewHeight = Math.round(content.width() / Math.max(options.aspectRatio, .5))
            }
        }

        function setSize(dateChanged) {
            ignoreWindowResize++;
            currentView.setHeight(suggestedViewHeight, dateChanged);
            if (absoluteViewElement) {
                absoluteViewElement.css('position', 'relative');
                absoluteViewElement = null
            }
            currentView.setWidth(content.width(), dateChanged);
            ignoreWindowResize--
        }

        function windowResize() {
            if (!ignoreWindowResize) {
                if (currentView.start) {
                    var uid = ++resizeUID;
                    setTimeout(function () {
                        if (uid == resizeUID && !ignoreWindowResize && elementVisible()) {
                            if (elementOuterWidth != (elementOuterWidth = element.outerWidth())) {
                                ignoreWindowResize++;
                                updateSize();
                                currentView.trigger('windowResize', _element);
                                ignoreWindowResize--
                            }
                        }
                    }, 200)
                } else {
                    lateRender()
                }
            }
        }

        function updateEvents(forceRender) {
            if (!options.lazyFetching || isFetchNeeded(currentView.visStart, currentView.visEnd)) {
                refetchEvents()
            } else if (forceRender) {
                rerenderEvents()
            }
        }

        function refetchEvents() {
            fetchEvents(currentView.visStart, currentView.visEnd)
        }

        function reportEvents(_events) {
            events = _events;
            rerenderEvents()
        }

        function reportEventChange(eventID) {
            rerenderEvents(eventID)
        }

        function rerenderEvents(modifiedEventID) {
            markEventsDirty();
            if (elementVisible()) {
                currentView.clearEvents();
                currentView.renderEvents(events, modifiedEventID);
                currentView.eventsDirty = false
            }
        }

        function markEventsDirty() {
            $.each(viewInstances, function (i, inst) {
                inst.eventsDirty = true
            })
        }

        function select(start, end, allDay) {
            currentView.select(start, end, allDay === undefined ? true : allDay)
        }

        function unselect() {
            if (currentView) {
                currentView.unselect()
            }
        }

        function prev() {
            renderView(-1)
        }

        function next() {
            renderView(1)
        }

        function prevYear() {
            addYears(date, -1);
            renderView()
        }

        function nextYear() {
            addYears(date, 1);
            renderView()
        }

        function today() {
            date = new Date();
            renderView()
        }

        function gotoDate(year, month, dateOfMonth) {
            if (year instanceof Date) {
                date = cloneDate(year)
            } else {
                setYMD(date, year, month, dateOfMonth)
            }
            renderView()
        }

        function incrementDate(years, months, days) {
            if (years !== undefined) {
                addYears(date, years)
            }
            if (months !== undefined) {
                addMonths(date, months)
            }
            if (days !== undefined) {
                addDays(date, days)
            }
            renderView()
        }

        function getDate() {
            return cloneDate(date)
        }

        function getView() {
            return currentView
        }

        function option(name, value) {
            if (value === undefined) {
                return options[name]
            }
            if (name == 'height' || name == 'contentHeight' || name == 'aspectRatio') {
                options[name] = value;
                updateSize()
            }
        }

        function trigger(name, thisObj) {
            if (options[name]) {
                return options[name].apply(thisObj || _element, Array.prototype.slice.call(arguments, 2))
            }
        }

        if (options.droppable) {
            $(document).bind('dragstart', function (ev, ui) {
                var _e = ev.target;
                var e = $(_e);
                if (!e.parents('.fc').length) {
                    var accept = options.dropAccept;
                    if ($.isFunction(accept) ? accept.call(_e, e) : e.is(accept)) {
                        _dragElement = _e;
                        currentView.dragStart(_dragElement, ev, ui)
                    }
                }
            }).bind('dragstop', function (ev, ui) {
                if (_dragElement) {
                    currentView.dragStop(_dragElement, ev, ui);
                    _dragElement = null
                }
            })
        }
    }

    function Header(calendar, options) {
        var t = this;
        t.render = render;
        t.destroy = destroy;
        t.updateTitle = updateTitle;
        t.activateButton = activateButton;
        t.deactivateButton = deactivateButton;
        t.disableButton = disableButton;
        t.enableButton = enableButton;
        var element = $([]);
        var tm;

        function render() {
            tm = options.theme ? 'ui' : 'fc';
            var sections = options.header;
            if (sections) {
                element = $("<table class='fc-header' style='width:100%'/>").append($("<tr/>").append(renderSection('left')).append(renderSection('center')).append(renderSection('right')));
                return element
            }
        }

        function destroy() {
            element.remove()
        }

        function renderSection(position) {
            var e = $("<td class='fc-header-" + position + "'/>");
            var buttonStr = options.header[position];
            if (buttonStr) {
                $.each(buttonStr.split(' '), function (i) {
                    if (i > 0) {
                        e.append("<span class='fc-header-space'/>")
                    }
                    var prevButton;
                    $.each(this.split(','), function (j, buttonName) {
                        if (buttonName == 'title') {
                            e.append("<span class='fc-header-title'><h2>&nbsp;</h2></span>");
                            if (prevButton) {
                                prevButton.addClass(tm + '-corner-right')
                            }
                            prevButton = null
                        } else {
                            var buttonClick;
                            if (calendar[buttonName]) {
                                buttonClick = calendar[buttonName]
                            } else if (fcViews[buttonName]) {
                                buttonClick = function () {
                                    button.removeClass(tm + '-state-hover');
                                    calendar.changeView(buttonName)
                                }
                            }
                            if (buttonClick) {
                                var icon = options.theme ? smartProperty(options.buttonIcons, buttonName) : null;
                                var text = smartProperty(options.buttonText, buttonName);
                                var button = $("<span class='fc-button fc-button-" + buttonName + " " + tm + "-state-default'><span class='fc-button-inner'><span class='fc-button-content'>" + (icon ? "<span class='fc-icon-wrap'><span class='ui-icon ui-icon-" + icon + "'/></span>" : text) + "</span><span class='fc-button-effect'><span></span></span></span></span>");
                                if (button) {
                                    button.click(function () {
                                        if (!button.hasClass(tm + '-state-disabled')) {
                                            buttonClick()
                                        }
                                    }).mousedown(function () {
                                        button.not('.' + tm + '-state-active').not('.' + tm + '-state-disabled').addClass(tm + '-state-down')
                                    }).mouseup(function () {
                                        button.removeClass(tm + '-state-down')
                                    }).hover(function () {
                                        button.not('.' + tm + '-state-active').not('.' + tm + '-state-disabled').addClass(tm + '-state-hover')
                                    }, function () {
                                        button.removeClass(tm + '-state-hover').removeClass(tm + '-state-down')
                                    }).appendTo(e);
                                    if (!prevButton) {
                                        button.addClass(tm + '-corner-left')
                                    }
                                    prevButton = button
                                }
                            }
                        }
                    });
                    if (prevButton) {
                        prevButton.addClass(tm + '-corner-right')
                    }
                })
            }
            return e
        }

        function updateTitle(html) {
            element.find('h2').html(html)
        }

        function activateButton(buttonName) {
            element.find('span.fc-button-' + buttonName).addClass(tm + '-state-active')
        }

        function deactivateButton(buttonName) {
            element.find('span.fc-button-' + buttonName).removeClass(tm + '-state-active')
        }

        function disableButton(buttonName) {
            element.find('span.fc-button-' + buttonName).addClass(tm + '-state-disabled')
        }

        function enableButton(buttonName) {
            element.find('span.fc-button-' + buttonName).removeClass(tm + '-state-disabled')
        }
    }

    fc.sourceNormalizers = [];
    fc.sourceFetchers = [];
    var ajaxDefaults = {dataType: 'json', cache: false};
    var eventGUID = 1;

    function EventManager(options, _sources) {
        var t = this;
        t.isFetchNeeded = isFetchNeeded;
        t.fetchEvents = fetchEvents;
        t.addEventSource = addEventSource;
        t.removeEventSource = removeEventSource;
        t.updateEvent = updateEvent;
        t.renderEvent = renderEvent;
        t.removeEvents = removeEvents;
        t.clientEvents = clientEvents;
        t.normalizeEvent = normalizeEvent;
        var trigger = t.trigger;
        var getView = t.getView;
        var reportEvents = t.reportEvents;
        var stickySource = {events: []};
        var sources = [stickySource];
        var rangeStart, rangeEnd;
        var currentFetchID = 0;
        var pendingSourceCnt = 0;
        var loadingLevel = 0;
        var cache = [];
        for (var i = 0; i < _sources.length; i++) {
            _addEventSource(_sources[i])
        }
        function isFetchNeeded(start, end) {
            return!rangeStart || start < rangeStart || end > rangeEnd
        }

        function fetchEvents(start, end) {
            rangeStart = start;
            rangeEnd = end;
            cache = [];
            var fetchID = ++currentFetchID;
            var len = sources.length;
            pendingSourceCnt = len;
            for (var i = 0; i < len; i++) {
                fetchEventSource(sources[i], fetchID)
            }
        }

        function fetchEventSource(source, fetchID) {
            _fetchEventSource(source, function (events) {
                if (fetchID == currentFetchID) {
                    if (events) {
                        for (var i = 0; i < events.length; i++) {
                            events[i].source = source;
                            normalizeEvent(events[i])
                        }
                        cache = cache.concat(events)
                    }
                    pendingSourceCnt--;
                    if (!pendingSourceCnt) {
                        reportEvents(cache)
                    }
                }
            })
        }

        function _fetchEventSource(source, callback) {
            var i;
            var fetchers = fc.sourceFetchers;
            var res;
            for (i = 0; i < fetchers.length; i++) {
                res = fetchers[i](source, rangeStart, rangeEnd, callback);
                if (res === true) {
                    return
                } else if (typeof res == 'object') {
                    _fetchEventSource(res, callback);
                    return
                }
            }
            var events = source.events;
            if (events) {
                if ($.isFunction(events)) {
                    pushLoading();
                    events(cloneDate(rangeStart), cloneDate(rangeEnd), function (events) {
                        callback(events);
                        popLoading()
                    })
                } else if ($.isArray(events)) {
                    callback(events)
                } else {
                    callback()
                }
            } else {
                var url = source.url;
                if (url) {
                    var success = source.success;
                    var error = source.error;
                    var complete = source.complete;
                    var data = $.extend({}, source.data || {});
                    var startParam = firstDefined(source.startParam, options.startParam);
                    var endParam = firstDefined(source.endParam, options.endParam);
                    if (startParam) {
                        data[startParam] = Math.round(+rangeStart / 1000)
                    }
                    if (endParam) {
                        data[endParam] = Math.round(+rangeEnd / 1000)
                    }
                    pushLoading();
                    $.ajax($.extend({}, ajaxDefaults, source, {data: data, success: function (events) {
                        events = events || [];
                        var res = applyAll(success, this, arguments);
                        if ($.isArray(res)) {
                            events = res
                        }
                        callback(events)
                    }, error: function () {
                        applyAll(error, this, arguments);
                        callback()
                    }, complete: function () {
                        applyAll(complete, this, arguments);
                        popLoading()
                    }}))
                } else {
                    callback()
                }
            }
        }

        function addEventSource(source) {
            source = _addEventSource(source);
            if (source) {
                pendingSourceCnt++;
                fetchEventSource(source, currentFetchID)
            }
        }

        function _addEventSource(source) {
            if ($.isFunction(source) || $.isArray(source)) {
                source = {events: source}
            } else if (typeof source == 'string') {
                source = {url: source}
            }
            if (typeof source == 'object') {
                normalizeSource(source);
                sources.push(source);
                return source
            }
        }

        function removeEventSource(source) {
            sources = $.grep(sources, function (src) {
                return!isSourcesEqual(src, source)
            });
            cache = $.grep(cache, function (e) {
                return!isSourcesEqual(e.source, source)
            });
            reportEvents(cache)
        }

        function updateEvent(event) {
            var i, len = cache.length, e, defaultEventEnd = getView().defaultEventEnd, startDelta = event.start - event._start, endDelta = event.end ? (event.end - (event._end || defaultEventEnd(event))) : 0;
            for (i = 0; i < len; i++) {
                e = cache[i];
                if (e._id == event._id && e != event) {
                    e.start = new Date(+e.start + startDelta);
                    if (event.end) {
                        if (e.end) {
                            e.end = new Date(+e.end + endDelta)
                        } else {
                            e.end = new Date(+defaultEventEnd(e) + endDelta)
                        }
                    } else {
                        e.end = null
                    }
                    e.title = event.title;
                    e.url = event.url;
                    e.allDay = event.allDay;
                    e.className = event.className;
                    e.editable = event.editable;
                    e.color = event.color;
                    e.backgroudColor = event.backgroudColor;
                    e.borderColor = event.borderColor;
                    e.textColor = event.textColor;
                    normalizeEvent(e)
                }
            }
            normalizeEvent(event);
            reportEvents(cache)
        }

        function renderEvent(event, stick) {
            normalizeEvent(event);
            if (!event.source) {
                if (stick) {
                    stickySource.events.push(event);
                    event.source = stickySource
                }
                cache.push(event)
            }
            reportEvents(cache)
        }

        function removeEvents(filter) {
            if (!filter) {
                cache = [];
                for (var i = 0; i < sources.length; i++) {
                    if ($.isArray(sources[i].events)) {
                        sources[i].events = []
                    }
                }
            } else {
                if (!$.isFunction(filter)) {
                    var id = filter + '';
                    filter = function (e) {
                        return e._id == id
                    }
                }
                cache = $.grep(cache, filter, true);
                for (var i = 0; i < sources.length; i++) {
                    if ($.isArray(sources[i].events)) {
                        sources[i].events = $.grep(sources[i].events, filter, true)
                    }
                }
            }
            reportEvents(cache)
        }

        function clientEvents(filter) {
            if ($.isFunction(filter)) {
                return $.grep(cache, filter)
            } else if (filter) {
                filter += '';
                return $.grep(cache, function (e) {
                    return e._id == filter
                })
            }
            return cache
        }

        function pushLoading() {
            if (!loadingLevel++) {
                trigger('loading', null, true)
            }
        }

        function popLoading() {
            if (!--loadingLevel) {
                trigger('loading', null, false)
            }
        }

        function normalizeEvent(event) {
            var source = event.source || {};
            var ignoreTimezone = firstDefined(source.ignoreTimezone, options.ignoreTimezone);
            event._id = event._id || (event.id === undefined ? '_fc' + eventGUID++ : event.id + '');
            if (event.date) {
                if (!event.start) {
                    event.start = event.date
                }
                delete event.date
            }
            event._start = cloneDate(event.start = parseDate(event.start, ignoreTimezone));
            event.end = parseDate(event.end, ignoreTimezone);
            if (event.end && event.end <= event.start) {
                event.end = null
            }
            event._end = event.end ? cloneDate(event.end) : null;
            if (event.allDay === undefined) {
                event.allDay = firstDefined(source.allDayDefault, options.allDayDefault)
            }
            if (event.className) {
                if (typeof event.className == 'string') {
                    event.className = event.className.split(/\s+/)
                }
            } else {
                event.className = []
            }
        }

        function normalizeSource(source) {
            if (source.className) {
                if (typeof source.className == 'string') {
                    source.className = source.className.split(/\s+/)
                }
            } else {
                source.className = []
            }
            var normalizers = fc.sourceNormalizers;
            for (var i = 0; i < normalizers.length; i++) {
                normalizers[i](source)
            }
        }

        function isSourcesEqual(source1, source2) {
            return source1 && source2 && getSourcePrimitive(source1) == getSourcePrimitive(source2)
        }

        function getSourcePrimitive(source) {
            return((typeof source == 'object') ? (source.events || source.url) : '') || source
        }
    }

    fc.addDays = addDays;
    fc.cloneDate = cloneDate;
    fc.parseDate = parseDate;
    fc.parseISO8601 = parseISO8601;
    fc.parseTime = parseTime;
    fc.formatDate = formatDate;
    fc.formatDates = formatDates;
    var dayIDs = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], DAY_MS = 86400000, HOUR_MS = 3600000, MINUTE_MS = 60000;

    function addYears(d, n, keepTime) {
        d.setFullYear(d.getFullYear() + n);
        if (!keepTime) {
            clearTime(d)
        }
        return d
    }

    function addMonths(d, n, keepTime) {
        if (+d) {
            var m = d.getMonth() + n, check = cloneDate(d);
            check.setDate(1);
            check.setMonth(m);
            d.setMonth(m);
            if (!keepTime) {
                clearTime(d)
            }
            while (d.getMonth() != check.getMonth()) {
                d.setDate(d.getDate() + (d < check ? 1 : -1))
            }
        }
        return d
    }

    function addDays(d, n, keepTime) {
        if (+d) {
            var dd = d.getDate() + n, check = cloneDate(d);
            check.setHours(9);
            check.setDate(dd);
            d.setDate(dd);
            if (!keepTime) {
                clearTime(d)
            }
            fixDate(d, check)
        }
        return d
    }

    function fixDate(d, check) {
        if (+d) {
            while (d.getDate() != check.getDate()) {
                d.setTime(+d + (d < check ? 1 : -1) * HOUR_MS)
            }
        }
    }

    function addMinutes(d, n) {
        d.setMinutes(d.getMinutes() + n);
        return d
    }

    function clearTime(d) {
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
        return d
    }

    function cloneDate(d, dontKeepTime) {
        if (dontKeepTime) {
            return clearTime(new Date(+d))
        }
        return new Date(+d)
    }

    function zeroDate() {
        var i = 0, d;
        do {
            d = new Date(1970, i++, 1)
        } while (d.getHours());
        return d
    }

    function skipWeekend(date, inc, excl) {
        inc = inc || 1;
        while (!date.getDay() || (excl && date.getDay() == 1 || !excl && date.getDay() == 6)) {
            addDays(date, inc)
        }
        return date
    }

    function dayDiff(d1, d2) {
        return Math.round((cloneDate(d1, true) - cloneDate(d2, true)) / DAY_MS)
    }

    function setYMD(date, y, m, d) {
        if (y !== undefined && y != date.getFullYear()) {
            date.setDate(1);
            date.setMonth(0);
            date.setFullYear(y)
        }
        if (m !== undefined && m != date.getMonth()) {
            date.setDate(1);
            date.setMonth(m)
        }
        if (d !== undefined) {
            date.setDate(d)
        }
    }

    function parseDate(s, ignoreTimezone) {
        if (typeof s == 'object') {
            return s
        }
        if (typeof s == 'number') {
            return new Date(s * 1000)
        }
        if (typeof s == 'string') {
            if (s.match(/^\d+(\.\d+)?$/)) {
                return new Date(parseFloat(s) * 1000)
            }
            if (ignoreTimezone === undefined) {
                ignoreTimezone = true
            }
            return parseISO8601(s, ignoreTimezone) || (s ? new Date(s) : null)
        }
        return null
    }

    function parseISO8601(s, ignoreTimezone) {
        var m = s.match(/^([0-9]{4})(-([0-9]{2})(-([0-9]{2})([T ]([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([-+])([0-9]{2})(:?([0-9]{2}))?))?)?)?)?$/);
        if (!m) {
            return null
        }
        var date = new Date(m[1], 0, 1);
        if (ignoreTimezone || !m[13]) {
            var check = new Date(m[1], 0, 1, 9, 0);
            if (m[3]) {
                date.setMonth(m[3] - 1);
                check.setMonth(m[3] - 1)
            }
            if (m[5]) {
                date.setDate(m[5]);
                check.setDate(m[5])
            }
            fixDate(date, check);
            if (m[7]) {
                date.setHours(m[7])
            }
            if (m[8]) {
                date.setMinutes(m[8])
            }
            if (m[10]) {
                date.setSeconds(m[10])
            }
            if (m[12]) {
                date.setMilliseconds(Number("0." + m[12]) * 1000)
            }
            fixDate(date, check)
        } else {
            date.setUTCFullYear(m[1], m[3] ? m[3] - 1 : 0, m[5] || 1);
            date.setUTCHours(m[7] || 0, m[8] || 0, m[10] || 0, m[12] ? Number("0." + m[12]) * 1000 : 0);
            if (m[14]) {
                var offset = Number(m[16]) * 60 + (m[18] ? Number(m[18]) : 0);
                offset *= m[15] == '-' ? 1 : -1;
                date = new Date(+date + (offset * 60 * 1000))
            }
        }
        return date
    }

    function parseTime(s) {
        if (typeof s == 'number') {
            return s * 60
        }
        if (typeof s == 'object') {
            return s.getHours() * 60 + s.getMinutes()
        }
        var m = s.match(/(\d+)(?::(\d+))?\s*(\w+)?/);
        if (m) {
            var h = parseInt(m[1], 10);
            if (m[3]) {
                h %= 12;
                if (m[3].toLowerCase().charAt(0) == 'p') {
                    h += 12
                }
            }
            return h * 60 + (m[2] ? parseInt(m[2], 10) : 0)
        }
    }

    function formatDate(date, format, options) {
        return formatDates(date, null, format, options)
    }

    function formatDates(date1, date2, format, options) {
        options = options || defaults;
        var date = date1, otherDate = date2, i, len = format.length, c, i2, formatter, res = '';
        for (i = 0; i < len; i++) {
            c = format.charAt(i);
            if (c == "'") {
                for (i2 = i + 1; i2 < len; i2++) {
                    if (format.charAt(i2) == "'") {
                        if (date) {
                            if (i2 == i + 1) {
                                res += "'"
                            } else {
                                res += format.substring(i + 1, i2)
                            }
                            i = i2
                        }
                        break
                    }
                }
            } else if (c == '(') {
                for (i2 = i + 1; i2 < len; i2++) {
                    if (format.charAt(i2) == ')') {
                        var subres = formatDate(date, format.substring(i + 1, i2), options);
                        if (parseInt(subres.replace(/\D/, ''), 10)) {
                            res += subres
                        }
                        i = i2;
                        break
                    }
                }
            } else if (c == '[') {
                for (i2 = i + 1; i2 < len; i2++) {
                    if (format.charAt(i2) == ']') {
                        var subformat = format.substring(i + 1, i2);
                        var subres = formatDate(date, subformat, options);
                        if (subres != formatDate(otherDate, subformat, options)) {
                            res += subres
                        }
                        i = i2;
                        break
                    }
                }
            } else if (c == '{') {
                date = date2;
                otherDate = date1
            } else if (c == '}') {
                date = date1;
                otherDate = date2
            } else {
                for (i2 = len; i2 > i; i2--) {
                    if (formatter = dateFormatters[format.substring(i, i2)]) {
                        if (date) {
                            res += formatter(date, options)
                        }
                        i = i2 - 1;
                        break
                    }
                }
                if (i2 == i) {
                    if (date) {
                        res += c
                    }
                }
            }
        }
        return res
    };
    var dateFormatters = {s: function (d) {
        return d.getSeconds()
    }, ss: function (d) {
        return zeroPad(d.getSeconds())
    }, m: function (d) {
        return d.getMinutes()
    }, mm: function (d) {
        return zeroPad(d.getMinutes())
    }, h: function (d) {
        return d.getHours() % 12 || 12
    }, hh: function (d) {
        return zeroPad(d.getHours() % 12 || 12)
    }, H: function (d) {
        return d.getHours()
    }, HH: function (d) {
        return zeroPad(d.getHours())
    }, d: function (d) {
        return d.getDate()
    }, dd: function (d) {
        return zeroPad(d.getDate())
    }, ddd: function (d, o) {
        return o.dayNamesShort[d.getDay()]
    }, dddd: function (d, o) {
        return o.dayNames[d.getDay()]
    }, M: function (d) {
        return d.getMonth() + 1
    }, MM: function (d) {
        return zeroPad(d.getMonth() + 1)
    }, MMM: function (d, o) {
        return o.monthNamesShort[d.getMonth()]
    }, MMMM: function (d, o) {
        return o.monthNames[d.getMonth()]
    }, yy: function (d) {
        return(d.getFullYear() + '').substring(2)
    }, yyyy: function (d) {
        return d.getFullYear()
    }, t: function (d) {
        return d.getHours() < 12 ? 'a' : 'p'
    }, tt: function (d) {
        return d.getHours() < 12 ? 'am' : 'pm'
    }, T: function (d) {
        return d.getHours() < 12 ? 'A' : 'P'
    }, TT: function (d) {
        return d.getHours() < 12 ? 'AM' : 'PM'
    }, u: function (d) {
        return formatDate(d, "yyyy-MM-dd'T'HH:mm:ss'Z'")
    }, S: function (d) {
        var date = d.getDate();
        if (date > 10 && date < 20) {
            return'th'
        }
        return['st', 'nd', 'rd'][date % 10 - 1] || 'th'
    }};
    fc.applyAll = applyAll;
    function exclEndDay(event) {
        if (event.end) {
            return _exclEndDay(event.end, event.allDay)
        } else {
            return addDays(cloneDate(event.start), 1)
        }
    }

    function _exclEndDay(end, allDay) {
        end = cloneDate(end);
        return allDay || end.getHours() || end.getMinutes() ? addDays(end, 1) : clearTime(end)
    }

    function segCmp(a, b) {
        return(b.msLength - a.msLength) * 100 + (a.event.start - b.event.start)
    }

    function segsCollide(seg1, seg2) {
        return seg1.end > seg2.start && seg1.start < seg2.end
    }

    function sliceSegs(events, visEventEnds, start, end) {
        var segs = [], i, len = events.length, event, eventStart, eventEnd, segStart, segEnd, isStart, isEnd;
        for (i = 0; i < len; i++) {
            event = events[i];
            eventStart = event.start;
            eventEnd = visEventEnds[i];
            if (eventEnd > start && eventStart < end) {
                if (eventStart < start) {
                    segStart = cloneDate(start);
                    isStart = false
                } else {
                    segStart = eventStart;
                    isStart = true
                }
                if (eventEnd > end) {
                    segEnd = cloneDate(end);
                    isEnd = false
                } else {
                    segEnd = eventEnd;
                    isEnd = true
                }
                segs.push({event: event, start: segStart, end: segEnd, isStart: isStart, isEnd: isEnd, msLength: segEnd - segStart})
            }
        }
        return segs.sort(segCmp)
    }

    function stackSegs(segs) {
        var levels = [], i, len = segs.length, seg, j, collide, k;
        for (i = 0; i < len; i++) {
            seg = segs[i];
            j = 0;
            while (true) {
                collide = false;
                if (levels[j]) {
                    for (k = 0; k < levels[j].length; k++) {
                        if (segsCollide(levels[j][k], seg)) {
                            collide = true;
                            break
                        }
                    }
                }
                if (collide) {
                    j++
                } else {
                    break
                }
            }
            if (levels[j]) {
                levels[j].push(seg)
            } else {
                levels[j] = [seg]
            }
        }
        return levels
    }

    function lazySegBind(container, segs, bindHandlers) {
        container.unbind('mouseover').mouseover(function (ev) {
            var parent = ev.target, e, i, seg;
            while (parent != this) {
                e = parent;
                parent = parent.parentNode
            }
            if ((i = e._fci) !== undefined) {
                e._fci = undefined;
                seg = segs[i];
                bindHandlers(seg.event, seg.element, seg);
                $(ev.target).trigger(ev)
            }
            ev.stopPropagation()
        })
    }

    function setOuterWidth(element, width, includeMargins) {
        for (var i = 0, e; i < element.length; i++) {
            e = $(element[i]);
            e.width(Math.max(0, width - hsides(e, includeMargins)))
        }
    }

    function setOuterHeight(element, height, includeMargins) {
        for (var i = 0, e; i < element.length; i++) {
            e = $(element[i]);
            e.height(Math.max(0, height - vsides(e, includeMargins)))
        }
    }

    function hsides(element, includeMargins) {
        return hpadding(element) + hborders(element) + (includeMargins ? hmargins(element) : 0)
    }

    function hpadding(element) {
        return(parseFloat($.curCSS(element[0], 'paddingLeft', true)) || 0) + (parseFloat($.curCSS(element[0], 'paddingRight', true)) || 0)
    }

    function hmargins(element) {
        return(parseFloat($.curCSS(element[0], 'marginLeft', true)) || 0) + (parseFloat($.curCSS(element[0], 'marginRight', true)) || 0)
    }

    function hborders(element) {
        return(parseFloat($.curCSS(element[0], 'borderLeftWidth', true)) || 0) + (parseFloat($.curCSS(element[0], 'borderRightWidth', true)) || 0)
    }

    function vsides(element, includeMargins) {
        return vpadding(element) + vborders(element) + (includeMargins ? vmargins(element) : 0)
    }

    function vpadding(element) {
        return(parseFloat($.curCSS(element[0], 'paddingTop', true)) || 0) + (parseFloat($.curCSS(element[0], 'paddingBottom', true)) || 0)
    }

    function vmargins(element) {
        return(parseFloat($.curCSS(element[0], 'marginTop', true)) || 0) + (parseFloat($.curCSS(element[0], 'marginBottom', true)) || 0)
    }

    function vborders(element) {
        return(parseFloat($.curCSS(element[0], 'borderTopWidth', true)) || 0) + (parseFloat($.curCSS(element[0], 'borderBottomWidth', true)) || 0)
    }

    function setMinHeight(element, height) {
        height = (typeof height == 'number' ? height + 'px' : height);
        element.each(function (i, _element) {
            _element.style.cssText += ';min-height:' + height + ';_height:' + height
        })
    }

    function noop() {
    }

    function cmp(a, b) {
        return a - b
    }

    function arrayMax(a) {
        return Math.max.apply(Math, a)
    }

    function zeroPad(n) {
        return(n < 10 ? '0' : '') + n
    }

    function smartProperty(obj, name) {
        if (obj[name] !== undefined) {
            return obj[name]
        }
        var parts = name.split(/(?=[A-Z])/), i = parts.length - 1, res;
        for (; i >= 0; i--) {
            res = obj[parts[i].toLowerCase()];
            if (res !== undefined) {
                return res
            }
        }
        return obj['']
    }

    function htmlEscape(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#039;').replace(/"/g, '&quot;').replace(/\n/g, '<br />')
    }

    function cssKey(_element) {
        return _element.id + '/' + _element.className + '/' + _element.style.cssText.replace(/(^|;)\s*(top|left|width|height)\s*:[^;]*/ig, '')
    }

    function disableTextSelection(element) {
        element.attr('unselectable', 'on').css('MozUserSelect', 'none').bind('selectstart.ui', function () {
            return false
        })
    }

    function markFirstLast(e) {
        e.children().removeClass('fc-first fc-last').filter(':first-child').addClass('fc-first').end().filter(':last-child').addClass('fc-last')
    }

    function setDayID(cell, date) {
        cell.each(function (i, _cell) {
            _cell.className = _cell.className.replace(/^fc-\w*/, 'fc-' + dayIDs[date.getDay()])
        })
    }

    function getSkinCss(event, opt) {
        var source = event.source || {};
        var eventColor = event.color;
        var sourceColor = source.color;
        var optionColor = opt('eventColor');
        var backgroundColor = event.backgroundColor || eventColor || source.backgroundColor || sourceColor || opt('eventBackgroundColor') || optionColor;
        var borderColor = event.borderColor || eventColor || source.borderColor || sourceColor || opt('eventBorderColor') || optionColor;
        var textColor = event.textColor || source.textColor || opt('eventTextColor');
        var statements = [];
        if (backgroundColor) {
            statements.push('background-color:' + backgroundColor)
        }
        if (borderColor) {
            statements.push('border-color:' + borderColor)
        }
        if (textColor) {
            statements.push('color:' + textColor)
        }
        return statements.join(';')
    }

    function applyAll(functions, thisObj, args) {
        if ($.isFunction(functions)) {
            functions = [functions]
        }
        if (functions) {
            var i;
            var ret;
            for (i = 0; i < functions.length; i++) {
                ret = functions[i].apply(thisObj, args) || ret
            }
            return ret
        }
    }

    function firstDefined() {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] !== undefined) {
                return arguments[i]
            }
        }
    }

    fcViews.month = MonthView;
    function MonthView(element, calendar) {
        var t = this;
        t.render = render;
        BasicView.call(t, element, calendar, 'month');
        var opt = t.opt;
        var renderBasic = t.renderBasic;
        var formatDate = calendar.formatDate;

        function render(date, delta) {
            if (delta) {
                addMonths(date, delta);
                date.setDate(1)
            }
            var start = cloneDate(date, true);
            start.setDate(1);
            var end = addMonths(cloneDate(start), 1);
            var visStart = cloneDate(start);
            var visEnd = cloneDate(end);
            var firstDay = opt('firstDay');
            var nwe = opt('weekends') ? 0 : 1;
            if (nwe) {
                skipWeekend(visStart);
                skipWeekend(visEnd, -1, true)
            }
            addDays(visStart, -((visStart.getDay() - Math.max(firstDay, nwe) + 7) % 7));
            addDays(visEnd, (7 - visEnd.getDay() + Math.max(firstDay, nwe)) % 7);
            var rowCnt = Math.round((visEnd - visStart) / (DAY_MS * 7));
            if (opt('weekMode') == 'fixed') {
                addDays(visEnd, (6 - rowCnt) * 7);
                rowCnt = 6
            }
            t.title = formatDate(start, opt('titleFormat'));
            t.start = start;
            t.end = end;
            t.visStart = visStart;
            t.visEnd = visEnd;
            renderBasic(6, rowCnt, nwe ? 5 : 7, true)
        }
    }

    fcViews.basicWeek = BasicWeekView;
    function BasicWeekView(element, calendar) {
        var t = this;
        t.render = render;
        BasicView.call(t, element, calendar, 'basicWeek');
        var opt = t.opt;
        var renderBasic = t.renderBasic;
        var formatDates = calendar.formatDates;

        function render(date, delta) {
            if (delta) {
                addDays(date, delta * 7)
            }
            var start = addDays(cloneDate(date), -((date.getDay() - opt('firstDay') + 7) % 7));
            var end = addDays(cloneDate(start), 7);
            var visStart = cloneDate(start);
            var visEnd = cloneDate(end);
            var weekends = opt('weekends');
            if (!weekends) {
                skipWeekend(visStart);
                skipWeekend(visEnd, -1, true)
            }
            t.title = formatDates(visStart, addDays(cloneDate(visEnd), -1), opt('titleFormat'));
            t.start = start;
            t.end = end;
            t.visStart = visStart;
            t.visEnd = visEnd;
            renderBasic(1, 1, weekends ? 7 : 5, false)
        }
    }

    fcViews.basicDay = BasicDayView;
    function BasicDayView(element, calendar) {
        var t = this;
        t.render = render;
        BasicView.call(t, element, calendar, 'basicDay');
        var opt = t.opt;
        var renderBasic = t.renderBasic;
        var formatDate = calendar.formatDate;

        function render(date, delta) {
            if (delta) {
                addDays(date, delta);
                if (!opt('weekends')) {
                    skipWeekend(date, delta < 0 ? -1 : 1)
                }
            }
            t.title = formatDate(date, opt('titleFormat'));
            t.start = t.visStart = cloneDate(date, true);
            t.end = t.visEnd = addDays(cloneDate(t.start), 1);
            renderBasic(1, 1, 1, false)
        }
    }

    setDefaults({weekMode: 'fixed'});
    function BasicView(element, calendar, viewName) {
        var t = this;
        t.renderBasic = renderBasic;
        t.setHeight = setHeight;
        t.setWidth = setWidth;
        t.renderDayOverlay = renderDayOverlay;
        t.defaultSelectionEnd = defaultSelectionEnd;
        t.renderSelection = renderSelection;
        t.clearSelection = clearSelection;
        t.reportDayClick = reportDayClick;
        t.dragStart = dragStart;
        t.dragStop = dragStop;
        t.defaultEventEnd = defaultEventEnd;
        t.getHoverListener = function () {
            return hoverListener
        };
        t.colContentLeft = colContentLeft;
        t.colContentRight = colContentRight;
        t.dayOfWeekCol = dayOfWeekCol;
        t.dateCell = dateCell;
        t.cellDate = cellDate;
        t.cellIsAllDay = function () {
            return true
        };
        t.allDayRow = allDayRow;
        t.allDayBounds = allDayBounds;
        t.getRowCnt = function () {
            return rowCnt
        };
        t.getColCnt = function () {
            return colCnt
        };
        t.getColWidth = function () {
            return colWidth
        };
        t.getDaySegmentContainer = function () {
            return daySegmentContainer
        };
        View.call(t, element, calendar, viewName);
        OverlayManager.call(t);
        SelectionManager.call(t);
        BasicEventRenderer.call(t);
        var opt = t.opt;
        var trigger = t.trigger;
        var clearEvents = t.clearEvents;
        var renderOverlay = t.renderOverlay;
        var clearOverlays = t.clearOverlays;
        var daySelectionMousedown = t.daySelectionMousedown;
        var formatDate = calendar.formatDate;
        var dayRender = calendar.options.dayRender || function() {};
        var head;
        var headCells;
        var body;
        var bodyRows;
        var bodyCells;
        var bodyFirstCells;
        var bodyCellTopInners;
        var daySegmentContainer;
        var viewWidth;
        var viewHeight;
        var colWidth;
        var rowCnt, colCnt;
        var coordinateGrid;
        var hoverListener;
        var colContentPositions;
        var rtl, dis, dit;
        var firstDay;
        var nwe;
        var tm;
        var colFormat;
        disableTextSelection(element.addClass('fc-grid'));
        function renderBasic(maxr, r, c, showNumbers) {
            rowCnt = r;
            colCnt = c;
            updateOptions();
            var firstTime = !body;
            if (firstTime) {
                buildSkeleton(maxr, showNumbers)
            } else {
                clearEvents()
            }
            updateCells(firstTime)
        }

        function updateOptions() {
            rtl = opt('isRTL');
            if (rtl) {
                dis = -1;
                dit = colCnt - 1
            } else {
                dis = 1;
                dit = 0
            }
            firstDay = opt('firstDay');
            nwe = opt('weekends') ? 0 : 1;
            tm = opt('theme') ? 'ui' : 'fc';
            colFormat = opt('columnFormat')
        }

        function buildSkeleton(maxRowCnt, showNumbers) {
            var s;
            var headerClass = tm + "-widget-header";
            var contentClass = tm + "-widget-content";
            var i, j;
            var table;
            s = "<table class='fc-border-separate' style='width:100%' cellspacing='0'><thead><tr>";
            for (i = 0; i < colCnt; i++) {
                s += "<th class='fc- " + headerClass + "'/>"
            }
            s += "</tr></thead><tbody>";
            for (i = 0; i < maxRowCnt; i++) {
                s += "<tr class='fc-week" + i + "'>";
                for (j = 0; j < colCnt; j++) {
                    s += "<td class='fc- " + contentClass + " fc-day" + (i * colCnt + j) + "'><div>" + (showNumbers ? "<div class='fc-day-number'/>" : '') + "<div class='fc-day-content'><div style='position:relative'>&nbsp;</div></div></div></td>"
                }
                s += "</tr>"
            }
            s += "</tbody></table>";
            table = $(s).appendTo(element);
            head = table.find('thead');
            headCells = head.find('th');
            body = table.find('tbody');
            bodyRows = body.find('tr');
            bodyCells = body.find('td');
            bodyFirstCells = bodyCells.filter(':first-child');
            bodyCellTopInners = bodyRows.eq(0).find('div.fc-day-content div');
            markFirstLast(head.add(head.find('tr')));
            markFirstLast(bodyRows);
            bodyRows.eq(0).addClass('fc-first');
            dayBind(bodyCells);
            daySegmentContainer = $("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(element)
        }

        function updateCells(firstTime) {
            var dowDirty = firstTime || rowCnt == 1;
            var month = t.start.getMonth();
            var today = clearTime(new Date());
            var cell;
            var date;
            var row;
            if (dowDirty) {
                headCells.each(function (i, _cell) {
                    cell = $(_cell);
                    date = indexDate(i);
                    cell.html(formatDate(date, colFormat));
                    setDayID(cell, date)
                })
            }
            bodyCells.each(function (i, _cell) {
                cell = $(_cell);
                date = indexDate(i);
                if (date.getMonth() == month) {
                    cell.removeClass('fc-other-month')
                } else {
                    cell.addClass('fc-other-month')
                }
                if (+date == +today) {
                    cell.addClass(tm + '-state-highlight fc-today')
                } else {
                    cell.removeClass(tm + '-state-highlight fc-today')
                }
                cell.find('div.fc-day-number').text(date.getDate());
                if (dowDirty) {
                    setDayID(cell, date)
                }

                var index = parseInt((this.className.match(/fc\-day(\d+)/) || [])[1]);
                var date = indexDate(index);
                dayRender(date, this);
            });
            bodyRows.each(function (i, _row) {
                row = $(_row);
                if (i < rowCnt) {
                    row.show();
                    if (i == rowCnt - 1) {
                        row.addClass('fc-last')
                    } else {
                        row.removeClass('fc-last')
                    }
                } else {
                    row.hide()
                }
            })
        }

        function setHeight(height) {
            viewHeight = height;
            var bodyHeight = viewHeight - head.height();
            var rowHeight;
            var rowHeightLast;
            var cell;
            if (opt('weekMode') == 'variable') {
                rowHeight = rowHeightLast = Math.floor(bodyHeight / (rowCnt == 1 ? 2 : 6))
            } else {
                rowHeight = Math.floor(bodyHeight / rowCnt);
                rowHeightLast = bodyHeight - rowHeight * (rowCnt - 1)
            }
            bodyFirstCells.each(function (i, _cell) {
                if (i < rowCnt) {
                    cell = $(_cell);
                    setMinHeight(cell.find('> div'), (i == rowCnt - 1 ? rowHeightLast : rowHeight) - vsides(cell))
                }
            })
        }

        function setWidth(width) {
            viewWidth = width;
            colContentPositions.clear();
            colWidth = Math.floor(viewWidth / colCnt);
            setOuterWidth(headCells.slice(0, -1), colWidth)
        }

        function dayBind(days) {
            days.click(dayClick).mousedown(daySelectionMousedown);
        }

        function dayClick(ev) {
            if (!opt('selectable')) {
                var index = parseInt((this.className.match(/fc\-day(\d+)/) || [])[1]);
                var date = indexDate(index);
                trigger('dayClick', this, date, true, ev)
            }
        }

        function renderDayOverlay(overlayStart, overlayEnd, refreshCoordinateGrid) {
            if (refreshCoordinateGrid) {
                coordinateGrid.build()
            }
            var rowStart = cloneDate(t.visStart);
            var rowEnd = addDays(cloneDate(rowStart), colCnt);
            for (var i = 0; i < rowCnt; i++) {
                var stretchStart = new Date(Math.max(rowStart, overlayStart));
                var stretchEnd = new Date(Math.min(rowEnd, overlayEnd));
                if (stretchStart < stretchEnd) {
                    var colStart, colEnd;
                    if (rtl) {
                        colStart = dayDiff(stretchEnd, rowStart) * dis + dit + 1;
                        colEnd = dayDiff(stretchStart, rowStart) * dis + dit + 1
                    } else {
                        colStart = dayDiff(stretchStart, rowStart);
                        colEnd = dayDiff(stretchEnd, rowStart)
                    }
                    dayBind(renderCellOverlay(i, colStart, i, colEnd - 1))
                }
                addDays(rowStart, 7);
                addDays(rowEnd, 7)
            }
        }

        function renderCellOverlay(row0, col0, row1, col1) {
            var rect = coordinateGrid.rect(row0, col0, row1, col1, element);
            return renderOverlay(rect, element)
        }

        function defaultSelectionEnd(startDate, allDay) {
            return cloneDate(startDate)
        }

        function renderSelection(startDate, endDate, allDay) {
            renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true)
        }

        function clearSelection() {
            clearOverlays()
        }

        function reportDayClick(date, allDay, ev) {
            var cell = dateCell(date);
            var _element = bodyCells[cell.row * colCnt + cell.col];
            trigger('dayClick', _element, date, allDay, ev)
        }

        function dragStart(_dragElement, ev, ui) {
            hoverListener.start(function (cell) {
                clearOverlays();
                if (cell) {
                    renderCellOverlay(cell.row, cell.col, cell.row, cell.col)
                }
            }, ev)
        }

        function dragStop(_dragElement, ev, ui) {
            var cell = hoverListener.stop();
            clearOverlays();
            if (cell) {
                var d = cellDate(cell);
                trigger('drop', _dragElement, d, true, ev, ui)
            }
        }

        function defaultEventEnd(event) {
            return cloneDate(event.start)
        }

        coordinateGrid = new CoordinateGrid(function (rows, cols) {
            var e, n, p;
            headCells.each(function (i, _e) {
                e = $(_e);
                n = e.offset().left;
                if (i) {
                    p[1] = n
                }
                p = [n];
                cols[i] = p
            });
            p[1] = n + e.outerWidth();
            bodyRows.each(function (i, _e) {
                if (i < rowCnt) {
                    e = $(_e);
                    n = e.offset().top;
                    if (i) {
                        p[1] = n
                    }
                    p = [n];
                    rows[i] = p
                }
            });
            p[1] = n + e.outerHeight()
        });
        hoverListener = new HoverListener(coordinateGrid);
        colContentPositions = new HorizontalPositionCache(function (col) {
            return bodyCellTopInners.eq(col)
        });
        function colContentLeft(col) {
            return colContentPositions.left(col)
        }

        function colContentRight(col) {
            return colContentPositions.right(col)
        }

        function dateCell(date) {
            return{row: Math.floor(dayDiff(date, t.visStart) / 7), col: dayOfWeekCol(date.getDay())}
        }

        function cellDate(cell) {
            return _cellDate(cell.row, cell.col)
        }

        function _cellDate(row, col) {
            return addDays(cloneDate(t.visStart), row * 7 + col * dis + dit)
        }

        function indexDate(index) {
            return _cellDate(Math.floor(index / colCnt), index % colCnt)
        }

        function dayOfWeekCol(dayOfWeek) {
            return((dayOfWeek - Math.max(firstDay, nwe) + colCnt) % colCnt) * dis + dit
        }

        function allDayRow(i) {
            return bodyRows.eq(i)
        }

        function allDayBounds(i) {
            return{left: 0, right: viewWidth}
        }
    }

    function BasicEventRenderer() {
        var t = this;
        t.renderEvents = renderEvents;
        t.compileDaySegs = compileSegs;
        t.clearEvents = clearEvents;
        t.bindDaySeg = bindDaySeg;
        DayEventRenderer.call(t);
        var opt = t.opt;
        var trigger = t.trigger;
        var isEventDraggable = t.isEventDraggable;
        var isEventResizable = t.isEventResizable;
        var reportEvents = t.reportEvents;
        var reportEventClear = t.reportEventClear;
        var eventElementHandlers = t.eventElementHandlers;
        var showEvents = t.showEvents;
        var hideEvents = t.hideEvents;
        var eventDrop = t.eventDrop;
        var getDaySegmentContainer = t.getDaySegmentContainer;
        var getHoverListener = t.getHoverListener;
        var renderDayOverlay = t.renderDayOverlay;
        var clearOverlays = t.clearOverlays;
        var getRowCnt = t.getRowCnt;
        var getColCnt = t.getColCnt;
        var renderDaySegs = t.renderDaySegs;
        var resizableDayEvent = t.resizableDayEvent;

        function renderEvents(events, modifiedEventId) {
            reportEvents(events);
            renderDaySegs(compileSegs(events), modifiedEventId)
        }

        function clearEvents() {
            reportEventClear();
            getDaySegmentContainer().empty()
        }

        function compileSegs(events) {
            var rowCnt = getRowCnt(), colCnt = getColCnt(), d1 = cloneDate(t.visStart), d2 = addDays(cloneDate(d1), colCnt), visEventsEnds = $.map(events, exclEndDay), i, row, j, level, k, seg, segs = [];
            for (i = 0; i < rowCnt; i++) {
                row = stackSegs(sliceSegs(events, visEventsEnds, d1, d2));
                for (j = 0; j < row.length; j++) {
                    level = row[j];
                    for (k = 0; k < level.length; k++) {
                        seg = level[k];
                        seg.row = i;
                        seg.level = j;
                        segs.push(seg)
                    }
                }
                addDays(d1, 7);
                addDays(d2, 7)
            }
            return segs
        }

        function bindDaySeg(event, eventElement, seg) {
            if (isEventDraggable(event)) {
                draggableDayEvent(event, eventElement)
            }
            if (seg.isEnd && isEventResizable(event)) {
                resizableDayEvent(event, eventElement, seg)
            }
            eventElementHandlers(event, eventElement)
        }

        function draggableDayEvent(event, eventElement) {
            var hoverListener = getHoverListener();
            var dayDelta;
            eventElement.draggable({zIndex: 9, delay: 50, opacity: opt('dragOpacity'), revertDuration: opt('dragRevertDuration'), start: function (ev, ui) {
                trigger('eventDragStart', eventElement, event, ev, ui);
                hideEvents(event, eventElement);
                hoverListener.start(function (cell, origCell, rowDelta, colDelta) {
                    eventElement.draggable('option', 'revert', !cell || !rowDelta && !colDelta);
                    clearOverlays();
                    if (cell) {
                        dayDelta = rowDelta * 7 + colDelta * (opt('isRTL') ? -1 : 1);
                        renderDayOverlay(addDays(cloneDate(event.start), dayDelta), addDays(exclEndDay(event), dayDelta))
                    } else {
                        dayDelta = 0
                    }
                }, ev, 'drag')
            }, stop: function (ev, ui) {
                hoverListener.stop();
                clearOverlays();
                trigger('eventDragStop', eventElement, event, ev, ui);
                if (dayDelta) {
                    eventDrop(this, event, dayDelta, 0, event.allDay, ev, ui)
                } else {
                    eventElement.css('filter', '');
                    showEvents(event, eventElement)
                }
            }})
        }
    }

    fcViews.agendaWeek = AgendaWeekView;
    function AgendaWeekView(element, calendar) {
        var t = this;
        t.render = render;
        AgendaView.call(t, element, calendar, 'agendaWeek');
        var opt = t.opt;
        var renderAgenda = t.renderAgenda;
        var formatDates = calendar.formatDates;

        function render(date, delta) {
            if (delta) {
                addDays(date, delta * 7)
            }
            var start = addDays(cloneDate(date), -((date.getDay() - opt('firstDay') + 7) % 7));
            var end = addDays(cloneDate(start), 7);
            var visStart = cloneDate(start);
            var visEnd = cloneDate(end);
            var weekends = opt('weekends');
            if (!weekends) {
                skipWeekend(visStart);
                skipWeekend(visEnd, -1, true)
            }
            t.title = formatDates(visStart, addDays(cloneDate(visEnd), -1), opt('titleFormat'));
            t.start = start;
            t.end = end;
            t.visStart = visStart;
            t.visEnd = visEnd;
            renderAgenda(weekends ? 7 : 5)
        }
    }

    fcViews.agendaDay = AgendaDayView;
    function AgendaDayView(element, calendar) {
        var t = this;
        t.render = render;
        AgendaView.call(t, element, calendar, 'agendaDay');
        var opt = t.opt;
        var renderAgenda = t.renderAgenda;
        var formatDate = calendar.formatDate;

        function render(date, delta) {
            if (delta) {
                addDays(date, delta);
                if (!opt('weekends')) {
                    skipWeekend(date, delta < 0 ? -1 : 1)
                }
            }
            var start = cloneDate(date, true);
            var end = addDays(cloneDate(start), 1);
            t.title = formatDate(date, opt('titleFormat'));
            t.start = t.visStart = start;
            t.end = t.visEnd = end;
            renderAgenda(1)
        }
    }

    setDefaults({allDaySlot: true, allDayText: 'all-day', firstHour: 6, slotMinutes: 30, defaultEventMinutes: 120, axisFormat: 'h(:mm)tt', timeFormat: {agenda: 'h:mm{ - h:mm}'}, dragOpacity: {agenda: .5}, minTime: 0, maxTime: 24});
    function AgendaView(element, calendar, viewName) {
        var t = this;
        t.renderAgenda = renderAgenda;
        t.setWidth = setWidth;
        t.setHeight = setHeight;
        t.beforeHide = beforeHide;
        t.afterShow = afterShow;
        t.defaultEventEnd = defaultEventEnd;
        t.timePosition = timePosition;
        t.dayOfWeekCol = dayOfWeekCol;
        t.dateCell = dateCell;
        t.cellDate = cellDate;
        t.cellIsAllDay = cellIsAllDay;
        t.allDayRow = getAllDayRow;
        t.allDayBounds = allDayBounds;
        t.getHoverListener = function () {
            return hoverListener
        };
        t.colContentLeft = colContentLeft;
        t.colContentRight = colContentRight;
        t.getDaySegmentContainer = function () {
            return daySegmentContainer
        };
        t.getSlotSegmentContainer = function () {
            return slotSegmentContainer
        };
        t.getMinMinute = function () {
            return minMinute
        };
        t.getMaxMinute = function () {
            return maxMinute
        };
        t.getBodyContent = function () {
            return slotContent
        };
        t.getRowCnt = function () {
            return 1
        };
        t.getColCnt = function () {
            return colCnt
        };
        t.getColWidth = function () {
            return colWidth
        };
        t.getSlotHeight = function () {
            return slotHeight
        };
        t.defaultSelectionEnd = defaultSelectionEnd;
        t.renderDayOverlay = renderDayOverlay;
        t.renderSelection = renderSelection;
        t.clearSelection = clearSelection;
        t.reportDayClick = reportDayClick;
        t.dragStart = dragStart;
        t.dragStop = dragStop;
        View.call(t, element, calendar, viewName);
        OverlayManager.call(t);
        SelectionManager.call(t);
        AgendaEventRenderer.call(t);
        var opt = t.opt;
        var trigger = t.trigger;
        var clearEvents = t.clearEvents;
        var renderOverlay = t.renderOverlay;
        var clearOverlays = t.clearOverlays;
        var reportSelection = t.reportSelection;
        var unselect = t.unselect;
        var daySelectionMousedown = t.daySelectionMousedown;
        var slotSegHtml = t.slotSegHtml;
        var formatDate = calendar.formatDate;
        var dayTable;
        var dayHead;
        var dayHeadCells;
        var dayBody;
        var dayBodyCells;
        var dayBodyCellInners;
        var dayBodyFirstCell;
        var dayBodyFirstCellStretcher;
        var slotLayer;
        var daySegmentContainer;
        var allDayTable;
        var allDayRow;
        var slotScroller;
        var slotContent;
        var slotSegmentContainer;
        var slotTable;
        var slotTableFirstInner;
        var axisFirstCells;
        var gutterCells;
        var selectionHelper;
        var viewWidth;
        var viewHeight;
        var axisWidth;
        var colWidth;
        var gutterWidth;
        var slotHeight;
        var savedScrollTop;
        var colCnt;
        var slotCnt;
        var coordinateGrid;
        var hoverListener;
        var colContentPositions;
        var slotTopCache = {};
        var tm;
        var firstDay;
        var nwe;
        var rtl, dis, dit;
        var minMinute, maxMinute;
        var colFormat;
        disableTextSelection(element.addClass('fc-agenda'));
        function renderAgenda(c) {
            colCnt = c;
            updateOptions();
            if (!dayTable) {
                buildSkeleton()
            } else {
                clearEvents()
            }
            updateCells()
        }

        function updateOptions() {
            tm = opt('theme') ? 'ui' : 'fc';
            nwe = opt('weekends') ? 0 : 1;
            firstDay = opt('firstDay');
            if (rtl = opt('isRTL')) {
                dis = -1;
                dit = colCnt - 1
            } else {
                dis = 1;
                dit = 0
            }
            minMinute = parseTime(opt('minTime'));
            maxMinute = parseTime(opt('maxTime'));
            colFormat = opt('columnFormat')
        }

        function buildSkeleton() {
            var headerClass = tm + "-widget-header";
            var contentClass = tm + "-widget-content";
            var s;
            var i;
            var d;
            var maxd;
            var minutes;
            var slotNormal = opt('slotMinutes') % 15 == 0;
            s = "<table style='width:100%' class='fc-agenda-days fc-border-separate' cellspacing='0'><thead><tr><th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>";
            for (i = 0; i < colCnt; i++) {
                s += "<th class='fc- fc-col" + i + ' ' + headerClass + "'/>"
            }
            s += "<th class='fc-agenda-gutter " + headerClass + "'>&nbsp;</th></tr></thead><tbody><tr><th class='fc-agenda-axis " + headerClass + "'>&nbsp;</th>";
            for (i = 0; i < colCnt; i++) {
                s += "<td class='fc- fc-col" + i + ' ' + contentClass + "'><div><div class='fc-day-content'><div style='position:relative'>&nbsp;</div></div></div></td>"
            }
            s += "<td class='fc-agenda-gutter " + contentClass + "'>&nbsp;</td></tr></tbody></table>";
            dayTable = $(s).appendTo(element);
            dayHead = dayTable.find('thead');
            dayHeadCells = dayHead.find('th').slice(1, -1);
            dayBody = dayTable.find('tbody');
            dayBodyCells = dayBody.find('td').slice(0, -1);
            dayBodyCellInners = dayBodyCells.find('div.fc-day-content div');
            dayBodyFirstCell = dayBodyCells.eq(0);
            dayBodyFirstCellStretcher = dayBodyFirstCell.find('> div');
            markFirstLast(dayHead.add(dayHead.find('tr')));
            markFirstLast(dayBody.add(dayBody.find('tr')));
            axisFirstCells = dayHead.find('th:first');
            gutterCells = dayTable.find('.fc-agenda-gutter');
            slotLayer = $("<div style='position:absolute;z-index:2;left:0;width:100%'/>").appendTo(element);
            if (opt('allDaySlot')) {
                daySegmentContainer = $("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(slotLayer);
                s = "<table style='width:100%' class='fc-agenda-allday' cellspacing='0'><tr><th class='" + headerClass + " fc-agenda-axis'>" + opt('allDayText') + "</th><td><div class='fc-day-content'><div style='position:relative'/></div></td><th class='" + headerClass + " fc-agenda-gutter'>&nbsp;</th></tr></table>";
                allDayTable = $(s).appendTo(slotLayer);
                allDayRow = allDayTable.find('tr');
                dayBind(allDayRow.find('td'));
                axisFirstCells = axisFirstCells.add(allDayTable.find('th:first'));
                gutterCells = gutterCells.add(allDayTable.find('th.fc-agenda-gutter'));
                slotLayer.append("<div class='fc-agenda-divider " + headerClass + "'><div class='fc-agenda-divider-inner'/></div>")
            } else {
                daySegmentContainer = $([])
            }
            slotScroller = $("<div style='position:absolute;width:100%;overflow-x:hidden;overflow-y:auto'/>").appendTo(slotLayer);
            slotContent = $("<div style='position:relative;width:100%;overflow:hidden'/>").appendTo(slotScroller);
            slotSegmentContainer = $("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(slotContent);
            s = "<table class='fc-agenda-slots' style='width:100%' cellspacing='0'><tbody>";
            d = zeroDate();
            maxd = addMinutes(cloneDate(d), maxMinute);
            addMinutes(d, minMinute);
            slotCnt = 0;
            for (i = 0; d < maxd; i++) {
                minutes = d.getMinutes();
                s += "<tr class='fc-slot" + i + ' ' + (!minutes ? '' : 'fc-minor') + "'><th class='fc-agenda-axis " + headerClass + "'>" + ((!slotNormal || !minutes) ? formatDate(d, opt('axisFormat')) : '&nbsp;') + "</th><td class='" + contentClass + "'><div style='position:relative'>&nbsp;</div></td></tr>";
                addMinutes(d, opt('slotMinutes'));
                slotCnt++
            }
            s += "</tbody></table>";
            slotTable = $(s).appendTo(slotContent);
            slotTableFirstInner = slotTable.find('div:first');
            slotBind(slotTable.find('td'));
            axisFirstCells = axisFirstCells.add(slotTable.find('th:first'))
        }

        function updateCells() {
            var i;
            var headCell;
            var bodyCell;
            var date;
            var today = clearTime(new Date());
            for (i = 0; i < colCnt; i++) {
                date = colDate(i);
                headCell = dayHeadCells.eq(i);
                headCell.html(formatDate(date, colFormat));
                bodyCell = dayBodyCells.eq(i);
                if (+date == +today) {
                    bodyCell.addClass(tm + '-state-highlight fc-today')
                } else {
                    bodyCell.removeClass(tm + '-state-highlight fc-today')
                }
                setDayID(headCell.add(bodyCell), date)
            }
        }

        function setHeight(height, dateChanged) {
            if (height === undefined) {
                height = viewHeight
            }
            viewHeight = height;
            slotTopCache = {};
            var headHeight = dayBody.position().top;
            var allDayHeight = slotScroller.position().top;
            var bodyHeight = Math.min(height - headHeight, slotTable.height() + allDayHeight + 1);
            dayBodyFirstCellStretcher.height(bodyHeight - vsides(dayBodyFirstCell));
            slotLayer.css('top', headHeight);
            slotScroller.height(bodyHeight - allDayHeight - 1);
            slotHeight = slotTableFirstInner.height() + 1;
            if (dateChanged) {
                resetScroll()
            }
        }

        function setWidth(width) {
            viewWidth = width;
            colContentPositions.clear();
            axisWidth = 0;
            setOuterWidth(axisFirstCells.width('').each(function (i, _cell) {
                axisWidth = Math.max(axisWidth, $(_cell).outerWidth())
            }), axisWidth);
            var slotTableWidth = slotScroller[0].clientWidth;
            gutterWidth = slotScroller.width() - slotTableWidth;
            if (gutterWidth) {
                setOuterWidth(gutterCells, gutterWidth);
                gutterCells.show().prev().removeClass('fc-last')
            } else {
                gutterCells.hide().prev().addClass('fc-last')
            }
            colWidth = Math.floor((slotTableWidth - axisWidth) / colCnt);
            setOuterWidth(dayHeadCells.slice(0, -1), colWidth)
        }

        function resetScroll() {
            var d0 = zeroDate();
            var scrollDate = cloneDate(d0);
            scrollDate.setHours(opt('firstHour'));
            var top = timePosition(d0, scrollDate) + 1;

            function scroll() {
                slotScroller.scrollTop(top)
            }

            scroll();
            setTimeout(scroll, 0)
        }

        function beforeHide() {
            savedScrollTop = slotScroller.scrollTop()
        }

        function afterShow() {
            slotScroller.scrollTop(savedScrollTop)
        }

        function dayBind(cells) {
            cells.click(slotClick).mousedown(daySelectionMousedown)
        }

        function slotBind(cells) {
            cells.click(slotClick).mousedown(slotSelectionMousedown)
        }

        function slotClick(ev) {
            if (!opt('selectable')) {
                var col = Math.min(colCnt - 1, Math.floor((ev.pageX - dayTable.offset().left - axisWidth) / colWidth));
                var date = colDate(col);
                var rowMatch = this.parentNode.className.match(/fc-slot(\d+)/);
                if (rowMatch) {
                    var mins = parseInt(rowMatch[1]) * opt('slotMinutes');
                    var hours = Math.floor(mins / 60);
                    date.setHours(hours);
                    date.setMinutes(mins % 60 + minMinute);
                    trigger('dayClick', dayBodyCells[col], date, false, ev)
                } else {
                    trigger('dayClick', dayBodyCells[col], date, true, ev)
                }
            }
        }

        function renderDayOverlay(startDate, endDate, refreshCoordinateGrid) {
            if (refreshCoordinateGrid) {
                coordinateGrid.build()
            }
            var visStart = cloneDate(t.visStart);
            var startCol, endCol;
            if (rtl) {
                startCol = dayDiff(endDate, visStart) * dis + dit + 1;
                endCol = dayDiff(startDate, visStart) * dis + dit + 1
            } else {
                startCol = dayDiff(startDate, visStart);
                endCol = dayDiff(endDate, visStart)
            }
            startCol = Math.max(0, startCol);
            endCol = Math.min(colCnt, endCol);
            if (startCol < endCol) {
                dayBind(renderCellOverlay(0, startCol, 0, endCol - 1))
            }
        }

        function renderCellOverlay(row0, col0, row1, col1) {
            var rect = coordinateGrid.rect(row0, col0, row1, col1, slotLayer);
            return renderOverlay(rect, slotLayer)
        }

        function renderSlotOverlay(overlayStart, overlayEnd) {
            var dayStart = cloneDate(t.visStart);
            var dayEnd = addDays(cloneDate(dayStart), 1);
            for (var i = 0; i < colCnt; i++) {
                var stretchStart = new Date(Math.max(dayStart, overlayStart));
                var stretchEnd = new Date(Math.min(dayEnd, overlayEnd));
                if (stretchStart < stretchEnd) {
                    var col = i * dis + dit;
                    var rect = coordinateGrid.rect(0, col, 0, col, slotContent);
                    var top = timePosition(dayStart, stretchStart);
                    var bottom = timePosition(dayStart, stretchEnd);
                    rect.top = top;
                    rect.height = bottom - top;
                    slotBind(renderOverlay(rect, slotContent))
                }
                addDays(dayStart, 1);
                addDays(dayEnd, 1)
            }
        }

        coordinateGrid = new CoordinateGrid(function (rows, cols) {
            var e, n, p;
            dayHeadCells.each(function (i, _e) {
                e = $(_e);
                n = e.offset().left;
                if (i) {
                    p[1] = n
                }
                p = [n];
                cols[i] = p
            });
            p[1] = n + e.outerWidth();
            if (opt('allDaySlot')) {
                e = allDayRow;
                n = e.offset().top;
                rows[0] = [n, n + e.outerHeight()]
            }
            var slotTableTop = slotContent.offset().top;
            var slotScrollerTop = slotScroller.offset().top;
            var slotScrollerBottom = slotScrollerTop + slotScroller.outerHeight();

            function constrain(n) {
                return Math.max(slotScrollerTop, Math.min(slotScrollerBottom, n))
            }

            for (var i = 0; i < slotCnt; i++) {
                rows.push([constrain(slotTableTop + slotHeight * i), constrain(slotTableTop + slotHeight * (i + 1))])
            }
        });
        hoverListener = new HoverListener(coordinateGrid);
        colContentPositions = new HorizontalPositionCache(function (col) {
            return dayBodyCellInners.eq(col)
        });
        function colContentLeft(col) {
            return colContentPositions.left(col)
        }

        function colContentRight(col) {
            return colContentPositions.right(col)
        }

        function dateCell(date) {
            return{row: Math.floor(dayDiff(date, t.visStart) / 7), col: dayOfWeekCol(date.getDay())}
        }

        function cellDate(cell) {
            var d = colDate(cell.col);
            var slotIndex = cell.row;
            if (opt('allDaySlot')) {
                slotIndex--
            }
            if (slotIndex >= 0) {
                addMinutes(d, minMinute + slotIndex * opt('slotMinutes'))
            }
            return d
        }

        function colDate(col) {
            return addDays(cloneDate(t.visStart), col * dis + dit)
        }

        function cellIsAllDay(cell) {
            return opt('allDaySlot') && !cell.row
        }

        function dayOfWeekCol(dayOfWeek) {
            return((dayOfWeek - Math.max(firstDay, nwe) + colCnt) % colCnt) * dis + dit
        }

        function timePosition(day, time) {
            day = cloneDate(day, true);
            if (time < addMinutes(cloneDate(day), minMinute)) {
                return 0
            }
            if (time >= addMinutes(cloneDate(day), maxMinute)) {
                return slotTable.height()
            }
            var slotMinutes = opt('slotMinutes'), minutes = time.getHours() * 60 + time.getMinutes() - minMinute, slotI = Math.floor(minutes / slotMinutes), slotTop = slotTopCache[slotI];
            if (slotTop === undefined) {
                slotTop = slotTopCache[slotI] = slotTable.find('tr:eq(' + slotI + ') td div')[0].offsetTop
            }
            return Math.max(0, Math.round(slotTop - 1 + slotHeight * ((minutes % slotMinutes) / slotMinutes)))
        }

        function allDayBounds() {
            return{left: axisWidth, right: viewWidth - gutterWidth}
        }

        function getAllDayRow(index) {
            return allDayRow
        }

        function defaultEventEnd(event) {
            var start = cloneDate(event.start);
            if (event.allDay) {
                return start
            }
            return addMinutes(start, opt('defaultEventMinutes'))
        }

        function defaultSelectionEnd(startDate, allDay) {
            if (allDay) {
                return cloneDate(startDate)
            }
            return addMinutes(cloneDate(startDate), opt('slotMinutes'))
        }

        function renderSelection(startDate, endDate, allDay) {
            if (allDay) {
                if (opt('allDaySlot')) {
                    renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true)
                }
            } else {
                renderSlotSelection(startDate, endDate)
            }
        }

        function renderSlotSelection(startDate, endDate) {
            var helperOption = opt('selectHelper');
            coordinateGrid.build();
            if (helperOption) {
                var col = dayDiff(startDate, t.visStart) * dis + dit;
                if (col >= 0 && col < colCnt) {
                    var rect = coordinateGrid.rect(0, col, 0, col, slotContent);
                    var top = timePosition(startDate, startDate);
                    var bottom = timePosition(startDate, endDate);
                    if (bottom > top) {
                        rect.top = top;
                        rect.height = bottom - top;
                        rect.left += 2;
                        rect.width -= 5;
                        if ($.isFunction(helperOption)) {
                            var helperRes = helperOption(startDate, endDate);
                            if (helperRes) {
                                rect.position = 'absolute';
                                rect.zIndex = 8;
                                selectionHelper = $(helperRes).css(rect).appendTo(slotContent)
                            }
                        } else {
                            rect.isStart = true;
                            rect.isEnd = true;
                            selectionHelper = $(slotSegHtml({title: '', start: startDate, end: endDate, className: ['fc-select-helper'], editable: false}, rect));
                            selectionHelper.css('opacity', opt('dragOpacity'))
                        }
                        if (selectionHelper) {
                            slotBind(selectionHelper);
                            slotContent.append(selectionHelper);
                            setOuterWidth(selectionHelper, rect.width, true);
                            setOuterHeight(selectionHelper, rect.height, true)
                        }
                    }
                }
            } else {
                renderSlotOverlay(startDate, endDate)
            }
        }

        function clearSelection() {
            clearOverlays();
            if (selectionHelper) {
                selectionHelper.remove();
                selectionHelper = null
            }
        }

        function slotSelectionMousedown(ev) {
            if (ev.which == 1 && opt('selectable')) {
                unselect(ev);
                var dates;
                hoverListener.start(function (cell, origCell) {
                    clearSelection();
                    if (cell && cell.col == origCell.col && !cellIsAllDay(cell)) {
                        var d1 = cellDate(origCell);
                        var d2 = cellDate(cell);
                        dates = [d1, addMinutes(cloneDate(d1), opt('slotMinutes')), d2, addMinutes(cloneDate(d2), opt('slotMinutes'))].sort(cmp);
                        renderSlotSelection(dates[0], dates[3])
                    } else {
                        dates = null
                    }
                }, ev);
                $(document).one('mouseup', function (ev) {
                    hoverListener.stop();
                    if (dates) {
                        if (+dates[0] == +dates[1]) {
                            reportDayClick(dates[0], false, ev)
                        }
                        reportSelection(dates[0], dates[3], false, ev)
                    }
                })
            }
        }

        function reportDayClick(date, allDay, ev) {
            trigger('dayClick', dayBodyCells[dayOfWeekCol(date.getDay())], date, allDay, ev)
        }

        function dragStart(_dragElement, ev, ui) {
            hoverListener.start(function (cell) {
                clearOverlays();
                if (cell) {
                    if (cellIsAllDay(cell)) {
                        renderCellOverlay(cell.row, cell.col, cell.row, cell.col)
                    } else {
                        var d1 = cellDate(cell);
                        var d2 = addMinutes(cloneDate(d1), opt('defaultEventMinutes'));
                        renderSlotOverlay(d1, d2)
                    }
                }
            }, ev)
        }

        function dragStop(_dragElement, ev, ui) {
            var cell = hoverListener.stop();
            clearOverlays();
            if (cell) {
                trigger('drop', _dragElement, cellDate(cell), cellIsAllDay(cell), ev, ui)
            }
        }
    }

    function AgendaEventRenderer() {
        var t = this;
        t.renderEvents = renderEvents;
        t.compileDaySegs = compileDaySegs;
        t.clearEvents = clearEvents;
        t.slotSegHtml = slotSegHtml;
        t.bindDaySeg = bindDaySeg;
        DayEventRenderer.call(t);
        var opt = t.opt;
        var trigger = t.trigger;
        var isEventDraggable = t.isEventDraggable;
        var isEventResizable = t.isEventResizable;
        var eventEnd = t.eventEnd;
        var reportEvents = t.reportEvents;
        var reportEventClear = t.reportEventClear;
        var eventElementHandlers = t.eventElementHandlers;
        var setHeight = t.setHeight;
        var getDaySegmentContainer = t.getDaySegmentContainer;
        var getSlotSegmentContainer = t.getSlotSegmentContainer;
        var getHoverListener = t.getHoverListener;
        var getMaxMinute = t.getMaxMinute;
        var getMinMinute = t.getMinMinute;
        var timePosition = t.timePosition;
        var colContentLeft = t.colContentLeft;
        var colContentRight = t.colContentRight;
        var renderDaySegs = t.renderDaySegs;
        var resizableDayEvent = t.resizableDayEvent;
        var getColCnt = t.getColCnt;
        var getColWidth = t.getColWidth;
        var getSlotHeight = t.getSlotHeight;
        var getBodyContent = t.getBodyContent;
        var reportEventElement = t.reportEventElement;
        var showEvents = t.showEvents;
        var hideEvents = t.hideEvents;
        var eventDrop = t.eventDrop;
        var eventResize = t.eventResize;
        var renderDayOverlay = t.renderDayOverlay;
        var clearOverlays = t.clearOverlays;
        var calendar = t.calendar;
        var formatDate = calendar.formatDate;
        var formatDates = calendar.formatDates;

        function renderEvents(events, modifiedEventId) {
            reportEvents(events);
            var i, len = events.length, dayEvents = [], slotEvents = [];
            for (i = 0; i < len; i++) {
                if (events[i].allDay) {
                    dayEvents.push(events[i])
                } else {
                    slotEvents.push(events[i])
                }
            }
            if (opt('allDaySlot')) {
                renderDaySegs(compileDaySegs(dayEvents), modifiedEventId);
                setHeight()
            }
            renderSlotSegs(compileSlotSegs(slotEvents), modifiedEventId)
        }

        function clearEvents() {
            reportEventClear();
            getDaySegmentContainer().empty();
            getSlotSegmentContainer().empty()
        }

        function compileDaySegs(events) {
            var levels = stackSegs(sliceSegs(events, $.map(events, exclEndDay), t.visStart, t.visEnd)), i, levelCnt = levels.length, level, j, seg, segs = [];
            for (i = 0; i < levelCnt; i++) {
                level = levels[i];
                for (j = 0; j < level.length; j++) {
                    seg = level[j];
                    seg.row = 0;
                    seg.level = i;
                    segs.push(seg)
                }
            }
            return segs
        }

        function compileSlotSegs(events) {
            var colCnt = getColCnt(), minMinute = getMinMinute(), maxMinute = getMaxMinute(), d = addMinutes(cloneDate(t.visStart), minMinute), visEventEnds = $.map(events, slotEventEnd), i, col, j, level, k, seg, segs = [];
            for (i = 0; i < colCnt; i++) {
                col = stackSegs(sliceSegs(events, visEventEnds, d, addMinutes(cloneDate(d), maxMinute - minMinute)));
                countForwardSegs(col);
                for (j = 0; j < col.length; j++) {
                    level = col[j];
                    for (k = 0; k < level.length; k++) {
                        seg = level[k];
                        seg.col = i;
                        seg.level = j;
                        segs.push(seg)
                    }
                }
                addDays(d, 1, true)
            }
            return segs
        }

        function slotEventEnd(event) {
            if (event.end) {
                return cloneDate(event.end)
            } else {
                return addMinutes(cloneDate(event.start), opt('defaultEventMinutes'))
            }
        }

        function renderSlotSegs(segs, modifiedEventId) {
            var i, segCnt = segs.length, seg, event, classes, top, bottom, colI, levelI, forward, leftmost, availWidth, outerWidth, left, html = '', eventElements, eventElement, triggerRes, vsideCache = {}, hsideCache = {}, key, val, contentElement, height, slotSegmentContainer = getSlotSegmentContainer(), rtl, dis, dit, colCnt = getColCnt();
            if (rtl = opt('isRTL')) {
                dis = -1;
                dit = colCnt - 1
            } else {
                dis = 1;
                dit = 0
            }
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                event = seg.event;
                top = timePosition(seg.start, seg.start);
                bottom = timePosition(seg.start, seg.end);
                colI = seg.col;
                levelI = seg.level;
                forward = seg.forward || 0;
                leftmost = colContentLeft(colI * dis + dit);
                availWidth = colContentRight(colI * dis + dit) - leftmost;
                availWidth = Math.min(availWidth - 6, availWidth * .95);
                if (levelI) {
                    outerWidth = availWidth / (levelI + forward + 1)
                } else {
                    if (forward) {
                        outerWidth = ((availWidth / (forward + 1)) - (12 / 2)) * 2
                    } else {
                        outerWidth = availWidth
                    }
                }
                left = leftmost + (availWidth / (levelI + forward + 1) * levelI) * dis + (rtl ? availWidth - outerWidth : 0);
                seg.top = top;
                seg.left = left;
                seg.outerWidth = outerWidth;
                seg.outerHeight = bottom - top;
                html += slotSegHtml(event, seg)
            }
            slotSegmentContainer[0].innerHTML = html;
            eventElements = slotSegmentContainer.children();
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                event = seg.event;
                eventElement = $(eventElements[i]);
                triggerRes = trigger('eventRender', event, event, eventElement);
                if (triggerRes === false) {
                    eventElement.remove()
                } else {
                    if (triggerRes && triggerRes !== true) {
                        eventElement.remove();
                        eventElement = $(triggerRes).css({position: 'absolute', top: seg.top, left: seg.left}).appendTo(slotSegmentContainer)
                    }
                    seg.element = eventElement;
                    if (event._id === modifiedEventId) {
                        bindSlotSeg(event, eventElement, seg)
                    } else {
                        eventElement[0]._fci = i
                    }
                    reportEventElement(event, eventElement)
                }
            }
            lazySegBind(slotSegmentContainer, segs, bindSlotSeg);
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                if (eventElement = seg.element) {
                    val = vsideCache[key = seg.key = cssKey(eventElement[0])];
                    seg.vsides = val === undefined ? (vsideCache[key] = vsides(eventElement, true)) : val;
                    val = hsideCache[key];
                    seg.hsides = val === undefined ? (hsideCache[key] = hsides(eventElement, true)) : val;
                    contentElement = eventElement.find('div.fc-event-content');
                    if (contentElement.length) {
                        seg.contentTop = contentElement[0].offsetTop
                    }
                }
            }
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                if (eventElement = seg.element) {
                    eventElement[0].style.width = Math.max(0, seg.outerWidth - seg.hsides) + 'px';
                    height = Math.max(0, seg.outerHeight - seg.vsides);
                    eventElement[0].style.height = height + 'px';
                    event = seg.event;
                    if (seg.contentTop !== undefined && height - seg.contentTop < 10) {
                        eventElement.find('div.fc-event-time').text(formatDate(event.start, opt('timeFormat')) + ' - ' + event.title);
                        eventElement.find('div.fc-event-title').remove()
                    }
                    trigger('eventAfterRender', event, event, eventElement)
                }
            }
        }

        function slotSegHtml(event, seg) {
            var html = "<";
            var url = event.url;
            var skinCss = getSkinCss(event, opt);
            var skinCssAttr = (skinCss ? " style='" + skinCss + "'" : '');
            var classes = ['fc-event', 'fc-event-skin', 'fc-event-vert'];
            if (isEventDraggable(event)) {
                classes.push('fc-event-draggable')
            }
            if (seg.isStart) {
                classes.push('fc-corner-top')
            }
            if (seg.isEnd) {
                classes.push('fc-corner-bottom')
            }
            classes = classes.concat(event.className);
            if (event.source) {
                classes = classes.concat(event.source.className || [])
            }
            if (url) {
                html += "a href='" + htmlEscape(event.url) + "'"
            } else {
                html += "div"
            }
            html += " class='" + classes.join(' ') + "' style='position:absolute;z-index:8;top:" + seg.top + "px;left:" + seg.left + "px;" + skinCss + "'><div class='fc-event-inner fc-event-skin'" + skinCssAttr + "><div class='fc-event-head fc-event-skin'" + skinCssAttr + "><div class='fc-event-time'>" + htmlEscape(formatDates(event.start, event.end, opt('timeFormat'))) + "</div></div><div class='fc-event-content'><div class='fc-event-title'>" + htmlEscape(event.title) + "</div></div><div class='fc-event-bg'></div></div>";
            if (seg.isEnd && isEventResizable(event)) {
                html += "<div class='ui-resizable-handle ui-resizable-s'>=</div>"
            }
            html += "</" + (url ? "a" : "div") + ">";
            return html
        }

        function bindDaySeg(event, eventElement, seg) {
            if (isEventDraggable(event)) {
                draggableDayEvent(event, eventElement, seg.isStart)
            }
            if (seg.isEnd && isEventResizable(event)) {
                resizableDayEvent(event, eventElement, seg)
            }
            eventElementHandlers(event, eventElement)
        }

        function bindSlotSeg(event, eventElement, seg) {
            var timeElement = eventElement.find('div.fc-event-time');
            if (isEventDraggable(event)) {
                draggableSlotEvent(event, eventElement, timeElement)
            }
            if (seg.isEnd && isEventResizable(event)) {
                resizableSlotEvent(event, eventElement, timeElement)
            }
            eventElementHandlers(event, eventElement)
        }

        function draggableDayEvent(event, eventElement, isStart) {
            var origWidth;
            var revert;
            var allDay = true;
            var dayDelta;
            var dis = opt('isRTL') ? -1 : 1;
            var hoverListener = getHoverListener();
            var colWidth = getColWidth();
            var slotHeight = getSlotHeight();
            var minMinute = getMinMinute();
            eventElement.draggable({zIndex: 9, opacity: opt('dragOpacity', 'month'), revertDuration: opt('dragRevertDuration'), start: function (ev, ui) {
                trigger('eventDragStart', eventElement, event, ev, ui);
                hideEvents(event, eventElement);
                origWidth = eventElement.width();
                hoverListener.start(function (cell, origCell, rowDelta, colDelta) {
                    clearOverlays();
                    if (cell) {
                        revert = false;
                        dayDelta = colDelta * dis;
                        if (!cell.row) {
                            renderDayOverlay(addDays(cloneDate(event.start), dayDelta), addDays(exclEndDay(event), dayDelta));
                            resetElement()
                        } else {
                            if (isStart) {
                                if (allDay) {
                                    eventElement.width(colWidth - 10);
                                    setOuterHeight(eventElement, slotHeight * Math.round((event.end ? ((event.end - event.start) / MINUTE_MS) : opt('defaultEventMinutes')) / opt('slotMinutes')));
                                    eventElement.draggable('option', 'grid', [colWidth, 1]);
                                    allDay = false
                                }
                            } else {
                                revert = true
                            }
                        }
                        revert = revert || (allDay && !dayDelta)
                    } else {
                        resetElement();
                        revert = true
                    }
                    eventElement.draggable('option', 'revert', revert)
                }, ev, 'drag')
            }, stop: function (ev, ui) {
                hoverListener.stop();
                clearOverlays();
                trigger('eventDragStop', eventElement, event, ev, ui);
                if (revert) {
                    resetElement();
                    eventElement.css('filter', '');
                    showEvents(event, eventElement)
                } else {
                    var minuteDelta = 0;
                    if (!allDay) {
                        minuteDelta = Math.round((eventElement.offset().top - getBodyContent().offset().top) / slotHeight) * opt('slotMinutes') + minMinute - (event.start.getHours() * 60 + event.start.getMinutes())
                    }
                    eventDrop(this, event, dayDelta, minuteDelta, allDay, ev, ui)
                }
            }});
            function resetElement() {
                if (!allDay) {
                    eventElement.width(origWidth).height('').draggable('option', 'grid', null);
                    allDay = true
                }
            }
        }

        function draggableSlotEvent(event, eventElement, timeElement) {
            var origPosition;
            var allDay = false;
            var dayDelta;
            var minuteDelta;
            var prevMinuteDelta;
            var dis = opt('isRTL') ? -1 : 1;
            var hoverListener = getHoverListener();
            var colCnt = getColCnt();
            var colWidth = getColWidth();
            var slotHeight = getSlotHeight();
            eventElement.draggable({zIndex: 9, scroll: false, grid: [colWidth, slotHeight], axis: colCnt == 1 ? 'y' : false, opacity: opt('dragOpacity'), revertDuration: opt('dragRevertDuration'), start: function (ev, ui) {
                trigger('eventDragStart', eventElement, event, ev, ui);
                hideEvents(event, eventElement);
                origPosition = eventElement.position();
                minuteDelta = prevMinuteDelta = 0;
                hoverListener.start(function (cell, origCell, rowDelta, colDelta) {
                    eventElement.draggable('option', 'revert', !cell);
                    clearOverlays();
                    if (cell) {
                        dayDelta = colDelta * dis;
                        if (opt('allDaySlot') && !cell.row) {
                            if (!allDay) {
                                allDay = true;
                                timeElement.hide();
                                eventElement.draggable('option', 'grid', null)
                            }
                            renderDayOverlay(addDays(cloneDate(event.start), dayDelta), addDays(exclEndDay(event), dayDelta))
                        } else {
                            resetElement()
                        }
                    }
                }, ev, 'drag')
            }, drag: function (ev, ui) {
                minuteDelta = Math.round((ui.position.top - origPosition.top) / slotHeight) * opt('slotMinutes');
                if (minuteDelta != prevMinuteDelta) {
                    if (!allDay) {
                        updateTimeText(minuteDelta)
                    }
                    prevMinuteDelta = minuteDelta
                }
            }, stop: function (ev, ui) {
                var cell = hoverListener.stop();
                clearOverlays();
                trigger('eventDragStop', eventElement, event, ev, ui);
                if (cell && (dayDelta || minuteDelta || allDay)) {
                    eventDrop(this, event, dayDelta, allDay ? 0 : minuteDelta, allDay, ev, ui)
                } else {
                    resetElement();
                    eventElement.css('filter', '');
                    eventElement.css(origPosition);
                    updateTimeText(0);
                    showEvents(event, eventElement)
                }
            }});
            function updateTimeText(minuteDelta) {
                var newStart = addMinutes(cloneDate(event.start), minuteDelta);
                var newEnd;
                if (event.end) {
                    newEnd = addMinutes(cloneDate(event.end), minuteDelta)
                }
                timeElement.text(formatDates(newStart, newEnd, opt('timeFormat')))
            }

            function resetElement() {
                if (allDay) {
                    timeElement.css('display', '');
                    eventElement.draggable('option', 'grid', [colWidth, slotHeight]);
                    allDay = false
                }
            }
        }

        function resizableSlotEvent(event, eventElement, timeElement) {
            var slotDelta, prevSlotDelta;
            var slotHeight = getSlotHeight();
            eventElement.resizable({handles: {s: 'div.ui-resizable-s'}, grid: slotHeight, start: function (ev, ui) {
                slotDelta = prevSlotDelta = 0;
                hideEvents(event, eventElement);
                eventElement.css('z-index', 9);
                trigger('eventResizeStart', this, event, ev, ui)
            }, resize: function (ev, ui) {
                slotDelta = Math.round((Math.max(slotHeight, eventElement.height()) - ui.originalSize.height) / slotHeight);
                if (slotDelta != prevSlotDelta) {
                    timeElement.text(formatDates(event.start, (!slotDelta && !event.end) ? null : addMinutes(eventEnd(event), opt('slotMinutes') * slotDelta), opt('timeFormat')));
                    prevSlotDelta = slotDelta
                }
            }, stop: function (ev, ui) {
                trigger('eventResizeStop', this, event, ev, ui);
                if (slotDelta) {
                    eventResize(this, event, 0, opt('slotMinutes') * slotDelta, ev, ui)
                } else {
                    eventElement.css('z-index', 8);
                    showEvents(event, eventElement)
                }
            }})
        }
    }

    function countForwardSegs(levels) {
        var i, j, k, level, segForward, segBack;
        for (i = levels.length - 1; i > 0; i--) {
            level = levels[i];
            for (j = 0; j < level.length; j++) {
                segForward = level[j];
                for (k = 0; k < levels[i - 1].length; k++) {
                    segBack = levels[i - 1][k];
                    if (segsCollide(segForward, segBack)) {
                        segBack.forward = Math.max(segBack.forward || 0, (segForward.forward || 0) + 1)
                    }
                }
            }
        }
    }

    function View(element, calendar, viewName) {
        var t = this;
        t.element = element;
        t.calendar = calendar;
        t.name = viewName;
        t.opt = opt;
        t.trigger = trigger;
        t.isEventDraggable = isEventDraggable;
        t.isEventResizable = isEventResizable;
        t.reportEvents = reportEvents;
        t.eventEnd = eventEnd;
        t.reportEventElement = reportEventElement;
        t.reportEventClear = reportEventClear;
        t.eventElementHandlers = eventElementHandlers;
        t.showEvents = showEvents;
        t.hideEvents = hideEvents;
        t.eventDrop = eventDrop;
        t.eventResize = eventResize;
        var defaultEventEnd = t.defaultEventEnd;
        var normalizeEvent = calendar.normalizeEvent;
        var reportEventChange = calendar.reportEventChange;
        var eventsByID = {};
        var eventElements = [];
        var eventElementsByID = {};
        var options = calendar.options;

        function opt(name, viewNameOverride) {
            var v = options[name];
            if (typeof v == 'object') {
                return smartProperty(v, viewNameOverride || viewName)
            }
            return v
        }

        function trigger(name, thisObj) {
            return calendar.trigger.apply(calendar, [name, thisObj || t].concat(Array.prototype.slice.call(arguments, 2), [t]))
        }

        function isEventDraggable(event) {
            return isEventEditable(event) && !opt('disableDragging')
        }

        function isEventResizable(event) {
            return isEventEditable(event) && !opt('disableResizing')
        }

        function isEventEditable(event) {
            return firstDefined(event.editable, (event.source || {}).editable, opt('editable'))
        }

        function reportEvents(events) {
            eventsByID = {};
            var i, len = events.length, event;
            for (i = 0; i < len; i++) {
                event = events[i];
                if (eventsByID[event._id]) {
                    eventsByID[event._id].push(event)
                } else {
                    eventsByID[event._id] = [event]
                }
            }
        }

        function eventEnd(event) {
            return event.end ? cloneDate(event.end) : defaultEventEnd(event)
        }

        function reportEventElement(event, element) {
            eventElements.push(element);
            if (eventElementsByID[event._id]) {
                eventElementsByID[event._id].push(element)
            } else {
                eventElementsByID[event._id] = [element]
            }
        }

        function reportEventClear() {
            eventElements = [];
            eventElementsByID = {}
        }

        function eventElementHandlers(event, eventElement) {
            eventElement.click(function (ev) {
                if (!eventElement.hasClass('ui-draggable-dragging') && !eventElement.hasClass('ui-resizable-resizing')) {
                    return trigger('eventClick', this, event, ev)
                }
            }).hover(function (ev) {
                trigger('eventMouseover', this, event, ev)
            }, function (ev) {
                trigger('eventMouseout', this, event, ev)
            })
        }

        function showEvents(event, exceptElement) {
            eachEventElement(event, exceptElement, 'show')
        }

        function hideEvents(event, exceptElement) {
            eachEventElement(event, exceptElement, 'hide')
        }

        function eachEventElement(event, exceptElement, funcName) {
            var elements = eventElementsByID[event._id], i, len = elements.length;
            for (i = 0; i < len; i++) {
                if (!exceptElement || elements[i][0] != exceptElement[0]) {
                    elements[i][funcName]()
                }
            }
        }

        function eventDrop(e, event, dayDelta, minuteDelta, allDay, ev, ui) {
            var oldAllDay = event.allDay;
            var eventId = event._id;
            moveEvents(eventsByID[eventId], dayDelta, minuteDelta, allDay);
            trigger('eventDrop', e, event, dayDelta, minuteDelta, allDay, function () {
                moveEvents(eventsByID[eventId], -dayDelta, -minuteDelta, oldAllDay);
                reportEventChange(eventId)
            }, ev, ui);
            reportEventChange(eventId)
        }

        function eventResize(e, event, dayDelta, minuteDelta, ev, ui) {
            var eventId = event._id;
            elongateEvents(eventsByID[eventId], dayDelta, minuteDelta);
            trigger('eventResize', e, event, dayDelta, minuteDelta, function () {
                elongateEvents(eventsByID[eventId], -dayDelta, -minuteDelta);
                reportEventChange(eventId)
            }, ev, ui);
            reportEventChange(eventId)
        }

        function moveEvents(events, dayDelta, minuteDelta, allDay) {
            minuteDelta = minuteDelta || 0;
            for (var e, len = events.length, i = 0; i < len; i++) {
                e = events[i];
                if (allDay !== undefined) {
                    e.allDay = allDay
                }
                addMinutes(addDays(e.start, dayDelta, true), minuteDelta);
                if (e.end) {
                    e.end = addMinutes(addDays(e.end, dayDelta, true), minuteDelta)
                }
                normalizeEvent(e, options)
            }
        }

        function elongateEvents(events, dayDelta, minuteDelta) {
            minuteDelta = minuteDelta || 0;
            for (var e, len = events.length, i = 0; i < len; i++) {
                e = events[i];
                e.end = addMinutes(addDays(eventEnd(e), dayDelta, true), minuteDelta);
                normalizeEvent(e, options)
            }
        }
    }

    function DayEventRenderer() {
        var t = this;
        t.renderDaySegs = renderDaySegs;
        t.resizableDayEvent = resizableDayEvent;
        var opt = t.opt;
        var trigger = t.trigger;
        var isEventDraggable = t.isEventDraggable;
        var isEventResizable = t.isEventResizable;
        var eventEnd = t.eventEnd;
        var reportEventElement = t.reportEventElement;
        var showEvents = t.showEvents;
        var hideEvents = t.hideEvents;
        var eventResize = t.eventResize;
        var getRowCnt = t.getRowCnt;
        var getColCnt = t.getColCnt;
        var getColWidth = t.getColWidth;
        var allDayRow = t.allDayRow;
        var allDayBounds = t.allDayBounds;
        var colContentLeft = t.colContentLeft;
        var colContentRight = t.colContentRight;
        var dayOfWeekCol = t.dayOfWeekCol;
        var dateCell = t.dateCell;
        var compileDaySegs = t.compileDaySegs;
        var getDaySegmentContainer = t.getDaySegmentContainer;
        var bindDaySeg = t.bindDaySeg;
        var formatDates = t.calendar.formatDates;
        var renderDayOverlay = t.renderDayOverlay;
        var clearOverlays = t.clearOverlays;
        var clearSelection = t.clearSelection;

        function renderDaySegs(segs, modifiedEventId) {
            var segmentContainer = getDaySegmentContainer();
            var rowDivs;
            var rowCnt = getRowCnt();
            var colCnt = getColCnt();
            var i = 0;
            var rowI;
            var levelI;
            var colHeights;
            var j;
            var segCnt = segs.length;
            var seg;
            var top;
            var k;
            segmentContainer[0].innerHTML = daySegHTML(segs);
            daySegElementResolve(segs, segmentContainer.children());
            daySegElementReport(segs);
            daySegHandlers(segs, segmentContainer, modifiedEventId);
            daySegCalcHSides(segs);
            daySegSetWidths(segs);
            daySegCalcHeights(segs);
            rowDivs = getRowDivs();
            for (rowI = 0; rowI < rowCnt; rowI++) {
                levelI = 0;
                colHeights = [];
                for (j = 0; j < colCnt; j++) {
                    colHeights[j] = 0
                }
                while (i < segCnt && (seg = segs[i]).row == rowI) {
                    top = arrayMax(colHeights.slice(seg.startCol, seg.endCol));
                    seg.top = top;
                    top += seg.outerHeight;
                    for (k = seg.startCol; k < seg.endCol; k++) {
                        colHeights[k] = top
                    }
                    i++
                }
                rowDivs[rowI].height(arrayMax(colHeights))
            }
            daySegSetTops(segs, getRowTops(rowDivs))
        }

        function renderTempDaySegs(segs, adjustRow, adjustTop) {
            var tempContainer = $("<div/>");
            var elements;
            var segmentContainer = getDaySegmentContainer();
            var i;
            var segCnt = segs.length;
            var element;
            tempContainer[0].innerHTML = daySegHTML(segs);
            elements = tempContainer.children();
            segmentContainer.append(elements);
            daySegElementResolve(segs, elements);
            daySegCalcHSides(segs);
            daySegSetWidths(segs);
            daySegCalcHeights(segs);
            daySegSetTops(segs, getRowTops(getRowDivs()));
            elements = [];
            for (i = 0; i < segCnt; i++) {
                element = segs[i].element;
                if (element) {
                    if (segs[i].row === adjustRow) {
                        element.css('top', adjustTop)
                    }
                    elements.push(element[0])
                }
            }
            return $(elements)
        }

        function daySegHTML(segs) {
            var rtl = opt('isRTL');
            var i;
            var segCnt = segs.length;
            var seg;
            var event;
            var url;
            var classes;
            var bounds = allDayBounds();
            var minLeft = bounds.left;
            var maxLeft = bounds.right;
            var leftCol;
            var rightCol;
            var left;
            var right;
            var skinCss;
            var html = '';
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                event = seg.event;
                classes = ['fc-event', 'fc-event-skin', 'fc-event-hori'];
                if (isEventDraggable(event)) {
                    classes.push('fc-event-draggable')
                }
                if (rtl) {
                    if (seg.isStart) {
                        classes.push('fc-corner-right')
                    }
                    if (seg.isEnd) {
                        classes.push('fc-corner-left')
                    }
                    leftCol = dayOfWeekCol(seg.end.getDay() - 1);
                    rightCol = dayOfWeekCol(seg.start.getDay());
                    left = seg.isEnd ? colContentLeft(leftCol) : minLeft;
                    right = seg.isStart ? colContentRight(rightCol) : maxLeft
                } else {
                    if (seg.isStart) {
                        classes.push('fc-corner-left')
                    }
                    if (seg.isEnd) {
                        classes.push('fc-corner-right')
                    }
                    leftCol = dayOfWeekCol(seg.start.getDay());
                    rightCol = dayOfWeekCol(seg.end.getDay() - 1);
                    left = seg.isStart ? colContentLeft(leftCol) : minLeft;
                    right = seg.isEnd ? colContentRight(rightCol) : maxLeft
                }
                classes = classes.concat(event.className);
                if (event.source) {
                    classes = classes.concat(event.source.className || [])
                }
                url = event.url;
                skinCss = getSkinCss(event, opt);
                if (url) {
                    html += "<a rel='nofollow' target='_blank' href='" + htmlEscape(url) + "'";
                    html += " class='" + classes.join(' ') + "' style='position:absolute;z-index:8;left:" + left + "px;text-align:center;'><div class='fc-event-inner fc-event-skin'" + (skinCss ? " style='" + skinCss + "'" : '') + ">"
                } else {
                    html += "<div";
                    html += " class='" + classes.join(' ') + "' style='position:absolute;z-index:8;left:" + left + "px;margin-top:-20px;text-align:right;'><div class='fc-event-inner fc-event-skin'" + (skinCss ? " style='" + skinCss + "'" : '') + ">"
                }
                if (!event.allDay && seg.isStart) {
                    html += "<span class='fc-event-time'>" + htmlEscape(formatDates(event.start, event.end, opt('timeFormat'))) + "</span>"
                }
                if (event._id.match(/[l|r]{0,1}cu_\d{4}-\d{1,2}-\d{1,2}/)) {
                    event._id = event._id.replace(/(^\s*)|(\s*$)/g, "").replace(/\ {2,}/, " ");
                    var eventIds = event._id.split(" ");
                    var eventIdsCnt = eventIds.length;
                    var iconCss = '';
                    var lastSpanCss = '';
                    for (var j = 0; j < eventIdsCnt; j++) {
                        if (eventIds[j].match(/[l|r]{0,1}cu_\d{4}-\d{1,2}-\d{1,2}/)) {
                            iconCss = eventIds[j];
                            continue
                        }
                        if (j < eventIdsCnt - 2) {
                            html += "<span class='" + htmlEscape(eventIds[j]) + "'></span>"
                        } else if (j == eventIdsCnt - 2) {
                            if (iconCss != '') {
                                html += "<span class='" + htmlEscape(eventIds[j]) + "'></span>"
                            } else {
                                lastSpanCss = eventIds[j]
                            }
                        } else {
                            lastSpanCss = eventIds[j]
                        }
                    }
                    html += "<span class='fc-event-title " + htmlEscape(lastSpanCss + " " + iconCss) + "'>" + htmlEscape(event.title) + "</span></div>"
                } else {
                    html += "<span class='fc-event-title " + htmlEscape(event._id) + "'>" + htmlEscape(event.title) + "</span></div>"
                }
                if (seg.isEnd && isEventResizable(event)) {
                    html += "<div class='ui-resizable-handle ui-resizable-" + (rtl ? 'w' : 'e') + "'>&nbsp;&nbsp;&nbsp;</div>"
                }
                html += "</" + (url ? "a" : "div") + ">";
                seg.left = left;
                seg.outerWidth = right - left;
                seg.startCol = leftCol;
                seg.endCol = rightCol + 1
            }
            return html
        }

        function daySegElementResolve(segs, elements) {
            var i;
            var segCnt = segs.length;
            var seg;
            var event;
            var element;
            var triggerRes;
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                event = seg.event;
                element = $(elements[i]);
                triggerRes = trigger('eventRender', event, event, element);
                if (triggerRes === false) {
                    element.remove()
                } else {
                    if (triggerRes && triggerRes !== true) {
                        triggerRes = $(triggerRes).css({position: 'absolute', left: seg.left});
                        element.replaceWith(triggerRes);
                        element = triggerRes
                    }
                    seg.element = element
                }
            }
        }

        function daySegElementReport(segs) {
            var i;
            var segCnt = segs.length;
            var seg;
            var element;
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                element = seg.element;
                if (element) {
                    reportEventElement(seg.event, element)
                }
            }
        }

        function daySegHandlers(segs, segmentContainer, modifiedEventId) {
            var i;
            var segCnt = segs.length;
            var seg;
            var element;
            var event;
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                element = seg.element;
                if (element) {
                    event = seg.event;
                    if (event._id === modifiedEventId) {
                        bindDaySeg(event, element, seg)
                    } else {
                        element[0]._fci = i
                    }
                }
            }
            lazySegBind(segmentContainer, segs, bindDaySeg)
        }

        function daySegCalcHSides(segs) {
            var i;
            var segCnt = segs.length;
            var seg;
            var element;
            var key, val;
            var hsideCache = {};
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                element = seg.element;
                if (element) {
                    key = seg.key = cssKey(element[0]);
                    val = hsideCache[key];
                    if (val === undefined) {
                        val = hsideCache[key] = hsides(element, true)
                    }
                    seg.hsides = val
                }
            }
        }

        function daySegSetWidths(segs) {
            var i;
            var segCnt = segs.length;
            var seg;
            var element;
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                element = seg.element;
                if (element) {
                    element[0].style.width = Math.max(0, seg.outerWidth - seg.hsides) + 'px'
                }
            }
        }

        function daySegCalcHeights(segs) {
            var i;
            var segCnt = segs.length;
            var seg;
            var element;
            var key, val;
            var vmarginCache = {};
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                element = seg.element;
                if (element) {
                    key = seg.key;
                    val = vmarginCache[key];
                    if (val === undefined) {
                        val = vmarginCache[key] = vmargins(element)
                    }
                    seg.outerHeight = element[0].offsetHeight + val
                }
            }
        }

        function getRowDivs() {
            var i;
            var rowCnt = getRowCnt();
            var rowDivs = [];
            for (i = 0; i < rowCnt; i++) {
                rowDivs[i] = allDayRow(i).find('td:first div.fc-day-content > div')
            }
            return rowDivs
        }

        function getRowTops(rowDivs) {
            var i;
            var rowCnt = rowDivs.length;
            var tops = [];
            for (i = 0; i < rowCnt; i++) {
                tops[i] = rowDivs[i][0].offsetTop
            }
            return tops
        }

        function daySegSetTops(segs, rowTops) {
            var i;
            var segCnt = segs.length;
            var seg;
            var element;
            var event;
            for (i = 0; i < segCnt; i++) {
                seg = segs[i];
                element = seg.element;
                if (element) {
                    element[0].style.top = rowTops[seg.row] + (seg.top || 0) + 'px';
                    event = seg.event;
                    trigger('eventAfterRender', event, event, element)
                }
            }
        }

        function resizableDayEvent(event, element, seg) {
            var rtl = opt('isRTL');
            var direction = rtl ? 'w' : 'e';
            var handle = element.find('div.ui-resizable-' + direction);
            var isResizing = false;
            disableTextSelection(element);
            element.mousedown(function (ev) {
                ev.preventDefault()
            }).click(function (ev) {
                if (isResizing) {
                    ev.preventDefault();
                    ev.stopImmediatePropagation()
                }
            });
            handle.mousedown(function (ev) {
                if (ev.which != 1) {
                    return
                }
                isResizing = true;
                var hoverListener = t.getHoverListener();
                var rowCnt = getRowCnt();
                var colCnt = getColCnt();
                var dis = rtl ? -1 : 1;
                var dit = rtl ? colCnt - 1 : 0;
                var elementTop = element.css('top');
                var dayDelta;
                var helpers;
                var eventCopy = $.extend({}, event);
                var minCell = dateCell(event.start);
                clearSelection();
                $('body').css('cursor', direction + '-resize').one('mouseup', mouseup);
                trigger('eventResizeStart', this, event, ev);
                hoverListener.start(function (cell, origCell) {
                    if (cell) {
                        var r = Math.max(minCell.row, cell.row);
                        var c = cell.col;
                        if (rowCnt == 1) {
                            r = 0
                        }
                        if (r == minCell.row) {
                            if (rtl) {
                                c = Math.min(minCell.col, c)
                            } else {
                                c = Math.max(minCell.col, c)
                            }
                        }
                        dayDelta = (r * 7 + c * dis + dit) - (origCell.row * 7 + origCell.col * dis + dit);
                        var newEnd = addDays(eventEnd(event), dayDelta, true);
                        if (dayDelta) {
                            eventCopy.end = newEnd;
                            var oldHelpers = helpers;
                            helpers = renderTempDaySegs(compileDaySegs([eventCopy]), seg.row, elementTop);
                            helpers.find('*').css('cursor', direction + '-resize');
                            if (oldHelpers) {
                                oldHelpers.remove()
                            }
                            hideEvents(event)
                        } else {
                            if (helpers) {
                                showEvents(event);
                                helpers.remove();
                                helpers = null
                            }
                        }
                        clearOverlays();
                        renderDayOverlay(event.start, addDays(cloneDate(newEnd), 1))
                    }
                }, ev);
                function mouseup(ev) {
                    trigger('eventResizeStop', this, event, ev);
                    $('body').css('cursor', '');
                    hoverListener.stop();
                    clearOverlays();
                    if (dayDelta) {
                        eventResize(this, event, dayDelta, 0, ev)
                    }
                    setTimeout(function () {
                        isResizing = false
                    }, 0)
                }
            })
        }
    }

    function SelectionManager() {
        var t = this;
        t.select = select;
        t.unselect = unselect;
        t.reportSelection = reportSelection;
        t.daySelectionMousedown = daySelectionMousedown;
        var opt = t.opt;
        var trigger = t.trigger;
        var defaultSelectionEnd = t.defaultSelectionEnd;
        var renderSelection = t.renderSelection;
        var clearSelection = t.clearSelection;
        var selected = false;
        if (opt('selectable') && opt('unselectAuto')) {
            $(document).mousedown(function (ev) {
                var ignore = opt('unselectCancel');
                if (ignore) {
                    if ($(ev.target).parents(ignore).length) {
                        return
                    }
                }
                unselect(ev)
            })
        }
        function select(startDate, endDate, allDay) {
            unselect();
            if (!endDate) {
                endDate = defaultSelectionEnd(startDate, allDay)
            }
            renderSelection(startDate, endDate, allDay);
            reportSelection(startDate, endDate, allDay)
        }

        function unselect(ev) {
            if (selected) {
                selected = false;
                clearSelection();
                trigger('unselect', null, ev)
            }
        }

        function reportSelection(startDate, endDate, allDay, ev) {
            selected = true;
            trigger('select', null, startDate, endDate, allDay, ev)
        }

        function daySelectionMousedown(ev) {
            var cellDate = t.cellDate;
            var cellIsAllDay = t.cellIsAllDay;
            var hoverListener = t.getHoverListener();
            var reportDayClick = t.reportDayClick;
            if (ev.which == 1 && opt('selectable')) {
                unselect(ev);
                var _mousedownElement = this;
                var dates;
                hoverListener.start(function (cell, origCell) {
                    clearSelection();
                    if (cell && cellIsAllDay(cell)) {
                        dates = [cellDate(origCell), cellDate(cell)].sort(cmp);
                        renderSelection(dates[0], dates[1], true)
                    } else {
                        dates = null
                    }
                }, ev);
                $(document).one('mouseup', function (ev) {
                    hoverListener.stop();
                    if (dates) {
                        if (+dates[0] == +dates[1]) {
                            reportDayClick(dates[0], true, ev)
                        }
                        reportSelection(dates[0], dates[1], true, ev)
                    }
                })
            }
        }
    }

    function OverlayManager() {
        var t = this;
        t.renderOverlay = renderOverlay;
        t.clearOverlays = clearOverlays;
        var usedOverlays = [];
        var unusedOverlays = [];

        function renderOverlay(rect, parent) {
            var e = unusedOverlays.shift();
            if (!e) {
                e = $("<div class='fc-cell-overlay' style='position:absolute;z-index:3'/>")
            }
            if (e[0].parentNode != parent[0]) {
                e.appendTo(parent)
            }
            usedOverlays.push(e.css(rect).show());
            return e
        }

        function clearOverlays() {
            var e;
            while (e = usedOverlays.shift()) {
                unusedOverlays.push(e.hide().unbind())
            }
        }
    }

    function CoordinateGrid(buildFunc) {
        var t = this;
        var rows;
        var cols;
        t.build = function () {
            rows = [];
            cols = [];
            buildFunc(rows, cols)
        };
        t.cell = function (x, y) {
            var rowCnt = rows.length;
            var colCnt = cols.length;
            var i, r = -1, c = -1;
            for (i = 0; i < rowCnt; i++) {
                if (y >= rows[i][0] && y < rows[i][1]) {
                    r = i;
                    break
                }
            }
            for (i = 0; i < colCnt; i++) {
                if (x >= cols[i][0] && x < cols[i][1]) {
                    c = i;
                    break
                }
            }
            return(r >= 0 && c >= 0) ? {row: r, col: c} : null
        };
        t.rect = function (row0, col0, row1, col1, originElement) {
            var origin = originElement.offset();
            return{top: rows[row0][0] - origin.top, left: cols[col0][0] - origin.left, width: cols[col1][1] - cols[col0][0], height: rows[row1][1] - rows[row0][0]}
        }
    }

    function HoverListener(coordinateGrid) {
        var t = this;
        var bindType;
        var change;
        var firstCell;
        var cell;
        t.start = function (_change, ev, _bindType) {
            change = _change;
            firstCell = cell = null;
            coordinateGrid.build();
            mouse(ev);
            bindType = _bindType || 'mousemove';
            $(document).bind(bindType, mouse)
        };
        function mouse(ev) {
            _fixUIEvent(ev);
            var newCell = coordinateGrid.cell(ev.pageX, ev.pageY);
            if (!newCell != !cell || newCell && (newCell.row != cell.row || newCell.col != cell.col)) {
                if (newCell) {
                    if (!firstCell) {
                        firstCell = newCell
                    }
                    change(newCell, firstCell, newCell.row - firstCell.row, newCell.col - firstCell.col)
                } else {
                    change(newCell, firstCell)
                }
                cell = newCell
            }
        }

        t.stop = function () {
            $(document).unbind(bindType, mouse);
            return cell
        }
    }

    function _fixUIEvent(event) {
        if (event.pageX === undefined) {
            event.pageX = event.originalEvent.pageX;
            event.pageY = event.originalEvent.pageY
        }
    }

    function HorizontalPositionCache(getElement) {
        var t = this, elements = {}, lefts = {}, rights = {};

        function e(i) {
            return elements[i] = elements[i] || getElement(i)
        }

        t.left = function (i) {
            return lefts[i] = lefts[i] === undefined ? e(i).position().left : lefts[i]
        };
        t.right = function (i) {
            return rights[i] = rights[i] === undefined ? t.left(i) + e(i).width() : rights[i]
        };
        t.clear = function () {
            elements = {};
            lefts = {};
            rights = {}
        }
    }
})(jQuery);
;//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
(function(){var n=this,t=n._,r={},e=Array.prototype,u=Object.prototype,i=Function.prototype,a=e.push,o=e.slice,c=e.concat,l=u.toString,f=u.hasOwnProperty,s=e.forEach,p=e.map,h=e.reduce,v=e.reduceRight,g=e.filter,d=e.every,m=e.some,y=e.indexOf,b=e.lastIndexOf,x=Array.isArray,w=Object.keys,_=i.bind,j=function(n){return n instanceof j?n:this instanceof j?void(this._wrapped=n):new j(n)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=j),exports._=j):n._=j,j.VERSION="1.6.0";var A=j.each=j.forEach=function(n,t,e){if(null==n)return n;if(s&&n.forEach===s)n.forEach(t,e);else if(n.length===+n.length){for(var u=0,i=n.length;i>u;u++)if(t.call(e,n[u],u,n)===r)return}else for(var a=j.keys(n),u=0,i=a.length;i>u;u++)if(t.call(e,n[a[u]],a[u],n)===r)return;return n};j.map=j.collect=function(n,t,r){var e=[];return null==n?e:p&&n.map===p?n.map(t,r):(A(n,function(n,u,i){e.push(t.call(r,n,u,i))}),e)};var O="Reduce of empty array with no initial value";j.reduce=j.foldl=j.inject=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),h&&n.reduce===h)return e&&(t=j.bind(t,e)),u?n.reduce(t,r):n.reduce(t);if(A(n,function(n,i,a){u?r=t.call(e,r,n,i,a):(r=n,u=!0)}),!u)throw new TypeError(O);return r},j.reduceRight=j.foldr=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),v&&n.reduceRight===v)return e&&(t=j.bind(t,e)),u?n.reduceRight(t,r):n.reduceRight(t);var i=n.length;if(i!==+i){var a=j.keys(n);i=a.length}if(A(n,function(o,c,l){c=a?a[--i]:--i,u?r=t.call(e,r,n[c],c,l):(r=n[c],u=!0)}),!u)throw new TypeError(O);return r},j.find=j.detect=function(n,t,r){var e;return k(n,function(n,u,i){return t.call(r,n,u,i)?(e=n,!0):void 0}),e},j.filter=j.select=function(n,t,r){var e=[];return null==n?e:g&&n.filter===g?n.filter(t,r):(A(n,function(n,u,i){t.call(r,n,u,i)&&e.push(n)}),e)},j.reject=function(n,t,r){return j.filter(n,function(n,e,u){return!t.call(r,n,e,u)},r)},j.every=j.all=function(n,t,e){t||(t=j.identity);var u=!0;return null==n?u:d&&n.every===d?n.every(t,e):(A(n,function(n,i,a){return(u=u&&t.call(e,n,i,a))?void 0:r}),!!u)};var k=j.some=j.any=function(n,t,e){t||(t=j.identity);var u=!1;return null==n?u:m&&n.some===m?n.some(t,e):(A(n,function(n,i,a){return u||(u=t.call(e,n,i,a))?r:void 0}),!!u)};j.contains=j.include=function(n,t){return null==n?!1:y&&n.indexOf===y?n.indexOf(t)!=-1:k(n,function(n){return n===t})},j.invoke=function(n,t){var r=o.call(arguments,2),e=j.isFunction(t);return j.map(n,function(n){return(e?t:n[t]).apply(n,r)})},j.pluck=function(n,t){return j.map(n,j.property(t))},j.where=function(n,t){return j.filter(n,j.matches(t))},j.findWhere=function(n,t){return j.find(n,j.matches(t))},j.max=function(n,t,r){if(!t&&j.isArray(n)&&n[0]===+n[0]&&n.length<65535)return Math.max.apply(Math,n);var e=-1/0,u=-1/0;return A(n,function(n,i,a){var o=t?t.call(r,n,i,a):n;o>u&&(e=n,u=o)}),e},j.min=function(n,t,r){if(!t&&j.isArray(n)&&n[0]===+n[0]&&n.length<65535)return Math.min.apply(Math,n);var e=1/0,u=1/0;return A(n,function(n,i,a){var o=t?t.call(r,n,i,a):n;u>o&&(e=n,u=o)}),e},j.shuffle=function(n){var t,r=0,e=[];return A(n,function(n){t=j.random(r++),e[r-1]=e[t],e[t]=n}),e},j.sample=function(n,t,r){return null==t||r?(n.length!==+n.length&&(n=j.values(n)),n[j.random(n.length-1)]):j.shuffle(n).slice(0,Math.max(0,t))};var E=function(n){return null==n?j.identity:j.isFunction(n)?n:j.property(n)};j.sortBy=function(n,t,r){return t=E(t),j.pluck(j.map(n,function(n,e,u){return{value:n,index:e,criteria:t.call(r,n,e,u)}}).sort(function(n,t){var r=n.criteria,e=t.criteria;if(r!==e){if(r>e||r===void 0)return 1;if(e>r||e===void 0)return-1}return n.index-t.index}),"value")};var F=function(n){return function(t,r,e){var u={};return r=E(r),A(t,function(i,a){var o=r.call(e,i,a,t);n(u,o,i)}),u}};j.groupBy=F(function(n,t,r){j.has(n,t)?n[t].push(r):n[t]=[r]}),j.indexBy=F(function(n,t,r){n[t]=r}),j.countBy=F(function(n,t){j.has(n,t)?n[t]++:n[t]=1}),j.sortedIndex=function(n,t,r,e){r=E(r);for(var u=r.call(e,t),i=0,a=n.length;a>i;){var o=i+a>>>1;r.call(e,n[o])<u?i=o+1:a=o}return i},j.toArray=function(n){return n?j.isArray(n)?o.call(n):n.length===+n.length?j.map(n,j.identity):j.values(n):[]},j.size=function(n){return null==n?0:n.length===+n.length?n.length:j.keys(n).length},j.first=j.head=j.take=function(n,t,r){return null==n?void 0:null==t||r?n[0]:0>t?[]:o.call(n,0,t)},j.initial=function(n,t,r){return o.call(n,0,n.length-(null==t||r?1:t))},j.last=function(n,t,r){return null==n?void 0:null==t||r?n[n.length-1]:o.call(n,Math.max(n.length-t,0))},j.rest=j.tail=j.drop=function(n,t,r){return o.call(n,null==t||r?1:t)},j.compact=function(n){return j.filter(n,j.identity)};var M=function(n,t,r){return t&&j.every(n,j.isArray)?c.apply(r,n):(A(n,function(n){j.isArray(n)||j.isArguments(n)?t?a.apply(r,n):M(n,t,r):r.push(n)}),r)};j.flatten=function(n,t){return M(n,t,[])},j.without=function(n){return j.difference(n,o.call(arguments,1))},j.partition=function(n,t){var r=[],e=[];return A(n,function(n){(t(n)?r:e).push(n)}),[r,e]},j.uniq=j.unique=function(n,t,r,e){j.isFunction(t)&&(e=r,r=t,t=!1);var u=r?j.map(n,r,e):n,i=[],a=[];return A(u,function(r,e){(t?e&&a[a.length-1]===r:j.contains(a,r))||(a.push(r),i.push(n[e]))}),i},j.union=function(){return j.uniq(j.flatten(arguments,!0))},j.intersection=function(n){var t=o.call(arguments,1);return j.filter(j.uniq(n),function(n){return j.every(t,function(t){return j.contains(t,n)})})},j.difference=function(n){var t=c.apply(e,o.call(arguments,1));return j.filter(n,function(n){return!j.contains(t,n)})},j.zip=function(){for(var n=j.max(j.pluck(arguments,"length").concat(0)),t=new Array(n),r=0;n>r;r++)t[r]=j.pluck(arguments,""+r);return t},j.object=function(n,t){if(null==n)return{};for(var r={},e=0,u=n.length;u>e;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},j.indexOf=function(n,t,r){if(null==n)return-1;var e=0,u=n.length;if(r){if("number"!=typeof r)return e=j.sortedIndex(n,t),n[e]===t?e:-1;e=0>r?Math.max(0,u+r):r}if(y&&n.indexOf===y)return n.indexOf(t,r);for(;u>e;e++)if(n[e]===t)return e;return-1},j.lastIndexOf=function(n,t,r){if(null==n)return-1;var e=null!=r;if(b&&n.lastIndexOf===b)return e?n.lastIndexOf(t,r):n.lastIndexOf(t);for(var u=e?r:n.length;u--;)if(n[u]===t)return u;return-1},j.range=function(n,t,r){arguments.length<=1&&(t=n||0,n=0),r=arguments[2]||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=0,i=new Array(e);e>u;)i[u++]=n,n+=r;return i};var R=function(){};j.bind=function(n,t){var r,e;if(_&&n.bind===_)return _.apply(n,o.call(arguments,1));if(!j.isFunction(n))throw new TypeError;return r=o.call(arguments,2),e=function(){if(!(this instanceof e))return n.apply(t,r.concat(o.call(arguments)));R.prototype=n.prototype;var u=new R;R.prototype=null;var i=n.apply(u,r.concat(o.call(arguments)));return Object(i)===i?i:u}},j.partial=function(n){var t=o.call(arguments,1);return function(){for(var r=0,e=t.slice(),u=0,i=e.length;i>u;u++)e[u]===j&&(e[u]=arguments[r++]);for(;r<arguments.length;)e.push(arguments[r++]);return n.apply(this,e)}},j.bindAll=function(n){var t=o.call(arguments,1);if(0===t.length)throw new Error("bindAll must be passed function names");return A(t,function(t){n[t]=j.bind(n[t],n)}),n},j.memoize=function(n,t){var r={};return t||(t=j.identity),function(){var e=t.apply(this,arguments);return j.has(r,e)?r[e]:r[e]=n.apply(this,arguments)}},j.delay=function(n,t){var r=o.call(arguments,2);return setTimeout(function(){return n.apply(null,r)},t)},j.defer=function(n){return j.delay.apply(j,[n,1].concat(o.call(arguments,1)))},j.throttle=function(n,t,r){var e,u,i,a=null,o=0;r||(r={});var c=function(){o=r.leading===!1?0:j.now(),a=null,i=n.apply(e,u),e=u=null};return function(){var l=j.now();o||r.leading!==!1||(o=l);var f=t-(l-o);return e=this,u=arguments,0>=f?(clearTimeout(a),a=null,o=l,i=n.apply(e,u),e=u=null):a||r.trailing===!1||(a=setTimeout(c,f)),i}},j.debounce=function(n,t,r){var e,u,i,a,o,c=function(){var l=j.now()-a;t>l?e=setTimeout(c,t-l):(e=null,r||(o=n.apply(i,u),i=u=null))};return function(){i=this,u=arguments,a=j.now();var l=r&&!e;return e||(e=setTimeout(c,t)),l&&(o=n.apply(i,u),i=u=null),o}},j.once=function(n){var t,r=!1;return function(){return r?t:(r=!0,t=n.apply(this,arguments),n=null,t)}},j.wrap=function(n,t){return j.partial(t,n)},j.compose=function(){var n=arguments;return function(){for(var t=arguments,r=n.length-1;r>=0;r--)t=[n[r].apply(this,t)];return t[0]}},j.after=function(n,t){return function(){return--n<1?t.apply(this,arguments):void 0}},j.keys=function(n){if(!j.isObject(n))return[];if(w)return w(n);var t=[];for(var r in n)j.has(n,r)&&t.push(r);return t},j.values=function(n){for(var t=j.keys(n),r=t.length,e=new Array(r),u=0;r>u;u++)e[u]=n[t[u]];return e},j.pairs=function(n){for(var t=j.keys(n),r=t.length,e=new Array(r),u=0;r>u;u++)e[u]=[t[u],n[t[u]]];return e},j.invert=function(n){for(var t={},r=j.keys(n),e=0,u=r.length;u>e;e++)t[n[r[e]]]=r[e];return t},j.functions=j.methods=function(n){var t=[];for(var r in n)j.isFunction(n[r])&&t.push(r);return t.sort()},j.extend=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)n[r]=t[r]}),n},j.pick=function(n){var t={},r=c.apply(e,o.call(arguments,1));return A(r,function(r){r in n&&(t[r]=n[r])}),t},j.omit=function(n){var t={},r=c.apply(e,o.call(arguments,1));for(var u in n)j.contains(r,u)||(t[u]=n[u]);return t},j.defaults=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)n[r]===void 0&&(n[r]=t[r])}),n},j.clone=function(n){return j.isObject(n)?j.isArray(n)?n.slice():j.extend({},n):n},j.tap=function(n,t){return t(n),n};var S=function(n,t,r,e){if(n===t)return 0!==n||1/n==1/t;if(null==n||null==t)return n===t;n instanceof j&&(n=n._wrapped),t instanceof j&&(t=t._wrapped);var u=l.call(n);if(u!=l.call(t))return!1;switch(u){case"[object String]":return n==String(t);case"[object Number]":return n!=+n?t!=+t:0==n?1/n==1/t:n==+t;case"[object Date]":case"[object Boolean]":return+n==+t;case"[object RegExp]":return n.source==t.source&&n.global==t.global&&n.multiline==t.multiline&&n.ignoreCase==t.ignoreCase}if("object"!=typeof n||"object"!=typeof t)return!1;for(var i=r.length;i--;)if(r[i]==n)return e[i]==t;var a=n.constructor,o=t.constructor;if(a!==o&&!(j.isFunction(a)&&a instanceof a&&j.isFunction(o)&&o instanceof o)&&"constructor"in n&&"constructor"in t)return!1;r.push(n),e.push(t);var c=0,f=!0;if("[object Array]"==u){if(c=n.length,f=c==t.length)for(;c--&&(f=S(n[c],t[c],r,e)););}else{for(var s in n)if(j.has(n,s)&&(c++,!(f=j.has(t,s)&&S(n[s],t[s],r,e))))break;if(f){for(s in t)if(j.has(t,s)&&!c--)break;f=!c}}return r.pop(),e.pop(),f};j.isEqual=function(n,t){return S(n,t,[],[])},j.isEmpty=function(n){if(null==n)return!0;if(j.isArray(n)||j.isString(n))return 0===n.length;for(var t in n)if(j.has(n,t))return!1;return!0},j.isElement=function(n){return!(!n||1!==n.nodeType)},j.isArray=x||function(n){return"[object Array]"==l.call(n)},j.isObject=function(n){return n===Object(n)},A(["Arguments","Function","String","Number","Date","RegExp"],function(n){j["is"+n]=function(t){return l.call(t)=="[object "+n+"]"}}),j.isArguments(arguments)||(j.isArguments=function(n){return!(!n||!j.has(n,"callee"))}),"function"!=typeof/./&&(j.isFunction=function(n){return"function"==typeof n}),j.isFinite=function(n){return isFinite(n)&&!isNaN(parseFloat(n))},j.isNaN=function(n){return j.isNumber(n)&&n!=+n},j.isBoolean=function(n){return n===!0||n===!1||"[object Boolean]"==l.call(n)},j.isNull=function(n){return null===n},j.isUndefined=function(n){return n===void 0},j.has=function(n,t){return f.call(n,t)},j.noConflict=function(){return n._=t,this},j.identity=function(n){return n},j.constant=function(n){return function(){return n}},j.property=function(n){return function(t){return t[n]}},j.matches=function(n){return function(t){if(t===n)return!0;for(var r in n)if(n[r]!==t[r])return!1;return!0}},j.times=function(n,t,r){for(var e=Array(Math.max(0,n)),u=0;n>u;u++)e[u]=t.call(r,u);return e},j.random=function(n,t){return null==t&&(t=n,n=0),n+Math.floor(Math.random()*(t-n+1))},j.now=Date.now||function(){return(new Date).getTime()};var T={escape:{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}};T.unescape=j.invert(T.escape);var I={escape:new RegExp("["+j.keys(T.escape).join("")+"]","g"),unescape:new RegExp("("+j.keys(T.unescape).join("|")+")","g")};j.each(["escape","unescape"],function(n){j[n]=function(t){return null==t?"":(""+t).replace(I[n],function(t){return T[n][t]})}}),j.result=function(n,t){if(null==n)return void 0;var r=n[t];return j.isFunction(r)?r.call(n):r},j.mixin=function(n){A(j.functions(n),function(t){var r=j[t]=n[t];j.prototype[t]=function(){var n=[this._wrapped];return a.apply(n,arguments),z.call(this,r.apply(j,n))}})};var N=0;j.uniqueId=function(n){var t=++N+"";return n?n+t:t},j.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var q=/(.)^/,B={"'":"'","\\":"\\","\r":"r","\n":"n","	":"t","\u2028":"u2028","\u2029":"u2029"},D=/\\|'|\r|\n|\t|\u2028|\u2029/g;j.template=function(n,t,r){var e;r=j.defaults({},r,j.templateSettings);var u=new RegExp([(r.escape||q).source,(r.interpolate||q).source,(r.evaluate||q).source].join("|")+"|$","g"),i=0,a="__p+='";n.replace(u,function(t,r,e,u,o){return a+=n.slice(i,o).replace(D,function(n){return"\\"+B[n]}),r&&(a+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'"),e&&(a+="'+\n((__t=("+e+"))==null?'':__t)+\n'"),u&&(a+="';\n"+u+"\n__p+='"),i=o+t.length,t}),a+="';\n",r.variable||(a="with(obj||{}){\n"+a+"}\n"),a="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+a+"return __p;\n";try{e=new Function(r.variable||"obj","_",a)}catch(o){throw o.source=a,o}if(t)return e(t,j);var c=function(n){return e.call(this,n,j)};return c.source="function("+(r.variable||"obj")+"){\n"+a+"}",c},j.chain=function(n){return j(n).chain()};var z=function(n){return this._chain?j(n).chain():n};j.mixin(j),A(["pop","push","reverse","shift","sort","splice","unshift"],function(n){var t=e[n];j.prototype[n]=function(){var r=this._wrapped;return t.apply(r,arguments),"shift"!=n&&"splice"!=n||0!==r.length||delete r[0],z.call(this,r)}}),A(["concat","join","slice"],function(n){var t=e[n];j.prototype[n]=function(){return z.call(this,t.apply(this._wrapped,arguments))}}),j.extend(j.prototype,{chain:function(){return this._chain=!0,this},value:function(){return this._wrapped}}),"function"==typeof define&&define.amd&&define("underscore",[],function(){return j})}).call(this);
;;(function(win,_){var array=[];var push=array.push;var slice=array.slice;var splice=array.splice;var Events={on:function(name,callback,context){if(!eventsApi(this,'on',name,[callback,context])||!callback)return this;this._events||(this._events={});var events=this._events[name]||(this._events[name]=[]);events.push({callback:callback,context:context,ctx:context||this});return this;},once:function(name,callback,context){if(!eventsApi(this,'once',name,[callback,context])||!callback)return this;var self=this;var once=_.once(function(){self.off(name,once);callback.apply(this,arguments);});once._callback=callback;return this.on(name,once,context);},off:function(name,callback,context){var retain,ev,events,names,i,l,j,k;if(!this._events||!eventsApi(this,'off',name,[callback,context]))return this;if(!name&&!callback&&!context){this._events=void 0;return this;}
names=name?[name]:_.keys(this._events);for(i=0,l=names.length;i<l;i++){name=names[i];if(events=this._events[name]){this._events[name]=retain=[];if(callback||context){for(j=0,k=events.length;j<k;j++){ev=events[j];if((callback&&callback!==ev.callback&&callback!==ev.callback._callback)||(context&&context!==ev.context)){retain.push(ev);}}}
if(!retain.length)delete this._events[name];}}
return this;},trigger:function(name){if(!this._events)return this;var args=slice.call(arguments,1);if(!eventsApi(this,'trigger',name,args))return this;var events=this._events[name];var allEvents=this._events.all;if(events)triggerEvents(events,args);if(allEvents)triggerEvents(allEvents,arguments);return this;},stopListening:function(obj,name,callback){var listeningTo=this._listeningTo;if(!listeningTo)return this;var remove=!name&&!callback;if(!callback&&typeof name==='object')callback=this;if(obj)(listeningTo={})[obj._listenId]=obj;for(var id in listeningTo){obj=listeningTo[id];obj.off(name,callback,this);if(remove||_.isEmpty(obj._events))delete this._listeningTo[id];}
return this;}};var eventSplitter=/\s+/;var eventsApi=function(obj,action,name,rest){if(!name)return true;if(typeof name==='object'){for(var key in name){obj[action].apply(obj,[key,name[key]].concat(rest));}
return false;}
if(eventSplitter.test(name)){var names=name.split(eventSplitter);for(var i=0,l=names.length;i<l;i++){obj[action].apply(obj,[names[i]].concat(rest));}
return false;}
return true;};var triggerEvents=function(events,args){var ev,i=-1,l=events.length,a1=args[0],a2=args[1],a3=args[2];switch(args.length){case 0:while(++i<l)(ev=events[i]).callback.call(ev.ctx);return;case 1:while(++i<l)(ev=events[i]).callback.call(ev.ctx,a1);return;case 2:while(++i<l)(ev=events[i]).callback.call(ev.ctx,a1,a2);return;case 3:while(++i<l)(ev=events[i]).callback.call(ev.ctx,a1,a2,a3);return;default:while(++i<l)(ev=events[i]).callback.apply(ev.ctx,args);return;}};var listenMethods={listenTo:'on',listenToOnce:'once'};_.each(listenMethods,function(implementation,method){Events[method]=function(obj,name,callback){var listeningTo=this._listeningTo||(this._listeningTo={});var id=obj._listenId||(obj._listenId=_.uniqueId('l'));listeningTo[id]=obj;if(!callback&&typeof name==='object')callback=this;obj[implementation](name,callback,this);return this;};});Events.bind=Events.on;Events.unbind=Events.off;function Event(){};Event.prototype=Events;win.Event=Event;win.Events=Events;})(window,_);;(function(factory){'use strict';if(typeof define==='function'&&define.amd){define(['jquery'],factory);}else if(typeof exports==='object'&&typeof require==='function'){factory(require('jquery'));}else{factory(jQuery);}}(function($){'use strict';var
utils=(function(){return{escapeRegExChars:function(value){return value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&");},createNode:function(containerClass){var div=document.createElement('div');div.className=containerClass;div.style.position='absolute';div.style.display='none';return div;}};}()),keys={ESC:27,TAB:9,RETURN:13,LEFT:37,UP:38,RIGHT:39,DOWN:40};function Autocomplete(el,options){var noop=function(){},that=this,defaults={ajaxSettings:{},autoSelectFirst:false,appendTo:document.body,serviceUrl:null,lookup:null,onSelect:null,width:'auto',minChars:1,maxHeight:300,deferRequestBy:0,params:{},formatResult:Autocomplete.formatResult,delimiter:null,zIndex:9999,type:'GET',noCache:false,onSearchStart:noop,onSearchComplete:noop,onSearchError:noop,containerClass:'autocomplete-suggestions',tabDisabled:false,dataType:'text',currentRequest:null,triggerSelectOnValidInput:true,preventBadQueries:true,lookupFilter:function(suggestion,originalQuery,queryLowerCase){return suggestion.value.toLowerCase().indexOf(queryLowerCase)!==-1;},paramName:'query',transformResult:function(response){return typeof response==='string'?$.parseJSON(response):response;},showNoSuggestionNotice:false,noSuggestionNotice:'No results',orientation:'bottom',forceFixPosition:false};that.element=el;that.el=$(el);that.suggestions=[];that.badQueries=[];that.selectedIndex=-1;that.currentValue=that.element.value;that.intervalId=0;that.cachedResponse={};that.onChangeInterval=null;that.onChange=null;that.isLocal=false;that.suggestionsContainer=null;that.noSuggestionsContainer=null;that.options=$.extend({},defaults,options);that.classes={selected:'autocomplete-selected',suggestion:'autocomplete-suggestion'};that.hint=null;that.hintValue='';that.selection=null;that.initialize();that.setOptions(options);}
Autocomplete.utils=utils;$.PkgAutocomplete=Autocomplete;Autocomplete.formatResult=function(suggestion,currentValue){var pattern='('+utils.escapeRegExChars(currentValue)+')';return suggestion.value.replace(new RegExp(pattern,'gi'),'<strong>$1<\/strong>');};Autocomplete.prototype={killerFn:null,initialize:function(){var that=this,suggestionSelector='.'+that.classes.suggestion,selected=that.classes.selected,options=that.options,container;that.element.setAttribute('autocomplete','off');that.killerFn=function(e){if($(e.target).closest('.'+that.options.containerClass).length===0){that.killSuggestions();that.disableKillerFn();}};that.noSuggestionsContainer=$('<div class="autocomplete-no-suggestion"></div>').html(this.options.noSuggestionNotice).get(0);that.suggestionsContainer=Autocomplete.utils.createNode(options.containerClass);container=$(that.suggestionsContainer);container.appendTo(options.appendTo);if(options.width!=='auto'){container.width(options.width);}
container.on('mouseover.autocomplete',suggestionSelector,function(){that.activate($(this).data('index'));});container.on('mouseout.autocomplete',function(){that.selectedIndex=-1;container.children('.'+selected).removeClass(selected);});container.on('click.autocomplete',suggestionSelector,function(){that.select($(this).data('index'));});that.fixPositionCapture=function(){if(that.visible){that.fixPosition();}};$(window).on('resize.autocomplete',that.fixPositionCapture);that.el.on('keydown.autocomplete',function(e){that.onKeyPress(e);});that.el.on('keyup.autocomplete',function(e){that.onKeyUp(e);});that.el.on('blur.autocomplete',function(){that.onBlur();});that.el.on('focus.autocomplete',function(){that.onFocus();});that.el.on('change.autocomplete',function(e){that.onKeyUp(e);});},onFocus:function(){var that=this;that.fixPosition();if(that.options.minChars<=that.el.val().length){that.onValueChange();}},onBlur:function(){this.enableKillerFn();},setOptions:function(suppliedOptions){var that=this,options=that.options;$.extend(options,suppliedOptions);that.isLocal=$.isArray(options.lookup);if(that.isLocal){options.lookup=that.verifySuggestionsFormat(options.lookup);}
options.orientation=that.validateOrientation(options.orientation,'bottom');$(that.suggestionsContainer).css({'max-height':options.maxHeight+'px','width':options.width+'px','z-index':options.zIndex});},clearCache:function(){this.cachedResponse={};this.badQueries=[];},clear:function(){this.clearCache();this.currentValue='';this.suggestions=[];},disable:function(){var that=this;that.disabled=true;clearInterval(that.onChangeInterval);if(that.currentRequest){that.currentRequest.abort();}},enable:function(){this.disabled=false;},fixPosition:function(){var that=this,$container=$(that.suggestionsContainer),containerParent=$container.parent().get(0);if(containerParent!==document.body&&!that.options.forceFixPosition)
return;var orientation=that.options.orientation,containerHeight=$container.outerHeight(),height=that.el.outerHeight(),offset=that.el.offset(),styles={'top':offset.top,'left':offset.left};if(orientation=='auto'){var viewPortHeight=$(window).height(),scrollTop=$(window).scrollTop(),topOverflow=-scrollTop+offset.top-containerHeight,bottomOverflow=scrollTop+viewPortHeight-(offset.top+height+containerHeight);orientation=(Math.max(topOverflow,bottomOverflow)===topOverflow)?'top':'bottom';}
if(orientation==='top'){styles.top+=-containerHeight;}else{styles.top+=height;}
if(containerParent!==document.body){var opacity=$container.css('opacity'),parentOffsetDiff;if(!that.visible){$container.css('opacity',0).show();}
parentOffsetDiff=$container.offsetParent().offset();styles.top-=parentOffsetDiff.top;styles.left-=parentOffsetDiff.left;if(!that.visible){$container.css('opacity',opacity).hide();}}
if(that.options.width==='auto'){styles.width=(that.el.outerWidth()-2)+'px';}
$container.css(styles);},enableKillerFn:function(){var that=this;$(document).on('click.autocomplete',that.killerFn);},disableKillerFn:function(){var that=this;$(document).off('click.autocomplete',that.killerFn);},killSuggestions:function(){var that=this;that.stopKillSuggestions();that.intervalId=window.setInterval(function(){that.hide();that.stopKillSuggestions();},50);},stopKillSuggestions:function(){window.clearInterval(this.intervalId);},isCursorAtEnd:function(){var that=this,valLength=that.el.val().length,selectionStart=that.element.selectionStart,range;if(typeof selectionStart==='number'){return selectionStart===valLength;}
if(document.selection){range=document.selection.createRange();range.moveStart('character',-valLength);return valLength===range.text.length;}
return true;},onKeyPress:function(e){var that=this;if(!that.disabled&&!that.visible&&e.which===keys.DOWN&&that.currentValue){that.suggest();return;}
if(that.disabled||!that.visible){return;}
switch(e.which){case keys.ESC:that.el.val(that.currentValue);that.hide();break;case keys.RIGHT:if(that.hint&&that.options.onHint&&that.isCursorAtEnd()){that.selectHint();break;}
return;case keys.TAB:if(that.hint&&that.options.onHint){that.selectHint();return;}
case keys.RETURN:if(that.selectedIndex===-1){that.hide();return;}
that.select(that.selectedIndex);if(e.which===keys.TAB&&that.options.tabDisabled===false){return;}
break;case keys.UP:that.moveUp();break;case keys.DOWN:that.moveDown();break;default:return;}
e.stopImmediatePropagation();e.preventDefault();},onKeyUp:function(e){var that=this;if(that.disabled){return;}
switch(e.which){case keys.UP:case keys.DOWN:return;}
clearInterval(that.onChangeInterval);if(that.currentValue!==that.el.val()){that.findBestHint();if(that.options.deferRequestBy>0){that.onChangeInterval=setInterval(function(){that.onValueChange();},that.options.deferRequestBy);}else{that.onValueChange();}}},onValueChange:function(){var that=this,options=that.options,value=that.el.val(),query=that.getQuery(value),index;if(that.selection&&that.currentValue!==query){that.selection=null;(options.onInvalidateSelection||$.noop).call(that.element);}
clearInterval(that.onChangeInterval);that.currentValue=value;that.selectedIndex=-1;if(options.triggerSelectOnValidInput){index=that.findSuggestionIndex(query);if(index!==-1){that.select(index);return;}}
if(query.length<options.minChars){that.hide();}else{that.getSuggestions(query);}},findSuggestionIndex:function(query){var that=this,index=-1,queryLowerCase=query.toLowerCase();$.each(that.suggestions,function(i,suggestion){if(suggestion.value.toLowerCase()===queryLowerCase){index=i;return false;}});return index;},getQuery:function(value){var delimiter=this.options.delimiter,parts;if(!delimiter){return value;}
parts=value.split(delimiter);return $.trim(parts[parts.length-1]);},getSuggestionsLocal:function(query){var that=this,options=that.options,queryLowerCase=query.toLowerCase(),filter=options.lookupFilter,limit=parseInt(options.lookupLimit,10),data;data={suggestions:$.grep(options.lookup,function(suggestion){return filter(suggestion,query,queryLowerCase);})};if(limit&&data.suggestions.length>limit){data.suggestions=data.suggestions.slice(0,limit);}
return data;},getSuggestions:function(q){var response,that=this,options=that.options,serviceUrl=options.serviceUrl,params,cacheKey,ajaxSettings;options.params[options.paramName]=q;params=options.ignoreParams?null:options.params;if(options.onSearchStart.call(that.element,options.params)===false){return;}
if(that.isLocal){response=that.getSuggestionsLocal(q);}else{if($.isFunction(serviceUrl)){serviceUrl=serviceUrl.call(that.element,q);}
cacheKey=serviceUrl+'?'+$.param(params||{});response=that.cachedResponse[cacheKey];}
if(response&&$.isArray(response.suggestions)){that.suggestions=response.suggestions;that.suggest();options.onSearchComplete.call(that.element,q,response.suggestions);}else if(!that.isBadQuery(q)){if(that.currentRequest){that.currentRequest.abort();}
ajaxSettings={url:serviceUrl,data:params,type:options.type,dataType:options.dataType};$.extend(ajaxSettings,options.ajaxSettings);that.currentRequest=$.ajax(ajaxSettings).done(function(data){var result;that.currentRequest=null;result=options.transformResult(data);that.processResponse(result,q,cacheKey);options.onSearchComplete.call(that.element,q,result.suggestions);}).fail(function(jqXHR,textStatus,errorThrown){options.onSearchError.call(that.element,q,jqXHR,textStatus,errorThrown);});}else{options.onSearchComplete.call(that.element,q,[]);}},isBadQuery:function(q){if(!this.options.preventBadQueries){return false;}
var badQueries=this.badQueries,i=badQueries.length;while(i--){if(q.indexOf(badQueries[i])===0){return true;}}
return false;},hide:function(){var that=this;that.visible=false;that.selectedIndex=-1;clearInterval(that.onChangeInterval);$(that.suggestionsContainer).hide();that.signalHint(null);},suggest:function(){if(this.suggestions.length===0){this.options.showNoSuggestionNotice?this.noSuggestions():this.hide();return;}
var that=this,options=that.options,groupBy=options.groupBy,formatResult=options.formatResult,value=that.getQuery(that.currentValue),className=that.classes.suggestion,classSelected=that.classes.selected,container=$(that.suggestionsContainer),noSuggestionsContainer=$(that.noSuggestionsContainer),beforeRender=options.beforeRender,html='',category,formatGroup=function(suggestion,index){var currentCategory=suggestion.data[groupBy];if(category===currentCategory){return'';}
category=currentCategory;return'<div class="autocomplete-group"><strong>'+category+'</strong></div>';},index;if(options.triggerSelectOnValidInput){index=that.findSuggestionIndex(value);if(index!==-1){that.select(index);return;}}
$.each(that.suggestions,function(i,suggestion){if(groupBy){html+=formatGroup(suggestion,value,i);}
html+='<div class="'+className+'" data-index="'+i+'">'+formatResult(suggestion,value)+'</div>';});this.adjustContainerWidth();noSuggestionsContainer.detach();container.html(html);if(options.autoSelectFirst){that.selectedIndex=0;container.children().first().addClass(classSelected);}
if($.isFunction(beforeRender)){beforeRender.call(that.element,container);}
that.fixPosition();container.show();that.visible=true;that.findBestHint();},noSuggestions:function(){var that=this,container=$(that.suggestionsContainer),noSuggestionsContainer=$(that.noSuggestionsContainer);this.adjustContainerWidth();noSuggestionsContainer.detach();container.empty();container.append(noSuggestionsContainer);that.fixPosition();container.show();that.visible=true;},adjustContainerWidth:function(){var that=this,options=that.options,width,container=$(that.suggestionsContainer);if(options.width==='auto'){width=that.el.outerWidth()-2;container.width(width>0?width:300);}},findBestHint:function(){var that=this,value=that.el.val().toLowerCase(),bestMatch=null;if(!value){return;}
$.each(that.suggestions,function(i,suggestion){var foundMatch=suggestion.value.toLowerCase().indexOf(value)===0;if(foundMatch){bestMatch=suggestion;}
return!foundMatch;});that.signalHint(bestMatch);},signalHint:function(suggestion){var hintValue='',that=this;if(suggestion){hintValue=that.currentValue+suggestion.value.substr(that.currentValue.length);}
if(that.hintValue!==hintValue){that.hintValue=hintValue;that.hint=suggestion;(this.options.onHint||$.noop)(hintValue);}},verifySuggestionsFormat:function(suggestions){if(suggestions.length&&typeof suggestions[0]==='string'){return $.map(suggestions,function(value){return{value:value,data:null};});}
return suggestions;},validateOrientation:function(orientation,fallback){orientation=$.trim(orientation||'').toLowerCase();if($.inArray(orientation,['auto','bottom','top'])===-1){orientation=fallback;}
return orientation;},processResponse:function(result,originalQuery,cacheKey){var that=this,options=that.options;result.suggestions=that.verifySuggestionsFormat(result.suggestions);if(!options.noCache){that.cachedResponse[cacheKey]=result;if(options.preventBadQueries&&result.suggestions.length===0){that.badQueries.push(originalQuery);}}
if(originalQuery!==that.getQuery(that.currentValue)){return;}
that.suggestions=result.suggestions;that.suggest();},activate:function(index){var that=this,activeItem,selected=that.classes.selected,container=$(that.suggestionsContainer),children=container.find('.'+that.classes.suggestion);container.find('.'+selected).removeClass(selected);that.selectedIndex=index;if(that.selectedIndex!==-1&&children.length>that.selectedIndex){activeItem=children.get(that.selectedIndex);$(activeItem).addClass(selected);return activeItem;}
return null;},selectHint:function(){var that=this,i=$.inArray(that.hint,that.suggestions);that.select(i);},select:function(i){var that=this;that.hide();that.onSelect(i);},moveUp:function(){var that=this;if(that.selectedIndex===-1){return;}
if(that.selectedIndex===0){$(that.suggestionsContainer).children().first().removeClass(that.classes.selected);that.selectedIndex=-1;that.el.val(that.currentValue);that.findBestHint();return;}
that.adjustScroll(that.selectedIndex-1);},moveDown:function(){var that=this;if(that.selectedIndex===(that.suggestions.length-1)){return;}
that.adjustScroll(that.selectedIndex+1);},adjustScroll:function(index){var that=this,activeItem=that.activate(index),offsetTop,upperBound,lowerBound,heightDelta=25;if(!activeItem){return;}
offsetTop=activeItem.offsetTop;upperBound=$(that.suggestionsContainer).scrollTop();lowerBound=upperBound+that.options.maxHeight-heightDelta;if(offsetTop<upperBound){$(that.suggestionsContainer).scrollTop(offsetTop);}else if(offsetTop>lowerBound){$(that.suggestionsContainer).scrollTop(offsetTop-that.options.maxHeight+heightDelta);}
that.el.val(that.getValue(that.suggestions[index].value));that.signalHint(null);},onSelect:function(index){var that=this,onSelectCallback=that.options.onSelect,suggestion=that.suggestions[index];that.currentValue=that.getValue(suggestion.value);if(that.currentValue!==that.el.val()){that.el.val(that.currentValue);}
that.signalHint(null);that.suggestions=[];that.selection=suggestion;if($.isFunction(onSelectCallback)){onSelectCallback.call(that.element,suggestion);}},getValue:function(value){var that=this,delimiter=that.options.delimiter,currentValue,parts;if(!delimiter){return value;}
currentValue=that.currentValue;parts=currentValue.split(delimiter);if(parts.length===1){return value;}
return currentValue.substr(0,currentValue.length-parts[parts.length-1].length)+value;},dispose:function(){var that=this;that.el.off('.autocomplete').removeData('autocomplete');that.disableKillerFn();$(window).off('resize.autocomplete',that.fixPositionCapture);$(that.suggestionsContainer).remove();}};$.fn.pkgautocomplete=$.fn.pkgdevbridgeAutocomplete=function(options,args){var dataKey='autocomplete';if(arguments.length===0){return this.first().data(dataKey);}
return this.each(function(){var inputElement=$(this),instance=inputElement.data(dataKey);if(typeof options==='string'){if(instance&&typeof instance[options]==='function'){instance[options](args);}}else{if(instance&&instance.dispose){instance.dispose();}
instance=new Autocomplete(this,options);inputElement.data(dataKey,instance);}});};}));;(function($){var dateEles=[];if(!Array.prototype.indexOf){Array.prototype.indexOf=function(elt){var len=this.length>>>0;var from=Number(arguments[1])||0;from=(from<0)?Math.ceil(from):Math.floor(from);if(from<0)
from+=len;for(;from<len;from++){if(from in this&&this[from]===elt)
return from;}
return-1;};}
function hideAllDate(){for(var i=0;i<dateEles.length;i++){dateEles[i].hide();}}
$.fn.TN_pkdate=function(settings){settings=jQuery.extend({wrap:'#wrap',dateW:'tnDateW_train',tnStartDate:'date_t_pre',tnEndDate:'date_t_next',currentObj:this,leaveDate:21},settings);var startDateArea=$(this[0]);var dateWObj;var tnStartDateObj;var tnEndDateObj;var nowTarget;var monthnames=new Array("1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月");var monthdays,todayDate,thisday,thismonth,thisdate,thisyear;var fthisday,fthismonth,fthisyear,ftodayDate;var festivalMap={"solar":{"0101":"元旦","0214":"情人","0308":"妇女","0501":"劳动","0601":"儿童","0910":"教师","1001":"国庆","1225":"圣诞"},"lunar":{"2015":["","","","","","","0927"],"2016":["0207","0208","0222","0404","0609","0809","0915"],"2017":["0127","0128","0211","0404","0530","0828","1004"],"2018":["0215","0216","0302","0405","0618","0817","0924"],"2019":["0204","0205","0219","0405","0607","0807","0913"],"2020":["0124","0125","0208","0404","0625","0825","1001"]},"lunarFestivals":["除夕","春节","元宵","清明","端午","七夕","中秋"]};function _initialize(){stateC(startDateArea);_initDate();dateWObj=$('<div class="'+settings.dateW+'"></div>').appendTo(settings.wrap);dateWObj.mousedown(function(event){event.stopPropagation();});dateWObj.hide();dateEles.push(dateWObj);tnStartDateObj=$('<div class="'+settings.tnStartDate+'"></div>').appendTo(dateWObj);tnEndDateObj=$('<div class="'+settings.tnEndDate+'"></div>').appendTo(dateWObj);dateWObj.delegate('.tdCobj','mouseover',function(){$(this).addClass('tdCobjS');}).delegate('.tdCobj','mouseout',function(){$(this).removeClass('tdCobjS');}).undelegate('click').delegate('.tdCobj','click',function(){nowTarget.val($(this).attr('data-id'));var selectWeek=nowTarget.val();if(settings.onSelect){settings.onSelect(selectWeek,nowTarget);}
nowTarget.css({'color':'#000'});dateWObj.hide();var nowWeek=getWeekday(selectWeek);$(document).unbind('mousedown',hideDateObj);});dateWObj.delegate('a.pre_link','click',function(){return MoveDate('pre')});dateWObj.delegate('a.next_link','click',function(){return MoveDate('next')});startDateArea.focus(function(){focusInputProcess($(this));}).blur(function(){blurTxtProcess($(this));}).keydown(function(){return false;}).mousedown(function(event){}).bind('contextmenu',function(e){e.preventDefault();});$(window).resize(function(){if(dateWObj.is(':visible'))posDate();});};function GetDateStr(pdate,AddDayCount){var dd=pdate;dd.setDate(dd.getDate()+AddDayCount);var y=dd.getYear();y=y%100;y=((y<50)?(2000+y):(1900+y));var m=dd.getMonth()+1;var d=dd.getDate();return y+"-"+adjustNumber(m)+"-"+adjustNumber(d);}
function stateC(obj){if(obj.val()=='yyyy-mm-dd'||obj.val()==''){if(obj.val()=='')obj.val('yyyy-mm-dd');obj.css({'color':'#999'});}
else{}}
function focusInputProcess(obj){hideAllDate();nowTarget=obj;var ptip=false;if((obj.val()=='yyyy-mm-dd'&&nowTarget[0]==startDateArea[0])||(obj.val()=='yyyy-mm-dd'&&startDateArea.val()=='yyyy-mm-dd')){obj.val('').css({'color':'#000'});ftodayDate=thisdate;fthisday=thisday;fthismonth=thismonth;fthisyear=thisyear;}
else if(nowTarget[0]==startDateArea[0]){var tArr=obj.val().split('-');var gddayDate=new Date(tArr[0],tArr[1]-1,tArr[2]);fthisday=gddayDate.getDay();fthismonth=gddayDate.getMonth();fthisyear=gddayDate.getYear();fthisyear=fthisyear%100;fthisyear=((fthisyear<50)?(2000+fthisyear):(1900+fthisyear));ftodayDate=gddayDate.getDate();}
formDate(ptip);posDate();dateWObj.show();preDocEvent();}
function formDate(ctip){var nday=fthisday;var nmonth=fthismonth;var nyear=fthisyear;var ndate=ftodayDate;var nextMonthObj=_getPreAndNextMoth('n');fthisday=nextMonthObj.xDay;fthismonth=nextMonthObj.xMonth;fthisyear=nextMonthObj.xYear;ftodayDate=1;var outStr,outStr2;if((nyear==thisyear&&nmonth==thismonth)||ctip){outStr=('<div class="date_t_b"><div class="pre_month"><span class="pre_link">&lt;</span>'+nyear+"年"+monthnames[nmonth]+'</div>')+_createDate(nyear,nmonth,ndate,nday);}
else{outStr=('<div class="date_t_b"><div class="pre_month"><a href="#" class="pre_link">&lt;</a>'+nyear+"年"+monthnames[nmonth]+'</div>')+_createDate(nyear,nmonth,ndate,nday);}
outStr2=('<div class="date_t_b"><div class="next_month"><a href="#" class="next_link">&gt;</a>'+nextMonthObj.xYear+"年"+monthnames[nextMonthObj.xMonth]+'</div>')+_createDate(nextMonthObj.xYear,nextMonthObj.xMonth,1,nextMonthObj.xDay);tnStartDateObj.html(outStr);tnEndDateObj.html(outStr2);bl_height();}
function posDate(){var wrapOffset=settings.wrap.offset();var pos=nowTarget.offset();var posL=pos.left;var posT=pos.top+nowTarget.outerHeight()+1;dateWObj.css({'left':posL-wrapOffset.left,'top':posT-wrapOffset.top});}
function blurTxtProcess(obj){if(obj.val()==''){obj.val('yyyy-mm-dd');obj.css({'color':'#999'});}
else if(obj.val()!='yyyy-mm-dd'){obj.css({'color':'#000'});}}
function _initDate(){todayDate=new Date();var tArr=GetDateStr(todayDate,0).split('-');todayDate=new Date(tArr[0],tArr[1]-1,tArr[2]);thisday=todayDate.getDay();thismonth=todayDate.getMonth();thisdate=todayDate.getDate();thisyear=todayDate.getYear();thisyear=thisyear%100;thisyear=((thisyear<50)?(2000+thisyear):(1900+thisyear));ftodayDate=thisdate;fthisday=thisday;fthismonth=thismonth;fthisyear=thisyear;}
function preDocEvent(){$(document).unbind('mousedown',hideDateObj);$(document).mousedown(hideDateObj);}
function bl_height(){var sNum=tnStartDateObj.find('tr').length;var eNum=tnEndDateObj.find('tr').length;var astr='<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';if(sNum>eNum){tnEndDateObj.find('table').append(astr);}
else if(eNum>sNum){tnStartDateObj.find('table').append(astr);}
else{}}
function hideDateObj(){$(document).unbind('mousedown',hideDateObj);dateWObj.hide();initTxt(startDateArea);}
function initTxt(obj){if(obj.val()==''){obj.val('yyyy-mm-dd');obj.css({'color':'#999'});}
else if(obj.val()!='yyyy-mm-dd'){obj.css({'color':'#000'});}
else{}}
function MoveDate(direction){var nextMonthObj;var nextMonthObj2;if(direction=='pre'){nextMonthObj=_getPreAndNextMoth('p');fthisday=nextMonthObj.xDay;fthismonth=nextMonthObj.xMonth;fthisyear=nextMonthObj.xYear;nextMonthObj2=_getPreAndNextMoth('p');var outStr,outStr2;if(nextMonthObj2.xYear==thisyear&&nextMonthObj2.xMonth==thismonth){outStr=_pickDateStr(thisyear,thismonth,thisyear,thismonth,thisdate,thisday,'p',true,true);outStr2=_pickDateStr(fthisyear,fthismonth,fthisyear,fthismonth,1,fthisday,'n',true,true);}
else{outStr=_pickDateStr(nextMonthObj2.xYear,nextMonthObj2.xMonth,nextMonthObj2.xYear,nextMonthObj2.xMonth,1,nextMonthObj2.xDay,'p',false,true);outStr2=_pickDateStr(fthisyear,fthismonth,fthisyear,fthismonth,1,fthisday,'n',true,true);}
tnStartDateObj.html(outStr);tnEndDateObj.html(outStr2);}
else{nextMonthObj=_getPreAndNextMoth('n');var outStr,outStr2;outStr=_pickDateStr(fthisyear,fthismonth,fthisyear,fthismonth,1,fthisday,'p',false,false);outStr2=_pickDateStr(nextMonthObj.xYear,nextMonthObj.xMonth,nextMonthObj.xYear,nextMonthObj.xMonth,1,nextMonthObj.xDay,'n',true,false);tnStartDateObj.html(outStr);tnEndDateObj.html(outStr2);}
bl_height();fthisday=nextMonthObj.xDay;fthismonth=nextMonthObj.xMonth;fthisyear=nextMonthObj.xYear;return false;}
function _pickDateStr(xyear,xmonth,cyear,cmonth,cdate,cday,PNtip,btip,qtip){var outStr='';var stip=false;if(PNtip=='p'){outStr+='<div class="date_t_b"><div class="pre_month">';if(btip||stip){outStr+='<span class="pre_link">&lt;</span>';}
else{outStr+='<a href="#" class="pre_link">&lt;</a>';}}
else{outStr+='<div class="date_t_b"><div class="next_month"><a href="#" class="next_link">&gt;</a>';}
outStr+=(xyear+"年"+monthnames[xmonth]+'</div>'+_createDate(cyear,cmonth,cdate,cday));return outStr;}
function _getPreAndNextMoth(pntip){var gdYear=0;var gdMonth=0;if(pntip=='n'){if(fthismonth<11){gdMonth=fthismonth+1;gdYear=fthisyear;}
else{gdMonth=0;gdYear=fthisyear+1;}}
else{if(fthismonth>0){gdMonth=fthismonth-1;gdYear=fthisyear;}
else{gdMonth=11;gdYear=fthisyear-1;}}
var gddayDate=new Date(gdYear,gdMonth,1);var fthisgdday=gddayDate.getDay();var fthisgdmonth=gddayDate.getMonth();var fthisgdyear=gddayDate.getYear();fthisgdyear=fthisgdyear%100;fthisgdyear=((fthisgdyear<50)?(2000+fthisgdyear):(1900+fthisgdyear));return{'xYear':fthisgdyear,'xMonth':fthisgdmonth,'xDay':fthisgdday};}
function _createDate(gYear,gMonth,gDate,gDay){var startArr=[];var endArr=[];var sttip=false;if(startDateArea.val()!=''&&startDateArea.val()!='yyyy-mm-dd'){sttip=true;startArr=startDateArea.val().split('-');}
monthdays=new Array(31,28,31,30,31,30,31,31,30,31,30,31);if(((gYear%4==0)&&!(gYear%100==0))||(gYear%400==0)){monthdays[1]++;}
var outStr='';var tAddStr='<td class="tdCobj tdCobjN"';var tempDate;var ftempDate;if(nowTarget[0]==startDateArea[0]){if(gYear==thisyear&&gMonth==thismonth){tempDate=thisdate;}
else{tempDate=1;}}
else{}
var startspaces=gDate;while(startspaces>7){startspaces-=7;}
startspaces=gDay-startspaces+1;if(startspaces<0){startspaces+=7;}
outStr+='<table cellpadding="0" cellspacing="0" border="0" class="dateSel_t">';outStr+='<tr>';outStr+='<th align="center" style="color:#ff9900"><strong>日</strong></th>';outStr+='<th align="center">一</th>';outStr+='<th align="center">二</th>';outStr+='<th align="center">三</th>';outStr+='<th align="center">四</th>';outStr+='<th align="center">五</th>';outStr+='<th align="center" style="color:#ff9900"><strong>六</strong></th>';outStr+='</tr>';outStr+='<tr>';for(s=0;s<startspaces;s++){outStr+='<td></td>';}
var count=1;while(count<=monthdays[gMonth]){for(b=startspaces;b<7;b++){if(count<=monthdays[gMonth]){var tetip=false;var teDate=new Date();var teArr=GetDateStr(teDate,settings.leaveDate-1).split('-');teDate=new Date(teArr[0],teArr[1]-1,teArr[2]);var tpDate=new Date(gYear,gMonth,count);if(tpDate>teDate)tetip=true;if(count<tempDate||tetip){outStr+='<td>';}
else{if(sttip){if(nowTarget[0]==startDateArea[0]){if(startArr[0]==gYear.toString()&&startArr[1]==adjustNumber(gMonth+1)&&startArr[2]==adjustNumber(count))
outStr+=tAddStr;else
outStr+='<td class="tdCobj"';}
else{if(startArr[0]==gYear.toString()&&startArr[1]==adjustNumber(gMonth+1)&&startArr[2]==adjustNumber(count))
outStr+=tAddStr;else if(endArr[0]==gYear.toString()&&endArr[1]==adjustNumber(gMonth+1)&&endArr[2]==adjustNumber(count))
outStr+='<td class="tdCobj tdCobjN"';else
outStr+='<td class="tdCobj"';}}
else if(sttip){if(sttip){if(startArr[0]==gYear.toString()&&startArr[1]==adjustNumber(gMonth+1)&&startArr[2]==adjustNumber(count))
outStr+=tAddStr;else
outStr+='<td class="tdCobj"';}
else{}}
else{outStr+='<td class="tdCobj"';}
outStr+=(' data-id="'+gYear.toString()+'-'+adjustNumber(gMonth+1)+'-'+adjustNumber(count)+'">');}
outStr+=adjustFestival(count,gMonth+1,gYear,(b==0||b==6));}
outStr+='</td>';count++;}
outStr+='</tr>';startspaces=0;}
outStr+='</table>';return outStr;}
function adjustNumber(number,len){number+='';len=len||2;var length=number.length;if(length<len){for(var i=len-length;i>0;i--){number='0'+number;}}
return number;}
function adjustFestival(day,month,year,flag){var str=flag?('<strong>'+day.toString()+'</strong>'):day.toString();var date=adjustNumber(month)+adjustNumber(day);var lunarFestivals=festivalMap['lunarFestivals'];$.each(festivalMap,function(key,value){if("solar"==key&&value[date]){str='<strong>'+value[date]+'</strong>';return false;}else if("lunar"==key&&value[year]){var index=value[year].indexOf(date);if(index>-1){str='<strong>'+lunarFestivals[index]+'</strong>';return false;}}});return str;}
function getWeekday(sDate){var dt=new Date(sDate.replace(/-/g,'/'));var todayDate=new Date();var strArr1=GetDateStr(todayDate,0).split('-');var strArr2=GetDateStr(dt,0).split('-');var str11=new Date(strArr1[0],strArr1[1]-1,strArr1[2]);var str22=new Date(strArr2[0],strArr2[1]-1,strArr2[2]);var a=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];var result=(str22-str11)/3600000;switch(result){case 0:return"今天";break;case 24:return"明天";break;case 48:return"后天";break;default:return a[dt.getDay()];}}
_initialize();}})(jQuery);;;(function(){var dropEles=[];function hideAllDrops(){for(var i=0;i<dropEles.length;i++){dropEles[i].hide();}}
function checkInputValid(obj){var val=parseInt(obj.value);if(isNaN(val)){val='';}
obj.value=val;}
$.fn.dropselect=function(){return this.each(function(){var $this=$(this),selectBox=$this.siblings(".select");dropEles.push(selectBox);$this.focus(function(){hideAllDrops();selectBox.show();}).bind('keydown keyup keypress contextmenu',function(e){e.preventDefault();}).bind('input propertychange change',function(){checkInputValid($this[0]);});selectBox.find("a").click(function(){$this.val($(this).text());checkInputValid($this[0]);selectBox.hide();});$this.parent().click(function(e){e.stopPropagation();});$(document).click(function(){selectBox.hide();});});}})();;;(function(){var cities={};var currentInputs={};var defaultOption={id:'J_Cities',cityUrl:'/tn?r=dynamic/ajaxGetCity',onChange:function(){},onError:function(){}}
$.fn.citysearch=function(){var option;if(arguments.length===1){option=arguments[0];}else{option={id:arguments[0],onChange:arguments[1],onError:arguments[2],cityUrl:arguments[3]}}
return this.each(function(){var textBox=$(this);var cityiesEle,tabEles,boxEles;var config=$.extend({},defaultOption,option);cityiesEle=$('#'+config.id).clone();cityiesEle.removeAttr('id').hide().appendTo('body');tabEles=$(".pkg_city_cat li",cityiesEle);boxEles=$(".pkg_city_list_cat",cityiesEle);function isParent(child,parent){var parents=child.parents();var res=false;if(child[0]===parent){res=true;}else{parents.each(function(){if(this===parent){res=true;return false;}});}
return res;}
function bindCitySearch(textBox,layer){var lowerIE=$.browser.msie&&$.browser.version<='8.0';var blurByLayer=false;if(lowerIE){textBox.focus(function(){this.select();showBox();}).blur(function(e){if(blurByLayer){e.preventDefault();e.stopPropagation();blurByLayer=false;}else{hideBox();}});layer.bind('mousedown',function(){blurByLayer=true;});$(document).mousedown(function(e){if(isParent($(e.target),layer[0])||e.target===textBox[0]){textBox.focus();}else{hideBox();}});}else{textBox.focus(function(){this.focused=true;this.select();showBox();}).mouseup(function(){if(this.focused){this.focused=false;return false;}}).blur(function(){hideBox();});layer.bind('mousedown',function(e){e.preventDefault();e.stopPropagation();});}
textBox.bind('change input propertychange',function(e){if(e.type!=='change'&&e.type!=='input'&&!(e.type==='propertychange'&&e.originalEvent.propertyName==='value')){return;}
if(textBox.val()!==''){hideBox();}else{showBox();}});}
function showBox(){var offset=textBox.offset();offset.height=textBox.outerHeight();_.each(cities,function(city){city.hide();});if(offset){cityiesEle.css({"left":offset.left,"top":offset.top+offset.height}).show();}}
function hideBox(){cityiesEle.hide();cityiesEle.siblings(".pkg_error_tip").hide();}
function setCity(cityCode,cityName){textBox.attr('code',cityCode);textBox.val(cityName);config.onChange({code:cityCode,name:cityName},0);}
$(window).resize(function(){if(cityiesEle.is(':visible')){setTimeout(showBox,30);}});cityiesEle.delegate(".pkg_city_list a",'click',function(){var code=$(this).attr('code');var cityName=$(this).text();setCity(code,cityName);hideBox();});cityiesEle.delegate(".pkg_city_history_list a",'click',function(){var code=$(this).attr('code');var cityName=$(this).text();setCity(code,cityName);hideBox();});tabEles.click(function(){var tab=$(this);var index=tab.index();tabEles.removeClass("current");tab.addClass("current");boxEles.addClass('hide').hide();$(boxEles.get(index)).show().removeClass('hide');});bindCitySearch(textBox,cityiesEle);textBox.bind('keydown',function(e){if(e.keyCode!=9&&e.keyCode!=13){textBox.removeAttr('code');hideBox();}}).pkgautocomplete({serviceUrl:config.cityUrl,dataType:'json',autoSelectFirst:false,showNoSuggestionNotice:true,noSuggestionNotice:'找不到相关的城市',width:textBox.outerWidth(),transformResult:function(response){if(response.code==200){response=response.data;_.each(response.suggestions,function(item){item.value=item.name;});}else{response=$.extend({"query":"","suggestions":[]},response.data);}
return response;},formatResult:function(suggestion){return suggestion.value+'('+suggestion.pinyin+')';},onFocus:function(){},onSearchStart:function(){if(this.value&&this.getAttribute('code')){return false;}else{}},beforeRender:function(){hideBox();},onSelect:function(suggestion){textBox.attr('code',suggestion.cityCode);config.onChange(suggestion,1);},onHint:function(hint){},onInvalidateSelection:function(){}});});};})();;;(function(win,_,$){var properties={listUrl:'',hotelInfoUrl:'',priceCalendarUrl:'',pkgCalendarUrl:'',flightCalendarUrl:''};function DataServer(){Event.call(this);}
DataServer.prototype={set:function(property,value){properties[property]=value||properties[property];},get:function(property){return properties[property];},initLoad:function(data,callback){$.get(this.get('listUrl'),data,function(data){callback&&callback(data);},'json');},getThrough:function(data,callback){$.get('/tn?r=train/trainTicket/getTrainInfo',data,function(data){callback(data);},'json');},getTkAddLoad:function(data,callback){$.get('/tn?r=train/trainTicket/uponArriveList',data,function(data){callback(data);},'json');},loadList:function(data,callback){$.get(this.get('listUrl'),data,function(data){callback&&callback(data);},'json');},getPkgCalendar:function(data,callback){callback&&callback({current:data.flightStartDay,data:$.extend([],window.dateEvents),startDate:'2014-10-01',today:'2014-10-01',endDate:'2014-10-31'});}}
win.getDataServer=_.once(function(){return new DataServer();});})(window,_,jQuery);;;(function(win,_){var initSelected;function Filter(options){Event.call(this);_.extend(this,options);this.data=null;this.items=[];this.sorts=[];this.container=$('#J_FilterItems');this.filterSelectedContainer=$('#pkg_filter_selected');this.sortContainer=$('#J_Sort');this.filterShowFlag=0;}
Filter.prototype=new Event;_.extend(Filter.prototype,{init:function(){var self=this;var filterContainer=self.container;var filterSelectedContainer=self.filterSelectedContainer;var noDefaultSort=true;var initSelectedFilter={};var initSelectedSort={};if(initSelected){initSelectedFilter=initSelected['filter'];initSelectedSort=initSelected['sort'];}
filterContainer.empty();filterSelectedContainer.empty();var selectedCon=$('<dl class="pkg_filter_selected"><dt class="pkg_filter_tit">您已选择</dt><dd></dd></dl>');self.selectedCon=selectedCon.children("dd");if(self.data.filter){$.each(self.data.filter,function(index,item){var selected;if(initSelectedFilter){selected=initSelectedFilter[item.id];}
var filterItem=new FilterItem(item,selected,self);self.items.push(filterItem);if(item.id==='star'){self.items.push(new FilterItem({id:'hotelName'},null,self,filterItem));}});}
self.sortContainer.empty();if(self.data.sort){$.each(self.data.sort,function(index,item){var selected;if(initSelectedSort){selected=initSelectedSort[item.id];}
var sortItem=new SortItem(item,selected,self);self.sorts.push(sortItem);if(item.id==='default'){noDefaultSort=false;}});var filterShow=$(".pkg_sort_item_6",self.sortContainer);filterShow.click(function(){if(self.filterShowFlag===0){self.filterShowFlag=1;filterShow.addClass("checked");}else{self.filterShowFlag=0;filterShow.removeClass("checked");}
self.trigger('filterShow');});}
self.filterSelectedContainer.html(selectedCon);this._updateSelectedView();},load:function(data,selected){var self=this;this.data=data||{};initSelected=selected;self.trigger('load');this.clear();this.init();},update:function(){this.trigger('change');},updateSelectedView:function(slient){var self=this;self._updateSelectedView();if(!slient){self.update();}},_updateSelectedView:function(){var self=this;var items=self.items;var con=self.selectedCon;var i=0;con.empty();$.each(items,function(index,item){var res=item.getSelectedView();if(!item.all){if(res!==false){con.append(item.getSelectedView());i++;}}});if(i){$('<a href="javascript:;" rel="nofollow" class="btn pkg_filter_clear">清除</a>').click(function(){self.clearSelected();}).appendTo(con);con.parent().show();}else{con.parent().hide();}},clearSelected:function(){$.each(this.items,function(){if(!this.all){this._selectAll();}});this.selectedCon.parent().hide();this.update();},clearSort:function(){$.each(this.sorts,function(){this.clear();});},clear:function(){var items=this.items;var sorts=this.sorts;while(items[0]){items.pop().remove();}
while(sorts[0]){sorts.pop();}},get:function(){var filter={};var sort={};var data;$.each(this.items,function(i,item){var res=item.get();var arr=[];if(res){_.each(res,function(r){arr.push(r.id);});filter[item.data.id]=arr;}});$.each(this.sorts,function(i,item){var data=item.get();sort[data.id]=data.state;});data={filter:filter,sort:sort};return data;},hide:function(){this.container.hide();},show:function(){this.container.show();},checkHeight:function(){var self=this;var filterLength;var filterContainer=self.container;var expandBtn,foldBtn,minFilterHeight=0,maxFilterHeight=0;_.each(this.items,function(item){item.checkHeight();});filterLength=self.data.filter.length;if(filterLength>2){expandBtn=$("<a href='javascript:;' rel='nofollow' class='slidesign'>更多筛选条件▼</a>");foldBtn=$("<a href='javascript:;' rel='nofollow' class='slideup'>收起▲</a>");filterContainer.append(expandBtn);filterContainer.append(foldBtn);filterContainer.children('dl').each(function(index){var height=$(this).outerHeight();if(index<2){minFilterHeight+=height;}
maxFilterHeight+=height;});self.isExpanded=false;self.minFilterHeight=minFilterHeight;self.maxFilterHeight=maxFilterHeight;self.expandBtn=expandBtn;self.foldBtn=foldBtn;expandBtn.click(function(){filterContainer.animate({'height':self.maxFilterHeight});expandBtn.hide();foldBtn.show();self.isExpanded=true;}).show();foldBtn.click(function(){filterContainer.animate({'height':self.minFilterHeight});expandBtn.show();foldBtn.hide();self.isExpanded=false;}).hide();filterContainer.css('height',self.minFilterHeight);}},recheckHeight:function(){var self=this;var filterLength=self.data.filter.length;var filterContainer=self.container;var minFilterHeight=0,maxFilterHeight=0;if(filterLength<=2){return;}
filterContainer.children('dl').each(function(index){var height=$(this).outerHeight();if(index<2){minFilterHeight+=height;}
maxFilterHeight+=height;});self.minFilterHeight=minFilterHeight;self.maxFilterHeight=maxFilterHeight;if(self.isExpanded){filterContainer.css('height',maxFilterHeight);}else{filterContainer.css('height',minFilterHeight);}}});win.CreateFilter=_.once(function(options){return new Filter(options);});})(window,_);;function FilterItem(data,initSelected,filter,relObj){Event.call(this);_.extend(this);this.data=data;this.filter=filter;this.selected=[];this.initSelected=typeof initSelected=='string'?[initSelected]:initSelected;this.all=true;this.custom='';this.init(relObj);}
FilterItem.prototype=new Event;_.extend(FilterItem.prototype,{init:function(relObj){var self=this;var data=this.data;var container=$('<dl />');var head=$('<dt />').addClass('.pkg_filter_tit').text(data.name).appendTo(container);var con=$('<dd />').addClass('pkg_filter_properties').appendTo(container);var hotelSearchHtml='<div class="pkg_filter_search clearfix"><div class="pkg_filter_search_input"><div class="pkg_info_placholder">酒店名称关键词</div><input type="text" /></div><a href="javascript:;" rel="nofollow" class="J_FilterHotelSearch pkg_filter_search_btn">搜索</a></div>';self.head=head;self.con=con;self.container=container;self.selectedEle=$('<a href="javascript:;" rel="nofollow"><span></span><i class="icon"></i></a>');function getItemIndex(source,item){if(!source){return-1;}
for(var i=0;i<source.length;i++){if(item==source[i]){return i;}}
return-1;}
function createProperties(data,con){$.each(data.pros,function(i,pro){var item=$('<a href="javascript:;" rel="nofollow"><i class="icon"></i>'+pro.name+'</a>');item.click(function(){var $this=$(this);if($this.hasClass('checked')){self.unselect(pro);$this.removeClass('checked')}else{self.select(pro);$this.addClass('checked')}});if(getItemIndex(self.initSelected,pro.id)!==-1){self.select(pro,null,null,true);item.addClass('checked')}
item.appendTo(con);});}
var buxian=$('<div class="pkg_filter_buxian"><a href="javascript:;" rel="nofollow" filter-value="0" class="checked">不限</a></div>').appendTo(con);buxian.click(function(){self.clear();self.selectAll();});this.buxian=buxian;var otherCon=$('<div />').addClass('pkg_filter_others').appendTo(con);this.otherCon=otherCon;if(data.id==='area'){container.addClass('pkg_filter_zone');$.each(data.pros,function(i,area){if(!area.pros||(area.pros&&area.pros.length===0)){return;}
var item=$('<a href="javascript:;" rel="nofollow">'+area.name+'<i class="icon"></i></a>');var subCity=$('<div />').addClass('pkg_filter_zones').appendTo(con);var subCityTable=$('<table />').appendTo(subCity);var first=true;item.click(function(){var $this=$(this);if($this.hasClass('checked')){$this.removeClass('checked');subCity.hide();}else{$this.siblings('.checked').removeClass('checked');$this.addClass('checked');subCity.siblings('.pkg_filter_zones').hide();subCity.show();if(first){var moreBtn;var foldFlag=true;var height=subCity.height();first=false;if(height>50){moreBtn=$('<i class="pkg_filter_more"><i class="icon"></i></i>').click(function(){if(foldFlag){subCity.animate({"height":height},200,function(){foldFlag=false;});moreBtn.addClass("fold");}else{subCity.animate({"height":50},200,function(){foldFlag=true;});moreBtn.removeClass("fold");}}).appendTo(subCity);subCity.height(50);}}}}).appendTo(otherCon);$.each(area.pros,function(i,city){var tr=$('<tr />');var th=$('<th />').text(city.name).appendTo(tr);var td=$('<td />').appendTo(tr);createProperties(city,td);tr.appendTo(subCityTable);});});}else if(data.id==='hotelName'){if(relObj){var hotelSearch=$(hotelSearchHtml);var hotelSearchInput=hotelSearch.find('input');hotelSearchInput.val('').placeholder();hotelSearch.find('.J_FilterHotelSearch').click(function(){var val=$.trim(hotelSearchInput.val());self.select({id:val,name:val});});relObj.otherCon.addClass('pkg_filter_stars').append(hotelSearch);self.hotelSearch=hotelSearch;}
return;}else{createProperties(data,otherCon);}
if(data.id==='price'){var template=_.template($('#T_CustomPrice').html());var customPrice=$(template(data)).appendTo(otherCon);customPrice.click(function(e){container.addClass("hover");e.stopPropagation();}).find('.J_FilterCustomBtnCls').click(function(){$(this).parents(".J_FilterCustomPrice").find("input").val("");}).end().find('.J_FilterCustomBtnOK').click(function(e){var flaseFlag=false;var vals='';var notBlank=0;var inputs=$(this).parents(".J_FilterCustomPrice").find("input").each(function(i,input){var value=this.value;if(this.value){notBlank++;if(!(/^\s*\d+\s*$/.test(value))){openDialog({msg:'请输入正确数字',close:function(){container.addClass("hover");input.focus();}});this.focus();flaseFlag=true;return false;}}});if(!notBlank){openDialog({msg:'请至少输入一个数字',close:function(){container.addClass("hover");}});return;}
if(flaseFlag){return;}else if(notBlank===2&&(inputs[1].value-inputs[0].value<=0)){openDialog({msg:'最大价格应大于最小价格',close:function(){container.addClass("hover");}});}else{var value1=$.trim(inputs[0].value);var value2=$.trim(inputs[1].value);var valueName=value1+'-'+value2;if(notBlank===1){valueName=(value1||'最高')+''+(value2||'起');}
container.removeClass("hover");self.select(-1,value1+'-'+value2,valueName);e.stopPropagation();}});}
$(document).click(function(){container.removeClass("hover");});this.filter.container.append(container);},get:function(){return this.all?0:this.selected;},getString:function(){var selected=this.selected;var str=[];if(this.data.id==='hotelName'&&selected[0]&&selected[0].id===''){return false;}
for(var i=0;i<selected.length;i++){str.push(selected[i].name);};return str.join(' ; ');},select:function(item,val,valName,slient){var index;if(this.data.id==='hotelName'){this.all=false;this.selected=[item];this.updateSelectedView();}else if(item===0){this.selectAll();}else if(item===-1){this.custom=val;this.all=false;this._unselectAll();this.selected.push({name:valName,id:val});this.updateSelectedView();}else{this.removeCustomPrice();index=this.indexOf(item.id);if(index===-1){this.all=false;this.unselectAll();this.selected.push(item);}else{this.selected[index]=item;}
this.updateSelectedView(slient);}},removeCustomPrice:function(){var selected=this.selected;var customID=this.custom;if(this.data.id==='price'&&customID){this.selected=_.filter(selected,function(item){return item.id===customID?false:true;});this.custom=void(0);}},_selectAll:function(){this.clear();this.all=true;this.buxian.children('a').addClass('checked');if(this.data.id==='hotelName'){this.hotelSearch.find(':text').val('').trigger('change');}
if(this.data.id==='price'){this.otherCon.find(':text').val('');}},selectAll:function(){this._selectAll();this.updateSelectedView();},unselect:function(item){var index=this.indexOf(item.id);if(index!==-1){this.selected.splice(index,1);if(this.selected.length===0){this.selectAll();}}
this.updateSelectedView();},unselectAll:function(){this.buxian.children('a').removeClass('checked');},_unselectAll:function(){var selected=this.selected;while(selected[0]){selected.pop();}
this.buxian.children('a').removeClass('checked');this.otherCon.children('a').removeClass('checked');},clear:function(){this.con.find("a").removeClass('checked');this.selected=[];},indexOf:function(id){var selected=this.selected;for(var i=selected.length-1;i>=0;i--){if(selected[i].id===id){return i;}};return-1;},updateSelectedView:function(slient){this.filter.updateSelectedView(slient);},remove:function(){this.container.remove();},getSelectedView:function(){var self=this;var ele=self.selectedEle;var txt=self.getString();if(txt===false){return false;}
ele.children('span').text(txt);ele.click(function(){self.selectAll();});return ele;},checkHeight:function(){var otherCon=this.otherCon;var moreBtn;var foldFlag=true;var height=otherCon.height();if(height>50){moreBtn=$('<i class="pkg_filter_more"><i class="icon"></i></i>').click(function(){if(foldFlag){otherCon.animate({"height":height},200,function(){foldFlag=false;});moreBtn.addClass("fold");}else{otherCon.animate({"height":50},200,function(){foldFlag=true;});moreBtn.removeClass("fold");}}).appendTo(otherCon);otherCon.height(50);}}});;function SortItem(data,initSelected,filter){Event.call(this);_.extend(this);this.filter=filter;this.data=data;this.state=0;if(data.type===void(0)){data.type=2;}
this.init();}
SortItem.prototype=new Event;SortItem.prototype={init:function(){var self=this;var data=self.data;var str='<a href="javascript:;" rel="nofollow" class="pkg_sort_item">';if(data.type!="other"){str+=data.name;if(data.type==1||data.type==2){str+='<i class="icon"></i>';}}else{str+='<i class="icon"></i>'+data.name;}
str+='</a>';var item=self.item=$(str);item.addClass('pkg_sort_item_'+data.id);item.addClass('pkg_sort_item_id_'+data.id);item.attr('changeFlag',data.id);if(data.type==1||data.type==3){item.click(function(){if(self.state===0){self.filter.clearSort();self.state=1;item.removeClass('asc');item.addClass('desc');self.filter.update();}});}else if(data.type==2){item.click(function(){if(self.state===0){self.filter.clearSort();}
if(self.state===1){self.state=2;item.removeClass('asc');item.addClass('desc');}else{self.state=1;item.removeClass('desc');item.addClass('asc');}
self.filter.update();});}
item.appendTo(self.filter.sortContainer);this.itemEle=item;if(data.id===1){this.set(1);}},set:function(state){state=parseInt(state);if(state){this.state=state;if(state===2){this.itemEle.removeClass('asc').addClass('desc');}else{this.itemEle.removeClass('desc').addClass('asc');}}},get:function(){var data=this.data;return{id:data.id,state:this.state}},clear:function(){this.state=0;this.item.removeClass('desc asc');}};;(function(win,_){function processData(data){var tmp={};var hotels=[];tmp.WF=data.isSingleTrip==1?0:1;tmp.AD={from:data.departureCityCode,fromName:data.departureCityName,to:data.destinationCityCodes,toName:data.destinationCityName,start:data.departsDate,back:data.destinationData};tmp.SF={adult:parseInt(data.adultNum)||0,child:parseInt(data.childNum)||0};_.each(data.hotel,function(hotel){hotels.push({addr:hotel.cityCode,addrName:hotel.cityName,start:hotel.departsDateBegin,end:hotel.departsDateEnd});});tmp.HT=hotels;tmp.TK=data.ticket;tmp.TK.start=tmp.TK.date;tmp.TK.from=tmp.TK.fromCityCode;tmp.TK.to=tmp.TK.toCityCode;return tmp;}
function Info(data){Event.call(this);this.service=getDataServer();this.container=$('#J_PkgInfo');this.items={};this.infoData={};this.init(data);}
Info.prototype=new Event;_.extend(Info.prototype,{init:function(data){var self=this;var items=self.items;var infoItems=self.container.find('.J_PkgInfoItem');var tempData=data;if(data){data=processData(data);}
self.infoData=data;if(infoItems.length){self.changeState=false;infoItems.each(function(){var type=$(this).attr('data-type');if(Tools.infoItems[type]){items[type]=new Tools.infoItems[type]($(this),self,data&&data[type]);}});var htItem=items['HT'];var adItem=items['AD'];var wfItem=items['WF'];if(htItem){htItem.bind('add remove',function(){self.trigger('hotelModify',this);});}
if(wfItem&&adItem){wfItem.bind('change',function(data){if(data==1){adItem.enable();}else{adItem.disable();}});adItem.bind('change',function(data,type){if(type==='back'&&data.back){wfItem.set(1);adItem.enable();}});}
if(htItem&&adItem){adItem.bind('change',function(data,type){if(data.to&&type==='to'){htItem.set(0,'addr',data.to,data.toName);}
if(data.start!='yyyy-mm-dd'&&type==='start'){htItem.set(0,'start',data.start);}
if(data.back!='yyyy-mm-dd'&&type==='back'&&htItem.items.length===1){htItem.set(0,'end',data.back);}});}
if(items['WF']&&data&&data['WF']!==void(0)){items['WF'].set(data['WF']);}}else{self.changeState=true;}
if(tempData&&tempData.flightData){$('<input type="hidden" name="flightData" />').val(tempData.flightData).appendTo(self.container);}
if(tempData&&tempData.hotelData){$('<input type="hidden" name="hotelData" />').val(tempData.hotelData).appendTo(self.container);}
$("#more-flight span").click(function(){window.location.href="http://www.tuniu.com/flight/";});$("#J_FoldExpandBtn").click(function(){var pkgInfo=$(this).parent();if(pkgInfo.hasClass("pkg_info_expand")){pkgInfo.removeClass("pkg_info_expand");$("#J_PkgInfo").slideUp(700);}else{pkgInfo.addClass("pkg_info_expand");$("#J_PkgInfo").slideDown(700);}});$('#J_SearchBtn').click(function(){self.search(false);console.log("search inited");});if($('#recommendFlightTemp').length>0){self.recommendFlightTemplate=_.template($('#recommendFlightTemp').html());self.getRecommendFlightInfo({from:window.PostData.ticket.from,to:window.PostData.ticket.to,start:window.PostData.ticket.start,fromName:window.PostData.ticket.fromName,toName:window.PostData.ticket.toName});}},search:function(flag){var self=this;var res=self._get();if(!$.isArray(res)){if($('#recommendFlightTemp').length>0){self.getRecommendFlightInfo(res.TK);}
self.trainSearchHistoryUpdate(self.get());$(this).children('a').text('重新搜索');self.trigger('search',$.extend(self.get(),{'indexFlag':flag}));}},check:function(){var flag=true;$.each(this.items,function(){var r=this.check();if(!r){flag=false;return false}});return flag;},_get:function(){var self=this;var res={};var flag=true;var errors=[];if(self.changeState){return self.infoData;}
$.each(self.items,function(k){var r=this.get();if(r.error!==true){res[k]=r;}else{errors=errors.concat(r.list);flag=false;}});if(!flag){self.trigger('invalid',errors);}
self.infoData=res;return flag?res:errors;},get:function(){return $.extend(true,{},this.infoData);},load:function(sendData){var self=this;self.trigger('beforeLoad',self.get());self.service.initLoad(sendData,function(data){if(data&&data.code==200){self.trigger('load',data);}else{self.trigger('error',data);}});},loadData:function(data){if(data){this.infoData=data;this.trigger('search',this.get());}},set:function(type,property,value){var item=this.items[type];if(item){item.set(property,value);this.infoData[type][property]=value;}},getRecommendFlightInfo:function(params){var self=this;var now=new Date();var year=now.getFullYear();var month=now.getMonth()+1;var day=now.getDate();var nowDate=year+'-'+month+'-'+day;var minTime=new Date(year,month-1,day,22,00,00).getTime();var maxTime=new Date(year,month-1,day+1,00,00,00).getTime();if((nowDate==params.start)&&(now.getTime()>=minTime)&&(now.getTime()<=maxTime)){$('.recommend-flight').hide();}else{var recommendFlightParams={"orgCityCode":params.from,"departureDate":params.start,"dstCityCode":params.to,"type":1};var url='https://flight-api.tuniu.com/query/queryCalendarPrices';var recommendFlightInfo={};var link="";$.ajax({url:url,data:{d:JSON.stringify(recommendFlightParams)},dataType:'json',success:function(json){if((true==json.success)&&(null!=json.data)){var data=json.data;for(var i=0;i<data.length;i++){if(data[i].date==params.start){var departureDate=params.start;var startDateArr=departureDate.split('-');var startDate=startDateArr[1]+'-'+startDateArr[2];recommendFlightInfo={"orgCityCode":params.from,"orgCityName":params.fromName,"dstCityCode":params.to,"dstCityName":params.toName,"departureDate":params.start,"startDate":startDate,"price":data[i].price};link="http://www.tuniu.com/flight";link+="/city_"+params.from+"_"+params.to+"?start="+params.start+"&type=1";break;}}
if($.isEmptyObject(recommendFlightInfo)){$('.recommend-flight').hide();$('#more-flight').hide();}else{var html=self.recommendFlightTemplate({data:recommendFlightInfo});$('.recommend-flight').html(html);$('.recommend-flight .btn').unbind('click').click(function(){window.location.href=link;});$('.recommend-flight').show();$('#more-flight').show();}}else{$('.recommend-flight').hide();$('#more-flight').hide();}},error:function(){$('.recommend-flight').hide();$('#more-flight').hide();}})}},trainSearchHistoryUpdate:function(params){params=params.TK;var base64=new Base64();var trainSearchHistory=$.parseJSON(base64.decode(getCookie("train_search_history")||''));if(!trainSearchHistory){trainSearchHistory={};}
if(!trainSearchHistory.departCity){trainSearchHistory.departCity={};}
if(!trainSearchHistory.destinationCity){trainSearchHistory.destinationCity={};}
if(trainSearchHistory.departCity['t'+params.from]){delete trainSearchHistory.departCity['t'+params.from];}
if(trainSearchHistory.destinationCity['t'+params.to]){delete trainSearchHistory.destinationCity['t'+params.to];}
trainSearchHistory.departCity['t'+params.from]={'code':params.from,'name':params.fromName}
trainSearchHistory.destinationCity['t'+params.to]={'code':params.to,'name':params.toName}
var pkgCityHistory=$('<ul class="pkg_city_history_list_cat clearfix"><div class="clearfix"><span></span></div></ul>');if(trainSearchHistory.destinationCity){var tempDestinationCity=[];$.each(trainSearchHistory.destinationCity,function(i,item){tempDestinationCity.push(item);});tempDestinationCity.reverse();var destinationCityHistory=pkgCityHistory.clone();var destinationCity="";$.each(tempDestinationCity,function(i,item){if(i<7){destinationCity+='<li title="'+item.name+'"><a code="'+item.code+'" href="javascript:;">'+item.name+'</a></li>';}});$("div",destinationCityHistory).append(destinationCity);$(".pkg_city_history_list").eq(1).html(destinationCityHistory.clone(true));$(".pkg_city_history_list").eq(3).html(destinationCityHistory.clone(true));}
if(trainSearchHistory.departCity){var tempDepartCity=[];$.each(trainSearchHistory.departCity,function(i,item){tempDepartCity.push(item);});tempDepartCity.reverse();var departCityHistory=pkgCityHistory.clone();var departCity="";$.each(tempDepartCity,function(i,item){if(i<7){departCity+='<li title="'+item.name+'"><a code="'+item.code+'" href="javascript:;">'+item.name+'</a></li>';}});$("div",departCityHistory).append(departCity);$(".pkg_city_history_list").eq(0).html(departCityHistory.clone(true));$(".pkg_city_history_list").eq(2).html(departCityHistory.clone(true));}}});win.CreateInfo=_.once(function(data){return new Info(data);});})(window,_);;function InfoTicket(obj,info,data){Event.call(this);_.extend(this);var inputs=$(':text',obj);this.container=obj;this.inputs=inputs;this.from=inputs[0];this.to=inputs[1];this.start=inputs[2];this.container=obj;this.errorEle=$('<div />').addClass('pkg_error_tip');this.init(data);}
InfoTicket.prototype=new Event;_.extend(InfoTicket.prototype,{init:function(data){var self=this;var today=window.TKToday
if(today){today=new Date(today.replace(/\-/g,'/'));}else{today=new Date();}
today.setHours(0);today.setMinutes(0);today.setSeconds(0);today.setMilliseconds(0);function GetDateStr(pdate,AddDayCount){var dd=pdate;dd.setDate(dd.getDate()+AddDayCount);var y=dd.getYear();y=y%100;y=((y<50)?(2000+y):(1900+y));var m=dd.getMonth()+1;var d=dd.getDate();return y+"-"+adjustNumber(m)+"-"+adjustNumber(d);}
function adjustNumber(number,len){number+='';len=len||2;var length=number.length;if(length<len){for(var i=len-length;i>0;i--){number='0'+number;}}
return number;}
function getWeekday(sDate){var dt=new Date(sDate.replace(/-/g,'/'));var todayDate=new Date();var strArr1=GetDateStr(todayDate,0).split('-');var strArr2=GetDateStr(dt,0).split('-');var str11=new Date(strArr1[0],strArr1[1]-1,strArr1[2]);var str22=new Date(strArr2[0],strArr2[1]-1,strArr2[2]);var a=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];var result=(str22-str11)/3600000;switch(result){case 0:return"今天";break;case 24:return"明天";break;case 48:return"后天";break;default:return a[dt.getDay()];break;}}
function getDateAlase(date){return getWeekday(date);}
function isEqual(src,rel){if(src.getFullYear()===rel.getFullYear()&&src.getMonth()===rel.getMonth()&&src.getDate()===rel.getDate()){return true;}else{return false;}}
function checkDate(){var placeholder=$(self.start).siblings(".pkg_info_placholder");var date=$(self.start).val();if(date){placeholder.text(getDateAlase(date)+'出发');}}
this.inputs.filter(".hide_placeholder").placeholder().end().filter(".input_addr").each(function(index){var inputEle=this;var _this=$(this);var parentEle=_this.parent();var holderEle=_this.siblings('.pkg_info_placholder');var txtTip=holderEle.text();if(!_this.val()||!_this.attr('code')){_this.val('');}
_this.citysearch({id:'J_Cities_'+(index+1),cityUrl:'http://www.tuniu.com/tn?r=train/trainTicket/getStation',onChange:function(cityData,flag){var nextAddr=self.inputs[index+1];parentEle.removeClass('error');holderEle.text(txtTip).hide();_this.trigger('change');self.trigger('change',self._get(),index===0?'from':'to');if(index===0){nextAddr.focus();}else if(index==1){nextAddr.click();nextAddr.focus();}
inputEle._originFlag=flag||0;inputEle._originData=cityData;console.log("citySearchonChange");},onError:function(){parentEle.addClass('error');holderEle.text('地址不存在').show();}});}).end().filter('.input_date').change(function(){var _this=$(this);var placeholder=_this.siblings(".pkg_info_placholder");var date=_this.val();if(_this.val()){placeholder.text(getDateAlase(date)+' 出发').show();}
self.trigger('change',this.value);}).TN_pkdate({leaveDate:60,wrap:$("body"),onSelect:function(selectWeek,nowTarget){var self=this.currentObj;var placeholder=self.siblings(".pkg_info_placholder");var date=self.val();if(self.val()){placeholder.text(getDateAlase(date)+'出发');}
self.trigger('change',self.val());}});$('.icon_change',self.container).click(function(){var fromAddr=self.from.value||'';var fromCode=self.from.getAttribute('code')||'';var toAddr=self.to.value||'';var toCode=self.to.getAttribute('code')||'';if(!toCode&&!fromCode){return;}
self.from.value=self.to.value;self.from.setAttribute('code',self.to.getAttribute('code')||'');self.to.value=fromAddr;self.to.setAttribute('code',fromCode);$(self.from).trigger('change');$(self.to).trigger('change');self.trigger('change',self._get(),'from');self.trigger('change',self._get(),'to');});if(data!==void(0)){if(data.from){self.from.setAttribute('code',data.from);self.from.value=data.fromName;}
if(data.to){self.to.setAttribute('code',data.to);self.to.value=data.toName;}
var startTimeVal=data.date,startTimeVal=startTimeVal.replace(/-+/g,'/'),urlDate=(+new Date(startTimeVal)),result=new Date(startTimeVal),flag=/\d+/g.test(result);var date=new Date(),year=date.getFullYear(),month=date.getMonth()+1,day=date.getDate(),nowDate=+new Date();if(flag&&urlDate>=nowDate){self.start.value=data.date;}
else{sNowTime=''+year+'-'+month+'-'+day;self.start.value=sNowTime;}
checkDate();self.inputs.trigger('change').trigger('blur');}},_get:function(){var from=this.from.getAttribute('code');var fromName=this.from.value;var to=this.to.getAttribute('code');var toName=this.to.value;var start=this.start.value;return{from:from,fromName:fromName,to:to,toName:toName,start:start,fromFlag:this.from._originFlag,fromOriginData:this.from._originData,toFlag:this.to._originFlag,toOriginData:this.to._originData}},get:function(){var from=this.from.getAttribute('code');var to=this.to.getAttribute('code');var start=this.start.value;var addrValidRes,dateValidRes;var errors=[];addrValidRes=Tools.checkAddr('','',this.from,this.to);if(this.disabled){dateValidRes=Tools.checkDate(start,null,this.start,null);}else{dateValidRes=Tools.checkDate(start,null,this.start,null);}
if(addrValidRes.error===0&&dateValidRes.error===0){return{from:from,fromName:this.from.value,to:to,toName:this.to.value,start:start,fromFlag:this.from._originFlag,fromOriginData:this.from._originData,toFlag:this.to._originFlag,toOriginData:this.to._originData}}else{if(addrValidRes.error===2){this.showError('出发地与目的地相同',this.from);}else if(addrValidRes.error===1){this.showError(addrValidRes.msg,addrValidRes.target);}
if(addrValidRes.error){errors.push(addrValidRes);}
if(dateValidRes.error===1){this.showError(dateValidRes.msg,dateValidRes.target);errors.push(dateValidRes);}
return{error:true,list:errors};}},check:function(){var from=this.from.getAttribute('code');var to=this.to.getAttribute('code');var start=this.start.value;var addrValidRes,dateValidRes;addrValidRes=Tools.checkAddr('','',this.from,this.to,true);if(this.disabled){dateValidRes=Tools.checkDate(start,null,this.start,null,true);}else{dateValidRes=Tools.checkDate(start,null,this.start,null,true);}
if(addrValidRes.error===0&&dateValidRes.error===0){return true;}else{return false;}},enable:function(){this.disabled=false;$(this.back).removeClass('disabled').parent().removeClass('disabled');},disable:function(){this.disabled=true;$(this.back).addClass('disabled').parent().addClass('disabled');},set:function(property,value){if(property==='start'){this.start.value=value;$(this.start).trigger('change');}else if(property==='back'){this.back.value=value;}},showError:function(msg,target){return;var errorEle=$(target).siblings('.pkg_error_tip');if(errorEle.length){errorEle.text(msg);}else{this.errorEle.clone().text(msg).insertAfter(target);}
this.container.addClass('error');},hideError:function(target){if(target){$(target).siblings('.pkg_error_tip').remove();}else{this.container.find('.pkg_error_tip').remove();}
if(this.container.find('.pkg_error_tip').length===0){this.container.removeClass('error');}}});;;(function(win,_){function ProsList(info){var flightTemplate;Event.call(this);this.container=$('#J_List');this.totalProEle=$('#J_TotalPro');this.items=[];this.service=getDataServer();this.info=info;if(window.contentType==='flight-pkg'||window.contentType==='flight'){this.pkgTemplate=this.template;if((flightTemplate=$('#T_ProFlightItem'))&&flightTemplate.length>0){this.flightTemplate=_.template(flightTemplate.html());}}
if(window.contentType==='flight'){this.template=this.flightTemplate;}}
var loadTimeStamp;ProsList.prototype=new Event;_.extend(ProsList.prototype,{init:function(){var self=this,data=self.data,items=self.items;self.clear();$.each(data,function(i,item){_.defer(function(){var pro=new Pro(item,self);items.push(pro);pro.bind('add',function(data,ele,callback){self.addToCart(data,ele,callback);});pro.bind('remove',function(data,ele,callback){self.removeFromCart(data,ele,callback);});pro.bind('create',function(pro){self.trigger('create',pro,self);});pro.bind('select',function(pro){self.select(pro);});pro.bind('unselect',function(pro){self.unselect(pro);});pro.bind('loadThrough',function(){self.trigger('loadThrough',pro);});pro.bind('afterLoadThrough',function(data){self.trigger('afterLoadThrough',pro,data);});pro.bind('tkAddLoad',function(data){self.trigger('tkAddLoad',pro);});pro.bind('tkAddLoadFail',function(){self.trigger('tkAddLoadFail',pro);});pro.bind('afterLoadTkAdd',function(data){self.trigger('afterLoadTkAdd',pro,data);});pro.bind('tkAddLoadMore',function(data){self.trigger('tkAddLoadMore',pro);});pro.bind('tkAddLoadMoreFail',function(){self.trigger('tkAddLoadMoreFail',pro)});pro.bind('afterLoadTkAddMore',function(data){self.trigger('afterLoadTkAddMore',pro,data);});pro.trigger('create',pro);});});},initTotalNum:function(num){num=num||10;this.totalProEle.text(num);},load:function(sendData){var self=this;var stamp=_.now();self.trigger('beforeLoad');loadTimeStamp=stamp;self.service.loadList(sendData,function(data){if(loadTimeStamp!==stamp){return false;}
if(data&&data.code=='200'){self.loadData(data.data);}else{self.trigger('error',data);}});},loadData:function(data){this.trigger('beforeListLoad',data);this.data=data.list;this.lowestPrice=data.lowestPrice;this.init();this.trigger('load',data);this.loadLast(data.allTrainType);},loadLast:function(data){var self=this;_.defer(function(){var lastLinkList=$(self.lastLinkListTemplate(data));lastLinkList.appendTo(self.container);});},clear:function(){var self=this,items=self.items,item;self.container.empty();while(items.length){item=items.pop();if(item){item.remove();}}},addToCart:function(data,ele,callback){this.trigger('add',data,ele,callback);},removeFromCart:function(data,ele,callback){this.trigger('remove',data,ele,callback);},hide:function(){this.container.hide();},show:function(){this.container.show();},select:function(item){var items=this.items;_.each(items,function(tmp){if(item===tmp){tmp.select();}else{tmp.unselect();}});},unselect:function(item){var items=this.items;_.each(items,function(tmp){if(item===tmp){tmp.unselect();}});},calcDeltaPrice:function(price){var items=this.items;_.each(items,function(item){item.calcDeltaPrice(price);});},filterShow:function(flag){var items=this.items;_.each(items,function(item){if(item.container.find("a.btn").length==0&&flag==1){item.container.hide();}else{item.container.show();}});}});win.CreateProsList=_.once(function(options){return new ProsList(options);});})(window,_);;;(function(win,_){function Calendar(today,currentDate){Event.call(this);this.caleContainer=$("#J_Calendar");this.weekContainer=$("#J_DateList");this.container=$('#J_DateWrap');this._today=str2Date(today);this.minDate=null;this.maxDate=null;this.minGroupDate=null;this.maxGroupDate=null;this.groupDateList=[];this.currentDate=str2Date(currentDate);this.init();}
Calendar.prototype=new Event;_.extend(Calendar.prototype,{init:function(){var self=this;var container=self.caleContainer;var weekContainer=self.weekContainer;var today=self._today;self.minDate=today;self.maxDate=getNextDate(today,59);self.container.show();container.empty();weekContainer.empty();self.setGroupDate(self.currentDate);function hideCalendar(){$("#J_PriceCalendar").parent().removeClass('hover');$(document).unbind('click',hideCalendar);}
$("#J_DateNext").unbind('click').click(function(){self.getNextGroup();});$("#J_DatePrev").unbind('click').click(function(){self.getPrevGroup();});$("#J_PriceCalendar").click(function(e){var parent=$(this).parent();if(parent.hasClass('hover')){parent.removeClass('hover');}else{parent.addClass("hover");if(!self.initFullCalendar){setTimeout(function(){self.initFullCalendar=true;self.buildFullCaleadar();},100);}
$(document).click(hideCalendar);}
e.stopPropagation();}).parent().removeClass("hover").click(function(e){e.stopPropagation();});},getNextGroup:function(){var self=this;if(self.getOverflowFlag(self.maxGroupDate)===1){return;}
self.buildGroup(1,getNextDate(self.minGroupDate,1),getNextDate(self.maxGroupDate,1));},getPrevGroup:function(){var self=this;if(self.getOverflowFlag(self.minGroupDate)===0){return;}
self.buildGroup(0,getNextDate(self.minGroupDate,-1),getNextDate(self.maxGroupDate,-1));},setGroupDate:function(date,notTrigger){var self=this;date=str2Date(date||self._today);var dir=self.getOverflowGroupDir(date);self.currentDate=date;var minGroupDay=getNextDate(date,-3);var maxGroupDay=getNextDate(date,3);if(getDeltaDay(minGroupDay,self._today)<0){var diffNum=Math.abs(getDeltaDay(date,self._today));var minGroupDay=getNextDate(date,0-diffNum);var maxGroupDay=getNextDate(date,6-diffNum);}
if(self.minGroupDate){var diffNum=Math.abs(getDeltaDay(date,self.minGroupDate));if(diffNum<3){var minGroupDay=getNextDate(date,0-diffNum);var maxGroupDay=getNextDate(date,6-diffNum);}}
self.buildGroup(dir,minGroupDay,maxGroupDay);if(!notTrigger){self.trigger('change',date);}
if(self.calendar){self.calendar.fullCalendar("select",date);}},buildGroup:function(dir,minGroupDay,maxGroupDay){var self=this;$.each(self.groupDateList,function(){this.TKDateFlag=0;});var newDays=self.buildGroupDates(minGroupDay,maxGroupDay);if(dir===0){$(newDays).prependTo(self.weekContainer);self.groupDateList=newDays.concat(self.groupDateList);}else if(dir===1){$(newDays).appendTo(self.weekContainer);self.groupDateList=self.groupDateList.concat(newDays);}
self.scrollGroupDate(dir,newDays.length);self.minGroupDate=minGroupDay;self.maxGroupDate=maxGroupDay;if(getDeltaDay(minGroupDay,self.minDate)<=0){$(".pkg_date_prev a").addClass('disabled').removeClass('hovered');$("#J_DatePrev").unbind('click');}else{$(".pkg_date_prev a").removeClass('disabled').addClass('hovered');$("#J_DatePrev").unbind('click').click(function(){self.getPrevGroup();});}
if(getDeltaDay(maxGroupDay,self.maxDate)>=0){$(".pkg_date_next a").addClass('disabled').removeClass('hovered');$("#J_DateNext").unbind('click');}else{$(".pkg_date_next a").removeClass('disabled').addClass('hovered');$("#J_DateNext").unbind('click').click(function(){self.getNextGroup();});}},scrollGroupDate:function(dir,amount){var self=this;var container=self.weekContainer;var wrap=self.container;var list=[];var wrapWidth=wrap.width();var listWidth=container[0].scrollWidth;var scrollLeftStart=0;var scrollLeftEnd=0;$.each(self.groupDateList,function(index,item){if(item.TKDateFlag==1){list.push(item);}else{$(item).remove();}});container.css('left',0)
self.groupDateList=list;},buildGroupDates:function(min,max){var self=this;var day=new Date(+min);var days=[];var dateItem;for(;+day<=+max;day.setDate(day.getDate()+1)){dateItem=self.buildGroupDate(day);if(dateItem){days.push(dateItem[0]);}}
return days;},buildGroupDate:function(day){var self=this;var disableFlag=self.getOverflowFlag(day);var dateItem=self.getGroupDate(day);var html='<li class="pkg_date_single"><a href="javascript:;" rel="nofollow"><strong>'+getDateMDString(day)+'</strong><span>'+getWeek(day)+'</span></a></li>'
if(dateItem){dateItem.TKDateFlag=1;dateItem=$(dateItem);}else{dateItem=$(html);if(disableFlag===2){dateItem.click(function(){if(+self.currentDate==this.TKDate){return;}
self.setGroupDate(new Date(this.TKDate));});}else{dateItem.addClass('pkg_date_blank');}
dateItem[0].TKDate=+day;dateItem[0].TKInit=true;dateItem[0].TKDateFlag=1;}
if(+day==+self.currentDate){dateItem.addClass('current');}else{dateItem.removeClass('current');}
return dateItem;},getGroupDate:function(date){var groupDateList=this.groupDateList;var dateItem;date=+date;for(var i=0;i<groupDateList.length;i++){dateItem=groupDateList[i];if(dateItem.TKDate==+date){return dateItem;}}
return null;},getOverflowFlag:function(date){var self,minDate,maxDate;date=str2Date(date);if(!date){return 2;}
date=+date;self=this;minDate=self.minDate;maxDate=self.maxDate;if(+minDate>date){return 0;}else if(+maxDate<date){return 1;}else{return 2;}},getOverflowGroupDir:function(date){var currentDate=+this.currentDate;date=str2Date(date);if(!date){return 2;}
date=+date;if(date<currentDate){return 0;}else if(date>currentDate){return 1;}else{return 2;}},buildFullCaleadar:function(){var self=this;var calendar=self.caleContainer;var currentDate=self.currentDate;var date=new Date(+self._today);var dataEvents=[];date.setDate(date.getDate()-1);for(var i=0;i<60;i++){date.setDate(date.getDate()+1);dataEvents.push({title:' ',start:getDateYMDString(date)});}
calendar.fullCalendar({header:{left:'prev',center:'title',right:'next'},year:currentDate.getFullYear(),month:currentDate.getMonth(),date:currentDate.getDate(),monthNames:['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],dayNamesShort:['日','一','二','三','四','五','六'],editable:false,events:dataEvents,dayRender:function(date,cell){var overflowFlag=self.getOverflowFlag(date);if(overflowFlag===2){$(cell).addClass('tk_calendar_enabled');}else{$(cell).removeClass('tk_calendar_enabled');}},eventAfterRender:function(event,ele,view){ele.click(function(e){var date=event.start;date.setHours(0);calendar.fullCalendar("unselect");calendar.fullCalendar("select",date);self.setGroupDate(date);self.trigger('change',date);$("#J_PriceCalendar").parent().removeClass('hover');});},eventAfterAllRender:function(){calendar.fullCalendar("select",self.currentDay);}});calendar.fullCalendar("select",currentDate);var prevMonthBtn=calendar.find('.fc-button-prev');var nextMonthBtn=calendar.find('.fc-button-next');prevMonthBtn.unbind('click').click(function(){if(!prevMonthBtn.hasClass('fc-state-disabled')){calendar.fullCalendar('prev');}});nextMonthBtn.unbind('click').click(function(){if(!nextMonthBtn.hasClass('fc-state-disabled')){calendar.fullCalendar('next');}});}});function str2Date(date){if(!date){return null;}
if(typeof date==='string'){date=uniformDateFormat(date);date=new Date(date);}else{date=new Date(+date);}
return date;}
function uniformDateFormat(date){if(typeof date==='string'){return date.replace(/\-/g,'/');}
return date;}
function getNextDate(srcDate,delta){srcDate=str2Date(srcDate);if(!srcDate){return null;}
delta=parseInt(delta);return new Date(srcDate.getTime()+delta*86400000);}
function getDeltaDay(srcDate,relDate){var delta=srcDate-relDate;return Math.floor(delta/86400000);}
function getDateYMDString(date){var year,month,day;date=str2Date(date)
year=date.getFullYear();month=adjustNumber(date.getMonth()+1);day=adjustNumber(date.getDate());return year+'-'+month+'-'+day;}
function getDateMDString(date){var month,day;date=str2Date(date)
month=adjustNumber(date.getMonth()+1);day=adjustNumber(date.getDate());return month+'-'+day;}
function getWeek(date){return'周'+['日','一','二','三','四','五','六'][date.getDay()];}
function adjustNumber(number,len){number+='';len=len||2;var length=number.length;if(length<len){for(var i=len-length;i>0;i--){number='0'+number;}}
return number;}
win.CreateCalendar=function(today,currentDate){return new Calendar(today,currentDate);}})(window,_);;$(function(){var html='<div class="layer" id="J_Dialog"><div class="mask"></div><div class="dialog"><div class="dialog_inner"><div class="dialog_head"><div class="dialog_tit">提示</div><a class="dialog_close" href="javascript:;"><i class="icon"></i></a></div><div class="dialog_con"></div><div class="dialog_btns"><a href="javascript:;" class="dialog_btn dialog_btn_ok">确定</a><a href="javascript:;" class="dialog_btn dialog_btn_cancle">取消</a></div></div></div></div>';var layerEle=$(html);var outerCon=$('.dialog',layerEle);var TitEle=$(".dialog_tit",layerEle);var conEle=$(".dialog_con",layerEle);var btnsEle=$(".dialog_btns",layerEle);var closeBtnEle=$(".dialog_close",layerEle);var okBtnEle=$(".dialog_btn_ok",layerEle);var cancleBtnEle=$(".dialog_btn_cancle",layerEle);var okCallback,cancleCallback,closeCallback;function closeDialog(){layerEle.hide();layerEle[0].className='layer';outerCon.css({'width':'auto','height':'auto','margin':0});if(closeCallback){closeCallback();}}
function showDialog(){layerEle.css({width:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),height:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)}).show();outerCon.css({'marginLeft':-outerCon.width()/2,'marginTop':-outerCon.height()/2});}
function openDialog(option){conEle.html(option.msg||"");option.title&&TitEle.text(option.title);option.className&&layerEle.addClass(option.className);option.width&&outerCon.width(option.width);option.height&&outerCon.height(option.height);okBtnEle.text(option.okLabel||'确定');cancleBtnEle.text(option.cancleLabel||'取消');if(option.btnHidden){btnsEle.hide();}else{btnsEle.show();okCallback=option.ok||null;cancleCallback=option.cancle||null;closeCallback=option.close||null;}
showDialog();}
closeBtnEle.click(closeDialog);okBtnEle.click(function(){var isClose=true;if(okCallback){isClose=okCallback();}
isClose!==false&&closeDialog();});cancleBtnEle.click(function(){var isClose=true;if(cancleCallback){isClose=cancleCallback();}
isClose!==false&&closeDialog();});layerEle.appendTo('body');window.openDialog=openDialog;window.hideDialog=closeDialog;});;var Tools={infoItems:{'WF':window.WangfanInfo,'AD':window.InfoAddress,'DE':window.InfoDest,'HT':window.InfoHotel,'SF':window.InfoStaff,'TK':window.InfoTicket},checkAddr:function(from,to,fromObj,toObj,slient){var blankFlag=false;var placeholder='地址';var target;var fromName=from,toName=to;if(!from&&fromObj){from=fromObj.getAttribute('code');fromName=fromObj.value;}
if(!to&&toObj){to=toObj.getAttribute('code');toName=toObj.value;}
if(fromObj&&(!from||!fromName)){blankFlag=true;placeholder=$(fromObj).siblings('.pkg_info_placholder').text();target=fromObj;}else if(toObj&&(!to||!toName)){blankFlag=true;placeholder=$(toObj).siblings('.pkg_info_placholder').text();target=toObj;}
if(blankFlag){return{error:1,msg:'请选择'+placeholder,target:target}}
if(fromObj&&toObj&&(from===to)&&(fromName==toName)){return{target:toObj,error:2,msg:'出发地与目的地不能相同'}}
return{error:0};},checkDate:function(start,back,startObj,backObj,slient){var blankFlag=false;var placeholder='';var target;if(startObj&&(!start||start==='yyyy-mm-dd')){blankFlag=true;placeholder=$(startObj).siblings('.pkg_info_placholder').text();target=startObj;}else if(backObj&&(!back||back==='yyyy-mm-dd')){blankFlag=true;placeholder=$(backObj).siblings('.pkg_info_placholder').text();target=backObj;}
if(blankFlag){return{error:1,msg:'请选择'+placeholder+'日期',target:target}}
return{error:0};},checkBlank:function(){var flag=true;_.each(arguments,function(ele){var val=$.trim(ele.value);if(!(!val||val=='yyyy-mm-dd')){flag=false;}});return flag;},getNextDate:function(current,delta){var currentDate;if(typeof current==='string'){current=current.replace(/\-/g,'/');}else{current=current.getFullYear()+'/'+(current.getMonth()+1)+'/'+current.getDate();}
currentDate=new Date(current);delta=delta||1;currentDate.setDate(currentDate.getDate()+delta);return currentDate.getFullYear()+'-'+Tools.adjustNumber(currentDate.getMonth()+1)+'-'+Tools.adjustNumber(currentDate.getDate());},getSearchQuery:function(){var search=location.search;var res={};if(search){search=search.replace(/^\?/,'');search=search.split('&');_.each(search,function(item){item=item.split('=');res[item[0]]=item[1];});}
return res;},adjustNumber:function(number,len){number+='';len=len||2;var length=number.length;if(length<len){for(var i=len-length;i>0;i--){number='0'+number;}}
return number;},isBlankDate:function(dateString){dateString=dateString.replace(/(^\s*|\s*$)/g,'');if(dateString==='yyyy-mm-dd'||dateString===''){return true;}
return false;},getDateMDString:function(date){if(typeof date==='string'){date=new Date(Tools.changeDateFormat(date));}
var month=Tools.adjustNumber(date.getMonth()+1);var date=Tools.adjustNumber(date.getDate());return month+'-'+date;},adjustNumber:function(number,len){number+='';len=len||2;var length=number.length;if(length<len){for(var i=len-length;i>0;i--){number='0'+number;}}
return number;},changeDateFormat:function(date){return date.replace(/\-/g,'/');},calcDeltaDate:function(start,end){start=new Date(Tools.changeDateFormat(start));end=new Date(Tools.changeDateFormat(end));return Math.abs((start-end)/86400000);},getDeltaDay:function(from,to){if(!from||!to){return 0;}
from=new Date(Tools.changeDateFormat(from));to=new Date(Tools.changeDateFormat(to));return Math.abs((to-from)/86400000);}}
_.mixin({formatDate:function(date){date=/\d{1,2}\-\d{1,2}$/.exec(date);if(date){date=_.map(date[0].split('-'),function(num){if(num.length===1){return'0'+num;}else{return num;}});return date.join('-');}else{return date;}}});$.fn.placeholder=function(){return this.each(function(){var placeholder=$(this).siblings(".pkg_info_placholder");$(this).bind("input propertychange change",function(){if(this.value){placeholder.hide();}else{placeholder.show();}});if(this.value){placeholder.hide();}});};;(function(win,_){var html='<div class="pkg_error" id="J_Errors"><div class="pkg_error_con"><h3></h3></div></div>';function ErrorInfo(wrap){Event.call(this);this.wrap=wrap;this.wrap.find("#J_Errors").remove();this.init();}
ErrorInfo.prototype=new Event;_.extend(ErrorInfo.prototype,{init:function(){var container=$(html);this.container=container;this.errorCon=$('h3',container);this.wrap.css({position:'relative'});container.appendTo(this.wrap);},hide:function(){this.container.hide();},show:function(msg){this.errorCon.html(msg||html);this.container.css({position:'static'}).removeClass('loading').show();},showLoading:function(isCover,ele){if(!ele){return false;}
var offset=ele.offset();var height=ele.outerHeight();var width=this.wrap.outerWidth();var container=this.container;var wrapOffset;var iTop;if(ele.is(':hidden')){container.css({position:'relative',width:'100%',height:150,top:0});}else{wrapOffset=this.wrap.offset();if(isCover){container.css({position:'relative',width:'100%',height:150,top:0});}else{iTop=offset.top-wrapOffset.top+height;container.css({position:'absolute',top:iTop,width:width,height:this.wrap.height()-iTop});}}
this.errorCon.text('小牛牛正在努力加载中...');container.addClass('loading');this.container.show();},setMsg:function(msg){if(msg){html=msg;}}});win.CreateErrorInfo=_.once(function(wrap){return new ErrorInfo(wrap);});})(window,_);;;(function(){function PkgTip(){this.ele=$('<div />').addClass('pkg_error_tip');this.container=$('<span />');this.visible=false;this._target=null;this._rel=null;this._msg='';$('<i />').addClass('pkg_error_tip_icon').appendTo(this.ele);this.container.appendTo(this.ele);this.ele.hide().appendTo('body');}
PkgTip.prototype.show=function(target,msg,rel){this._target=target;this._msg=msg;this._rel=rel;this.update();this.container.text(msg);this.ele.show();this.visible=true;}
PkgTip.prototype.hide=function(){this.ele.hide();this.container.text('');this.visible=false;}
PkgTip.prototype.update=function(){var target=$(this._target);var wrap=this._rel;var wrapOffset=wrap.offset();var targetOffset=target.offset();var targetHeight=target.outerHeight();this.ele.css({'min-width':wrap.width(),'left':wrapOffset.left,'top':targetOffset.top+targetHeight});}
window.CreatePkgError=_.once(function(){var error=new PkgTip();$(window).resize(function(){if(error.visible){error.update();}});return error;});})();;$(function(){var ERROR_MSG_P='抱歉，没有符合搜索条件的套票';var ERROR_MSG_S='抱歉，没有符合搜索条件的该程机票，请调整目的地或者行程时间后再重新搜索';var _loadCalendar;function processSendData(infoData,filterData){var data={};var key,sortData;if(infoData){data.primary={'departureDate':infoData.TK.start,'departureCityCode':parseInt(infoData.TK.from,10),'departureCityName':infoData.TK.fromName,'arrivalCityCode':parseInt(infoData.TK.to,10),'arrivalCityName':infoData.TK.toName};}
if(filterData){data.secondary={};_.each(filterData.filter,function(filters,filterType){data.secondary[filterType]=filters;});data.secondary.sortType=filterData.sort;if(filterData.sort){sortData=filterData.sort;for(key in sortData){if(sortData[key]!=0){data.secondary.sortName=key;data.secondary.sortType=sortData[key]+1;}}}}
data.start=0;data.limit=0;return data;}
var dataServer=getDataServer();var info=CreateInfo(window.PostData);var list=CreateProsList(info);var filter=CreateFilter();var calendar=CreateCalendar(window.TKToday);var error=CreateErrorInfo($('.pkg_main'));var pkgError=CreatePkgError();var crumbEle=$('#J_Crumb');var startDateEle=$('#J_StartDate');var startCityEle=$('#J_StartCity');var endCityEle=$('#J_EndCity');var caleSearch=false;var lineSearch=false;var indexSearchFlag=false;function hideAllList(){$('#J_Main').show();$('#J_Filter').children('div').not('.pkg_filter_head').hide();$('#J_ProList').hide();}
function showAllList(){$('#J_Filter').children('div').not('.pkg_filter_head').show();$('#J_ProList').show();}
function showLines(){$('#J_Filters').show().children('div').not('.pkg_plane_lines').hide();}
function showFilter(){$('#J_Filters').children('div').not('.pkg_date_select').show();}
function getStartDateStr(date){var dateArr;if(date&&typeof date==='string'){dateArr=date.replace(/\//g,'-').split('-');return dateArr[1]+'月'+dateArr[2]+'日';}
return'';}
var listUrl='/tn?r=train/trainTicket/getTickets';dataServer.set('listUrl',listUrl);info.bind('search',function(data){var filterData,secondary;indexSearchFlag=data.indexFlag;if(window.PostData&&window.PostData.secondary&&indexSearchFlag){secondary=window.PostData.secondary;filterData=secondary;}
filterData=filterData||{filter:{}};if(data.TK.fromFlag==1&&data.TK.fromOriginData.name!=data.TK.fromOriginData.cityName){filterData.filter.departureStations=[data.TK.fromOriginData.code];}else if(data.TK.fromFlag==0||data.TK.fromFlag==1){filterData.filter.departureStations=[];}
if(data.TK.toFlag==1&&data.TK.toOriginData.name!=data.TK.toOriginData.cityName){filterData.filter.arrivalStations=[data.TK.toOriginData.code];}else if(data.TK.toFlag==0||data.TK.toFlag==1){filterData.filter.arrivalStations=[];}
data=processSendData(data,filterData);startCityEle.text(data.primary.departureCityName);endCityEle.text(data.primary.arrivalCityName);crumbEle.text(data.primary.departureCityName+'到'+data.primary.arrivalCityName+'火车票');startDateEle.text(getStartDateStr(data.primary.departureDate));getRightRecommend(data.primary.departureCityCode,data.primary.arrivalCityCode);getLinkRecommend(data.primary.departureCityCode,data.primary.departureCityName,data.primary.arrivalCityCode,data.primary.arrivalCityName)
calendar.setGroupDate(data.primary.departureDate,true);info.load(data);});info.bind('beforeLoad',function(){if(caleSearch){error.showLoading(false,calendar.container);caleSearch=false;}else{hideAllList();error.showLoading(true,$('#J_ProList'));}});info.bind('load',function(data){var listData=data.data.list;data.data.filter.sort=reSetSortData(data.data.filter.sort);filter.load(data.data.filter,indexSearchFlag?(window.PostData&&window.PostData.secondary):null);list.loadData(data.data);if(listData.length===0){error.show('没有找到符合条件的列车');}else{showAllList();showFilter();error.hide();}
filter.checkHeight();});info.bind('error',function(data){error.show('没有找到符合条件的列车');$('#J_ProList').hide();$('#J_Filters').show();$('#J_FilterItems').hide();$('#pkg_filter_selected').hide();$("#J_alltrain").text(0);});info.bind('invalid',function(errors){var target=$(errors[0].target);target.focus();pkgError.show(target,errors[0].msg,target.parent());target.parent().addClass('error');});calendar.bind('change',function(date){caleSearch=true;error.showLoading(false,this.container);var month=(date.getMonth()+1)>9?(date.getMonth()+1):"0"+(date.getMonth()+1);var day=date.getDate()>9?date.getDate():"0"+date.getDate();info.set('TK','start',date.getFullYear()+'-'+month+'-'+day);info.search();});filter.bind('change',function(){var infoData=info.get();var filterData=filter.get();var data=processSendData(infoData,filterData);list.load(data);});filter.bind('filterShow',function(){list.filterShow(this.filterShowFlag);});list.bind('beforeLoad',function(){});list.bind('error',function(data){error.show('没有找到符合条件的列车');$('#J_ProList').hide();$("#J_alltrain").text(0);});list.bind('load',function(data){if(data&&data.list.length===0){error.show('没有找到符合条件的列车');}else{$('#J_ProList').show();error.hide();}
$("#J_alltrain").text(data.count);});list.bind('beforeListLoad',function(data){});list.bind('create',function(pro){var container=pro.container;trainticket.ticketPopBox(container);});list.bind('add',function(data){var infoData=info.get();if(infoData.TK){data.startDate=infoData.TK.start;data.startStationCode=infoData.TK.from;data.startStationName=infoData.TK.fromName;data.desStationCode=infoData.TK.to;data.desStationName=infoData.TK.toName;}
delete data._obj;buildForm(data);});list.bind('loadThrough',function(pro){var tkData=pro.get();var infoData=info.get();var infoTkData=infoData.TK;var sendData={id:tkData.trainId,departDate:infoTkData.start,cityStation:{}}
sendData.cityStation.depart={departStationId:tkData.departStationId};sendData.cityStation.dest={destStationId:tkData.destStationId};pro.getThrough(sendData);});list.bind('afterLoadThrough',function(pro,data){pro.loadThrough(data);});list.bind('tkAddLoad',function(pro){var tkData=pro.get();var infoData=info.get();var infoTkData=infoData.TK;var filterData=filter.get();var sendData={primary:{},secondary:{},limit:1,area:0}
sendData.primary.departureDate=infoTkData.start;sendData.primary.departureCityName=infoTkData.fromName;sendData.primary.departureCityCode=infoTkData.from;sendData.primary.arrivalCityName=infoTkData.toName;sendData.primary.arrivalCityCode=infoTkData.to;sendData.primary.trainIds=[tkData.trainId];sendData.secondary.departureStations=[tkData.departStationId];sendData.secondary.arrivalStations=[tkData.destStationId];sendData.secondary.seats=filterData.filter.seats;sendData.secondary.restCountAvailable=1;pro.getTkAddLoad(sendData);});list.bind('afterLoadTkAdd',function(pro,data){if(data.code==200){pro.tkAddLoad(data.data);}else{var tkData=pro.get();var trainNum=tkData.trainNum;pro.tkAddLoadFail(trainNum);}});list.bind('tkAddLoadMore',function(pro){var tkData=pro.get();var infoData=info.get();var infoTkData=infoData.TK;var filterData=filter.get();var sendData={primary:{},secondary:{},limit:3,area:1}
sendData.primary.departureDate=infoTkData.start;sendData.primary.departureCityName=infoTkData.fromName;sendData.primary.departureCityCode=infoTkData.from;sendData.primary.arrivalCityName=infoTkData.toName;sendData.primary.arrivalCityCode=infoTkData.to;sendData.primary.trainIds=[tkData.trainId];sendData.secondary.departureStations=[tkData.departStationId];sendData.secondary.arrivalStations=[tkData.destStationId];sendData.secondary.seats=filterData.filter.seats;sendData.secondary.restCountAvailable=1;pro.getTkAddLoadMore(sendData);});list.bind('afterLoadTkAddMore',function(pro,data){if(data.code==200){pro.tkAddLoadMore(data.data);}else{var tkData=pro.get();var trainNum=tkData.trainNum;pro.tkAddLoadFailMore(trainNum);}});var formEle=$('#J_MainForm');var infoEle=$('#J_PkgInfo');var rightRecommendWrap=$('#J_TKRight');var linkRecommendWrap=$('#J_TKLink');var recommendUrl='/tn?r=train/TrainTicket/getRightRecommend';var recommendLinkUrl='/tn?r=train/TrainTicket/getLinkRecommend';function getRightRecommend(from,to){rightRecommendWrap.addClass('right_main_loading');$.get(recommendUrl,{fromCityCode:from,toCityCode:to},function(html){rightRecommendWrap.removeClass('right_main_loading');rightRecommendWrap[0].innerHTML=html;trainticket.tabCon();});}
function getLinkRecommend(from,fromName,to,toName){$.get(recommendLinkUrl,{fromCityCode:from,toCityCode:to,fromCityName:fromName,toCityName:toName},function(html){linkRecommendWrap[0].innerHTML=html;linkRecommendWrap.show();});}
function buildForm(data){var form=$('<form />');var input=$('<input />');form.attr({method:'POST',action:'/book'});input.attr({type:'hidden',name:'ticket',value:SerializeJsonToStr(data)});input.appendTo(form);form.appendTo('body');form[0].submit();}
function SerializeJsonToStr(oJson){if(oJson==null)
return"null";if(typeof(oJson)==typeof(0)){return oJson.toString();}
if(typeof(oJson)==typeof('')||oJson instanceof String){oJson=oJson.toString();oJson=oJson.replace(/\r\n/,'\\r\\n');oJson=oJson.replace(/\n/,'\\n');oJson=oJson.replace(/"/,'\\"');return'"'+oJson+'"';}
if(oJson instanceof Array){var strRet="[";for(var i=0;i<oJson.length;i++){if(strRet.length>1)
strRet+=",";strRet+=SerializeJsonToStr(oJson[i]);}
strRet+="]";return strRet;}
if(typeof(oJson)==typeof({})){var strRet="{";for(var p in oJson){if(strRet.length>1){strRet+=",";}
strRet+='"'+p.toString()+'":'+SerializeJsonToStr(oJson[p]);}
strRet+="}";return strRet;}}
function postPageByForm(url){infoEle.find(':text').each(function(){var inputEle=$(this);var hiddenInputEle=inputEle.siblings('[type=hidden]');if(hiddenInputEle.length){hiddenInputEle.val(inputEle.attr('code'));}});$('#J_ST').val($('#J_WF').val()==1?0:1);formEle.attr('action',url).submit();}
$(window).resize(function(){filter.recheckHeight();});$('#J_HeadTab').find('a').click(function(e){var _this=$(this);var action=_this.attr('href');e.preventDefault();if(_this.hasClass('current')){return false;}
postPageByForm(action);});if(info.check()){startCityEle.text(window.PostData.ticket.fromName);endCityEle.text(window.PostData.ticket.toName);crumbEle.text(window.PostData.ticket.fromName+'到'+window.PostData.ticket.toName+'火车票');startDateEle.text(getStartDateStr(window.PostData.ticket.date));calendar.setGroupDate(window.PostData.ticket.date,true);indexSearchFlag=true;if(window.ListData.code==200){hideAllList();info.trigger('load',window.ListData);}else{info.trigger('search',$.extend(info.get(),{'indexFlag':true}));}}
$(window).scroll(function(){var listHead=$(".pkg_filter_sort");var list=$(".pkg_list");if(list[0].getBoundingClientRect().top<50){listHead.addClass("pkg_filter_sort_fixed");}else{listHead.removeClass("pkg_filter_sort_fixed");}});function reSetSortData(sortData){var sort=[{id:'0',name:"车次",type:0}];for(var i=0,len=sortData.length;i<len;i++){if(sortData[i]['id']=='1'){sortData[i]['name']="发时";sort.push(sortData[i]);}else if(sortData[i]['id']=='2'){sortData[i]['name']="到时";sort.splice(2,0,sortData[i]);}else if(sortData[i]['id']=='4'){sortData[i]['name']="参考票价";sort.push(sortData[i]);}else{sort.push(sortData[i]);}}
sort.splice(3,0,{id:'5',name:"出发/到达车站",type:0});sort.push({id:'0',name:"剩余票数",type:0});sort.push({id:'6',name:"只显示有票车次",type:"other"});return sort;}});;$(function(){trainticket.tabCon();})
var trainticket={slidedetail:function(){},addSlideSign:function(){var sign="<a href='javascript:;' class='slidesign'>更多筛选条件▼</a>";var packup="<a href='javascript:;' class='slideup'>收起▲</a>";$(".pkg_filter_item").append(sign);$(".pkg_filter_item").append(packup);},addtrainInfo:function(){var start=$(".pkg_info_from input").val();var end=$(".pkg_info_to input").val();var time=$(".pkg_info_start_date input").val();$("#J_startcity").text(start);$("#J_endcity").text(end);$("#J_nowtime").text(time);},slideAll:function(){$(".pkg_filter_item .slidesign").click(function(){$(".pkg_filter_item").animate({height:"360px"});$(this).hide();$(".pkg_filter_item .slideup").show();})},initslideAll:function(){$(".pkg_filter_item").css({height:"85px"});},packUp:function(){$(".pkg_filter_item .slideup").click(function(){$(".pkg_filter_item").animate({height:"85px"});$(this).hide();$(".pkg_filter_item .slidesign").show();})},tabCon:function(){$(".J_SideClass li").click(function(){var index=$(this).index();$(this).addClass("cur").siblings().removeClass("cur");$(".J_SideClass .sel").eq(index).addClass("cur").siblings().removeClass("cur");})},wordpop:function(){trainticket.createBg();trainticket.initNoTtNoClose();},initNoTtNoClose:function(s){trainticket.createBg();var _str='<p class="des-pos ticketbtn yanzheng">正在验证是否可以预定</p>';var _str1='<p class="des-pos ticketbtn yuding">可预订,正前往订单填写页</p>';var _str2='<p class="des-pos ticketbtn wupiao">没有票了，看看其他车次吧</p>';s=s&&s.length>0?s:_str;trainticket.createNoTtNoCloseContent(s);trainticket.ticketPopBox();},createBg:function(){var tn_divmask=$(".tn-divmask");if(!tn_divmask.length){$("body").append('<div class="tn-divmask"></div>');}},createNoTtNoCloseContent:function(s){$(".popping-box").show();if($(".hasNone").length){$("#ticketstate .popping-box-content").append(s);}},ticketPopBox:function(wrap){wrap.find(".wopu").hover(function(){$(this).find(".popbox").show();},function(){$(this).find(".popbox").hide();})
wrap.find(".popbox .close").click(function(){$(this).parents(".popbox").hide();})}};function Pro(data,list){this.data=data;this.list=list;this.isRemovable=true;data._obj=this;this.init();}
Pro.prototype=new Event;_.extend(Pro.prototype,{init:function(){var self=this;var list=self.list;var data=self.data;var container=$(list.template(data));var selectBtn=$(".J_PkgItemSelectBtn",container);var sleeperLabels=container.find('.J_Sleeper');var dataService=getDataServer();var expandBtn=container.find(".J_PlaneExpand");var expandBtnArrow=expandBtn.find('span');var foldBtn=container.find('.J_FoldBtn');var uponFoldBtn=container.find(".J_UponFbtn");var uponFoldMoreBtn=container.find(".J_UponFMBtn");var searchMore=container.find(".J_search_more");var tkAddBtn=container.find(".tk_add_click");var searchMoreBtn=container.find('.J_SearchMoreBtn');var tkAddList=container.find('.T_AddList');var tkAddMoreList=container.find('.T_AddMoreList');var detailList=container.find('.J_DetailList');var tkAddNote=container.find('.J_tk_add');var tkAddNoteDetail=container.find('.J_tkAdd_note');var appBuy=$('.J_PkgInfoItem .pkg_info_item .APP_buy');function getSeatData(resid){var seats=data.prices;for(var i=0;i<seats.length;i++){if(seats[i].resId==resid){return seats[i];}}
return false;}
self.selectBtn=selectBtn;self.container=container;self.detailList=detailList;self.dataService=dataService;self.tkAddList=tkAddList;self.tkAddMoreList=tkAddMoreList;self.tkAddMoreFailed=0;self.tkAddFailed=0;expandBtn.click(function(){if(!self.detailLoaded){self.trigger('loadThrough');}
if(detailList.is(':hidden')){detailList.slideDown(function(){foldBtn.show();});expandBtnArrow.text('▲');}else{detailList.slideUp();foldBtn.hide();expandBtnArrow.text('▼');}});foldBtn.click(function(){detailList.slideUp();foldBtn.hide();expandBtnArrow.text('▼');});tkAddBtn.click(function(){if((self.tkAddLoaded)&&(self.tkAddFailed==0)){if(tkAddList.is(':hidden')){self.trigger('tkAddLoad');}else{if(!tkAddMoreList.is(':hidden')){uponFoldMoreBtn.hide();self.tkAddMoreList.slideUp();}
self.tkAddList.slideUp();searchMore.hide();}}else{self.trigger('tkAddLoad');}});uponFoldBtn.click(function(){tkAddList.slideUp();searchMore.hide();uponFoldBtn.hide();});tkAddNote.hover(function(){tkAddNoteDetail.show();},function(){tkAddNoteDetail.hide();});searchMoreBtn.click(function(){self.trigger('tkAddLoadMore');});uponFoldMoreBtn.click(function(){tkAddList.hide();searchMore.hide();tkAddMoreList.slideUp();uponFoldMoreBtn.hide();});var changeFlag=$("#J_Sort .asc,#J_Sort .desc").attr("changeFlag");container.hover(function(){container.addClass("hover");container.find(".change"+changeFlag).animate({"font-size":"120%"},"fast");},function(){container.removeClass("hover");container.find(".change"+changeFlag).animate({"font-size":"100%"},"fast");});appBuy.hover(function(){$(this).find('.APP_arrow').text('▲');$(this).find('.APP_buy_detail').css('display','block');},function(){$(this).find('.APP_arrow').text('▼');$(this).find('.APP_buy_detail').css('display','none');});if(sleeperLabels.length){sleeperLabels.each(function(){var label=$(this);var sleeperInfo=label.parent().find('.J_SleeperInfo');var tipDialog;if(sleeperInfo.length===0){return;}
$(this).hover(function(){var currentHours=new Date().getHours();if(7<=currentHours&&currentHours<23){sleeperInfo.find('.tk_slp_tip').text('卧铺上\\中\\下铺是随机分配的，页面卧铺票价仅供参考，请以实际占位价格为准。如必须购买下铺，请到车站或者代售点购票。');}
tipDialog=layer.tips(sleeperInfo.html(),label[0],{guide:0,isGuide:true,style:['padding-right:0']});},function(){layer.close(tipDialog);});})}
selectBtn.each(function(){var btn=$(this);var resid=btn.data('resid');var seatData=getSeatData(resid);btn.click(function(){if(seatData.leftNumber>0){if(seatData.leftNumber<30){var dialog=self.openSaveOrderDialog('<div class="orderbook_dialog_loading orderbook_loading mb_20"><div class="pkg_error_con"><h3 class="secondCountInfo">正在验证是否可预订, 请稍等...</h3></div></div>');self.getLeftTicket(btn,resid,seatData,dialog,function(tempData){var data=$.extend({},self.data);data.resId=resid;data.isExcess=0;if(tempData){data.leftNumber=tempData.leftTicket;}
var trainStartTime=self.list.info.get().TK.start+" "+self.data.departDepartTime+":00";var diffTime=Date.parse(new Date(trainStartTime.replace(/-/g,"/")))-Date.parse(new Date());if(diffTime>40*60*1000&&diffTime<2*60*60*1000){layer.close(dialog);var info_dialog=self.openSaveOrderDialog('<div class="orderbook_dialog_loading"><div class="msg"><b>温馨提示：</b>您选择的列车距开车时间很近了，请确保有足够的时间抵达车站，并办理换取纸质车票、安全检查、实名制验证及检票等手续，以免耽误您的旅行</div><div class="dialog_btn"><a class="btn_ok">确定</a></div></div>',true);$("#xubox_layer"+info_dialog).find(".btn_ok").click(function(){layer.close(info_dialog);self.trigger('add',data);});}else{self.trigger('add',data);}});}else{var data=$.extend({},self.data);data.resId=resid;data.leftNumber=seatData.leftNumber;data.isExcess=0;var trainStartTime=self.list.info.get().TK.start+" "+self.data.departDepartTime+":00";var diffTime=Date.parse(new Date(trainStartTime.replace(/-/g,"/")))-Date.parse(new Date());if(diffTime>40*60*1000&&diffTime<2*60*60*1000){var info_dialog=self.openSaveOrderDialog('<div class="orderbook_dialog_loading"><div class="msg"><b>温馨提示：</b>您选择的列车距开车时间很近了，请确保有足够的时间抵达车站，并办理换取纸质车票、安全检查、实名制验证及检票等手续，以免耽误您的旅行</div><div class="dialog_btn"><a class="btn_ok">确定</a></div></div>',true);$("#xubox_layer"+info_dialog).find(".btn_ok").click(function(){layer.close(info_dialog);self.trigger('add',data);});}else{self.trigger('add',data);}}}else{$.layer({type:1,title:'提示',btns:0,btn:[],area:['480px','280px']});}});});container.appendTo(list.container);},getLeftTicket:function(btn,resid,seatData,dialog,callback){var self=this;var infoData=self.list.info.get();var params={'trainNumber':self.data.trainNum,'startStationName':self.data.departStationName,'arriveStationName':self.data.destStationName,'startDate':infoData.TK.start,'seatTypes':[seatData.seat]}
$.get('/tn?r=train/trainTicket/getPricePlan',{"param":params},function(tempData){if(tempData.code==200){var tempData=tempData.data[0];var leftNumber=tempData.leftTicket;if(leftNumber>0){callback&&callback(tempData);}else{layer.close(dialog);var falid_dialog=self.openSaveOrderDialog('<div class="orderbook_dialog_loading orderbook_error_loading"><div class="pkg_error_con ml_-10"><h3><div class="msg">对不起，您所选的车次/坐席已无票，请选择其他车次/坐席</div></h3></div><div class="dialog_btn"><a class="btn_ok">确定</a></div></div>');$("#xubox_layer"+falid_dialog).find(".btn_ok").click(function(){layer.close(falid_dialog);});setTimeout(function(){layer.close(falid_dialog);},5000);btn.unbind('click');btn.addClass('btngrey').removeClass('btn');btn.parents('dl').addClass('tk_seat_disabled');btn.text('售完');if(seatData.seat=='3'||seatData.seat=='8'){btn.parents('dl').prev('dl').show();}}}else{callback&&callback();}},'json');},getLeftTicketUpon:function(btn,resid,seatData,dataLi,dialog,callback){var self=this;var infoData=self.list.info.get();var params={'trainNumber':dataLi.trainNum,'startStationName':dataLi.departStationName,'arriveStationName':dataLi.destStationName,'startDate':infoData.TK.start,'seatTypes':[seatData.seat]}
$.get('/tn?r=train/trainTicket/getPricePlan',{"param":params},function(tempData){if(tempData.code==200){var tempData=tempData.data[0];var leftNumber=tempData.leftTicket;if(leftNumber>0){callback&&callback(tempData);}else{layer.close(dialog);var falid_dialog=self.openSaveOrderDialog('<div class="orderbook_dialog_loading orderbook_error_loading"><div class="pkg_error_con ml_-10"><h3><div class="msg">对不起，您所选的车次/坐席已无票，请选择其他车次/坐席</div></h3></div><div class="dialog_btn"><a class="btn_ok">确定</a></div></div>');$("#xubox_layer"+falid_dialog).find(".btn_ok").click(function(){layer.close(falid_dialog);});setTimeout(function(){layer.close(falid_dialog);},5000);btn.unbind('click');btn.addClass('btngrey').removeClass('btn');btn.parents('dl').addClass('tk_seat_disabled');btn.text('售完');if(seatData.seat=='3'||seatData.seat=='8'){btn.parents('dl').prev('dl').show();}}}else{callback&&callback();}},'json');},getLeftTicketUponAfter:function(dataLi,resId,dialog,tempData){var self=this;var data=$.extend({},dataLi);data.resId=resId;data.isExcess=1;if(tempData){data.leftNumber=tempData.leftTicket;}
var trainStartTime=self.list.info.get().TK.start+" "+dataLi.departDepartTime+":00";var diffTime=Date.parse(new Date(trainStartTime.replace(/-/g,"/")))-Date.parse(new Date());if(diffTime>40*60*1000&&diffTime<2*60*60*1000){layer.close(dialog);var info_dialog=self.openSaveOrderDialog('<div class="orderbook_dialog_loading"><div class="msg"><b>温馨提示：</b>您选择的列车距开车时间很近了，请确保有足够的时间抵达车站，并办理换取纸质车票、安全检查、实名制验证及检票等手续，以免耽误您的旅行</div><div class="dialog_btn"><a class="btn_ok">确定</a></div></div>',true);$("#xubox_layer"+info_dialog).find(".btn_ok").click(function(){layer.close(info_dialog);self.trigger('add',data);});}else{self.trigger('add',data);}},getLeftTicketUponAfterElse:function(dataLi,resId,seatData){var self=this;var data=$.extend({},dataLi);data.resId=resId;data.leftNumber=seatData.leftNumber;data.isExcess=1;var trainStartTime=self.list.info.get().TK.start+" "+dataLi.departDepartTime+":00";var diffTime=Date.parse(new Date(trainStartTime.replace(/-/g,"/")))-Date.parse(new Date());if(diffTime>40*60*1000&&diffTime<2*60*60*1000){var info_dialog=self.openSaveOrderDialog('<div class="orderbook_dialog_loading"><div class="msg"><b>温馨提示：</b>您选择的列车距开车时间很近了，请确保有足够的时间抵达车站，并办理换取纸质车票、安全检查、实名制验证及检票等手续，以免耽误您的旅行</div><div class="dialog_btn"><a class="btn_ok">确定</a></div></div>',true);$("#xubox_layer"+info_dialog).find(".btn_ok").click(function(){layer.close(info_dialog);self.trigger('add',data);});}else{self.trigger('add',data);}},select:function(){this.selected=true;this.checkState();},unselect:function(){this.selected=false;this.checkState();},getThrough:function(sendData){var self=this;var dataService=self.dataService;self.detailLoaded=true;self.detailList.addClass('loading');dataService.getThrough(sendData,function(data){self.trigger('afterLoadThrough',data);});},loadThrough:function(data){var self=this;var html=self.list.throughTemplate(data);self.detailList.removeClass('loading');self.detailList.html(html);},getTkAddLoad:function(sendData){var self=this;var calNote='<div class="calNote">正在为您计算线路，请稍等...</div>';self.tkAddList.addClass('loadingUpon');self.tkAddList.html(calNote);self.tkAddList.show();var dataService=self.dataService;self.tkAddLoaded=true;dataService.getTkAddLoad(sendData,function(data){self.trigger('afterLoadTkAdd',data);})},tkAddLoad:function(data){var self=this;self.tkAddData=data;var trainInfo=self.data;var noTicketInfo;var inAreaNote='';var addHtml=self.list.tkAddTemplate(data);var html=noTicketInfo+inAreaNote+addHtml;self.tkAddList.removeClass('loadingUpon');self.tkAddList.html(html);var tkSelectBtn=$(".T_AddItemSelectBtn",self.container);var searchMore=$(".J_search_more",self.container);var uponFoldBtn=$(".J_UponFbtn",self.container);self.tkAddList.slideDown();searchMore.show();uponFoldBtn.show();tkSelectBtn.click(function(){var addData=self.tkAddData;var btn=$(this);var resId=$(this).attr('data-resid');var key=$(this).attr('data-key');var k=$(this).attr('data-k');var dataLi=addData.list[key];var seatData=addData.list[key].prices[k];console.log(seatData);if(seatData.leftNumber>0){if(seatData.leftNumber<30){var dialog=self.openSaveOrderDialog('');self.getLeftTicketUpon(btn,resId,seatData,dataLi,dialog,function(tempData){self.getLeftTicketUponAfter(dataLi,resId,dialog,tempData);});}else{self.getLeftTicketUponAfterElse(dataLi,resId,seatData);}}});},tkAddLoadFail:function(trainNum){var self=this;self.tkAddFailed=1;self.tkAddList.removeClass('loadingUpon');self.tkAddList.find('.calNote').hide();var falid_dialog=self.openSaveOrderDialog('');$("#xubox_layer"+falid_dialog).find(".btn_ok").click(function(){layer.close(falid_dialog);});setTimeout(function(){layer.close(falid_dialog);},5000);},getTkAddLoadMore:function(sendData){var self=this;var calNote='';self.tkAddMoreList.addClass('loadingUpon');self.tkAddMoreList.html(calNote);self.tkAddMoreList.show();var searchMore=$(".J_search_more",self.container);searchMore.hide();var dataService=self.dataService;dataService.getTkAddLoad(sendData,function(data){self.trigger('afterLoadTkAddMore',data);})},tkAddLoadMore:function(data){var self=this;self.tkAddDataMore=data;var outAreaNote='';var addHtml=self.list.tkAddTemplate(data);var html=outAreaNote+addHtml
self.tkAddMoreList.removeClass('loadingUpon');self.tkAddMoreList.html(html);var tkSelectBtn=$(".T_AddItemSelectBtn",self.container);var searchMore=$(".J_search_more",self.container);var uponFoldMoreBtn=$(".J_UponFMBtn",self.container);searchMore.hide();uponFoldMoreBtn.show();self.tkAddMoreList.slideDown();tkSelectBtn.click(function(){var addData=self.tkAddDataMore;var btn=$(this);var resId=$(this).attr('data-resid');var key=$(this).attr('data-key');var k=$(this).attr('data-k');var dataLi=addData.list[key];var seatData=addData.list[key].prices[k];console.log(seatData);if(seatData.leftNumber>0){if(seatData.leftNumber<30){var dialog=self.openSaveOrderDialog('');self.getLeftTicketUpon(btn,resId,seatData,dataLi,dialog,function(tempData){self.getLeftTicketUponAfter(dataLi,resId,dialog,tempData);});}else{self.getLeftTicketUponAfterElse(dataLi,resId,seatData);}}});},tkAddLoadFailMore:function(trainNum){var self=this;self.tkAddMoreFailed=1;self.tkAddMoreList.find('.calNote').hide();self.tkAddMoreList.removeClass('loadingUpon');var falid_dialog=self.openSaveOrderDialog('');$("#xubox_layer"+falid_dialog).find(".btn_ok").click(function(){layer.close(falid_dialog);});setTimeout(function(){layer.close(falid_dialog);},5000);var searchMore=$(".J_search_more",self.container);searchMore.show();},checkState:function(){if(!this.selected){this.state=1;}else{this.state=2;}
this.showState();},showState:function(){var selectBtn=this.selectBtn;var container=this.container;var state=this.state;switch(state){case 1:container.removeClass('selected');selectBtn.html('选择');break;case 2:container.addClass('selected');selectBtn.html('');break;case 3:container.addClass('selected');selectBtn.html('取消');break;}},remove:function(){this.list=null;this.data=null;},get:function(){return this.data;},removable:function(){this.isRemovable=true;},unremovable:function(){this.isRemovable=false;},calcDeltaPrice:function(price){var deltaPrice=parseFloat(this.data['pkg_price'])-parseFloat(price);var res='<i>';if(deltaPrice<0){res+='-';}else if(deltaPrice>=0){res+='+';}
res+='￥</i>'+Math.ceil(Math.abs(deltaPrice));$('.pkg_item_price',this.container).find('span').html(res);},openSaveOrderDialog:function(msg,isShow,callback){var closeOption;if(isShow){closeOption=[0,true];}else{closeOption=false;}
callback=callback||function(){};return $.layer({type:1,guide:2,title:false,closeBtn:closeOption,btns:0,close:callback,area:['470px','auto'],border:[6,1,'#c4c4c5'],page:{html:msg}});}});