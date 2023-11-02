import {
  currentSegmentTraits,
  currentSegmentUserEmail,
  identifyFromEmail,
} from '../../src/common/segment-utils';

describe('currentSegmentTraits', () => {
  it('should extract the traits', () => {
    (window as any).analytics = {
      user: () => ({
        traits: () => ({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      }),
    };

    expect(currentSegmentTraits()).toEqual({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
  });

  it("should return empty object when Segment isn't initialized", () => {
    window.analytics = undefined;
    expect(currentSegmentTraits()).toEqual({});
  });

  it('should return empty object when Segment.user() is blank', () => {
    (window as any).analytics = {
      user: (): any => undefined,
    };
    expect(currentSegmentTraits()).toEqual({});
  });

  it('should return empty object when Segment.user().traits() is blank', () => {
    (window as any).analytics = {
      user: () => ({
        traits: (): any => undefined,
      }),
    };
    expect(currentSegmentTraits()).toEqual({});
  });
});

describe('currentSegmentUserEmail', () => {
  it("should use the user's email trait if available", () => {
    (window as any).analytics = {
      user: () => ({
        traits: () => ({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      }),
    };

    expect(currentSegmentUserEmail()).toEqual('test@example.com');
  });

  it('should use the user ID if it looks like an email', () => {
    (window as any).analytics = {
      user: () => ({
        traits: (): any => undefined,
        id: () => 'test@example.com',
      }),
    };

    expect(currentSegmentUserEmail()).toEqual('test@example.com');
  });

  it('should not use the user ID if it does not like an email', () => {
    (window as any).analytics = {
      user: () => ({
        traits: (): any => undefined,
        id: () => 'test',
      }),
    };

    expect(currentSegmentUserEmail()).toBeUndefined();
  });

  it('should be graceful if there is no user ID', () => {
    (window as any).analytics = {
      user: () => ({
        traits: (): string | undefined => undefined,
        id: (): string | undefined => undefined,
      }),
    };

    expect(currentSegmentUserEmail()).toBeUndefined();
  });
});

describe('identifyFromEmail', () => {
  it('should call analytics.identify() with the email and traits', () => {
    (window as any).analytics = {
      identify: jest.fn(),
    };

    identifyFromEmail('test@example.com', { firstName: 'Test' });

    expect(window.analytics.identify).toHaveBeenCalledWith('test@example.com', {
      email: 'test@example.com',
      firstName: 'Test',
    });
  });

  it('should call not override a provided email trait', () => {
    (window as any).analytics = {
      identify: jest.fn(),
    };

    identifyFromEmail('test@example.com', { firstName: 'Test', email: 'TeSt@example.com' });

    expect(window.analytics.identify).toHaveBeenCalledWith('test@example.com', {
      email: 'TeSt@example.com',
      firstName: 'Test',
    });
  });

  it('should trim and downcase the email', () => {
    (window as any).analytics = {
      identify: jest.fn(),
    };

    identifyFromEmail('    TEST@example.com    ', { firstName: 'Test' });

    expect(window.analytics.identify).toHaveBeenCalledWith('test@example.com', {
      email: 'TEST@example.com',
      firstName: 'Test',
    });
  });
});
