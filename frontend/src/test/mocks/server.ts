/**
 * MSW server instance for test environment.
 *
 * RED PHASE: Will fail because MSW (msw) package and the frontend
 * scaffold don't exist yet.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the MSW server with mock handlers
export const server = setupServer(...handlers);
