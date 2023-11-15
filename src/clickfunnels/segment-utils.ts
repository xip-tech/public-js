import type { Plugin } from '@segment/analytics-next';

/**
 * Define a Segment plugin that will parse url paths from learn.xip.co. This plugin is
 * responsible for enriching the event with properties related to Clickfunnels URLs.
 * It adds the following properties to the event:
 * - instructor: The name of the instructor associated with the funnel.
 * - funnelType: The type of the funnel.
 * - funnelStep: The step of the funnel.
 * - version: The version of the funnel.
 * - funnel: The name of the funnel for top-level link pages.
 *
 * @see https://github.com/segmentio/analytics-next/tree/master/packages/browser#-plugins
 *
 */
export const ClickfunnelsUrlEnrichmentPlugin: Plugin = {
  name: 'Clickfunnels Url Enrichment',
  type: 'enrichment',
  version: '1.0.0',

  isLoaded: () => true,
  load: () => Promise.resolve(),

  track: (ctx) => {
    const url = new URL(ctx.event.properties?.url || '');

    let urlPath = url.pathname;

    /**
     * Handle the case where an event comes from a clickfunnels
     * page, ending in '-page', and not a clickfunnels funnel page.
     * Example: https://learn.xip.co/instructor/karri_hanninen-vsl-opt_in-v1-page
     */
    if (urlPath.endsWith('-page')) {
      urlPath = urlPath.slice(0, -5);
    }

    /**
     * Handle the case where the event comes from a top-level link page. A top-level
     * link is how funnels are shared on clickfunnels and results in an immediate redirect
     * Clickfunnels also does not allow underscores in top level links. Because of
     * this, we only ever tag the event with a 'funnel' property, and not a funnel step or funnel type.
     * Example: https://learn.xip.co/instructor/karri-hanninen-vsl-top-level
     */
    if (urlPath.endsWith('-top-level')) {
      const funnel = urlPath.slice(0, -10);
      ctx.event.properties = {
        ...ctx.event.properties,
        funnel,
      };
      return ctx;
    }

    const pathComponents = urlPath.replace('/', '').split('-');

    // Add checks to ensure the URL path matches the expected pattern
    if (pathComponents.length >= 3 && pathComponents.length <= 4) {
      // Assuming pathComponents array contains [instructor, funnel type, funnel step, version] in order
      const [instructor, funnelType, funnelStep, version = ''] = pathComponents;

      // Append these as properties to the event
      ctx.event.properties = {
        ...ctx.event.properties,
        instructor,
        funnelType,
        funnelStep,
        version,
      };
    }

    return ctx;
  },
};
