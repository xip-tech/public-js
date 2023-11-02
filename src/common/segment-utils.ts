type SegmentTraits = { email?: string; firstName?: string; lastName?: string };

/**
 * Returns the traits of the current user as tracked by segment
 */
export const currentSegmentTraits = (): SegmentTraits => {
  // Have to use this nasty type hack because the typescript definitions for segment are wrong (they say that .traits()
  // returns nothing but it actually returns the current traits)
  const traits = window.analytics?.user()?.traits() as unknown as SegmentTraits | undefined;
  return traits || {};
};

/**
 * Returns the current user's email address as tracked by segment.
 *
 * We will attempt to fetch this from the user's email trait if possible. Otherwise, we'll see if the user has an ID
 * that looks like an email address.
 */
export const currentSegmentUserEmail = (): string | undefined => {
  // Check the current Segment user traits for an email
  const traits = currentSegmentTraits();
  if (traits?.email) {
    return traits.email;
  }

  // We didn't find it. See if the current user ID is an email
  const userId = window.analytics?.user()?.id();
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
  window.analytics.identify(email.trim().toLowerCase(), updatedTraits);
};
