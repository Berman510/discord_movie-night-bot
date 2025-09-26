/* Jest unit tests for utils/config-check.js */

// Mock the database module used by config-check
jest.mock('../../database', () => {
  return {
    __esModule: true,
    isConnected: true,
    getGuildConfig: jest.fn(),
  };
});

// Mock logger to avoid noisy output if error path is exercised
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

const database = require('../../database');
const cfgCheck = require('../../utils/config-check');

describe('config-check', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns isConfigured=true when required config is present', async () => {
    database.getGuildConfig.mockResolvedValue({
      movie_channel_id: '123',
      admin_channel_id: '456',
      session_viewing_channel_id: '789',
      viewer_roles: ['role1'],
      admin_roles: ['roleA'],
    });

    const result = await cfgCheck.checkConfiguration('guild-1');
    expect(result).toEqual({
      isConfigured: true,
      missingItems: [],
      message: null,
    });
  });

  test('returns isConfigured=false when no config exists', async () => {
    database.getGuildConfig.mockResolvedValue(null);

    const result = await cfgCheck.checkConfiguration('guild-2');
    expect(result.isConfigured).toBe(false);
    expect(result.missingItems).toContain('All configuration');
    expect(typeof result.message).toBe('string');
    expect(result.message).toMatch(/Bot not configured/i);
  });
});
