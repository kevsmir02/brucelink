jest.mock('@react-native-cookies/cookies', () => ({
  get: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  DownloadDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  downloadFile: jest.fn(() => ({ promise: Promise.resolve({ statusCode: 200 }) })),
  readFile: jest.fn(() => Promise.resolve('')),
}));

import {
  apiClient,
  sendCommand,
  registerUnauthorizedHandler,
  setBaseUrl,
  getImagePreviewUrl,
} from '../../src/services/api';

describe('api helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds image preview URLs from base url, fs, and file path', () => {
    setBaseUrl('http://172.0.0.1/');
    const url = getImagePreviewUrl('SD', '/images/photo one.png');
    expect(url).toBe(
      'http://172.0.0.1/file?fs=SD&name=%2Fimages%2Fphoto%20one.png&action=image',
    );
  });

  it('sends /cm commands as x-www-form-urlencoded payload', async () => {
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: 'ok' } as never);

    const response = await sendCommand('nav sel');

    expect(postSpy).toHaveBeenCalledWith(
      '/cm',
      'cmnd=nav%20sel',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'text',
        timeout: 15000,
      }),
    );
    expect(response).toBe('ok');
  });

  it('invokes unauthorized handler for 401 command failures', async () => {
    const handler = jest.fn();
    registerUnauthorizedHandler(handler);

    jest.spyOn(apiClient, 'post').mockRejectedValue({
      response: { status: 401, data: 'Unauthorized' },
    });

    await expect(sendCommand('info')).rejects.toThrow('Unauthorized access (401)');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
