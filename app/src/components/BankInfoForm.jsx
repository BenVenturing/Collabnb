import { useState, useMemo } from 'react';

// ─── Formatting / normalization helpers ─────────────────────────────────────
const digits = (s) => (s || '').replace(/\D/g, '');
const alnumUpper = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Groups a digit string into dash-separated chunks for display, e.g.
// groupDigits('123456', [2,2,2]) -> '12-34-56'.
function groupDigits(raw, groupSizes) {
  const d = digits(raw);
  let i = 0;
  return groupSizes
    .map((size) => d.slice(i, (i += size)))
    .filter(Boolean)
    .join('-');
}
const formatSortCode = (raw) => groupDigits(raw, [2, 2, 2]);
const formatBsb = (raw) => groupDigits(raw, [3, 3]);

// ISO 7064 mod-97-10 IBAN checksum — catches transposed/mistyped digits that
// a simple length/charset regex would miss.
function isValidIban(raw) {
  const iban = alnumUpper(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => (c.charCodeAt(0) - 55).toString());
  let remainder = numeric;
  while (remainder.length > 9) {
    remainder = (parseInt(remainder.slice(0, 9), 10) % 97) + remainder.slice(9);
  }
  return parseInt(remainder, 10) % 97 === 1;
}
const isValidBic = (raw) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(alnumUpper(raw));

// ─── Country → banking-system configuration ─────────────────────────────────
// Wise `type`/`details` field names below are best-effort per Wise's account
// creation API (same caveat as the existing USD/IDR paths in Profile.jsx) —
// worth a live sandbox test per country before this ever handles a real payout.
const COUNTRIES = [
  { code: 'US', label: 'United States', group: 'US' },
  { code: 'DE', label: 'Germany', group: 'EU' },
  { code: 'FR', label: 'France', group: 'EU' },
  { code: 'ES', label: 'Spain', group: 'EU' },
  { code: 'IT', label: 'Italy', group: 'EU' },
  { code: 'NL', label: 'Netherlands', group: 'EU' },
  { code: 'GB', label: 'United Kingdom', group: 'UK' },
  { code: 'ID', label: 'Indonesia', group: 'ID' },
  { code: 'AU', label: 'Australia', group: 'AU' },
];

