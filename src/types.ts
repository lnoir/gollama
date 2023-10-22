export type AppModalType = 'component' | 'confirm' | 'prompt' | 'alert';
export type AppLevelType = 'info' | 'warn' | 'danger';

export type AppModalOptions = {
	title: string;
	component?: string;
	message?: string;
	level?: AppLevelType;
	response?: (result: boolean) => void;
	_id?: string;
};

export type AppDialogOptions = AppModalOptions & {
	type: AppModalType;
	body?: string;
};

export type AppMessageOptions = AppModalOptions & {
	type?: AppLevelType;
	message: string;
};

export interface GenericQueueFn<T> {
	(data: T): void;
}

export interface DbConversation {
	id?: number;
	title?: string;
	model: string;
	started: string;
	context?: number[];
	top_k?: number;
	top_p?: number;
	seed?: number;
	num_ctx?: number;
}

export interface DbMessage {
	id?: number;
	conversationId: number;
	senderType: string;
	text: string;
	time: string;
}

export interface DbSetting {
	id?: number;
	name: string;
	value: string | number;
	default?: string;
}

export type HydratedConversation = DbConversation & {
	messages: DbMessage[];
};

export type PromptParams = {
	prompt: string;
	model: string;
	context?: number[];
	options?: ModelOptions;
};

export type Model = {
	name: string;
	digest: string;
	modified_at: string;
	size: number;
};

export type Conversation = {
	id: string;
	name?: string;
	model: string;
	messages: DbMessage[];
};

export type PromptSettings = {
	defaultModel?: string;
	stream?: boolean;
	options?: ModelParams;
};

export type ModelParams = {
	top_k: number;
	top_p: number;
	seed: number;
	num_ctx: number;
};

export type ParsedPromptResponse = {
	text: string;
	context: number[];
};

export type SettingsMap = {
	ollama_host?: string;
	default_model?: string;
	options: ModelOptions;
	template?: string;
	stream?: boolean;
	[key: string]: DbValue | object;
};

export type ModelOptions = {
	top_k?: number;
	top_p?: number;
	seed?: number;
	num_ctx?: number;
};

export type DbValue = number | number[] | string | boolean | undefined | null;

export type DataObject = {
	[key: string]: DbValue;
};
