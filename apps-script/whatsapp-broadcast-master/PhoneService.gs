/**
 * Phone number validation for international WhatsApp recipients.
 * Does not silently send to invalid numbers.
 */

var PhoneService = (function () {
  function digitsOnly_(raw) {
    return String(raw == null ? '' : raw).replace(/\D/g, '');
  }

  function fromExcel_(raw) {
    if (typeof raw === 'number' && isFinite(raw)) {
      if (raw > 1e10) {
        return String(Math.round(raw));
      }
      return String(raw);
    }
    var text = String(raw == null ? '' : raw).trim();
    if (/e\+/i.test(text)) {
      var asNumber = Number(text);
      if (isFinite(asNumber) && asNumber > 1e10) {
        return String(Math.round(asNumber));
      }
    }
    return text;
  }

  function normalize(raw, defaultCountry) {
    var country = digitsOnly_(defaultCountry || getDefaultCountryCode_());
    var text = fromExcel_(raw);
    if (!text) return { ok: false, reason: 'MISSING', input: '', e164: '' };

    var plus = text.trim().indexOf('+') === 0;
    var digits = digitsOnly_(text);
    if (!digits) return { ok: false, reason: 'MISSING', input: text, e164: '' };

    if (digits.length < 8 || digits.length > 15) {
      return { ok: false, reason: 'INVALID', input: text, e164: digits };
    }

    if (digits.length === 11 && digits.charAt(0) === '0') {
      digits = digits.slice(1);
    }

    if (digits.length === 10 && country) {
      digits = country + digits;
    }

    if (!plus && country && digits.indexOf(country + country) === 0 && digits.length > country.length + 10) {
      digits = digits.slice(country.length);
    }

    if (digits.length < 10 || digits.length > 15) {
      return { ok: false, reason: 'INVALID', input: text, e164: digits };
    }

    if (/^0+$/.test(digits) || /^(\d)\1{9,}$/.test(digits)) {
      return { ok: false, reason: 'INVALID', input: text, e164: digits };
    }

    return { ok: true, reason: 'VALID', input: text, e164: digits };
  }

  function classify(values, defaultCountry) {
    var seen = {};
    var result = {
      total: values.length,
      valid: [],
      invalid: [],
      missing: [],
      duplicates: []
    };

    for (var i = 0; i < values.length; i++) {
      var rowNumber = i + 2;
      var parsed = normalize(values[i], defaultCountry);
      var record = {
        rowNumber: rowNumber,
        input: parsed.input,
        e164: parsed.e164,
        reason: parsed.reason
      };

      if (parsed.reason === 'MISSING') {
        result.missing.push(record);
        continue;
      }
      if (!parsed.ok) {
        result.invalid.push(record);
        continue;
      }
      if (seen[parsed.e164]) {
        record.reason = 'DUPLICATE';
        record.duplicateOfRow = seen[parsed.e164];
        result.duplicates.push(record);
        continue;
      }
      seen[parsed.e164] = rowNumber;
      result.valid.push(record);
    }

    return result;
  }

  function display(e164) {
    if (!e164) return '';
    if (e164.indexOf('91') === 0 && e164.length === 12) {
      return '+91 ' + e164.slice(2, 7) + ' ' + e164.slice(7);
    }
    return '+' + e164;
  }

  return {
    normalize: normalize,
    classify: classify,
    display: display
  };
})();
