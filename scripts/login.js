/* ── Clerk instance (cached) ── */
let _clerkPromise = null;
async function getClerk() {
  if (!_clerkPromise) {
    _clerkPromise = (async () => {
      const { Clerk } = await import('@clerk/clerk-js');
      const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
      if (!key) return null;
      const clerk = new Clerk(key);
      await clerk.load();
      return clerk;
    })();
  }
  return _clerkPromise;
}

function getClerkErrorMessage(err) {
  const code = err.errors?.[0]?.code;
  if (code === 'form_identifier_not_found' || code === 'form_password_incorrect') {
    return 'Wrong email or password. Try again.';
  }
  if (code === 'form_not_verified') {
    return 'Please confirm your email first. Check your inbox.';
  }
  return err.errors?.[0]?.longMessage || err.message || 'Something went wrong. Please try again.';
}

// If arriving from a sign-out, clear any stale session first
(async () => {
  if (window.location.search.includes('logout') || window.location.hash.includes('logout')) {
    const clerk = await getClerk();
    if (clerk) await clerk.signOut();
  }
})();

const formEl = document.getElementById('login-form');
const emailEl = document.getElementById('login-email');
const passwordEl = document.getElementById('login-password');
const submitBtn = document.getElementById('login-submit');
const errorEl = document.getElementById('login-error');
const cardEl = document.getElementById('login-card');
const successEl = document.getElementById('login-success');
const forgotHint = document.getElementById('login-forgot-hint');
const forgotHintBtn = document.getElementById('login-forgot-hint-btn');

formEl?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const clerk = await getClerk();
    if (!clerk) throw new Error('Clerk not configured. Add VITE_CLERK_PUBLISHABLE_KEY to .env');

    const signInAttempt = await clerk.client.signIn.create({
      identifier: email,
      password: password,
    });

    if (signInAttempt.status === 'needs_second_factor') {
      _pendingSignIn = signInAttempt;
      const factors = signInAttempt.supportedSecondFactors || [];
      const strategy = factors[0]?.strategy || 'totp';

      if (strategy === 'totp') {
        if (mfaDesc) mfaDesc.textContent = 'Enter the 6-digit code from your authenticator app.';
      } else if (strategy === 'phone_code') {
        if (mfaDesc) mfaDesc.textContent = 'Enter the code sent to your phone number.';
        await signInAttempt.prepareSecondFactor({ strategy: 'phone_code', phoneNumberId: factors[0].phoneNumberId });
      } else if (strategy === 'email_code') {
        if (mfaDesc) mfaDesc.textContent = 'Enter the code sent to your email.';
        await signInAttempt.prepareSecondFactor({ strategy: 'email_code', emailAddressId: factors[0].emailAddressId });
      } else {
        if (mfaDesc) mfaDesc.textContent = 'Enter the verification code to complete sign in.';
      }

      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      showPanel(mfaCard);
      mfaCodeEl?.focus();
      return;
    }

    if (signInAttempt.status !== 'complete') {
      throw new Error(`Sign-in requires additional steps (${signInAttempt.status}). Please contact support.`);
    }

    // Success — show spinner then redirect to app
    const clerk = await getClerk();
    await clerk.setActive({ session: signInAttempt.createdSessionId });
    cardEl.hidden = true;
    successEl.hidden = false;
    setTimeout(() => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      window.location.href = isLocalhost ? 'http://localhost:5174/#/explore' : '/app/#/explore';
    }, 800);

  } catch (err) {
    const msg = getClerkErrorMessage(err);
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    if (msg.includes('Wrong email or password') || msg.includes('password')) {
      if (forgotHint) forgotHint.style.display = 'block';
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});

