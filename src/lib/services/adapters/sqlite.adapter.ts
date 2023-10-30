import { DB_CREATE_STATEMENTS, DB_FILENAME } from '../../../constants';
import type { DataObject, DbConversation, DbMessage, DbSetting, SettingsMap } from '../../../types';
import Database from "tauri-plugin-sql-api";
import { BaseAdapter } from './base.adapter';
import { trace } from "tauri-plugin-log-api";
import { dbReady } from '../../../stores/app.store';
import { tick } from 'svelte';

export class SQLiteAdapter extends BaseAdapter {
	db: any;

	constructor() {
    super();
    
    Database.load(`sqlite:${DB_FILENAME}`)
    .then(async db => {
      this.db = db;
      await this.runCreateStatements();
      await tick();
      dbReady.update(() => true);
    })
    .catch(console.error);
	}

  private async runCreateStatements() {
    for (const s of DB_CREATE_STATEMENTS) {
      try {
        await this.db.execute(s);
      }
      catch(err) {
        console.warn(s);
        console.error(err);
      }
    }
  }

  async insertInto(table: string, data: any) {
    const { columns, placeholders, values } = this.prepareInsert(data);
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const res = await this.db.execute(sql, values);
    trace(`@insert ${JSON.stringify(res)}`);
		this.bumpUpdate();
		return res.lastInsertId; 
  }

  async update(table: string, id: number, data: any) {
    const { updates, values } = this.prepareUpdate(data, id);
    const sql = `UPDATE ${table} SET ${updates} WHERE id = $${values.length}`;
    const res = await this.db.execute(sql, values);
		this.bumpUpdate();
    return res;
  }

	async addConversation(data: DbConversation) {
		return this.insertInto('conversations', data);
	}

	async getConversation(id: number) {
    const conversation = await this.db.select(
      `SELECT * FROM conversations WHERE id = $1`,
      [id]
    );
    if (!conversation?.length) return;
    const messages = await this.db.select(
      `select * from messages where conversationId = $1`,
      [id]
    );
    return {
      ...conversation[0],
      messages
    }
	}

	async updateConversation(id: number, data: DataObject) {
		return this.update('conversations', id, data);
	}

	async updateConversationTitle(id: number, title: string) {
    const res = await this.updateConversation(id, {title});
		this.bumpUpdate();
		return res;
	}

	async updateConversationContext(id: number, context: number[]) {
    const res = await this.updateConversation(id, {context});
		this.bumpUpdate();
		return res;
	}

	async getConversations() {
    return await this.db.select(
      `select * from conversations`
    );
	}

	async addMessage(data: DbMessage) {
		return this.insertInto('messages', data);
	}

	async deleteConversation(id: number) {
    await this.db.execute(
      `DELETE FROM messages WHERE conversationId = $1`,
      [id]
    );
    await this.db.execute(
      `DELETE FROM conversations WHERE id = $1`,
      [id]
    );
		this.bumpUpdate();
	}

	async putSetting(name: string, value: string) {
    const existing = await this.db.select(
      `SELECT * FROM settings WHERE name = $1`,
      [name]
    );
    const data = {name, value};
		if (existing?.length) {
      return this.update('settings', existing[0].id, data);
		} else {
      return this.insertInto('settings', data);
		}
	}

	async getSettings() {
    return await this.db.select(
      `select * from settings`
    ) as DbSetting[];
	}

	async getSettingsMap() {
		const settings = await this.getSettings();
		const map: SettingsMap = { options: {} };
		settings.forEach((s) => this.settingToObject(s, map));
		return map;
	}
}

export const db = new SQLiteAdapter();
