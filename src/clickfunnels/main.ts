import _ from 'lodash';
import {
  analytics,
  enableSegment,
  identifyFromEmail,
  getAdditionalWindowData,
} from '../common/segment-utils';
import { initializeWistiaSegmentIntegration } from '../common/wistia-utils';
import { ClickfunnelsUrlEnrichmentPlugin } from '../clickfunnels/segment-utils';

enableSegment('YTsllNl2tO9CSJ8OqG7qtz2EW00HElZG', ClickfunnelsUrlEnrichmentPlugin);

document.addEventListener('DOMContentLoaded', () => {
  /**
   * Parses a URL-encoded string into an object with key-value pairs.
   * @param str The URL-encoded string to parse.
   * @returns An object with key-value pairs representing the parsed data.
   */
  function parseUrlEncoded(str: string) {
    const vals: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(str)) {
      vals[k] = v;
    }
    return vals;
  }

  /**
   * Extracts contact attributes from a parsed ClickFunnels form body.
   * @param parsedCfFormBody - The parsed ClickFunnels form body.
   * @returns A record of contact attributes.
   */
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

  /**
   * Extracts identity attributes from a given contact attributes object.
   * @param contactAttrs - The contact attributes object to extract identity attributes from.
   * @returns The extracted identity attributes as a new object.
   */
  function extractIdentityAttrs(contactAttrs: Record<string, string>): Record<string, string> {
    const attrs: Record<string, string> = {};
    ['email', 'firstName', 'lastName', 'phone'].forEach((key) => {
      if (contactAttrs[key]) {
        attrs[key] = contactAttrs[key];
      }
    });
    return attrs;
  }

  /**
   * Adds a click event listener to the specified button element and tracks the click event with analytics.
   * @param button - The button element to add the click event listener to.
   */
  function addButtonClickListener(button: HTMLElement) {
    button.addEventListener('click', () => {
      const buttonText = button.textContent?.trim() || '';
      const additionalEventData = getAdditionalWindowData(window, navigator);

      // Track the click event with analytics
      analytics.track('Clickfunnels Button Clicked', {
        buttonText,
        ...additionalEventData,
      });
    });
  }

  // Override window.fetch to catch clickfunnels form submissions
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const [url, options] = args;
    const urlString = (url instanceof Request ? url.url : url).toString();
    const additionalEventData = getAdditionalWindowData(window, navigator);
    if (
      ['xip.myclickfunnels', 'learn.xip'].some((url) => urlString.includes(url)) &&
      options &&
      options.body &&
      typeof options.body === 'string'
    ) {
      const parsedBody = parseUrlEncoded(options.body);
      const contactAttrs = extractContactAttrs(parsedBody);
      const idAttrs = extractIdentityAttrs(contactAttrs);

      analytics.track('Clickfunnels Form Submitted', {
        ...additionalEventData,
        contactAttrs,
      });

      if (idAttrs.email) {
        identifyFromEmail(idAttrs.email, idAttrs);
      }
    }

    return originalFetch.apply(this, args);
  };

  // Attach listeners to all buttons currently on the page
  document.querySelectorAll('.elButton').forEach((element: HTMLElement) => {
    addButtonClickListener(element);
  });

  // MutationObserver to observe for new buttons added dynamically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.matches('.elButton')) {
          addButtonClickListener(node);
        }
      });
    });
  });

  // Start observing the document body for added nodes
  observer.observe(document.body, { childList: true, subtree: true });

  // Track Wistia events via Segment
  initializeWistiaSegmentIntegration();
});
