var escapeHTML = function(string) {
    if (string == null) string = ''
    // Lifted from mustache.js
    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    return string.replace(/[&<>"'\/]/g, function(s) {
        return entityMap[s];
    });
};

var template = {
    github: document.getElementById("github-template"),
};
var fill = function(data) {
    var html = template[data.type].innerHTML.replace(
        /\{(.+?)\}/g,
        function(match, varname){
            return escapeHTML(data[varname]);
        }
    );

    var holder = document.createElement("div");
    holder.innerHTML = html;
    holder = holder.children[0];

    return holder;
};

var emitted  = {};
var evstream = document.getElementById("events");
var emit     = function(events) {
    events.reverse();
    events.forEach(function(_){
        if (emitted[_.id]) return;
        evstream.insertBefore(fill(_), evstream.children[0]);
        emitted[_.id] = true;
    });
};

var qs = function(params) {
    return Object.keys(params).map(function(_){
        return [_, params[_]].map(function(c){
            return encodeURIComponent(c);
        }).join('=');
    }).join('&');
};

var request = function(url) {
    var script  = document.createElement("script");
    script.type = "text/javascript";
    script.src  = url;
    document.head.appendChild(script);
    document.head.removeChild(script);
};

var update_github = function() {
    var url = 'https://api.github.com/search/repositories?' + qs({
        q:          "language:perl",
        sort:       "updated",
        order:      "desc",
        per_page:   20,
        callback:   "show_github",
    });
    request(url);
};

var poll = function(fn, interval) {
    fn();
    return setInterval(fn, interval * 1000);
    // XXX TODO: doesn't handle delays stacking up outstanding requests
};

var pretty_date = function(date) {
    var now = new Date();
    var diff = ((now.getTime() - date.getTime()) / 1000);
    var day_diff = Math.floor(diff / 86400);
    if (isNaN(day_diff) || day_diff < 0 || day_diff > 300)
        return;
    return day_diff == 0 && (
               diff <  60   && "just now"
            || diff < 120   && "1 minute ago"
            || diff < 3600  && Math.floor(diff / 60) + " minutes ago"
            || diff < 7200  && "1 hour ago"
            || diff < 86400 && Math.floor(diff / 3600) + " hours ago")
        || day_diff == 1  && "yesterday"
        || day_diff < 13  && day_diff + " days ago"
        || day_diff < 45  && Math.ceil(day_diff / 7) + " weeks ago"
        || day_diff < 300 && Math.ceil(day_diff / 30) + " months ago";
};

var show_github = function(response) {
    var repos = (response && response.data && response.data.items) || [];
    if (!repos.length) return;
    emit(
        repos.map(function(repo) {
            var data = {
                type:           'github',
                id:             ['github', repo.id, repo.pushed_at.replace(/[^0-9TZ]/g, '')].join("-"),
                source:         repo.full_name,
                description:    repo.description,
                link:           repo.html_url,
                pushed_at:      repo.pushed_at,
                pushed_ago:     pretty_date(new Date(repo.pushed_at)),
                owner_name:     repo.owner.login,
                owner_avatar:   repo.owner.avatar_url
            };
            if (!data.description) data.description = repo.full_name
            return data;
        })
    );
};

var update_timestamps = function() {
    var spans = events.getElementsByClassName("timestamp");
    Array.apply(null, spans).forEach(function(_) {
        if (_.timestamp == null)
            _.timestamp = new Date(_.getAttribute("data-timestamp"))
        _.textContent = pretty_date(_.timestamp);
    });
};

poll(update_github, 6);
poll(update_timestamps, 22);
