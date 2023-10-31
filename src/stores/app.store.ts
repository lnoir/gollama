import { writable, type Writable } from 'svelte/store';
import type {
	AppDialogOptions,
	AppMessageOptions,
	AppModalOptions,
} from '../types';

export const messageQueue: Writable<AppModalOptions[]> = writable([]);
export const dialogQueue: Writable<AppModalOptions[]> = writable([]);
export const loading: Writable<boolean> = writable(false);
export const activeModals = writable({});
export const dbReady = writable(false);
export const menuOverlapping = writable(false);
export const messageInputFocused = writable(false);

export const pushMessage = (data: AppMessageOptions) => {
	pushModalItem(data);
};

export const pushDialog = (data: AppDialogOptions) => {
	pushModalItem(data);
};

export const pushModalItem = (
	data: AppDialogOptions | AppMessageOptions
) => {
	let queue;
	switch (data.type) {
		case 'component':
		case 'confirm':
		case 'prompt':
			queue = dialogQueue;
			break;
		default:
			queue = messageQueue;
	}
	queue.update((items) => {
		items.push(data);
		return items;
	});
};