import { accountRequest, changeAccount, enterAsGuest, session, signIn } from "../game/session.js";

export function showWelcome(content, enter, notice) {
  content.innerHTML = `<section class="panel account-gate">
    <img class="welcome-logo" src="assets/favicon.svg" width="104" height="104" alt="">
    <h1>Exalted Chess</h1>
    <div class="welcome-actions"><button type="button" data-mode="signup" class="primary">Sign Up</button><button type="button" data-mode="login">Log In</button></div>
    <p role="status"></p><form hidden></form><button type="button" data-guest>Continue as guest</button></section>`;
  const form = content.querySelector("form");
  const status = content.querySelector('[role="status"]');
  status.textContent = notice;
  const guest = content.querySelector("[data-guest]");
  guest.onclick = async () => {
    for (const control of content.querySelectorAll("button")) control.disabled = true;
    await enterAsGuest();
    enter();
  };
  accountRequest("/account-status").then(({ accountsEnabled }) => {
    if (!accountsEnabled && !status.textContent) {
      status.textContent = "Sign Up is unavailable until the server can save accounts permanently. You can still play as a guest.";
    }
  }).catch(() => {});
  for (const button of content.querySelectorAll("[data-mode]")) button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    const signup = mode === "signup";
    status.textContent = "";
    form.hidden = false;
    form.innerHTML = `<label>Username <input type="text" name="username" autocomplete="username" maxlength="24" required></label>
      <label>Password <input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}"${signup ? ' aria-describedby="signup-password-reminder"' : ""} required>${signup ? '<small id="signup-password-reminder">Please write down your password</small>' : ""}</label>
      ${signup ? '<small>Use 3–24 letters, numbers or underscores and a password of at least 10 characters.</small>' : ""}
      <button class="primary" type="submit">${button.textContent}</button>`;
    form.elements.username.focus();
    form.onsubmit = async event => {
      event.preventDefault();
      const inputs = Object.fromEntries(new FormData(form));
      for (const control of content.querySelectorAll("button")) control.disabled = true;
      status.textContent = signup ? "Creating your account…" : "Signing in…";
      try { await signIn(mode, inputs); enter(); }
      catch (error) {
        status.textContent = error.message;
        for (const control of content.querySelectorAll("button")) control.disabled = false;
      }
    };
  });
}

export function addAccountControls(panel) {
  if (!session.account) return;
  const section = document.createElement("section");
  section.className = "account-controls";
  section.innerHTML = `<div class="account-heading"><span class="player-avatar" aria-hidden="true"><img src="assets/favicon.svg" alt=""></span><h1></h1>
    <button type="button" data-edit="username" aria-label="Edit username">✎</button></div>
    <button type="button" data-edit="password">Change password</button>
    <form hidden></form><p role="status"></p>`;
  section.querySelector("h1").textContent = session.account.username;
  panel.querySelector("h1")?.replaceWith(section);
  const form = section.querySelector("form");
  const status = section.querySelector('[role="status"]');
  for (const button of section.querySelectorAll("[data-edit]")) button.onclick = () => {
    const kind = button.dataset.edit;
    form.hidden = false;
    status.textContent = "";
    form.innerHTML = kind === "username"
      ? '<label>New username <input type="text" name="username" autocomplete="username" maxlength="24" required></label>'
      : '<label>Current password <input type="password" name="current" autocomplete="current-password" required></label><label>New password <input type="password" name="password" autocomplete="new-password" minlength="10" required></label>';
    form.insertAdjacentHTML("beforeend", '<div class="action-row"><button class="primary" type="submit">Save</button><button type="button" data-cancel>Cancel</button></div>');
    if (kind === "username") form.elements.username.value = session.account.username;
    form.querySelector("input").focus();
    form.querySelector("[data-cancel]").onclick = () => { form.reset(); form.hidden = true; button.focus(); };
    form.onsubmit = async event => {
      event.preventDefault();
      const save = form.querySelector('[type="submit"]');
      save.disabled = true;
      try {
        await changeAccount({ kind, ...Object.fromEntries(new FormData(form)) });
        section.querySelector("h1").textContent = session.account.username;
        form.reset();
        form.hidden = true;
        status.textContent = kind === "username" ? "Username updated." : "Password updated.";
        button.focus();
      } catch (error) { status.textContent = error.message; }
      finally { save.disabled = false; }
    };
  };
}
