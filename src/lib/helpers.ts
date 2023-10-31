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
 * @param readableStream ReadableStream return from body from fetch response
 * @param updater function An optional callback that receives a string of text parsed so far
 * @returns Object { text: string, context: number[] }
 */
export async function parseResponseStream(
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

