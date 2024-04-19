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
	import IconMessage from 'virtual:icons/tabler/message';
	import ButtonScrollBottom from './Buttons/ButtonScrollBottom.svelte';
	import IconX from 'virtual:icons/tabler/x';

	export let conversationId = 0;

	let prompt = '';
	let models: Model[] = [];
	let model = '';
	let waitingForInitialResponse = false;
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

	function scrollToBottom(pad = 150) {
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

		waitingForInitialResponse = true;
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
			setTimeout(() => {
				scrollToBottom(500);
			}, 10);

      const res = await ollamaService.sendPrompt(
        { prompt, model, context },
        { signal: abortSignal }
      );
      if (!res) return;

      prompt = '';
			waitingForInitialResponse = false;
			
      const updater = (text: string) => {
        responding = text;
				if (!mainContainer) return;

				const pad = 100;
				const scrolled = mainContainer.getBoundingClientRect().bottom + mainContainer.scrollTop + pad;
				if (scrolled >= mainContainer.scrollHeight) {
					setTimeout(scrollToBottom);
				}
      };
      const { text: reply, context: newContext } = await parseResponseStream(res, updater);
      context = newContext;

      if (!conversation?.title || conversation.title === 'New conversation') {
        generateTitle(tempPrompt, reply);
      }

      await addMessage(Number(conversationId), 'ai', reply);
      await db.updateConversationContext(conversationId, newContext);

      responding = '';
      waitingForResponse = false;
			setTimeout(scrollToBottom, 250);
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
			options: { top_k: 10, top_p: 0.20 }
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

<div class="block relative mx-auto max-w-3xl p-4 pt-0 pb-20">
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
		{#if waitingForInitialResponse}
		<ProgressRadial
			class="mx-auto !stroke-teal-600"
			width="w-10"
			stroke={60}
			meter="stroke-teal-600" />
		{/if}
	</div>

	<ButtonScrollBottom target="#conversation" root="#main" />
</div>

<div class="fixed left-0 bottom-0 w-full z-30">
	<div class="flex w-2/3 m-4 mx-auto max-w-3xl max-h-16 dark:bg-slate-900 rounded-md border border-slate-500">
		<textarea
			id="message-input"
			class="textarea resize-none rounded-none rounded-s-md border-none overflow-hidden w-full bg-transparent dark:bg-slate-900 px-4 py-2 max-h-48"
			placeholder="Type something..."
			bind:value={prompt}
			on:keydown={handleKeyPress}
			on:focus={() => updateFocused(true)}
			on:blur={() => updateFocused(false)}
			disabled={!model || waitingForResponse} />
			<div id="input-button-panel"
				class="flex p-2 bg-">
				{#if waitingForResponse || responding}
				<button class="btn" on:click={abort} title="Cancel">
					<IconX />
				</button>
				{:else}
				<button class="btn" on:click={sendPrompt} title="Send">
					<IconMessage />
				</button>	
				{/if}
			</div>
	</div>
</div>
