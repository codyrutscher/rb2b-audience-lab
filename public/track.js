// Audience Lab Tracking Script
(function() {
  'use strict';
  
  // Generate or retrieve session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem('al_session_id');
    if (!sessionId) {
      sessionId = 'al_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('al_session_id', sessionId);
    }
    return sessionId;
  }

  // Track page view
  function trackPageView() {
    const data = {
      sessionId: getSessionId(),
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || null,
    };

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(err => console.error('Tracking error:', err));
  }

  // Identify visitor (call this when you have user info)
  window.audienceLabIdentify = function(userData) {
    const data = {
      sessionId: getSessionId(),
      email: userData.email,
      name: userData.name,
      company: userData.company,
      linkedinUrl: userData.linkedinUrl,
    };

    fetch('/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(err => console.error('Identification error:', err));
  };

  // Track initial page view
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }

  // Track navigation for SPAs
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      trackPageView();
    }
  }).observe(document, { subtree: true, childList: true });
})();
