// Audience Lab Enhanced Tracking Script
(function() {
  'use strict';
  
  // Get script tag attributes
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var workspaceId = currentScript.getAttribute('data-workspace-id');
  
  // Get the base URL from the script src
  var scriptSrc = currentScript.src;
  var baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
  // Remove /track.js or similar from the end to get the domain
  baseUrl = scriptSrc.replace(/\/track\.js.*$/, '');
  
  // State management
  var state = {
    sessionId: null,
    pageLoadTime: Date.now(),
    scrollDepth: 0,
    clicks: [],
    formInteractions: {},
    isReturningVisitor: false,
  };

  // Generate or retrieve session ID
  function getSessionId() {
    if (state.sessionId) return state.sessionId;
    
    let sessionId = sessionStorage.getItem('al_session_id');
    if (!sessionId) {
      sessionId = 'al_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('al_session_id', sessionId);
    }
    
    // Check if returning visitor
    state.isReturningVisitor = !!localStorage.getItem('al_returning_visitor');
    localStorage.setItem('al_returning_visitor', 'true');
    
    state.sessionId = sessionId;
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

  // Track scroll depth
  function trackScrollDepth() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const depth = Math.round((scrolled / scrollHeight) * 100);
    
    if (depth > state.scrollDepth) {
      state.scrollDepth = depth;
      
      // Track milestones (25%, 50%, 75%, 100%)
      if (depth >= 25 && state.scrollDepth < 25) {
        trackEvent('scroll_depth', { depth: 25 });
      } else if (depth >= 50 && state.scrollDepth < 50) {
        trackEvent('scroll_depth', { depth: 50 });
      } else if (depth >= 75 && state.scrollDepth < 75) {
        trackEvent('scroll_depth', { depth: 75 });
      } else if (depth >= 100 && state.scrollDepth < 100) {
        trackEvent('scroll_depth', { depth: 100 });
      }
    }
  }

  // Track clicks
  function trackClick(event) {
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    const clickData = {
      tag: tagName,
      text: target.innerText?.substring(0, 100) || '',
      href: target.href || '',
      id: target.id || '',
      classes: target.className || '',
      x: event.clientX,
      y: event.clientY,
    };
    
    state.clicks.push(clickData);
    
    // Track specific click types
    if (tagName === 'a') {
      trackEvent('link_clicked', clickData);
    } else if (tagName === 'button') {
      trackEvent('button_clicked', clickData);
    }
  }

  // Track form interactions
  function trackFormFocus(event) {
    const form = event.target.closest('form');
    if (!form) return;
    
    const formId = form.id || form.name || 'unnamed_form';
    
    if (!state.formInteractions[formId]) {
      state.formInteractions[formId] = {
        started: Date.now(),
        fields: {},
      };
      trackEvent('form_started', { form_id: formId });
    }
    
    const fieldName = event.target.name || event.target.id || 'unnamed_field';
    state.formInteractions[formId].fields[fieldName] = {
      focused: Date.now(),
    };
  }

  function trackFormSubmit(event) {
    const form = event.target;
    const formId = form.id || form.name || 'unnamed_form';
    
    trackEvent('form_submitted', {
      form_id: formId,
      fields: Object.keys(state.formInteractions[formId]?.fields || {}),
      time_to_submit: Date.now() - (state.formInteractions[formId]?.started || Date.now()),
    });
  }

  // Track time on page
  function getTimeOnPage() {
    return Math.round((Date.now() - state.pageLoadTime) / 1000); // seconds
  }

  // Send tracking data
  function sendData(endpoint, data) {
    var url = baseUrl + endpoint;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(err => console.error('Tracking error:', err));
  }

  // Track page view
  function trackPageView() {
    const data = {
      sessionId: getSessionId(),
      workspaceId: workspaceId,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || null,
      is_returning: state.isReturningVisitor,
      ...getUTMParams(),
      ...getDeviceInfo(),
    };

    sendData('/api/track', data);
  }

  // Track event
  function trackEvent(eventName, properties) {
    const data = {
      sessionId: getSessionId(),
      workspaceId: workspaceId,
      event: eventName,
      properties: properties || {},
      url: window.location.href,
    };

    sendData('/api/event', data);
  }

  // Send page exit data
  function trackPageExit() {
    const data = {
      sessionId: getSessionId(),
      workspaceId: workspaceId,
      url: window.location.href,
      time_on_page: getTimeOnPage(),
      scroll_depth: state.scrollDepth,
      clicks: state.clicks.length,
    };

    // Use sendBeacon for reliable exit tracking
    if (navigator.sendBeacon) {
      navigator.sendBeacon(baseUrl + '/api/page-exit', JSON.stringify(data));
    } else {
      sendData('/api/page-exit', data);
    }
  }

  // Public API: Identify visitor
  window.audienceLabIdentify = function(userData) {
    const data = {
      sessionId: getSessionId(),
      workspaceId: workspaceId,
      email: userData.email,
      name: userData.name,
      company: userData.company,
      linkedinUrl: userData.linkedinUrl,
    };

    sendData('/api/identify', data);
  };

  // Public API: Track custom events
  window.audienceLabTrack = function(eventName, properties) {
    trackEvent(eventName, properties);
  };

  // Initialize tracking
  function init() {
    // Track initial page view
    if (document.readyState === 'complete') {
      trackPageView();
    } else {
      window.addEventListener('load', trackPageView);
    }

    // Track scroll depth
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScrollDepth, 100);
    }, { passive: true });

    // Track clicks
    document.addEventListener('click', trackClick, true);

    // Track form interactions
    document.addEventListener('focus', trackFormFocus, true);
    document.addEventListener('submit', trackFormSubmit, true);

    // Track page exit
    window.addEventListener('beforeunload', trackPageExit);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        trackPageExit();
      }
    });

    // Track navigation for SPAs
    let lastUrl = location.href;
    new MutationObserver(function() {
      const url = location.href;
      if (url !== lastUrl) {
        trackPageExit(); // Track exit from previous page
        lastUrl = url;
        state.pageLoadTime = Date.now();
        state.scrollDepth = 0;
        state.clicks = [];
        trackPageView();
      }
    }).observe(document, { subtree: true, childList: true });
  }

  // Start tracking
  init();
})();
