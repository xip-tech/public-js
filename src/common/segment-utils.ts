import { AnalyticsBrowser, Context, Plugin } from '@segment/analytics-next';
import { CookieCategory, waitForInitialConsent } from './onetrust-utils';
import { Destination, fetchDestinations } from './segment-destinations';
import Cookies from 'js-cookie';
import _ from 'lodash';

/**
 * This is the shared instance of analytics (the Segment library) that should be used across the page.
 *
 * Code can call track, identify, etc. immediately by referring to this variable. However, the data won't actually be
 * sent to segment until enableSegment() is called.
 */
export const analytics = new AnalyticsBrowser();

let segmentLoadedWriteKey: null | string = null;

/**
 * For testing purposes only. This method should not be called in production code.
 */
export const _test_allowSegmentReload = () => {
  segmentLoadedWriteKey = null;
};

const DESTINATION_NAME_TO_COOKIE_CATEGORY: Record<string, CookieCategory> = {
  Heap: CookieCategory.PERFORMANCE,
  Hotjar: CookieCategory.PERFORMANCE,
  'Facebook Pixel': CookieCategory.TARGETING,
  'Customer.io (Actions)': CookieCategory.STRICTLY_NECESSARY,
  'Customer.io': CookieCategory.STRICTLY_NECESSARY,
  'Webhooks (Actions)': CookieCategory.STRICTLY_NECESSARY,
};

const DESTINATION_CATEGORY_TO_COOKIE_CATEGORY: Record<string, CookieCategory> = {
  Analytics: CookieCategory.PERFORMANCE,
  Advertising: CookieCategory.TARGETING,
  'Heatmaps & Recordings': CookieCategory.PERFORMANCE,
  'Raw Data': CookieCategory.STRICTLY_NECESSARY,
};

/**
 * Determine the cookie category for a given segment destination.
 *
 * @param {Destination} destination - The destination object.
 * @returns {CookieCategory} - The cookie category for the destination.
 */
const destinationCookieCategory = (destination: Destination): CookieCategory =>
  DESTINATION_NAME_TO_COOKIE_CATEGORY[destination.name] || // If we have hardcoded a cookie category for this destination, use it
  DESTINATION_CATEGORY_TO_COOKIE_CATEGORY[destination.category] || // If we have hardcoded a cookie category for this destination's category, use it
  CookieCategory.PERFORMANCE; // Otherwise, assume it is a performance cookie

/**
 * Determines whether the destination should be loaded based on the allowed cookie categories.
 *
 * @param {Destination} destination - The destination to check.
 * @param {CookieCategory[]} allowedCookieCategories - The list of allowed cookie categories per the user's consent.
 * @returns {boolean} Whether the destination should be loaded or not.
 */
const shouldLoadDestination = (
  destination: Destination,
  allowedCookieCategories: CookieCategory[],
): boolean => allowedCookieCategories.includes(destinationCookieCategory(destination));

/**
 * Allow segment to be used on the page. Once this method is called, any previous and future calls to
 * analytics.identify(), analytics.track() etc. will be sent to segment. This will also automatically trigger a call to
 * analytics.page() so that a page view event can be captured.
 *
 * Only one write key can be used per page.
 *
 * @param writeKey The write key of the segment source that we wish to use for this page.
 * @param plugins Optional list of plugins to enable.
 */
export const enableSegment = async (writeKey: string, ...plugins: Plugin[]): Promise<void> => {
  // Make sure we weren't asked to load segment a second time with a different write key.
  if (segmentLoadedWriteKey != null) {
    if (segmentLoadedWriteKey !== writeKey) {
      throw new Error('Segment was already loaded with a different write key');
    } else {
      // We were asked to load a second time with the same write key. Ignore it.
      return;
    }
  }
  segmentLoadedWriteKey = writeKey;

  // Track the initial page event. This will be buffered until we actually call analytics.load.
  analytics.page();

  // Find the list of destinations that are configured for this write key, and wait for consent to be expressed (either
  // saved from a previous visit or via the user interacting with the banner)
  const segmentDestinations = await fetchDestinations(writeKey);
  const allowedCategories = await waitForInitialConsent();

  // Turn on or off each destination based on the user's consent
  const integrations: Record<string, boolean> = {};
  for (const destination of segmentDestinations) {
    integrations[destination.name] = shouldLoadDestination(destination, allowedCategories);
  }

  // Load segment w/allowed destinations
  analytics.load(
    {
      writeKey,
      plugins: [
        consentEnrichmentPlugin(allowedCategories), // Register a plugin that will add the consent to every event
        ...plugins,
      ],
    },
    { integrations },
  );
};

