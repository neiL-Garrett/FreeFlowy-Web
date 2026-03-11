import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/utils/runtime-config', () => ({
  getConfigValue: jest.fn(),
}));

import { Subscription, SubscriptionInterval, SubscriptionPlan } from '@/application/types';
import { getConfigValue } from '@/utils/runtime-config';

import {
  getProAccessPlanFromSubscriptions,
  hasProAccessFromPlans,
  isAppFlowyHosted,
} from '../subscription';

describe('subscription utils', () => {
  const mockGetConfigValue = getConfigValue as jest.MockedFunction<typeof getConfigValue>;

  beforeEach(() => {
    window.localStorage.clear();
    mockGetConfigValue.mockReturnValue('');
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('treats official cloud hosts as hosted', () => {
    mockGetConfigValue.mockReturnValue('https://test.appflowy.cloud');
    expect(isAppFlowyHosted()).toBe(true);

    mockGetConfigValue.mockReturnValue('https://beta.appflowy.cloud');
    expect(isAppFlowyHosted()).toBe(true);
  });

  it('treats localhost and loopback hosts as self-hosted', () => {
    mockGetConfigValue.mockReturnValue('http://localhost:8000');
    expect(isAppFlowyHosted()).toBe(false);

    mockGetConfigValue.mockReturnValue('http://127.0.0.1:8000');
    expect(isAppFlowyHosted()).toBe(false);
  });

  it('falls back to browser hostname and keeps localhost self-hosted', () => {
    mockGetConfigValue.mockReturnValue('');
    expect(window.location.hostname).toBe('localhost');
    expect(isAppFlowyHosted()).toBe(false);
  });

  it('supports forcing self-hosted behavior in tests', () => {
    mockGetConfigValue.mockReturnValue('https://test.appflowy.cloud');
    window.localStorage.setItem('__test_force_self_hosted', 'true');

    expect(isAppFlowyHosted()).toBe(false);
  });

  it('detects pro access from active plans', () => {
    expect(hasProAccessFromPlans([SubscriptionPlan.Team])).toBe(true);
    expect(hasProAccessFromPlans([SubscriptionPlan.Pro])).toBe(true);
    expect(hasProAccessFromPlans([SubscriptionPlan.Free])).toBe(false);
  });

  it('maps subscription details to effective plan', () => {
    expect(
      getProAccessPlanFromSubscriptions([
        {
          plan: SubscriptionPlan.Team,
          recurring_interval: SubscriptionInterval.Month,
          currency: 'USD',
          price_cents: 0,
        },
      ] as Subscription[])
    ).toBe(SubscriptionPlan.Pro);

    expect(
      getProAccessPlanFromSubscriptions([
        {
          plan: SubscriptionPlan.Free,
          recurring_interval: SubscriptionInterval.Month,
          currency: 'USD',
          price_cents: 0,
        },
      ] as Subscription[])
    ).toBe(SubscriptionPlan.Free);
  });
});
