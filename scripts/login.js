/* ── Clerk instance (cached) ── */
let _clerkPromise = null;
async function getClerk() {
  if (!_clerkPromise) {
    _clerkPromise = (async () => {
      const Clerk = (await import('@clerk/clerk-js')).default;
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
      throw new Error('Additional authentication required.');
    }

    // Success — show spinner then redirect to profile
    cardEl.hidden = true;
    successEl.hidden = false;
    setTimeout(() => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      window.location.href = isLocalhost ? 'http://localhost:5174/#/profile' : '/profile.html';
    }, 800);

  } catch (err) {
    errorEl.textContent = getClerkErrorMessage(err);
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});

// If already signed in, go straight to profile
(async () => {
  const clerk = await getClerk();
  if (clerk?.user) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.location.href = isLocalhost ? 'http://localhost:5174/#/profile' : '/profile.html';
  }
})();