const GROUP_CONFIG = {
  US: {
    currency: 'USD',
    wiseType: 'aba',
    fields: [
      {
        key: 'routingNumber', label: 'Routing Number', placeholder: '021000021',
        help: 'The 9-digit ABA code for your bank.', normalize: digits, maxLength: 9,
        validate: (v) => (/^\d{9}$/.test(v) ? null : 'Must be exactly 9 digits.'),
      },
      {
        key: 'accountNumber', label: 'Account Number', placeholder: '000123456789',
        normalize: digits, maxLength: 17,
        validate: (v) => (/^\d{4,17}$/.test(v) ? null : 'Enter a valid account number.'),
      },
      {
        key: 'accountType', label: 'Account Type', type: 'select',
        options: [{ value: 'CHECKING', label: 'Checking' }, { value: 'SAVINGS', label: 'Savings' }],
        validate: (v) => (v ? null : 'Select an account type.'),
      },
    ],
    buildDetails: (v) => ({ legalType: 'PRIVATE', abartn: v.routingNumber, accountNumber: v.accountNumber, accountType: v.accountType }),
  },
  EU: {
    currency: 'EUR',
    wiseType: 'iban',
    fields: [
      {
        key: 'iban', label: 'IBAN', placeholder: 'DE89 3704 0044 0532 0130 00',
        help: 'Your International Bank Account Number — found on your bank statement or banking app.',
        normalize: alnumUpper,
        validate: (v) => (isValidIban(v) ? null : 'Enter a valid IBAN.'),
      },
      {
        key: 'bic', label: 'BIC / SWIFT Code', placeholder: 'DEUTDEFF', optional: true,
        help: 'An 8 or 11-character code identifying your specific bank branch. Optional — only needed if your bank requires it for local routing.',
        normalize: alnumUpper,
        validate: (v) => (!v || isValidBic(v) ? null : 'Enter a valid 8 or 11-character BIC/SWIFT code.'),
      },
    ],
    buildDetails: (v) => ({ legalType: 'PRIVATE', IBAN: v.iban, ...(v.bic ? { BIC: v.bic } : {}) }),
  },
  UK: {
    currency: 'GBP',
    wiseType: 'sort_code',
    fields: [
      {
        key: 'sortCode', label: 'Sort Code', placeholder: '12-34-56',
        help: '6-digit format: XX-XX-XX.', format: formatSortCode, normalize: digits, maxLength: 6,
        validate: (v) => (/^\d{6}$/.test(v) ? null : 'Must be 6 digits (XX-XX-XX).'),
      },
      {
        key: 'accountNumber', label: 'Account Number', placeholder: '12345678',
        normalize: digits, maxLength: 8,
        validate: (v) => (/^\d{8}$/.test(v) ? null : 'Must be exactly 8 digits.'),
      },
    ],
    buildDetails: (v) => ({ legalType: 'PRIVATE', sortCode: v.sortCode, accountNumber: v.accountNumber }),
  },
  ID: {
    currency: 'IDR',
    wiseType: 'indonesian',
    fields: [
      {
        key: 'bankCode', label: 'Bank Local Code', placeholder: '014 (BCA)',
        help: "Your bank's 3–4 digit local clearing code — e.g. 014 for BCA, 002 for BRI.",
        normalize: digits, maxLength: 4,
        validate: (v) => (/^\d{3,4}$/.test(v) ? null : "Enter your bank's 3–4 digit code."),
      },
      {
        key: 'accountNumber', label: 'Account Number', placeholder: '1234567890',
        normalize: digits, maxLength: 16,
        validate: (v) => (/^\d{6,16}$/.test(v) ? null : 'Enter a valid account number.'),
      },
      {
        key: 'swift', label: 'SWIFT / BIC Code', placeholder: 'CENAIDJA',
        help: 'An 8 or 11-character code identifying your bank. Required for international wire transfers.',
        normalize: alnumUpper,
        validate: (v) => (isValidBic(v) ? null : 'Enter a valid 8 or 11-character SWIFT/BIC code.'),
      },
    ],
    buildDetails: (v) => ({ legalType: 'PRIVATE', bankCode: v.bankCode, accountNumber: v.accountNumber, swiftCode: v.swift }),
  },
  AU: {
    currency: 'AUD',
    wiseType: 'australian',
    fields: [
      {
        key: 'bsb', label: 'BSB Number', placeholder: '123-456',
        help: '6-digit Bank State Branch code.', format: formatBsb, normalize: digits, maxLength: 6,
        validate: (v) => (/^\d{6}$/.test(v) ? null : 'Must be 6 digits.'),
      },
      {
        key: 'accountNumber', label: 'Account Number', placeholder: '123456789',
        normalize: digits, maxLength: 10,
        validate: (v) => (/^\d{5,10}$/.test(v) ? null : 'Enter a valid account number.'),
      },
    ],
    buildDetails: (v) => ({ legalType: 'PRIVATE', bsbCode: v.bsb, accountNumber: v.accountNumber }),
  },
};

const EU_CODES = COUNTRIES.filter((c) => c.group === 'EU').map((c) => c.code);

// ─── Shared field styles (matches the HAZY design system) ──────────────────
const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' };
const errorInputStyle = { ...inputStyle, border: '1px solid rgba(185,28,28,0.5)', background: 'rgba(185,28,28,0.04)' };
const helpStyle = { fontSize: '0.7rem', color: 'var(--sage)', margin: '0.35rem 0 0', lineHeight: 1.45 };
const errorStyle = { fontSize: '0.7rem', color: '#b91c1c', margin: '0.35rem 0 0', lineHeight: 1.45 };

