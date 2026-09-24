/*! bs-tracking.js — cattura parametri, li passa ai form GHL, carica l'embed, traccia il lead */
(function () {
  'use strict';

  var STORE_KEY = 'bs_params';
  var KEYS = ['param_ads_sede', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', 'wbraid', 'gbraid'];
  var LOWER = { param_ads_sede: 1, utm_source: 1, utm_medium: 1, utm_campaign: 1 };
  var FORM_SEL = 'iframe[data-src*="/widget/form/"], iframe[src*="/widget/form/"],' +
    'iframe[data-src*="/widget/survey/"], iframe[src*="/widget/survey/"]';
  var EMBED_URL = 'https://link.msgsndr.com/js/form_embed.js';

  function clean(k, v) {
    v = String(v).trim().slice(0, 200);
    if (LOWER[k]) v = v.toLowerCase();
    if (k === 'param_ads_sede') v = v.replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
    return v;
  }
  function read() { try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) { } }

  // 1. Cattura parametri (nuovi dall'URL, altrimenti quelli salvati in sessione)
  var qs = new URLSearchParams(location.search);
  var fresh = {};
  KEYS.forEach(function (k) {
    var v = qs.get(k);
    if (v) { v = clean(k, v); if (v) fresh[k] = v; }
  });
  var hasFresh = Object.keys(fresh).length > 0;
  var store = hasFresh ? fresh : read();
  if (hasFresh) save(store);

  // 2. Form GHL: aggiunge i parametri all'iframe e poi carica form_embed.js
  function withParams(src) {
    try {
      var u = new URL(src, location.href);
      Object.keys(store).forEach(function (k) { u.searchParams.set(k, store[k]); });
      return u.toString();
    } catch (e) { return src; }
  }
  function fillForms() {
    document.querySelectorAll(FORM_SEL).forEach(function (f) {
      if (f.getAttribute('data-bs-done')) return;
      f.setAttribute('data-bs-done', '1');
      var base = f.getAttribute('data-src') || f.getAttribute('src');
      if (!base) return;
      var full = withParams(base);
      if (f.hasAttribute('data-src')) f.setAttribute('data-src', full);
      if (f.getAttribute('src') !== full) f.src = full;
    });
  }
  function loadEmbed() {
    if (document.querySelector('script[src*="form_embed.js"]')) return; // già in pagina: non duplicare
    var s = document.createElement('script');
    s.src = EMBED_URL;
    document.body.appendChild(s);
  }
  function init() {
    fillForms();
    if (document.querySelector(FORM_SEL)) loadEmbed(); // solo se c'è un form
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.BS = { params: store, fillForms: fillForms };
  window.BS_PARAMS = store;

  // 3. TY page: conversione su ?lead=ok
  if (qs.get('lead') === 'ok') {
    var data = { event: 'generate_lead' };
    if (store.param_ads_sede) data.sede = store.param_ads_sede;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
    var u = new URL(location.href);
    u.searchParams.delete('lead');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  }
})();