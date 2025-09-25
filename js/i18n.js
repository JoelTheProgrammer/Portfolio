// js/i18n.js
// Robust client-side i18n loader.
// - Accepts both nested JSON and flat dot-keys.
// - Tries ./i18n/<lang>.json first, then ./<lang>.json as fallback.
// - Saves chosen language in localStorage under 'site_lang'.
// - Usage: add data-i18n="key.path" to elements.

(function () {
    'use strict';

    const LANG_STORAGE_KEY = 'site_lang';
    const DEFAULT_LANG = 'en';
    const SUPPORTED = ['en', 'de'];
    const PRIMARY_PATH = './i18n/'; // first try this folder
    const SECONDARY_PATH = './';    // fallback to project root

    const cache = {};

    function fetchLang(lang) {
        if (cache[lang]) return Promise.resolve(cache[lang]);

        const primaryUrl = `${PRIMARY_PATH}${lang}.json`;
        const fallbackUrl = `${SECONDARY_PATH}${lang}.json`;

        return fetch(primaryUrl, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) {
                    return fetch(fallbackUrl, { cache: 'no-store' });
                }
                return res;
            })
            .then(res => {
                if (!res.ok) throw new Error(`i18n file not found at either ${primaryUrl} or ${fallbackUrl}`);
                return res.json();
            })
            .then(json => {
                cache[lang] = json || {};
                return cache[lang];
            })
            .catch(err => {
                cache[lang] = cache[lang] || {};
                console.warn('i18n load warning for', lang, err && err.message ? err.message : err);
                return cache[lang];
            });
    }

    function resolveKey(obj, key) {
        if (!obj) return undefined;
        if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
        return key.split('.').reduce((acc, part) => {
            return (acc && Object.prototype.hasOwnProperty.call(acc, part)) ? acc[part] : undefined;
        }, obj);
    }

    function applyTranslations(lang) {
        const dict = cache[lang];
        if (!dict) {
            console.warn('i18n: no dictionary loaded for', lang);
            return;
        }

        const els = document.querySelectorAll('[data-i18n]');
        els.forEach(el => {
            const key = (el.getAttribute('data-i18n') || '').trim();
            if (!key) return;

            const value = resolveKey(dict, key);
            if (value === undefined) {
                console.debug('i18n: missing key', key, 'for lang', lang);
                return;
            }

            const attr = el.getAttribute('data-i18n-attr');
            if (attr) {
                el.setAttribute(attr, value);
                if (attr === 'value' && ('value' in el)) el.value = value;
            } else {
                el.textContent = value;
            }
        });

        try { document.documentElement.lang = lang; } catch (e) { /* ignore */ }
        updateLangUI(lang);
    }

    function updateLangUI(activeLang) {
        document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
            const isActive = btn.getAttribute('data-lang') === activeLang;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    function initLangButtons() {
        document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const lang = btn.getAttribute('data-lang');
                if (!SUPPORTED.includes(lang)) {
                    console.warn('Unsupported lang', lang);
                    return;
                }
                setLang(lang);
            });
        });
    }

    function setLang(lang) {
        if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
        localStorage.setItem(LANG_STORAGE_KEY, lang);
        return fetchLang(lang).then(() => applyTranslations(lang)).catch(err => {
            console.error('i18n load failed for', lang, err);
        });
    }

    function getSavedLang() {
        const stored = localStorage.getItem(LANG_STORAGE_KEY);
        if (stored && SUPPORTED.includes(stored)) return stored;
        const nav = (navigator.language || navigator.userLanguage || '').slice(0, 2);
        if (SUPPORTED.includes(nav)) return nav;
        return DEFAULT_LANG;
    }

    document.addEventListener('DOMContentLoaded', function () {
        initLangButtons();
        const lang = getSavedLang();
        Promise.all(SUPPORTED.map(l => fetchLang(l))).then(() => {
            applyTranslations(lang);
        }).catch(() => {
            applyTranslations(lang);
        });
    });
})();
