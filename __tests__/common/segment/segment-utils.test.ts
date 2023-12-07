import {
  _test_allowSegmentReload,
  analytics,
  currentSegmentUserEmail,
  enableSegment,
  identifyFromEmail,
} from '../../../src/common/segment/segment-utils';
import { User } from '@segment/analytics-next';

describe('enableSegment', () => {
  beforeEach(() => {
    _test_allowSegmentReload();
  });

  it('should load the first time it is called', () => {
    const mockLoad = jest.fn();
    const mockPage = jest.fn();
    analytics.load = mockLoad;
    analytics.page = mockPage;

    enableSegment('abc123');

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith({ writeKey: 'abc123' });
    expect(mockPage).toHaveBeenCalledTimes(1);
  });

  it('should be a no-op the second time it is called', () => {
    const mockLoad = jest.fn();
    const mockPage = jest.fn();
    analytics.load = mockLoad;
    analytics.page = mockPage;

    enableSegment('abc123');
    enableSegment('abc123');

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith({ writeKey: 'abc123' });
    expect(mockPage).toHaveBeenCalledTimes(1);
  });

  it('should complain if it is called with two different write keys', () => {
    const mockLoad = jest.fn();
    const mockPage = jest.fn();
    analytics.load = mockLoad;
    analytics.page = mockPage;

    enableSegment('abc123');
    expect(() => enableSegment('def456')).toThrow(
      'Segment was already loaded with a different write key',
    );

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith({ writeKey: 'abc123' });
    expect(mockPage).toHaveBeenCalledTimes(1);
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
