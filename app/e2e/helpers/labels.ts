import fa from '../../src/messages/fa.json';

/**
 * Selector text is read from the app's own fa.json, so tests stay in sync with
 * the UI copy instead of duplicating (and drifting from) Persian strings. The
 * app defaults to fa (RTL), which is the primary experience we test.
 */
export const L = fa;
