import {
  analytics,
  currentSegmentUserEmail,
  identifyFromEmail,
} from '../../src/common/segment-utils';
import { User } from '@segment/analytics-next';

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
