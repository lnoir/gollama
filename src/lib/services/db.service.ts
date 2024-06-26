import { conversationsLastUpdated } from '../../stores/conversation.store';
import type { DataObject, DbConversation, DbImageInsert, DbMessageInsert, DbSetting, HydratedConversation, SettingsMap } from '../../types';
import { SQLiteAdapter } from './adapters/sqlite.adapter';

export class ChatDb {
	db;

	constructor() {
		this.db = new SQLiteAdapter();
	}

	async addConversation(data: DbConversation) {
		const res = await this.db.addConversation(data);
		this.bumpUpdate();
		return res;
	}

	async getConversation(id: number): Promise<HydratedConversation> {
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

	async addMessage(data: DbMessageInsert) {
		const res = await this.db.addMessage(data);
		this.bumpUpdate();
		return res;
	}

	async addImage(data: DbImageInsert) {
		const res = await this.db.addImage(data);
	}

	async deleteMessage(id: number) {
		await this.db.deleteMessage(id);
	}

	async deleteConversation(id: number) {
		await this.db.deleteConversation(id);
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
		const nums = ['top_k', 'top_p', 'seed', 'num_ctx'];
		// eslint-disable @typescript-eslint/no-explicit-any
		return levels.reduce((prev: any, curr: string, i: number) => {
			if (i === levels.length - 1) {
				prev[curr] = nums.includes(curr) ? Number(setting.value) : setting.value;
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

	async queryDatabase({ page, itemsPerPage, query }: QueryDatabaseParams): Promise<any> {
		// This function should query your SQLite database and return the results.
		// Here, I'm providing a mock implementation.
		const totalRecords = 100; // Assume 100 records in the database
		const totalPages = Math.ceil(totalRecords / itemsPerPage);
		const res = await this.db.queryDatabase({query});
		console.log(res);
		return res;
	/*
		const results = [];
		for (let i = 0; i < itemsPerPage; i++) {
			const id = (page - 1) * itemsPerPage + i + 1;
			if (id > totalRecords) break;
			results.push({
				id,
				name: `Name ${id}`,
				age: 20 + (id % 30),
				email: `name${id}@example.com`,
				additional: `Additional data ${id}` // Arbitrary additional data for demonstration
			});
		}

	
		return {
			results,
			totalPages,
		};*/
	}
}

export interface QueryDatabaseParams {
  page: number;
  itemsPerPage: number;
  query: string;
}

export interface QueryDatabaseResult {
  results: Array<{ [key: string]: any }>;
  totalPages: number;
} 

export const db = new ChatDb();
