self.onmessage = function(event) {
  console.log('hello?', event)
  // Capture console.log messages
  const logs = [];
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    logs.push(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' '));
    originalConsoleLog.apply(console, args);
  };

  try {
    const result = eval(event.data.code);
    // Restore original console.log
    console.log = originalConsoleLog;
    self.postMessage({ type: 'result', result, logs });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message, logs });
  }
};
