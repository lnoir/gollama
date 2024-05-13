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

export type PromptParamMessage = {
	role: 'system' | 'assistant'| 'user';
	content: string;
}

export interface AdapterInterface {
  addConversation(data: DbConversation): Promise<DbConversation>;
	getConversation(id: number): Promise<HydratedConversation | undefined>;
	updateConversation(id: number, data: DataObject): Promise<void>;
	updateConversationTitle(id: number, title: string): Promise<void>;
	updateConversationContext(id: number, context: number[]): Promise<void>;
	getConversations(): Promise<DbConversation[]>;
	addMessage(data: DbMessage): Promise<number>;
	deleteConversation(id: number): Promise<void>;
	putSetting(name: string, value: string): Promise<void>;
	getSettings(): Promise<DbSetting[]>;
}

export type DbConversation = {
	id?: number;
	title?: string;
	model: string;
	started: string;
	context?: number[] | undefined;
	system?: string;
	top_k?: number | undefined;
	top_p?: number | undefined;
	seed?: number | undefined;
	num_ctx?: number | undefined;
}

export type DbMessage = {
	id?: number;
	conversationId: number;
	senderType: string;
	text: string;
	time: string;
}

export type DbSetting = {
	id?: number;
	name: string;
	value: string | number;
	defaultVal?: string;
}

export type HydratedConversation = DbConversation & {
	messages?: DbMessage[];
};

export type PromptParams = {
	prompt?: string;
	model: string;
	stream?: boolean;
	format?: 'json'; // only accepted value at the moment
	messages: PromptParamMessage[];
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

export type UIConvo = DbConversation & {
	edit?: boolean;
	showMenu?: Boolean;
}

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
	temperature: number;
};

export type ModelOptions = Partial<ModelParams>;

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

/*{
	top_k?: number;
	top_p?: number;
	seed?: number;
	num_ctx?: number;
};*/

export type DbValue = number | number[] | string | boolean | undefined | null;

export type DataObject = {
	[key: string]: DbValue;
};
