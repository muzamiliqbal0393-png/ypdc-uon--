(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;
  function eventCard(e) {
    var reg = Number(e.registered) || 0;
    var cap = Number(e.capacity) || 0;
    var pct = cap ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
    return '<article class="card card-flat lift" style="padding:0;overflow:hidden;display:flex;flex-direction:column">' +
      '<div class="media-frame" style="border-radius:0;box-shadow:none;aspect-ratio:16/9"><img src="' + img(e.image) + '" alt="' + esc(e.title) + '"></div>' +
      '<div style="padding:20px 22px;display:flex;flex-direction:column;gap:10px;flex:1">' +
      '<div class="flex-between"><span class="badge badge-info">' + esc(e.category || 'General') + '</span>' +
      '<span class="badge ' + (e.status === 'Upcoming' ? 'badge-ok' : 'badge-line') + '">' + esc(e.status || 'Scheduled') + '</span></div>' +
      '<h4 style="font-size:1.12rem">' + esc(e.title) + '</h4>' +
      '<div class="mut" style="font-size:.85rem">' + I.cal + ' ' + fmtDate(e.date) + ' · ' + esc(e.time) + '</div>' +
      '<div class="mut" style="font-size:.85rem">' + I.pin + ' ' + esc(e.location) + '</div>' +
      '<div class="bar mt-6"><span style="width:' + pct + '%"></span></div>' +
      '<div class="mut" style="font-size:.78rem">' + reg + ' registered · ' + (cap ? (cap - reg) + ' seats left' : 'open entry') + '</div>' +
      '<div class="btn-row mt-10"><a class="btn btn-green btn-sm" href="#/event/' + e.id + '">Event details</a>' +
      '<button class="btn btn-outline btn-sm" data-action="register-event" data-id="' + e.id + '">Register</button></div>' +
      '</div></article>';
  }

  App.eventCard = eventCard;
})();
