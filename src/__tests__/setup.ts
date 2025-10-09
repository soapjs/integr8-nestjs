/**
 * Jest setup file
 * This file runs before all tests
 */

// Only mock console in unit tests, not E2E tests
if (!process.env.INTEGR8_E2E_TEST) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.INTEGR8_MODE = 'true';

