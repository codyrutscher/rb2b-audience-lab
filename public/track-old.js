// Audience Lab Tracking Script
(function() {
  'use strict';
  
  // Get workspace ID from script tag
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var workspaceId = currentScript.getAttribute('data-workspace-id');
  
  // Generate or retrieve session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem('al_session_id');
    if (!sessionId) {
      sessionId = 'al_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('al_session_id', sessionId);
    }
    return sessionId;
  }

  // Parse UTM parameters
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
    };
  }

  // Get device info
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      device_type: /Mobile|Android|iPhone|iPad|iPod/.test(ua) ? 'mobile' : 'desktop',
    };
  }

  // Track page view
  function trackPageView() {
    const data = {
      sessionId: getSessionId(),
      workspaceId: workspaceId,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || null,
      ...getUTMParams(),
      ...getDeviceInfo(),
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
      workspaceId: workspaceId,
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

  // Track custom events
  window.audienceLabTrack = function(eventName, properties) {
    const data = {
      sessionId: getSessionId(),
      workspaceId: workspaceId,
      event: eventName,
      properties: properties || {},
      url: window.location.href,
    };

    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(err => console.error('Event tracking error:', err));
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
