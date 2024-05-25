import { writable } from 'svelte/store';
import type { ResponseStatus } from '../types';

export interface Conversations {
	[key: string]: Conversation;
}

export type SenderType = 'human' | 'ai'

export interface Conversation {
	name?: string;
	messages: Message[];
}

export interface Message {
	senderType: SenderType;
	text: string;
	time: string;
}

export interface ProgressMessage {
	id: number;
	title?: string;
	source?: string;
	message: string;
	image?: string; // base64
	level?: 'info' | 'warn' | 'danger',
	timeout?: any
}

export const conversations = writable<Conversations>({});
export const conversationsLastUpdated = writable<Date>();
export const currentConversationId = writable<number>(0);
export const streamingReply = writable<string>('');
export const currentConversationMessageCount = writable(0);
export const responseStatus = writable<ResponseStatus>('idle');
export const progressNotifications = writable<ProgressMessage[]>([]);