import Dexie, { type Table } from 'dexie';
import type {
  AdapterInterface,
  DataObject,
  DbConversation,
  DbMessage,
  DbSetting,
  HydratedConversation,
} from '../../../types';
import { BaseAdapter } from './base.adapter';

class ChatDexie extends Dexie {
	conversations!: Table<DbConversation>;
	messages!: Table<DbMessage>;
	settings!: Table<DbSetting>;

	constructor() {
		super('gollama');
		this.version(2).stores({
			conversations: '++id, name',
			messages: '++id, conversationId, senderType, text, time',
			resends: '++id, messageId, senderType, text, time',
			settings: '++id, &name'
		});
	}
}

export class DexieAdapter extends BaseAdapter implements AdapterInterface {
	db: ChatDexie;

	constructor() {
    super();
		this.db = new ChatDexie();
	}

	async addConversation(data: DbConversation) {
		const res = await this.db.conversations.add(data);
		return res;
	}

	async getConversation(id: number) {
		const conversation = await this.db.conversations.get(id);
    if (!conversation) return;
    const messages: DbMessage[] = await this.db.messages
			.where('conversationId')
			.equals(id)
			.toArray();
		const hydrated: HydratedConversation = {
			...conversation,
			messages
    }
		return hydrated;
	}

	async updateConversation(id: number, data: DataObject) {
		await this.db.conversations.where('id').equals(id).modify(data);
	}

	async updateConversationTitle(id: number, title: string) {
	  await this.db.conversations.where('id').equals(id).modify({ title });
	}

	async updateConversationContext(id: number, context: number[]) {
    await this.db.conversations.where('id').equals(id).modify({ context });
	}

	async getConversations() {
		return await this.db.conversations.toArray();
	}

	async addMessage(data: DbMessage) {
		const res = await this.db.messages.add(data);
		return res;
	}

	async deleteConversation(id: number) {
		await this.db.messages.where('conversationId').equals(id).delete();
		await this.db.conversations.where('id').equals(id).delete();
	}

	async putSetting(name: string, value: string) {
		const existing = await this.db.settings.where('name').equals(name).toArray();
		if (existing?.length) {
			await this.db.settings.put({ name, value, id: existing[0].id });
		} else {
			await this.db.settings.put({ name, value });
		}
	}

	async getSettings() {
		return this.db.settings.toArray();
	}
}

export const db = new DexieAdapter();
