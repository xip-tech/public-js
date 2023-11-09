import Cookies from 'js-cookie';
import _ from 'lodash';
import {
  analytics,
  enableSegment,
  identifyFromEmail,
  urlPathFilter,
} from '../common/segment-utils';
import { initializeWistiaSegmentIntegration } from '../common/wistia-utils';

enableSegment('YTsllNl2tO9CSJ8OqG7qtz2EW00HElZG');

document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location.href);
  const queryParams: Record<string, string> = {};

  analytics.register(urlPathFilter);

  for (const [key, value] of url.searchParams.entries()) {
    queryParams[_.camelCase(key)] = value;
  }

  const additionalData = {
    url: url.toString(),
    path: url.pathname,
    userAgent: navigator.userAgent,
    fbc: Cookies.get('fbc'),
    fbp: Cookies.get('fbp'),
  };

  function parseUrlEncoded(str: string) {
    const vals: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(str)) {
      vals[k] = v;
    }
    return vals;
  }

  // Transform keys
  function extractContactAttrs(parsedCfFormBody: Record<string, string>): Record<string, string> {
    const contactAttrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsedCfFormBody)) {
      const subKey = key.replace('contact[', '').replace(']', '');
      if (subKey === 'phoneNumber') {
        contactAttrs.phone = value;
      } else {
        contactAttrs[_.camelCase(subKey)] = value;
      }
    }
    return contactAttrs;
  }

  // Get identity fields
  function extractIdentityAttrs(contactAttrs: Record<string, string>): Record<string, string> {
    const attrs: Record<string, string> = {};
    ['email', 'firstName', 'lastName', 'phone'].forEach((key) => {
      if (contactAttrs[key]) {
        attrs[key] = contactAttrs[key];
      }
    });
    return attrs;
  }

  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const [url, options] = args;
    const urlString = (url instanceof Request ? url.url : url).toString();
    if (
      ['xip.myclickfunnels', 'courses.xip'].some((url) => urlString.includes(url)) &&
      options &&
      options.body &&
      typeof options.body === 'string'
    ) {
      const parsedBody = parseUrlEncoded(options.body);
      const contactAttrs = extractContactAttrs(parsedBody);
      const idAttrs = extractIdentityAttrs(contactAttrs);

      console.log('Form Submitted Tracking');

      analytics.track('Clickfunnels Form Submitted', {
        ...additionalData,
        queryParams,
        contactAttrs,
      });

      if (idAttrs.email) {
        identifyFromEmail(idAttrs.email, idAttrs);
      }
    }

    return originalFetch.apply(this, args);
  };

  // Get the button element
  const button = document.querySelector('.elButton');

  // Add a click event listener to the button
  button.addEventListener('click', () => {
    // Get the text within the button
    const buttonText = button.textContent.trim();

    // Get the query params
    const url = new URL(window.location.href);
    const queryParams: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      queryParams[_.camelCase(key)] = value;
    }

    // Additional data
    const additionalData = {
      url: url.toString(),
      path: url.pathname,
      userAgent: navigator.userAgent,
      fbc: Cookies.get('fbc'),
      fbp: Cookies.get('fbp'),
    };

    // Track the click event with analytics
    analytics.track('Clickfunnels Button Clicked', {
      buttonText: buttonText,
      queryParams: queryParams,
      ...additionalData,
    });
  });

  // Track Wistia events via Segment
  initializeWistiaSegmentIntegration();
});
