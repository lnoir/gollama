import { writable, type Writable } from 'svelte/store';

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

export const conversations: Writable<Conversations> = writable({});
export const conversationsLastUpdated: Writable<Date> = writable();
export const currentConversationId: Writable<number> = writable(0);
export const streamingReply: Writable<string> = writable('');
export const currentConversationMessageCount = writable(0);
