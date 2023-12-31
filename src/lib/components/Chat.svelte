<script lang="ts">
	import { ollamaService } from '$services/ollama.service';
	import { onMount } from 'svelte';
	import type { Model, SettingsMap } from '../../types';
	import {
	currentConversationId,
		currentConversationMessageCount,
		type SenderType
	} from '../../stores/conversation.store';
	import { db } from '$services/db.service';
	import { ProgressRadial } from '@skeletonlabs/skeleton';
	import Conversation from './Conversation.svelte';
	import { parseResponseStream } from '$lib/helpers';
	import { dbReady, messageInputFocused, pushMessage } from '../../stores/app.store';
	import { info } from 'tauri-plugin-log-api';
	import { emit } from '@tauri-apps/api/event';

	export let conversationId = 0;

	let prompt = '';
	let models: Model[] = [];
	let model = '';
	let waitingForResponse = false;
	let responding = '';
	let settings: SettingsMap;
	let context: number[] | undefined;
	let abortController: AbortController;
	let abortSignal: AbortSignal;
  let previousConversationId: number;
	let mainContainer: HTMLElement | null;

	onMount(async () => {
		const res = await ollamaService.getModels();
		models = res || [];
		const dbReadyUnsub = dbReady.subscribe(async ready => {
			settings = (await db.getSettingsMap()) as SettingsMap;
			model = settings.default_model || settings.default_model || '';
			dbReadyUnsub();
		});
		currentConversationId.subscribe(async id => {
			if (id && previousConversationId === id) return;
			conversationId = id;
			if (!id) return;
			const conversation = await db.getConversation(id);
			if (!conversation) return;
			model = conversation.model;
		});
		mainContainer = document.getElementById('main');
	});

	function scrollToBottom() {
		mainContainer?.scrollTo({
			left: 0,
			top: mainContainer.scrollHeight,
			behavior: 'smooth'
		});
	}

	function abort() {
		abortController.abort();
		responding = '';
		waitingForResponse = false;
	}

  async function sendPrompt() {
    const modelInvalid = !isValidModelSelection(model);
    const promptEmpty = !prompt?.trim();
    if (modelInvalid || promptEmpty) {
      pushMessage({
        title: 'hi!',
        message: modelInvalid ? 'Select a model first' : 'Promp cannot be empty',
        type: 'warn'
      });
      return;
    }

    waitingForResponse = true;
    let tempPrompt = prompt;
    abortController = new AbortController();
    abortSignal = abortController.signal;

    try {
      if (!conversationId) {
        conversationId = await db.addConversation({
          title: 'New conversation',
          model,
          started: new Date().toISOString()
        });
      }

      let conversation = await db.getConversation(conversationId);
      context = JSON.parse(conversation.context);

      await addMessage(Number(conversationId), 'human', prompt);

      const res = await ollamaService.sendPrompt(
        { prompt, model, context },
        { signal: abortSignal }
      );
      if (!res) return;

      prompt = '';

      const updater = (text: string) => {
        responding = text;
				scrollToBottom();
      };
      const { text: reply, context: newContext } = await parseResponseStream(res, updater);
      context = newContext;

      if (!conversation?.title || conversation.title === 'New conversation') {
        generateTitle(tempPrompt, reply);
      }

      await addMessage(Number(conversationId), 'ai', reply);
      await db.updateConversationContext(conversationId, newContext);

      responding = '';
			scrollToBottom();
      waitingForResponse = false;
    } catch (err) {
      console.error('@err', err);
    }
  }

	async function handleKeyPress(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') {
      sendPrompt();
		}
	}

	async function generateTitle(originalPrompt: string, reply: string) {
		const exchange = `P1: ${originalPrompt}\n\nP2: ${reply}`;
		const prompt = `Write a concise title of no more than 7 words for the topic of the following text.
    Do not include any prefixes, suffixes, quotation marks or other special characters, just return the raw title.
    Here is the text:
    ${exchange}`;
		let text = '';
		const res = await ollamaService.sendPrompt({
			prompt,
			model,
			options: { top_k: 10, top_p: 0.5 }
		});
		if (res) {
			({ text } = await parseResponseStream(res));
			if (text) {
				await db.updateConversationTitle(conversationId, text);
			}
		}
		return text;
	}

	async function addMessage(conversationId: number, senderType: SenderType, text: string) {
		const message = {
			conversationId,
			senderType,
			text,
			time: new Date().toISOString()
		};
		return await db.addMessage(message);
	}

	function isValidModelSelection(model: string) {
		if (!models?.length || !model?.trim()) return false;
		const found = models.find((m) => m.name === model);
		return !!found;
	}

	async function updateFocused(focused: boolean) {
		messageInputFocused.update(() => focused);
		if (focused) {
			emit('close_menu');
		}
		info(`Message input focused: ${focused}`);
	}
</script>

<div class="block mx-auto max-w-3xl p-4 pt-0 pb-32">
	<select
		class="select block max-w-lg mx-auto my-2 dark:bg-slate-800 text-slate-300"
		placeholder="Select a model"
		bind:value={model}
		disabled={$currentConversationMessageCount > 0}>
		<option class="text-slate-300">-- Select model -- </option>
		{#each models as model}
			<option class="text-slate-300" value={model.name}>{model.name}</option>
		{/each}
	</select>

	<Conversation {conversationId} {responding} />

	<div class="block invisible mx-auto mt-6" class:!visible={waitingForResponse || responding}>
		<ProgressRadial
			class="mx-auto !stroke-teal-600"
			width="w-10"
			stroke={60}
			meter="stroke-teal-600" />
		<button class="btn block variant-outline-secondary mx-auto mt-8" on:click={abort}>Cancel</button>
	</div>
</div>

<div class="fixed left-0 bottom-0 w-full z-30">
	<div class="block w-2/3 m-4 mx-auto max-w-3xl">
		<textarea
			id="message-input"
			class="textarea resize-none overflow-hidden w-full dark:bg-slate-900 px-4 py-2 max-h-48"
			placeholder="Type something..."
			bind:value={prompt}
			on:keydown={handleKeyPress}
			on:focus={() => updateFocused(true)}
			on:blur={() => updateFocused(false)}
			disabled={!model || waitingForResponse} />
	</div>
</div>
