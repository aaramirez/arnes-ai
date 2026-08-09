// Tiny ANSI helpers for the terminal UI. Port of bits of internal/ui.

const RESET = '\x1b[0m';

export function dim(s: string): string {
  return `\x1b[2m${s}${RESET}`;
}

export function cyan(s: string): string {
  return `\x1b[36m${s}${RESET}`;
}

export function bold(s: string): string {
  return `\x1b[1m${s}${RESET}`;
}
