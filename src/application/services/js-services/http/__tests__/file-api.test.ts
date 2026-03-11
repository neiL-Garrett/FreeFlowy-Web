import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { SubscriptionPlan } from '@/application/types';

const mockNotifyError = jest.fn();
const mockUploadUrl = '/api/file_storage/upload';
const mockResolvedFileUrl = '/api/file_storage/blob/file-id';
const mockPut = jest.fn();
const mockGetActiveSubscription = jest.fn();
const mockIsAppFlowyHosted = jest.fn();
const mockHasProAccessFromPlans = jest.fn();

jest.mock('@/components/_shared/notify', () => ({
  notify: {
    error: mockNotifyError,
  },
}));

jest.mock('@/utils/file-storage-url', () => ({
  getAppFlowyFileUploadUrl: jest.fn(() => mockUploadUrl),
  getAppFlowyFileUrl: jest.fn(() => mockResolvedFileUrl),
}));

jest.mock('@/utils/subscription', () => ({
  isAppFlowyHosted: mockIsAppFlowyHosted,
  hasProAccessFromPlans: mockHasProAccessFromPlans,
}));

jest.mock('../core', () => ({
  getAxios: jest.fn(() => ({
    put: mockPut,
  })),
  handleAPIError: jest.fn((error: unknown) => error),
}));

jest.mock('../billing-api', () => ({
  getActiveSubscription: mockGetActiveSubscription,
}));

import { uploadFile } from '../file-api';

const createFile = (sizeBytes: number) => {
  return new File([new Uint8Array(sizeBytes)], 'test.bin', {
    type: 'application/octet-stream',
  });
};

describe('file-api upload limits', () => {
  const workspaceId = 'workspace-1';
  const viewId = 'view-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPut.mockResolvedValue({
      data: {
        code: 0,
        data: {
          file_id: 'file-id',
        },
      },
    });
  });

  it('skips billing gate for large uploads on self-hosted instances', async () => {
    mockIsAppFlowyHosted.mockReturnValue(false);

    const bigFile = createFile(8 * 1024 * 1024);
    const result = await uploadFile(workspaceId, viewId, bigFile);

    expect(mockGetActiveSubscription).not.toHaveBeenCalled();
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockResolvedFileUrl);
  });

  it('blocks large uploads on official host without pro plan', async () => {
    mockIsAppFlowyHosted.mockReturnValue(true);
    mockGetActiveSubscription.mockResolvedValue([SubscriptionPlan.Free]);
    mockHasProAccessFromPlans.mockReturnValue(false);

    const bigFile = createFile(8 * 1024 * 1024);

    await expect(uploadFile(workspaceId, viewId, bigFile)).rejects.toMatchObject({
      code: 413,
      message: 'File size is too large. Please upgrade your plan for unlimited uploads.',
    });

    expect(mockNotifyError).toHaveBeenCalledWith('Your file is over 7 MB limit of the Free plan. Upgrade for unlimited uploads.');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('returns a self-hosted friendly 413 message', async () => {
    mockIsAppFlowyHosted.mockReturnValue(false);
    mockPut.mockRejectedValue({
      response: {
        status: 413,
      },
    });

    const file = createFile(1024);

    await expect(uploadFile(workspaceId, viewId, file)).rejects.toMatchObject({
      code: 413,
      message: 'File size is too large for this server.',
    });
  });
});