// ── Password visibility toggle ────────────────────────────────────────
const passwordToggle = document.getElementById('login-password-toggle');
const passwordEye = document.getElementById('login-password-eye');
passwordToggle?.addEventListener('click', () => {
  const isPassword = passwordEl.type === 'password';
  passwordEl.type = isPassword ? 'text' : 'password';
  passwordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  passwordEye.innerHTML = isPassword
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

// ── Forgot password — inline reset flow ──────────────────────────────
const resetStep1Card   = document.getElementById('reset-step1-card');
const resetStep2Card   = document.getElementById('reset-step2-card');
const resetEmailForm   = document.getElementById('reset-email-form');
const resetEmailEl     = document.getElementById('reset-email');
const resetEmailSubmit = document.getElementById('reset-email-submit');
const resetEmailError  = document.getElementById('reset-email-error');
const resetCodeForm    = document.getElementById('reset-code-form');
const resetCodeEl      = document.getElementById('reset-code');
const resetNewPwEl     = document.getElementById('reset-new-password');
const resetConfirmPwEl = document.getElementById('reset-confirm-password');
const resetCodeSubmit  = document.getElementById('reset-code-submit');
const resetCodeError   = document.getElementById('reset-code-error');
const resetStep2Desc   = document.getElementById('reset-step2-desc');

let _resetSignIn = null;
let _resetEmail  = '';

const mfaCard   = document.getElementById('mfa-card');
const mfaForm   = document.getElementById('mfa-form');
const mfaCodeEl = document.getElementById('mfa-code');
const mfaSubmit = document.getElementById('mfa-submit');
const mfaError  = document.getElementById('mfa-error');
const mfaDesc   = document.getElementById('mfa-desc');
let _pendingSignIn = null;

function showPanel(panel) {
  [cardEl, mfaCard, resetStep1Card, resetStep2Card].forEach(el => { if (el) el.hidden = true; });
  if (panel) panel.hidden = false;
}

function handleForgotPassword() {
  const prefill = emailEl?.value.trim();
  if (prefill && resetEmailEl) resetEmailEl.value = prefill;
  showPanel(resetStep1Card);
  resetEmailEl?.focus();
}

document.getElementById('login-forgot')?.addEventListener('click', handleForgotPassword);
forgotHintBtn?.addEventListener('click', handleForgotPassword);
document.getElementById('reset-back-to-login')?.addEventListener('click', () => showPanel(cardEl));
document.getElementById('reset-step2-back')?.addEventListener('click', () => showPanel(resetStep1Card));

resetEmailForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = resetEmailEl.value.trim();
  if (!email) return;
  resetEmailError.style.display = 'none';
  resetEmailSubmit.disabled = true;
  resetEmailSubmit.textContent = 'Sending…';
  try {
    const clerk = await getClerk();
    _resetSignIn = await clerk.client.signIn.create({
      strategy: 'reset_password_email_code',
      identifier: email,
    });
    _resetEmail = email;
    if (resetStep2Desc) resetStep2Desc.textContent = `We sent a code to ${email}. Enter it below and choose a new password.`;
    showPanel(resetStep2Card);
    resetCodeEl?.focus();
  } catch (err) {
    resetEmailError.textContent = getClerkErrorMessage(err);
    resetEmailError.style.display = 'block';
  } finally {
    resetEmailSubmit.disabled = false;
    resetEmailSubmit.textContent = 'Send code';
  }
});

document.getElementById('reset-resend')?.addEventListener('click', async function() {
  if (!_resetEmail) { showPanel(resetStep1Card); return; }
  this.textContent = 'Sending…';
  this.disabled = true;
  try {
    const clerk = await getClerk();
    _resetSignIn = await clerk.client.signIn.create({
      strategy: 'reset_password_email_code',
      identifier: _resetEmail,
    });
    this.textContent = 'Code resent ✓';
    setTimeout(() => { this.textContent = 'Resend code'; this.disabled = false; }, 3000);
  } catch {
    this.textContent = 'Failed — try again';
    setTimeout(() => { this.textContent = 'Resend code'; this.disabled = false; }, 3000);
  }
});

resetCodeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code        = resetCodeEl.value.trim();
  const newPassword = resetNewPwEl.value;
  const confirm     = resetConfirmPwEl.value;
  resetCodeError.style.display = 'none';

  if (newPassword !== confirm) {
    resetCodeError.textContent = 'Passwords do not match.';
    resetCodeError.style.display = 'block';
    return;
  }
  if (newPassword.length < 8) {
    resetCodeError.textContent = 'Password must be at least 8 characters.';
    resetCodeError.style.display = 'block';
    return;
  }

  resetCodeSubmit.disabled = true;
  resetCodeSubmit.textContent = 'Resetting…';

  try {
    let result = await _resetSignIn.attemptFirstFactor({
      strategy: 'reset_password_email_code',
      code,
    });

    if (result.status === 'needs_new_password') {
      result = await _resetSignIn.resetPassword({ password: newPassword, signOutOfOtherSessions: false });
    }

    if (result.status === 'complete') {
      const clerk = await getClerk();
      await clerk.setActive({ session: result.createdSessionId });
      showPanel(null);
      successEl.hidden = false;
      setTimeout(() => {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        window.location.href = isLocalhost ? 'http://localhost:5174/#/explore' : '/app/#/explore';
      }, 800);
    } else {
      throw new Error(`Unexpected status: ${result.status}`);
    }
  } catch (err) {
    resetCodeError.textContent = getClerkErrorMessage(err);
    resetCodeError.style.display = 'block';
    resetCodeSubmit.disabled = false;
    resetCodeSubmit.textContent = 'Reset Password';
  }
});

