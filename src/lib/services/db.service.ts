import Dexie, { type Table } from 'dexie';
import { conversationsLastUpdated } from '../../stores/conversation.store';
import type { DataObject, DbConversation, DbMessage, DbSetting, SettingsMap } from '../../types';

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

export class ChatDb {
	db: ChatDexie;

	constructor() {
		this.db = new ChatDexie();
	}

	async addConversation(data: DbConversation) {
		const res = await this.db.conversations.add(data);
		this.bumpUpdate();
		return res;
	}

	async getConversation(id: number) {
		const conversation = await this.db.conversations.get(id);
		const messages: DbMessage[] = await this.db.messages
			.where('conversationId')
			.equals(id)
			.toArray();
		return {
			...conversation,
			messages
		};
	}

	async updateConversation(id: number, data: DataObject) {
		const res = await this.db.conversations.where('id').equals(id).modify(data);
		this.bumpUpdate();
		return res;
	}

	async updateConversationTitle(id: number, title: string) {
		const res = await this.db.conversations.where('id').equals(id).modify({ title });
		this.bumpUpdate();
		return res;
	}

	async updateConversationContext(id: number, context: number[]) {
		const res = await this.db.conversations.where('id').equals(id).modify({ context });
		this.bumpUpdate();
		return res;
	}

	async getConversations() {
		return await this.db.conversations.toArray();
	}

	async addMessage(data: DbMessage) {
		const res = await this.db.messages.add(data);
		this.bumpUpdate();
		return res;
	}

	async deleteConversation(id: number) {
		await this.db.messages.where('conversationId').equals(id).delete();
		await this.db.conversations.where('id').equals(id).delete();
		this.bumpUpdate();
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

	async getSettingsMap() {
		const settings = await this.getSettings();
		const map: SettingsMap = { options: {} };
		settings.forEach((s) => this.settingToObject(s, map));
		return map;
	}

	settingToObject(setting: DbSetting, settingsMap: SettingsMap): void {
		const levels = setting.name.split('.');
		// eslint-disable @typescript-eslint/no-explicit-any
		levels.reduce((prev: any, curr: string, i: number) => {
			if (i === levels.length - 1) {
				prev[curr] = setting.value;
				return settingsMap;
			} else if (!prev[curr]) {
				prev[curr] = {};
			}
			return prev[curr];
		}, settingsMap);
	}

	bumpUpdate() {
		conversationsLastUpdated.update(() => new Date());
	}
}

export const db = new ChatDb();
