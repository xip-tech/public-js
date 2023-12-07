import Cookies from 'js-cookie';
import { isEqual } from 'lodash';

type ConsentCallback = (allowedCategories: CookieCategory[]) => void;

const ONE_TRUST_BUTTON_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#accept-recommended-btn-handler',
  'button.save-preference-btn-handler',
];

export enum CookieCategory {
  STRICTLY_NECESSARY = 'C0001',
  PERFORMANCE = 'C0002',
  FUNCTIONAL = 'C0003',
  TARGETING = 'C0004',
  SOCIAL_MEDIA = 'C0005',
}

const onDocumentReady = (callback: () => void) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
};

/**
 * Returns true if a string (like 'C0001') is one of the known categories from the CookieCategory enum
 * @param category
 */
const isKnownCookieCategory = (category: string): category is CookieCategory =>
  Object.values(CookieCategory).includes(category as CookieCategory);

/**
 * Returns the name of a cookie category (like 'STRICTLY_NECESSARY') given its value (like 'C0001')
 *
 * @param {CookieCategory} value - The value representing a cookie category.
 * @returns {string} - The name of the cookie category.
 */
export const cookieCategoryName = (value: CookieCategory): string =>
  (Object.keys(CookieCategory) as Array<keyof typeof CookieCategory>).find(
    (key) => CookieCategory[key] === value,
  );

const isOneTrustButton = (node: Node): boolean =>
  ONE_TRUST_BUTTON_SELECTORS.some((selector) => node instanceof Element && node.matches(selector));

/**
 * Call a callback every time the user expresses a new set of allowed cookie categories. This will happen under the
 * following scenarios:
 *  1. User clicks a button like "Accept All" or "Save Preferences"
 *  2. User just loaded the page and we remember their consent from a prior visit
 *  3. User clicks a button to change their consent. We typically don't configure our banners to allow this, so this is
 *     unlikely to happen.
 *
 * @param callback - The callback to call when consent changes.
 */
export const onConsentChange = (callback: ConsentCallback) => {
  let reportedConsent: null | string[] = null;
  // Function that we can call any time there might have been a change to consent. It'll call our callback if consent
  // has actually changed.
  const reportConsentIfChanged = () => {
    const consent = parseOneTrustConsent();

    if (consent.length > 0 && !isEqual(consent, reportedConsent)) {
      reportedConsent = consent;
      callback(consent);
    }
  };

  // It's possible that we have a cookie from last time
  reportConsentIfChanged();

  // Attach to any buttons that exist as soon as the doc loads
  onDocumentReady(() => {
    // Attach click handlers to any existing one trust buttons
    document.querySelectorAll(ONE_TRUST_BUTTON_SELECTORS.join(', ')).forEach((button) => {
      button.addEventListener('click', reportConsentIfChanged);
    });

    // Listen for changes to the DOM and attach click handlers to any new buttons
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (isOneTrustButton(node)) {
            // The added node is a onetrust button. Add a click listener.
            node.addEventListener('click', reportConsentIfChanged);
          } else if (node instanceof Element) {
            // The node isn't a onetrust button, but let's check to see if any of its children are
            node
              .querySelectorAll(ONE_TRUST_BUTTON_SELECTORS.join(', '))
              .forEach((button) => button.addEventListener('click', reportConsentIfChanged));
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  });
};

/**
 * Waits for initial user consent regarding cookie categories.
 *
 * If consent changes, the page will be automatically refreshed.
 *
 * @returns {Promise<CookieCategory[]>} - A promise that resolves to an array of allowed cookie categories.
 */
export const waitForInitialConsent = (): Promise<CookieCategory[]> => {
  let allowedCategories: CookieCategory[] | null = null;
  return new Promise<CookieCategory[]>((resolve) => {
    onConsentChange((consent) => {
      if (allowedCategories == null) {
        allowedCategories = consent;
        resolve(allowedCategories);
      } else if (!isEqual(allowedCategories, consent)) {
        // User changed consent. Reload the page to make sure we load the correct destinations.
        window.location.reload();
        return;
      }
    });
  });
};

/**
 * Returns the current state of a user's consent as represented by OneTrust's cookies.
 */
const parseOneTrustConsent = (): CookieCategory[] => {
  // OneTrust stores a cookie that contains the date that the user closed the banner. If this cookie doesn't exist,
  // then the user hasn't closed the banner yet and we shouldn't consider any consent to have taken place.
  const alertBoxCookie = Cookies.get('OptanonAlertBoxClosed');
  if (!alertBoxCookie) {
    return [];
  }

  /*
  The OptanonConsent cookie has a bunch of information from OneTrust. Its value looks like a query string like this:
    isGpcEnabled=0&datestamp=Wed+Nov+08+2023+09:16:29+GMT-0800+(Pacific+Standard+Time)&version=202310.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0001:1,C0002:0,C0003:0,C0004:0&geolocation=;&AwaitingReconsent=false

  We care about the 'groups' field which looks like this:
      groups=C0001:1,C0002:0,C0003:0,C0004:0

  Each of these is a type of cookie (analytics, advertising, etc.) and :1 indicates opt in, :0 indicates opt out.
   */
  const consentCookie = Cookies.get('OptanonConsent');
  if (!consentCookie) {
    return [];
  }

  const parsed = new URLSearchParams(consentCookie);
  const rawGroups = parsed.get('groups');
  if (!rawGroups) {
    return [];
  }

  // Parse the groups and only return the ones with :1 at the end
  return rawGroups
    .split(',')
    .filter((category) => category.endsWith(':1'))
    .map((category) => category.split(':')[0])
    .filter(isKnownCookieCategory);
};
