import { CookieCategory } from '../../../src/common/onetrust-utils';
import {
  _test_allowSegmentReload,
  analytics,
  currentSegmentUserEmail,
  enableSegment,
  identifyFromEmail,
} from '../../../src/common/segment/segment-utils';
import { User } from '@segment/analytics-next';
import { Destination } from '../../../src/common/segment/segment-destinations';
import Mock = jest.Mock;

let allowedCookieCategories: CookieCategory[] = [];
let allDestinations: Destination[] = [];
jest.mock('../../../src/common/onetrust-utils', () => {
  const original = jest.requireActual('../../../src/common/onetrust-utils');
  return {
    __esModule: true,
    ...original,
    onConsentChange: jest.fn().mockImplementation((callback) => callback(allowedCookieCategories)),
    waitForInitialConsent: jest.fn().mockImplementation(async () => allowedCookieCategories),
  };
});
jest.mock('../../../src/common/segment/segment-destinations', () => {
  const original = jest.requireActual('../../../src/common/segment/segment-destinations');
  return {
    __esModule: true,
    ...original,
    fetchDestinations: jest.fn().mockImplementation(async () => allDestinations),
  };
});

describe('enableSegment', () => {
  beforeEach(() => {
    analytics.load = jest.fn();
    analytics.page = jest.fn();
    allowedCookieCategories = [CookieCategory.PERFORMANCE, CookieCategory.STRICTLY_NECESSARY];
    allDestinations = [];
    _test_allowSegmentReload();
  });

  it('should load the first time it is called', async () => {
    await enableSegment('abc123');

    expect(analytics.load).toHaveBeenCalledTimes(1);
    expect(analytics.load).toHaveBeenCalledWith(
      expect.objectContaining({
        writeKey: 'abc123',
        plugins: expect.any(Array),
      }),
      // expect.anything(),
      expect.objectContaining({
        integrations: expect.any(Object),
      }),
    );
    expect(analytics.page).toHaveBeenCalledTimes(1);
  });

  it('should throw an error the second time it is called', async () => {
    await enableSegment('abc123');
    await expect(enableSegment('abc123')).rejects.toThrow('Attempt to load segment more than once');

    expect(analytics.load).toHaveBeenCalledTimes(1);
    expect(analytics.page).toHaveBeenCalledTimes(1);
  });

  it('should enable destinations based on consent', async () => {
    // Only allow strictly necessary
    allowedCookieCategories = [CookieCategory.STRICTLY_NECESSARY];

    // Create some other destinations too
    allDestinations = [
      { id: '1', name: 'Heap', description: '', website: '', category: 'Analytics' },
      {
        id: '2',
        name: 'Facebook Pixel',
        description: '',
        website: '',
        category: 'Advertising',
      },
      {
        id: '3',
        name: 'Customer.io',
        description: '',
        website: '',
        category: 'Raw Data',
      },
    ];

    await enableSegment('abc123');

    // Make sure load was called w/the correct args
    expect(analytics.load).toHaveBeenCalledTimes(1);
    const loadArgs = (analytics.load as Mock).mock.calls[0];
    expect(loadArgs[1]).toEqual(
      expect.objectContaining({
        integrations: {
          Heap: false,
          'Facebook Pixel': false,
          'Customer.io': true,
        },
      }),
    );
  });
});

describe('currentSegmentUserEmail', () => {
  it('should return the email from user traits', async () => {
    jest.spyOn(analytics, 'user').mockResolvedValue({
      traits: () => ({ email: 'test@example.com' }),
      id: () => 'not-an-email',
    } as User);

    const email = await currentSegmentUserEmail();
    expect(email).toBe('test@example.com');
  });

  it("should use the user's email trait if available", async () => {
    jest.spyOn(analytics, 'user').mockResolvedValue({
      traits: () => ({ email: 'test@example.com', firstName: 'Test', lastName: 'User' }),
    } as User);

    expect(await currentSegmentUserEmail()).toEqual('test@example.com');
  });

  it('should use the user ID if it looks like an email', async () => {
    jest.spyOn(analytics, 'user').mockResolvedValue({
      traits: () => ({}),
      id: () => 'test@example.com',
    } as User);

    expect(await currentSegmentUserEmail()).toEqual('test@example.com');
  });

  it('should not use the user ID if it does not like an email', async () => {
    jest.spyOn(analytics, 'user').mockResolvedValue({
      traits: () => ({}),
      id: () => 'test',
    } as User);

    expect(await currentSegmentUserEmail()).toBeUndefined();
  });

  it('should be graceful if there is no user ID', async () => {
    jest.spyOn(analytics, 'user').mockResolvedValue({
      traits: () => ({}),
      id: () => undefined,
    } as User);

    expect(await currentSegmentUserEmail()).toBeUndefined();
  });
});

describe('identifyFromEmail', () => {
  it('should call analytics.identify() with the email and traits', () => {
    const mockIdentify = jest.fn();
    analytics.identify = mockIdentify;

    identifyFromEmail('test@example.com', { firstName: 'Test' });

    expect(mockIdentify).toHaveBeenCalledWith('test@example.com', {
      email: 'test@example.com',
      firstName: 'Test',
    });
  });

  it('should not override a provided email trait', () => {
    const mockIdentify = jest.fn();
    analytics.identify = mockIdentify;

    identifyFromEmail('test@example.com', { firstName: 'Test', email: 'TeSt@example.com' });

    expect(mockIdentify).toHaveBeenCalledWith('test@example.com', {
      email: 'TeSt@example.com',
      firstName: 'Test',
    });
  });

  it('should trim and downcase the email', () => {
    const mockIdentify = jest.fn();
    analytics.identify = mockIdentify;

    identifyFromEmail('    TEST@example.com    ', { firstName: 'Test' });

    expect(mockIdentify).toHaveBeenCalledWith('test@example.com', {
      email: 'TEST@example.com',
      firstName: 'Test',
    });
  });
});
