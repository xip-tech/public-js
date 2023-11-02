import Cookies from 'js-cookie';
import _ from 'lodash';
import { identifyFromEmail } from '../common/segment-utils';
import { initializeWistiaSegmentIntegration } from '../common/wistia-utils';

document.addEventListener('DOMContentLoaded', () => {
  const url = new URL(window.location.href);
  const queryParams: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    queryParams[_.camelCase(key)] = value;
  }

  const additionalData = {
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

      window.analytics.track('Form Submitted', {
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

  // Track Wistia events via Segment
  initializeWistiaSegmentIntegration();
});
