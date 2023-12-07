import { AnalyticsBrowser } from '@segment/analytics-next';
import { CookieCategory, waitForInitialConsent } from './onetrust-utils';
import { Destination, fetchDestinations } from './segment-destinations';

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
 */
export const enableSegment = async (writeKey: string): Promise<void> => {
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
  analytics.load({ writeKey }, { integrations });
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
