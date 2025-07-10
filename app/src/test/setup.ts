import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock supabase module
vi.mock('../lib/supabase', () => {
  const mockChain = {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    neq: vi.fn(() => mockChain),
    gt: vi.fn(() => mockChain),
    gte: vi.fn(() => mockChain),
    lt: vi.fn(() => mockChain),
    lte: vi.fn(() => mockChain),
    ilike: vi.fn(() => mockChain),
    like: vi.fn(() => mockChain),
    is: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    contains: vi.fn(() => mockChain),
    containedBy: vi.fn(() => mockChain),
    order: vi.fn(() => mockChain),
    limit: vi.fn(() => mockChain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: vi.fn((callback) => Promise.resolve({ data: [], error: null }).then(callback)),
    catch: vi.fn(),
  };

  return {
    supabase: {
      auth: {
        signInWithOtp: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        getUser: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
      from: vi.fn(() => mockChain),
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
  auth: {
    signIn: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  db: {
    getPlayDates: vi.fn(),
    getPlayDate: vi.fn(),
    getPlayers: vi.fn(),
    getMatches: vi.fn(),
    updateMatchScore: vi.fn(),
    updateMatchScoreWithValidation: vi.fn(),
    getRankings: vi.fn(),
    from: vi.fn(),
  },
  realtime: {
    subscribeToMatches: vi.fn(),
    subscribeToRankings: vi.fn(),
    unsubscribe: vi.fn(),
  },
  };
});

// Mock logger module
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    performance: vi.fn(),
    time: vi.fn(async (name, fn) => {
      return await fn();
    }),
    timeSync: vi.fn((name, fn) => {
      return fn();
    }),
    getLogs: vi.fn(() => []),
    getErrors: vi.fn(() => []),
    getPerformanceMetrics: vi.fn(() => []),
  },
}));

// Mock monitoring module
vi.mock('../lib/monitoring', () => ({
  monitor: {
    updateConnectionStatus: vi.fn(),
    recordLatency: vi.fn(),
    recordError: vi.fn(),
    recordMetric: vi.fn(),
    getMonitoringSummary: vi.fn(() => ({
      currentConnectionStatus: 'disconnected',
      averageLatency: 0,
      errorCount: 0,
    })),
    onConnectionStatusChange: vi.fn(() => vi.fn()),
    measureApiCall: vi.fn(async (name, fn) => {
      return await fn();
    }),
  },
}));

// Mock supabase scores module
vi.mock('../lib/supabase/scores', () => ({
  updateMatchScore: vi.fn(),
  canUpdateMatchScore: vi.fn(() => Promise.resolve({ canUpdate: true })),
  validateScoreUpdate: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
}));

// Mock score validation module
vi.mock('../lib/validation/scoreValidation', () => ({
  validateMatchScore: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  validateScoreValue: vi.fn(() => ({ isValid: true, error: null })),
  validateWinCondition: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  determineWinner: vi.fn((score1: number, score2: number) => score1 > score2 ? 1 : score2 > score1 ? 2 : null),
  isMatchComplete: vi.fn(() => true),
  getCommonScores: vi.fn(() => [11, 15, 21]),
  formatScore: vi.fn((score: number | null) => score?.toString() || '-'),
  parseScore: vi.fn((score: string) => score === '-' ? null : parseInt(score, 10)),
  DEFAULT_SCORE_CONFIG: {
    winCondition: 'first-to-target',
    targetScore: 15,
    minWinDifference: 2,
    MIN_SCORE: 0,
    MAX_SCORE: 50,
    DEFAULT_TARGET: 11,
    COMMON_TARGETS: [11, 15, 21],
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scroll functions
global.scrollTo = vi.fn();
global.scrollBy = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// Clean up after each test
if (typeof beforeEach !== 'undefined') {
  beforeEach(() => {
    vi.clearAllMocks();
  });
}

if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    vi.clearAllMocks();
  });
}