(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;

  function toast() { return App.toast.apply(null, arguments); }
  function render() { return App.render.apply(null, arguments); }

  function feedbackForm(title, role) {
    return '<div class="card" style="border-color:var(--gold-strong);background:var(--cream-2)">' +
      '<div class="grid g32" style="align-items:center">' +
      '<div><span class="eyebrow">Feedback / Comments</span><h3 class="mt-10">' + esc(title) + '</h3>' +
      '<p class="mut mt-10" style="font-size:.9rem">Your feedback goes to the YPDC admin dashboard where it can be reviewed and answered.</p></div>' +
      '<form data-form="feedback">' +
      '<div class="form-grid">' +
      '<label class="field"><span>Your name</span><input name="name" required placeholder="Full name"></label>' +
      '<label class="field"><span>Email (optional)</span><input name="email" type="email" placeholder="name@uon.edu.pk"></label>' +
      '<label class="field full"><span>Feedback</span><textarea name="text" required placeholder="Write your feedback..."></textarea></label>' +
      '<label class="field"><span>Rating</span><select name="rating"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Needs work</option><option value="1">1 — Poor</option></select></label>' +
      '<div class="field" style="display:flex;align-items:flex-end"><button class="btn btn-green btn-block" type="submit">Send Feedback</button></div>' +
      '</div></form></div>' +
      '<div class="grid g3 mt-22">' + S.feedback.slice(0, 3).map(function (f) {
        return '<div class="card card-tight"><div class="flex-between"><b style="font-size:.92rem">' + esc(f.name) + '</b><span class="badge badge-line">' + f.rating + '/5</span></div>' +
          '<p class="mut mt-10" style="font-size:.86rem">"' + esc(f.text) + '"</p>' +
          '<div class="mut mt-10" style="font-size:.74rem">' + esc(f.role) + ' · ' + fmtDate(f.date) + '</div></div>';
      }).join('') + '</div></div>';
  }

  App.feedbackForm = feedbackForm;
})();
