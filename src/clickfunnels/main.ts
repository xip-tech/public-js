import _ from 'lodash';
import {
  analytics,
  enableSegment,
  identifyFromEmail,
  getAdditionalWindowData,
  registerLiveEventHandler,
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
   * Handles the click event for a button element.
   * @param event - The click event.
   */
  function buttonClickHandler(event: Event) {
    // get the element that was clicked
    const element = event.target as HTMLElement;

    const buttonText = element.textContent?.trim() || '';
    const additionalEventData = getAdditionalWindowData(window, navigator);

    console.log('buttonText', buttonText);

    // Track the click event with analytics
    analytics.track('Clickfunnels Button Clicked', {
      buttonText,
      ...additionalEventData,
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

  registerLiveEventHandler('.elButton', 'click', buttonClickHandler);

  // Track Wistia events via Segment
  initializeWistiaSegmentIntegration();
});
