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

    if (signInAttempt.status !== 'complete') {
      throw new Error(`Additional authentication required (status: ${signInAttempt.status}). Check your email for a verification code or visit the Clerk dashboard to confirm the user.`);
    }

    // Success — show spinner then redirect to profile
    cardEl.hidden = true;
    successEl.hidden = false;
    setTimeout(() => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      window.location.href = isLocalhost ? 'http://localhost:5174/#/profile' : '/profile.html';
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

// ── Forgot password — redirect to Clerk hosted reset page ────────────
function handleForgotPassword() {
  const origin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5173'
    : 'https://www.collabnb.com';
  window.location.href = `https://accounts.collabnb.com/sign-in#/forgot-password?redirect_url=${encodeURIComponent(origin + '/profile.html')}`;
}

const forgotBtn = document.getElementById('login-forgot');
forgotBtn?.addEventListener('click', handleForgotPassword);
forgotHintBtn?.addEventListener('click', handleForgotPassword);

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
      : 'https://www.collabnb.com';
    await clerk.client.signIn.create({
      strategy: 'oauth_google',
      redirectUrl: `${origin}/sso-callback.html`,
      actionCompleteRedirectUrl: `${origin}/profile.html`,
    });
  } catch (err) {
    errorEl.textContent = 'Could not connect to Google. Please try again.';
    errorEl.style.display = 'block';
    googleBtn.disabled = false;
    googleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.8 0 7 5.4 3.2 13.3l7.8 6C12.9 13.2 18 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.7 37.2 46.5 31.3 46.5 24.5z"/><path fill="#FBBC05" d="M11 28.3c-.7-2-1-4-1-6.3s.4-4.4 1-6.3l-7.8-6C1.2 13.3 0 18.5 0 24s1.2 10.7 3.2 14.3l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.3-7.7 2.3-6 0-11.1-3.7-12.9-9l-7.8 6C7 42.6 14.8 48 24 48z"/></svg> Continue with Google`;
  }
});
(async () => {
  const clerk = await getClerk();
  if (clerk?.user) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.location.href = isLocalhost ? 'http://localhost:5174/#/profile' : '/profile.html';
  }
})();
