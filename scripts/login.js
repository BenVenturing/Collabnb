import { supabase } from './supabase.js';

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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      errorEl.textContent = 'Wrong email or password. Try again.';
    } else if (error.message.includes('Email not confirmed')) {
      errorEl.textContent = 'Please confirm your email first. Check your inbox.';
    } else {
      errorEl.textContent = error.message;
    }
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    return;
  }

  // Success — show spinner then redirect to profile
  cardEl.hidden = true;
  successEl.hidden = false;
  setTimeout(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.location.href = isLocalhost ? 'http://localhost:5174/#/profile' : '/profile.html';
  }, 800);
});

// If already signed in, go straight to profile
supabase.auth.getUser().then(({ data: { user } }) => {
  if (user?.email_confirmed_at) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.location.href = isLocalhost ? 'http://localhost:5174/#/profile' : '/profile.html';
  }
});