/**
 * A Segment plugin that will add the user's consent as a property on every event.
 *
 * @param allowedCategories
 */
const consentEnrichmentPlugin = (allowedCategories: CookieCategory[]): Plugin => {
  const enrichWithConsent = (path: string) => (ctx: Context) => {
    ctx.updateEvent(path, allowedCategories.join(','));
    return ctx;
  };

  return {
    name: 'OneTrust Consent',
    type: 'enrichment',
    version: '1.0.0',
    isLoaded: () => true,
    load: () => Promise.resolve(),
    track: enrichWithConsent('properties.consent'),
    identify: enrichWithConsent('traits.consent'),
    page: enrichWithConsent('properties.consent'),
  };
};

/**
 * Returns the current user's email address as tracked by segment.
 *
 * We will attempt to fetch this from the user's email trait if possible. Otherwise, we'll see if the user has an ID
 * that looks like an email address.
 */
export const currentSegmentUserEmail = async (): Promise<string | undefined> => {
  // Check the current Segment user traits for an email
  const user = await analytics.user();
  const traits = user.traits();
  if (traits.email) {
    return traits.email;
  }

  // We didn't find it. See if the current user ID is an email
  const userId = user.id();
  if (userId && userId.includes('@')) {
    return userId;
  }

  return undefined;
};

/**
 * Call Segment.identify() with the given email and traits.
 *
 * Normalizes the email and makes sure to include it in the traits.
 *
 * @param email
 * @param traits
 */
export const identifyFromEmail = (email: string, traits: Record<string, string>) => {
  const updatedTraits: Record<string, string> = { ...traits };
  if (!('email' in updatedTraits)) {
    updatedTraits['email'] = email.trim();
  }
  analytics.identify(email.trim().toLowerCase(), updatedTraits);
};

/**
 * Standard Facebook events that don't take any required metadata
 */
type FacebookBasicEvent =
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'Schedule'
  | 'Search'
  | 'SubmitApplication'
  | 'ViewContent';

/**
 * Trigger a standard Facebook event.
 *
 * @see https://www.facebook.com/business/help/402791146561655
 *
 * @param eventName
 */
export const trackFacebookBasicEvent = (eventName: FacebookBasicEvent) => {
  analytics.track(eventName, {}, { integrations: { All: false, 'Facebook Pixel': true } });
};

/**
 * Get additional url and navigator properties that should be included with every event.
 * @param window The current page window.
 * @param navigator The current page navigator.
 */
export const getAdditionalWindowData = (window: Window, navigator: Navigator) => {
  const url = new URL(window.location.href);

  const queryParams: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    queryParams[_.camelCase(key)] = value;
  }

  const additionalWindowData = {
    url: url.toString(),
    path: url.pathname,
    userAgent: navigator.userAgent,
    fbc: Cookies.get('fbc'),
    fbp: Cookies.get('fbp'),
    queryParams,
  };

  return additionalWindowData;
};

/**
 * Registers a live event handler for a given selector and event.
 * The handler will be called for all matching elements, including those added dynamically.
 *
 * @param selector - The CSS selector for the elements to attach the event listener to.
 * @param event - The name of the event to listen for.
 * @param callback - The function to call when the event is triggered.
 */
export const registerLiveEventHandler = (
  selector: string,
  event: string,
  // eslint-disable-next-line no-unused-vars
  callback: (event: Event) => void,
): void => {
  // Attach event listeners to existing elements
  document.querySelectorAll(selector).forEach((element) => {
    element.addEventListener(event, callback);
  });

  // MutationObserver to observe for new elements added dynamically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check if the added node itself matches the selector
          if (node.matches(selector)) {
            node.addEventListener(event, callback);
          }
          // Also, check all its descendant nodes
          node.querySelectorAll(selector).forEach((child) => {
            child.addEventListener(event, callback);
          });
        }
      });
    });
  });

  // Start observing the document body for added nodes
  observer.observe(document.body, { childList: true, subtree: true });
};
