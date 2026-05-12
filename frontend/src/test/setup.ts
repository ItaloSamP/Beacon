/**
 * Vitest test setup file.
 *
 * Configures MSW (Mock Service Worker) to intercept API calls during tests.
 * This prevents tests from making real HTTP requests to the backend.
 *
 * RED PHASE: This file and the modules it imports don't exist yet.
 * Tests will fail with module-not-found errors until the executor
 * creates the frontend scaffold.
 */

import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test (prevents test pollution)
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// Extend vitest with jest-dom matchers
import '@testing-library/jest-dom/vitest';
