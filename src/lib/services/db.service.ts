import { conversationsLastUpdated } from '../../stores/conversation.store';
import type { DataObject, DbConversation, DbMessage, DbSetting, SettingsMap } from '../../types';
import { SQLiteAdapter } from './adapters/sqlite.adapter';

export class ChatDb {
	db;

	constructor() {
		//this.db = new DexieAdapter();
		this.db = new SQLiteAdapter();
	}

	async addConversation(data: DbConversation) {
		const res = await this.db.addConversation(data);
		this.bumpUpdate();
		return res;
	}

	async getConversation(id: number) {
		return await this.db.getConversation(id);
	}

	async updateConversation(id: number, data: DataObject) {
		const res = await this.db.updateConversation(id, data);
		this.bumpUpdate();
		return res;
	}

	async updateConversationTitle(id: number, title: string) {
		const res = await this.db.updateConversationTitle(id, title);
		this.bumpUpdate();
		return res;
	}

	async updateConversationContext(id: number, context: number[]) {
		const res = await this.db.updateConversationContext(id, context);
		this.bumpUpdate();
		return res;
	}

	async getConversations() {
		return await this.db.getConversations();
	}

	async addMessage(data: DbMessage) {
		const res = await this.db.addMessage(data);
		this.bumpUpdate();
		return res;
	}

	async deleteConversation(id: number) {
		await this.db.deleteConversation(id);
		this.bumpUpdate();
	}

	async putSetting(name: string, value: string) {
		return this.db.putSetting(name, value);
	}

	async getSettings() {
		return this.db.getSettings();
	}

	async getSettingsMap() {
		const settings = (await this.getSettings()) as unknown as any[];
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
