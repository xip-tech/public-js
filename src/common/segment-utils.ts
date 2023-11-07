import { AnalyticsBrowser } from '@segment/analytics-next';

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

/**
 * Allow segment to be used on the page. Once this method is called, any previous and future calls to
 * analytics.identify(), analytics.track() etc. will be sent to segment. This will also automatically trigger a call to
 * analytics.page() so that a page view event can be captured.
 *
 * Only one write key can be used per page.
 *
 * @param writeKey The write key of the segment source that we wish to use for this page.
 */
export const enableSegment = (writeKey: string) => {
  if (segmentLoadedWriteKey == null) {
    analytics.load({ writeKey });
    analytics.page();
    segmentLoadedWriteKey = writeKey;
  } else if (segmentLoadedWriteKey !== writeKey) {
    throw new Error('Segment was already loaded with a different write key');
  }
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
