(function () {
  'use strict';
  var App = window.App;
  var S = window.YPDC.state;
  var A = window.YPDC.actions;
  var $ = App.$, $$ = App.$$, esc = App.esc, img = App.img,
      I = App.Icons, fmtDate = App.fmtDate, initials = App.initials,
      money = App.money, slugTitle = App.slugTitle, roleTitle = App.roleTitle;

  function logoBlock() { return App.logoBlock.apply(null, arguments); }
  function authTab() { return window.__authTab === 'signup' ? 'signup' : 'signin'; }

  function authTabs(tab) {
    return '<div class="chip-row mt-16" style="justify-content:flex-start">' +
      '<button type="button" class="chip' + (tab === 'signin' ? ' active' : '') + '" data-action="auth-tab" data-tab="signin">Sign in</button>' +
      '<button type="button" class="chip' + (tab === 'signup' ? ' active' : '') + '" data-action="auth-tab" data-tab="signup">Create account</button>' +
      '</div>';
  }

  function signInCard(role, live) {
    return '<span class="eyebrow">Authentication</span><h2 class="mt-10">Sign in</h2>' +
      '<p class="mut mt-10">Use your YPDC account to continue.</p>' +
      authTabs('signin') +
      '<form class="mt-22" data-form="login">' +
      '<label class="field"><span>Email address</span><input name="email" type="email" value="" placeholder="your.name@uon.edu.pk" autocomplete="username" required></label>' +
      '<label class="field"><span>Password</span><input name="password" type="password" value="" placeholder="••••••••" autocomplete="current-password" required></label>' +
      '<div class="flex-between" style="align-items:center;margin:-6px 0 14px"><span class="mut" style="font-size:.82rem">8+ characters · letters and a number</span>' +
      '<a style="font-size:.84rem;color:var(--green-800);font-weight:600" href="#/forgot">Forgot password?</a></div>' +
      '<input type="hidden" name="role" value="' + esc(role) + '">' +
      '<button class="btn btn-green btn-block" type="submit">Sign in to workspace ' + I.arrow + '</button>' +
      '</form>';
  }

  function signUpCard(role, live) {
    var ids = (window.YPDC.state.portals || []).map(function (p) { return p.id; })
      .filter(function (id) { return ['admin', 'guest', 'directorate'].indexOf(id) === -1; });
    if (!ids.length) ids = ['student', 'member', 'directorate', 'faculty', 'alumni'];
    return '<span class="eyebrow">New account</span><h2 class="mt-10">Create your account</h2>' +
      '<p class="mut mt-10">Fill this in and your own workspace opens right away — no waiting for approval.</p>' +
      authTabs('signup') +
      '<form class="mt-22" data-form="signup">' +
      '<label class="field"><span>Full name</span><input name="name" type="text" placeholder="e.g. Ayesha Khan" autocomplete="name" required></label>' +
      '<label class="field"><span>Email address</span><input name="email" type="email" placeholder="your.name@uon.edu.pk" autocomplete="email" required></label>' +
      '<label class="field"><span>Role</span><select name="role">' + ids.map(function (id) {
        return '<option value="' + esc(id) + '"' + (id === role ? ' selected' : '') + '>' + esc(App.roleTitle(id)) + '</option>';
      }).join('') + '</select></label>' +
      '<div class="grid g2" style="gap:12px">' +
      '<label class="field"><span>Program (optional)</span><input name="program" type="text" placeholder="e.g. BS Computer Science"></label>' +
      '<label class="field"><span>Directorate (optional)</span><input name="directorate" type="text" placeholder="e.g. Peace &amp; Civic Engagement"></label>' +
      '</div>' +
      '<label class="field"><span>Password</span><input name="password" type="password" placeholder="8+ characters, letters and a number" autocomplete="new-password" required></label>' +
      '<label class="field"><span>Confirm password</span><input name="confirm" type="password" placeholder="Type the same password again" autocomplete="new-password" required></label>' +
      '<button class="btn btn-gold btn-block" type="submit">Create my account ' + I.arrow + '</button>' +
      '</form>' +
      (live
        ? '<div class="panel-note mt-22">The account is created in the real database and you are signed in at once. The admin can see every sign-up in <b>Admin → People Directory</b> and in the activity log.</div>'
        : '<div class="panel-note mt-22"><b>Server is not running:</b> accounts need the backend. Open the <b>backend/server</b> folder and run <b>npm start</b> (see START-HERE.txt).</div>');
  }

  function loginPage(roleFromQuery) {
    var api = window.YPDC.api;
    var live = !!(api && api.available);
    var role = roleFromQuery || 'student';
    var tab = authTab();
    return '<div class="auth-wrap">' +
      '<div class="auth-left">' + logoBlock() +
      '<div style="margin-top:auto"><span class="eyebrow">Authentication</span>' +
      '<h1 class="mt-16">Your YPDC journey <span class="accent">continues here.</span></h1>' +
      '<p class="lead mt-16" style="color:#C6D8D1">One secure entry point for Volunteer, General Member, Faculty and Alumni workspaces.</p>' +
      '<div class="grid mt-32" style="gap:12px">' +
      '<div class="auth-feature">Role-aware navigation</div>' +
      '<div class="auth-feature">Events, tasks &amp; attendance</div>' +
      '<div class="auth-feature">Certificates, reports &amp; approvals</div>' +
      '</div></div>' +
      '<div class="mut mt-32" style="font-size:.8rem;color:#B9CFC7">' +
        (live ? 'Secure sign-in · bcrypt password + httpOnly session cookie'
              : 'This is the single-file version — no server connection.') + '</div>' +
      '</div>' +
      '<div class="auth-right"><div class="auth-card center-x">' +
      (tab === 'signup' ? signUpCard(role, live) : signInCard(role, live)) +
      (tab === 'signup' ? '' : (live
        ? '<div class="panel-note mt-22">Enter your <b>email and password</b> — the portal for your role opens. No account yet? <a href="#" data-action="auth-tab" data-tab="signup">Create your account</a>.</div>'
        : '<div class="panel-note mt-22"><b>Server is not running:</b> this is the single-file version (public website only). ' +
          'For portals, login and the real database, start the backend — open the <b>backend/server</b> folder and run <b>npm start</b>' +
          ' (or open <b>START-HERE.txt</b> for the steps).')) +
      '<div class="flex mt-22" style="gap:14px"><a class="mut" style="font-size:.84rem" href="#/">← Back to website</a>' +
      '<a class="mut" style="font-size:.84rem" href="#/feedback">Feedback</a>' +
      '<a class="mut" style="font-size:.84rem" href="#/induction">New here? Apply</a>' +
      '<a class="mut" style="font-size:.84rem" href="#/portal/guest/dashboard">Public workspace</a></div>' +
      '</div></div></div>';
  }

  function authShell(card) {
    return '<div class="auth-wrap">' +
      '<div class="auth-left">' + logoBlock() +
      '<div style="margin-top:auto"><span class="eyebrow">Account access</span>' +
      '<h1 class="mt-16">Get back into your <span class="accent">YPDC workspace.</span></h1>' +
      '<p class="lead mt-16" style="color:#C6D8D1">Reset links are single-use, expire on their own, and every request is recorded on the server.</p></div>' +
      '</div>' +
      '<div class="auth-right"><div class="auth-card center-x">' + card +
      '<div class="flex mt-22" style="gap:14px"><a class="mut" style="font-size:.84rem" href="#/login">← Back to sign in</a>' +
      '<a class="mut" style="font-size:.84rem" href="#/">Back to website</a></div>' +
      '</div></div></div>';
  }

  function forgotPage() {
    var card = '<span class="eyebrow">Password reset</span><h2 class="mt-10">Forgot your password?</h2>' +
      '<p class="mut mt-10">Enter the email address of your YPDC account. If it is registered, a reset link is sent to that inbox.</p>' +
      '<form class="mt-22" data-form="forgot">' +
      '<label class="field"><span>Email address</span><input name="email" type="email" placeholder="your.name@uon.edu.pk" autocomplete="username" required></label>' +
      '<button class="btn btn-green btn-block" type="submit">Send reset link ' + I.arrow + '</button>' +
      '</form>' +
      '<div class="panel-note mt-22">For your safety the reply is the same whether or not the email is registered — nobody can use this page to check who has an account.</div>';
    return authShell(card);
  }

  function resetPage(token) {
    if (!token) {
      return authShell('<span class="eyebrow">Password reset</span><h2 class="mt-10">Link missing</h2>' +
        '<p class="mut mt-10">This page needs a reset link. Open the link from your email, or request a new one.</p>' +
        '<a class="btn btn-green btn-block mt-22" href="#/forgot">Request a new link</a>');
    }
    var card = '<span class="eyebrow">Password reset</span><h2 class="mt-10">Set a new password</h2>' +
      '<p class="mut mt-10">Pick a password you have not used here before. When you save it, every old session is signed out automatically.</p>' +
      '<form class="mt-22" data-form="reset">' +
      '<input type="hidden" name="token" value="' + esc(token) + '">' +
      '<label class="field"><span>New password</span><input name="password" type="password" placeholder="8+ characters, letters and a number" autocomplete="new-password" required></label>' +
      '<label class="field"><span>Confirm new password</span><input name="confirm" type="password" placeholder="Type the same password again" autocomplete="new-password" required></label>' +
      '<button class="btn btn-green btn-block" type="submit">Save new password ' + I.arrow + '</button>' +
      '</form>' +
      '<div class="panel-note mt-22">The link can be used once and expires automatically. After saving, sign in with the new password.</div>';
    return authShell(card);
  }

  App.loginPage = loginPage;
  App.forgotPage = forgotPage;
  App.resetPage = resetPage;
})();
