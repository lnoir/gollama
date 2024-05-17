import { writable, type Writable } from 'svelte/store';
import type { ResponseStatus } from '../types';

export type Conversations = {
	[key: string]: Conversation;
};

export type SenderType = 'human' | 'ai';

export type Conversation = {
	name?: string;
	messages: Message[];
};

export type Message = {
	senderType: SenderType;
	text: string;
	time: string;
};

export const conversations = writable<Conversations>({});
export const conversationsLastUpdated = writable<Date>();
export const currentConversationId = writable<number>(0);
export const streamingReply = writable<string>('');
export const currentConversationMessageCount = writable(0);
export const responseStatus = writable<ResponseStatus>('idle');