/**
 * Append hidden fields to any of our forms on the page
 *  - Any UTM params that are present in the query string
 *  - A "path" param that w/the path of the current page
 *  - A "user_agent" param w/the user agent of the current browser
 *  - A "additional_query_params" param w/any additional query params
 *  - "fbc" and "fbp" params w/the values of the _fbc and _fbp cookies that facebook provides
 */
import Cookies from 'js-cookie';
import _ from 'lodash';
import { identifyFromEmail } from '../common/segment-utils';
import { initializeWistiaSegmentIntegration } from '../common/wistia-utils';

document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location.href);
  const path = url.pathname;
  const urlParams = new URLSearchParams(url.search);
  const utmParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_ad',
    'utm_adset',
  ];

  document.querySelectorAll('form').forEach((form) => {
    const createHiddenField = (name: string, value: string) => {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = name;
      hiddenInput.value = value;
      form.appendChild(hiddenInput);
    };

    // Append each UTM param to the form as a hidden field
    utmParams.forEach((param) => {
      const value = urlParams.get(param);
      if (value) {
        createHiddenField(param, value);
      }
    });

    // Take any additional query params and append them to a single additional_query_params field
    const additionalQueryParams: Record<string, string> = {};
    urlParams.forEach((value, key) => {
      if (!utmParams.includes(key)) {
        additionalQueryParams[key] = value;
      }
    });
    createHiddenField('additional_query_params', JSON.stringify(additionalQueryParams));

    // Append hidden fields for the current path and user agent
    createHiddenField('path', path);
    createHiddenField('user_agent', navigator.userAgent);

    // Fetch _fbc and _fbp cookies and store them in hidden fields
    ['_fbc', '_fbp'].forEach((cookieName) => {
      let value = null;
      try {
        value = Cookies.get(cookieName);
      } catch (err) {
        console.error(`Failed to get ${cookieName}`, err);
      }
      if (value) {
        createHiddenField(
          cookieName.substring(1), // Strip the leading underscore
          value,
        );
      }
    });
  });
});

/**
 * Track form submissions using Segment
 *  - Call analytics.track() with details of the form's fields
 *  - Call analytics.identify() based on detected fields such as email, firstName, and lastName.
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', () => {
      // Get all input fields
      const formData = new FormData(form);
      const formFields: Record<string, string> = {};
      let identifyUserId = null;
      const identifyFields: Record<string, string> = {};

      // Prepare formFields object and extract required fields for identify
      for (const [key, value] of formData.entries()) {
        if (!_.isString(value)) {
          continue;
        }
        formFields[_.camelCase(key)] = value;

        const cleanKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        if (value && value.trim() !== '') {
          if (cleanKey === 'email') {
            identifyUserId = value.trim().toLowerCase();
            identifyFields['email'] = value;
          }

          if (cleanKey === 'firstname' || cleanKey === 'first') {
            identifyFields['firstName'] = value;
          }
          if (cleanKey === 'lastname' || cleanKey === 'last') {
            identifyFields['lastName'] = value;
          }
        }
      }

      // Call analytics.track() with the form fields
      window.analytics.track('Webflow Form Submitted', formFields);

      // Call analytics.identify() if we found any identity in the form
      if (identifyUserId && Object.keys(identifyFields).length > 0) {
        identifyFromEmail(identifyUserId, identifyFields);
      }
    });
  });

  /**
   * Event handler that handles a click on an element that has data-event set, sending the appropriate
   * event to segment
   */
  function handleEventClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const dataEventValue = event.target.getAttribute('data-event');

    switch (dataEventValue) {
      case 'schedule-click': {
        const innerText = event.target.innerText.trim();
        window.analytics.track('Schedule Intent Button Clicked', { innerText });
        break;
      }
    }
  }

  function attachDataEventClickListener(element: HTMLElement) {
    if (element.hasAttribute('data-event')) {
      element.addEventListener('click', handleEventClick);
    }
  }

  // Attach listeners to any elements that currently have a data-event
  document.querySelectorAll('[data-event]').forEach(attachDataEventClickListener);

  // Set up a MutationObserver to watch for DOM changes
  new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          // Ensure it's an element node
          if (node.nodeType === 1 && node instanceof HTMLElement) {
            attachDataEventClickListener(node);

            // Also handle any descendants of the node
            const descendantElements = node.querySelectorAll('[data-event]');
            descendantElements.forEach(attachDataEventClickListener);
          }
        });
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
});

// Wistia + Segment integration
initializeWistiaSegmentIntegration();
