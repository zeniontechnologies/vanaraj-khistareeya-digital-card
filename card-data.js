(() => {
  const DEFAULT_JSON_PATH = './card.json';

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = $(id);
    if (!el) return;
    el.textContent = value ?? '';
  }

  function setAttr(id, attr, value) {
    const el = $(id);
    if (!el) return;
    if (value == null || value === '') el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  }

  function normalizeE164(phoneE164) {
    if (!phoneE164) return '';
    return String(phoneE164).replace(/\s+/g, '');
  }

  function buildVCard(data) {
    const profile = data?.profile || {};
    const contact = data?.contact || {};
    const phone = normalizeE164(contact.phoneE164);
    const email = contact.email || '';
    const url = contact.website || '';

    const lastName = profile.lastName || '';
    const firstName = profile.firstName || '';
    const fullName = profile.fullName || [firstName, lastName].filter(Boolean).join(' ').trim();

    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
      `FN:${escapeVCard(fullName)}`
    ];

    if (profile.company) lines.push(`ORG:${escapeVCard(profile.company)}`);
    if (profile.title) lines.push(`TITLE:${escapeVCard(profile.title)}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`);
    if (email) lines.push(`EMAIL;TYPE=WORK:${escapeVCard(email)}`);
    if (url) lines.push(`URL:${escapeVCard(url)}`);

    lines.push('END:VCARD');
    return lines.join('\n');
  }

  function escapeVCard(value) {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  function fileSafeBaseName(name) {
    return String(name || 'contact')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'contact';
  }

  function applyToDom(data) {
    const profile = data?.profile || {};
    const contact = data?.contact || {};
    const images = data?.images || {};
    const social = data?.social || {};
    const seo = data?.seo || {};

    // Ensure we always have a non-empty title (even if seo.pageTitle is missing).
    const fallbackTitle = profile.fullName || 'Digital Business Card';

    if (profile.fullName) {
      setText('profile-name', profile.fullName);
      setAttr('profile-avatar', 'alt', profile.fullName);
    }

    if (profile.company) setText('profile-company', profile.company);
    if (profile.tagline) setText('profile-tagline', `"${profile.tagline}"`);
    if (profile.avatarText) setText('avatar-fallback', profile.avatarText);

    if (images.avatar) setAttr('profile-avatar', 'src', images.avatar);
    if (images.banner) setAttr('profile-banner', 'src', images.banner);

    const phone = normalizeE164(contact.phoneE164);
    if (phone) setAttr('btn-phone', 'href', `tel:${phone}`);
    if (contact.email) setAttr('btn-email', 'href', `mailto:${contact.email}`);
    if (contact.website) setAttr('btn-web', 'href', contact.website);
    if (social.linkedin) setAttr('btn-linkedin', 'href', social.linkedin);
    if (contact.website) setAttr('footer-link', 'href', contact.website);
    if (profile.company) setText('footer-company', profile.company);

    document.title = seo.pageTitle || fallbackTitle;

    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', seo.ogTitle || document.title);

    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', seo.ogDescription || '');

    const appleTitleEl = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleEl) appleTitleEl.setAttribute('content', seo.appleWebAppTitle || document.title);
  }

  async function loadCardData() {
    const res = await fetch(DEFAULT_JSON_PATH, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${DEFAULT_JSON_PATH}: ${res.status}`);
    const data = await res.json();

    window.CARD_DATA = data;
    window.CARD_VCARD_TEXT = () => buildVCard(data);
    window.CARD_FILE_BASE = () => fileSafeBaseName(data?.profile?.fullName);
    window.CARD_WHATSAPP_URL = () => {
      const wa = data?.contact?.whatsapp || {};
      const phone = normalizeE164(wa.phoneE164 || data?.contact?.phoneE164);
      const msg = wa.message || '';
      if (!phone) return '';
      const digits = phone.replace(/^\+/, '');
      const qs = msg ? `?text=${encodeURIComponent(msg)}` : '';
      return `https://wa.me/${digits}${qs}`;
    };
    window.CARD_SHARE_DATA = () => ({
      title: data?.share?.title || data?.profile?.fullName || document.title,
      text: data?.share?.text || '',
      url: window.location.href
    });

    applyToDom(data);
  }

  // Load ASAP (index.html already has the DOM in place before this script runs).
  loadCardData().catch((err) => {
    // Keep the static content as a fallback.
    const isFileProtocol = window.location.protocol === 'file:';
    if (isFileProtocol) {
      console.warn('[card-data] card.json cannot be fetched on file://. Run via a local web server (http://) to enable dynamic data.', err);
    } else {
      console.warn('[card-data] Using static fallback:', err);
    }
  });
})();
