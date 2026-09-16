import { getRoleSwitchProfile, submitRoleSwitchProfile } from './convex.js';

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const els = {
  loading: document.getElementById('fr-loading'),
  invalid: document.getElementById('fr-invalid'),
  invalidTitle: document.getElementById('fr-invalid-title'),
  invalidBody: document.getElementById('fr-invalid-body'),
  formCard: document.getElementById('fr-form-card'),
  subtitle: document.getElementById('fr-subtitle'),
  form: document.getElementById('fr-form'),
  creatorFields: document.getElementById('fr-creator-fields'),
  hostFields: document.getElementById('fr-host-fields'),
  error: document.getElementById('fr-error'),
  submit: document.getElementById('fr-submit'),
  success: document.getElementById('fr-success'),
  successBody: document.getElementById('fr-success-body'),
};

function showOnly(el) {
  [els.loading, els.invalid, els.formCard, els.success].forEach((e) => { e.hidden = e !== el; });
}

function showInvalid(status) {
  if (status === 'expired') {
    els.invalidTitle.textContent = 'Link expired';
    els.invalidBody.textContent = "This link has expired. Reply to the email you were sent and we'll send you a new one.";
  } else if (status === 'already_done') {
    els.invalidTitle.textContent = 'Already finished';
    els.invalidBody.textContent = "This profile is already complete — you're good to go.";
  } else {
    els.invalidTitle.textContent = 'Link not valid';
    els.invalidBody.textContent = "We couldn't find this invite. It may have already been used.";
  }
  showOnly(els.invalid);
}

async function init() {
  if (!token) return showInvalid('not_found');
  let data;
  try {
    data = await getRoleSwitchProfile(token);
  } catch {
    return showInvalid('not_found');
  }
  if (!data || data.status !== 'ok') return showInvalid(data?.status);

  const role = data.role;
  els.subtitle.textContent = role === 'host'
    ? `A couple of details are needed to unlock publishing, ${(data.full_name || '').split(' ')[0] || 'friend'}.`
    : `A couple of details are needed to unlock applying to listings, ${(data.full_name || '').split(' ')[0] || 'friend'}.`;
  els.creatorFields.hidden = role !== 'creator';
  els.hostFields.hidden = role !== 'host';
  document.getElementById('fr-country').value = data.country || '';
  if (role === 'host') document.getElementById('fr-city').value = data.city || '';

  showOnly(els.formCard);

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.error.style.display = 'none';
    els.submit.disabled = true;
    els.submit.textContent = 'Saving…';
    try {
      const fields = { country: document.getElementById('fr-country').value.trim() };
      if (role === 'creator') {
        fields.instagram_handle = document.getElementById('fr-instagram').value.trim();
        fields.tiktok_handle = document.getElementById('fr-tiktok').value.trim();
        fields.portfolio = document.getElementById('fr-portfolio-creator').value.trim();
      } else {
        fields.business_name = document.getElementById('fr-business').value.trim();
        fields.city = document.getElementById('fr-city').value.trim();
        fields.portfolio = document.getElementById('fr-portfolio-host').value.trim();
      }
      const res = await submitRoleSwitchProfile(token, fields);
      els.successBody.textContent = res.role === 'host'
        ? "Your host profile is complete — you're all set to publish your first listing."
        : "Your creator profile is complete — you're all set to start applying to listings.";
      showOnly(els.success);
    } catch (err) {
      els.error.textContent = err?.message || 'Something went wrong. Please try again.';
      els.error.style.display = 'block';
      els.submit.disabled = false;
      els.submit.textContent = 'Finish my profile →';
    }
  });
}

init();
