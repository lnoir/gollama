import { ollamaHost } from '../../stores/settings.store';
import { get } from 'svelte/store';
import type { Model, PromptParams } from '../../types';
import { db } from './db.service';

type RequestOptions = {
	signal?: AbortSignal;
};

class OllamaService {
	baseUrl = '';

	constructor() {
		this.setHost();
	}

	async setHost() {
		const host = get(ollamaHost);
		this.baseUrl = `${host}/api`;
	}

	async $getRequest(url: string) {
		const res = await fetch(`${this.baseUrl}${url}`);
		return res.json();
	}

	async $postRequest(path: string, data: object, requestOptions?: RequestOptions) {
		const opts = requestOptions || {};
		const url = `${this.baseUrl}${path}`;
		const res = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(data),
			...opts
		});
		return res.body;
	}

	async sendPrompt(data: PromptParams, requestOptions?: RequestOptions) {
		const defaults = await db.getSettingsMap();
		const { prompt, model, context } = data;
		const body = {
			prompt,
			model,
			context,
			stream: true,
			options: {
				...defaults.options
			}
		};
		return await this.$postRequest('/generate', body, requestOptions);
	}

	async getModels(): Promise<Model[]> {
		return (await this.$getRequest('/tags')).models;
	}
}

export const ollamaService = new OllamaService();
