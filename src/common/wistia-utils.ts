import { analytics, currentSegmentUserEmail } from './segment-utils';
import { CookieCategory, waitForInitialConsent } from './onetrust-utils';

export const initializeWistiaSegmentIntegration = async () => {
  // Make sure the user has consented to performance cookies
  const consent = await waitForInitialConsent();
  if (!consent.includes(CookieCategory.PERFORMANCE)) {
    return;
  }

  window._wq = window._wq || [];
  window._wq.push({
    id: '_all',
    onReady: (video) => {
      // Extract some common properties from the video that we want to send with all of our track events
      const commonTrackProperties = {
        wistiaVideoId: video.hashedId(),
        videoName: video.name(),
        wistiaVisitorKey: video.visitorKey(),
      };

      // Attempt to grab the user email from segment and pass it to wistia
      analytics.ready(async () => {
        const userEmail = await currentSegmentUserEmail();
        if (userEmail) {
          video.email(userEmail);
        }
      });

      // When the video is played for the first time, fire a segment event
      let playEventFired = false;
      video.bind('play', () => {
        if (!playEventFired) {
          analytics.track('Video Played', commonTrackProperties);
          playEventFired = true;
        }
      });

      // When the user watches key threshold amounts of the video, fire segment events
      video.bind('percentwatchedchanged', (percent: number, lastPercent: number) => {
        [0.25, 0.5, 0.75, 0.95].forEach((threshold) => {
          if (percent >= threshold && lastPercent < threshold) {
            analytics.track('Video Watched', {
              ...commonTrackProperties,
              fractionWatched: threshold,
            });
          }
        });
      });

      // If a conversion occurred using Wistia's built-in CTA, track it
      video.bind('conversion', (type, email, firstName, lastName) => {
        analytics.track('Video Lead Captured', {
          ...commonTrackProperties,
          conversionType: type,
          email,
          firstName,
          lastName,
        });
      });
    },
  });
};
