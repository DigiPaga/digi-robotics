// 1. IMPORTANTE: Esto habilita matchers como toBeInTheDocument, toHaveTextContent, etc.
import '@testing-library/jest-dom/vitest';

// 2. El stub para ResizeObserver que pidió el bot
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