// Password visibility toggle for reset form
const resetPasswordToggle = document.getElementById('reset-password-toggle');
const resetPasswordEye    = document.getElementById('reset-password-eye');
resetPasswordToggle?.addEventListener('click', () => {
  const isPassword = resetNewPwEl.type === 'password';
  resetNewPwEl.type = isPassword ? 'text' : 'password';
  resetPasswordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  resetPasswordEye.innerHTML = isPassword
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

// ── MFA second factor ─────────────────────────────────────────────────
document.getElementById('mfa-back')?.addEventListener('click', () => showPanel(cardEl));

mfaForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = mfaCodeEl.value.trim();
  mfaError.style.display = 'none';
  mfaSubmit.disabled = true;
  mfaSubmit.textContent = 'Verifying…';

  try {
    const factors = _pendingSignIn?.supportedSecondFactors || [];
    const strategy = factors[0]?.strategy || 'totp';

    const result = await _pendingSignIn.attemptSecondFactor({ strategy, code });

    if (result.status === 'complete') {
      const clerk = await getClerk();
      await clerk.setActive({ session: result.createdSessionId });
      showPanel(null);
      successEl.hidden = false;
      setTimeout(() => {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        window.location.href = isLocalhost ? 'http://localhost:5174/#/explore' : '/app/#/explore';
      }, 800);
    } else {
      throw new Error(`Unexpected status: ${result.status}`);
    }
  } catch (err) {
    mfaError.textContent = getClerkErrorMessage(err);
    mfaError.style.display = 'block';
    mfaSubmit.disabled = false;
    mfaSubmit.textContent = 'Verify';
  }
});

// ── Google sign-in ────────────────────────────────────────────────────
const googleBtn = document.getElementById('login-google');
googleBtn?.addEventListener('click', async () => {
  googleBtn.disabled = true;
  googleBtn.textContent = 'Redirecting to Google…';
  try {
    const clerk = await getClerk();
    if (!clerk) throw new Error('Clerk not configured');
    const origin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5173'
      : 'https://collabnb.com';
    // Clerk v5: create the sign-in, then manually follow the redirect URL
    const signInAttempt = await clerk.client.signIn.create({
      strategy: 'oauth_google',
      redirectUrl: `${origin}/sso-callback.html`,
      actionCompleteRedirectUrl: `${origin}/app/#/explore`,
    });
    const redirectTarget = signInAttempt.firstFactorVerification?.externalVerificationRedirectURL;
    if (redirectTarget) {
      window.location.href = redirectTarget.toString();
    } else {
      throw new Error('No redirect URL returned from Google sign-in. Check Clerk Dashboard → Social Connections → Google is enabled.');
    }
  } catch (err) {
    console.error('Google sign-in error:', err);
    const msg = getClerkErrorMessage(err);
    errorEl.textContent = msg.startsWith('Something went wrong') ? 'Google sign-in failed — ' + (err.message || msg) : msg;
    errorEl.style.display = 'block';
    googleBtn.disabled = false;
    googleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.8 0 7 5.4 3.2 13.3l7.8 6C12.9 13.2 18 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.7 37.2 46.5 31.3 46.5 24.5z"/><path fill="#FBBC05" d="M11 28.3c-.7-2-1-4-1-6.3s.4-4.4 1-6.3l-7.8-6C1.2 13.3 0 18.5 0 24s1.2 10.7 3.2 14.3l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.3-7.7 2.3-6 0-11.1-3.7-12.9-9l-7.8 6C7 42.6 14.8 48 24 48z"/></svg> Continue with Google`;
  }
});
(async () => {
  const clerk = await getClerk();
  if (clerk?.user) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.location.href = isLocalhost ? 'http://localhost:5174/#/explore' : '/app/#/explore';
  }
})();
