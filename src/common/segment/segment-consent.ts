import { CookieCategory } from '../onetrust-utils';
import { Destination } from './segment-destinations';
import { Context, Plugin } from '@segment/analytics-next';

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
export const shouldLoadDestination = (
  destination: Destination,
  allowedCookieCategories: CookieCategory[],
): boolean => allowedCookieCategories.includes(destinationCookieCategory(destination));

/**
 * A Segment plugin that will add the user's consent as a property on every event.
 *
 * @param allowedCategories
 */
export const consentEnrichmentPlugin = (allowedCategories: CookieCategory[]): Plugin => {
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
