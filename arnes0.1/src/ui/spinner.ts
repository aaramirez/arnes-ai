// withSpinner runs an async task with a small stderr spinner, so stdout
// (agent output, tool logs) stays clean and pipeable. Disabled when stderr
// isn't a TTY — CI and piped runs get plain output. Port of the spinner
// behavior in the Go TUI (internal/ui), minus the full screen machinery.

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const CLEAR_LINE = '\r\x1b[K';

export async function withSpinner<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!process.stderr.isTTY) {
    return fn();
  }

  let frame = 0;
  const timer = setInterval(() => {
    process.stderr.write(`\r${FRAMES[frame % FRAMES.length]} ${label}`);
    frame++;
  }, 80);

  try {
    return await fn();
  } finally {
    clearInterval(timer);
    process.stderr.write(CLEAR_LINE);
  }
}
