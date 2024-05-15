import type { ModalStore, ToastStore } from '@skeletonlabs/skeleton';
import type { AppDialogOptions, AppMessageOptions, ParsedPromptResponse } from '../types';
import { menuOverlapping } from '../stores/app.store';
import { info } from 'tauri-plugin-log-api';

/**
 * Displays stated component in a modal
 *
 * @param modalStore ModalStore
 * @param component string Name of the component (must be registered in modal regitry)
 * @returns
 */
export function showModal(modalStore: ModalStore, options: AppDialogOptions) {
	modalStore.trigger(options);
	return modalStore;
}

export function showToast(toastStore: ToastStore, options: AppMessageOptions) {
	toastStore.trigger(options);
	return toastStore;
}

/**
 * Parses Ollama API response from the /generate endpoing
 * 
 * @deprecated Moved to using Ollama's chat completion endpoint
 *
 * @param readableStream ReadableStream return from body from fetch response
 * @param updater function An optional callback that receives a string of text parsed so far
 * @returns Object { text: string, context: number[] }
 */
export async function parseResponseStream(
	readableStream: ReadableStream<Uint8Array>,
	updater?: (text: string) => void
): Promise<ParsedPromptResponse> {
	console.log('@parseResponseStream readableStream:', readableStream)
	return new Promise((resolve, reject) => {
		const reader = readableStream?.getReader();
		const textDecoder = new TextDecoder('utf-8');
		let text = '';

		// Just to make it easier to pinpoint any issues
		let currentStreamValue = '';
		let currentStreamPart = '';

		if (updater) updater(text);

		const readStream: () => Promise<void> = async () => {
			if (!reader) return resolve({ text, context: [] });
			const { value, done } = await reader.read();
			if (done) return resolve({ text, context: [] });
			try {
				const decoded = textDecoder.decode(value);
				currentStreamValue = decoded;
				const parts = decoded.split('\n');
				for (const part of parts.filter((p) => !!p?.trim())) {
					currentStreamPart = part;
					const json = JSON.parse(textDecoder.decode(value));
					if (json.done === true) {
						const { context } = json;
						return resolve({ text, context });
					}
					text += json.response;
					if (updater) updater(text);
				}
				return readStream();
			} catch (err) {
				console.error({ currentStreamPart, currentStreamValue }, err);
				return reject(err);
			}
		};

		readStream();
	});
}

/**
 * Parses Ollama API response from the /generate endpoing
 *
 * @param readableStream ReadableStream return from body from fetch response
 * @param updater function An optional callback that receives a string of text parsed so far
 * @returns Object { text: string, context: number[] }
 */
export async function parseChatResponseStream(
	readableStream: ReadableStream<Uint8Array>,
	updater?: (text: string) => void
): Promise<ParsedPromptResponse> {
	return new Promise((resolve, reject) => {
		const reader = readableStream?.getReader();
		const textDecoder = new TextDecoder('utf-8');
		let text = '';

		// Just to make it easier to pinpoint any issues
		let currentStreamValue = '';
		let currentStreamPart = '';

		if (updater) updater(text);

		const readStream: () => Promise<void> = async () => {
			if (!reader) return resolve({ text, context: [] });
			const { value, done } = await reader.read();
			if (done) return resolve({ text, context: [] });
			try {
				const decoded = textDecoder.decode(value);
				currentStreamValue = decoded;
				const parts = decoded.split('\n');
				for (const part of parts.filter((p) => !!p?.trim())) {
					//console.log('@part', part)
					const json = JSON.parse(textDecoder.decode(value));
					if (json.done === true) {
						const { context } = json;
						return resolve({ text, context });
					}
					if (json.message?.content) text += json.message?.content;
					if (updater) updater(text);
				}
				return readStream();
			} catch (err) {
				console.error({ currentStreamPart, currentStreamValue }, err);
				return reject(err);
			}
		};

		readStream();
	});
}

/**
 * Checks if two elements intersect in the viewport.
 * 
 * @returns boolean
 */
export function updateMenuOverlap() {
	const elem1 = document.getElementById('chat-selector');
	const elem2 = document.getElementById('message-input');
	if (!elem1 || ! elem2) return;
	
	const rect1 = elem1.getBoundingClientRect();
	const rect2 = elem2.getBoundingClientRect();

	const overlapping = (
		rect1.top < rect2.bottom &&
		rect1.bottom > rect2.top &&
		rect1.left < rect2.right &&
		rect1.right > rect2.left
	);
	info('update menu overlap')
	menuOverlapping.update(() => overlapping);
}

export function runJsCodeInIframe({ code }: { code: string }) {
  return new Promise((resolve, reject) => {
    // Array to hold the console messages and result
    const iframeConsoleMessages: string[] = [];
    let executionResult: any = null;
    let executionError: any = null;

    // Setup iframe
    const iframe = document.createElement('iframe');
    iframe.name = `js-execution-frame-${Date.now()}`;
    iframe.style.display = 'none'; // Hide it
    iframe.srcdoc = `
      <html>
        <head></head>
        <body>
          <script>
            (function() {
              const originalConsoleLog = console.log;
              console.log = (...args) => {
                // Send the log messages to the parent window
                window.parent.postMessage({ type: 'iframe-console-log', messages: args }, '*');
                // Call the original console.log
                originalConsoleLog(...args);
              };

              // Listen for code execution requests from the parent window
              window.addEventListener('message', (event) => {
                if (event.data.type === 'execute-code') {
                  try {
                    const result = eval(event.data.code);
                    window.parent.postMessage({ type: 'execution-result', result: result }, '*');
                  } catch (error) {
                    window.parent.postMessage({ type: 'execution-error', error: error.message }, '*');
                  }
                }
              });

              // Notify the parent window that the iframe is ready
              window.parent.postMessage({ type: 'iframe-ready' }, '*');
            })();
          </script>
        </body>
      </html>
    `;
    document.body.appendChild(iframe);

    // Event listener to capture messages from the iframe
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'iframe-console-log') {
        const messages = event.data.messages.map((msg: any) => (typeof msg === 'object' ? JSON.stringify(msg) : String(msg)));
        iframeConsoleMessages.push(messages.join(' '));
      } else if (event.data.type === 'execution-result') {
        executionResult = event.data.result;
        resolveAll();
      } else if (event.data.type === 'execution-error') {
        executionError = event.data.error;
        resolveAll();
      } else if (event.data.type === 'iframe-ready') {
        iframe.contentWindow?.postMessage({ type: 'execute-code', code: code }, '*');
      }
    };

    const resolveAll = () => {
      if (executionResult !== null || executionError !== null) {
        window.removeEventListener('message', messageHandler);
        if (executionError) {
          reject({ error: executionError, logs: iframeConsoleMessages });
        } else {
          resolve({ result: executionResult, logs: iframeConsoleMessages });
        }
        document.body.removeChild(iframe);
      }
    };

    window.addEventListener('message', messageHandler);
  });
}