function Field({ def, value, error, touched, onChange, onBlur }) {
  const displayValue = def.format ? def.format(value || '') : (value || '');
  return (
    <div>
      <label style={labelStyle}>{def.label}{!def.optional && <span style={{ color: '#b91c1c' }}> *</span>}</label>
      {def.type === 'select' ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(def.key, e.target.value)}
          onBlur={() => onBlur(def.key)}
          style={touched && error ? errorInputStyle : inputStyle}
        >
          <option value="">Select…</option>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type="text"
          value={displayValue}
          placeholder={def.placeholder}
          maxLength={def.format ? undefined : def.maxLength}
          onChange={(e) => onChange(def.key, def.normalize ? def.normalize(e.target.value) : e.target.value)}
          onBlur={() => onBlur(def.key)}
          style={touched && error ? errorInputStyle : inputStyle}
        />
      )}
      {touched && error ? <p style={errorStyle}>{error}</p> : def.help ? <p style={helpStyle}>{def.help}</p> : null}
    </div>
  );
}

/**
 * Country-adaptive bank details form. Shows only the fields a given country's
 * banking system actually needs, with matching local terminology and
 * validation. Renders nothing beyond the country picker until a country is
 * chosen. Purely a controlled input collector — call `onChange` to receive
 * the current state; the caller owns the submit button and busy state.
 *
 * onChange payload: { isValid, country, currency, wiseType, accountHolderName, details }
 */
export default function BankInfoForm({ onChange, disabled }) {
  const [country, setCountry] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [fields, setFields] = useState({});
  const [touched, setTouched] = useState({});

  const countryMeta = COUNTRIES.find((c) => c.code === country);
  const config = countryMeta ? GROUP_CONFIG[countryMeta.group] : null;

  const errors = useMemo(() => {
    if (!config) return {};
    const out = {};
    for (const f of config.fields) out[f.key] = f.validate(fields[f.key] || '');
    return out;
  }, [config, fields]);

  const isValid = !!config
    && accountHolderName.trim().length > 0
    && Object.values(errors).every((e) => e === null);

  function emit(nextFields, nextName) {
    if (!config) { onChange?.({ isValid: false }); return; }
    const name = nextName ?? accountHolderName;
    const f = nextFields ?? fields;
    const fieldErrors = config.fields.map((def) => def.validate(f[def.key] || ''));
    const valid = name.trim().length > 0 && fieldErrors.every((e) => e === null);
    onChange?.({
      isValid: valid,
      country,
      currency: config.currency,
      wiseType: config.wiseType,
      accountHolderName: name,
      details: config.buildDetails(f),
    });
  }

  function handleCountryChange(code) {
    setCountry(code);
    setFields({});
    setTouched({});
    onChange?.({ isValid: false, country: code });
  }

  function handleFieldChange(key, value) {
    const next = { ...fields, [key]: value };
    setFields(next);
    emit(next, undefined);
  }

  function handleNameChange(value) {
    setAccountHolderName(value);
    emit(undefined, value);
  }

  function handleBlur(key) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <label style={labelStyle}>Country <span style={{ color: '#b91c1c' }}>*</span></label>
        <select
          value={country}
          disabled={disabled}
          onChange={(e) => handleCountryChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select country…</option>
          <option value="US">United States</option>
          <optgroup label="European Union / SEPA">
            {COUNTRIES.filter((c) => EU_CODES.includes(c.code)).map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </optgroup>
          <option value="GB">United Kingdom</option>
          <option value="ID">Indonesia</option>
          <option value="AU">Australia</option>
        </select>
      </div>

      {config && (
        <>
          <div>
            <label style={labelStyle}>Account Holder Name <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              type="text"
              value={accountHolderName}
              placeholder="Full name on the account"
              disabled={disabled}
              onChange={(e) => handleNameChange(e.target.value)}
              style={inputStyle}
            />
          </div>
          {config.fields.map((def) => (
            <fieldset key={def.key} disabled={disabled} style={{ border: 'none', padding: 0, margin: 0 }}>
              <Field
                def={def}
                value={fields[def.key]}
                error={errors[def.key]}
                touched={!!touched[def.key]}
                onChange={handleFieldChange}
                onBlur={handleBlur}
              />
            </fieldset>
          ))}
        </>
      )}
    </div>
  );
}
