<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { conversationsLastUpdated, currentConversationId } from '../../stores/conversation.store';
	import { db } from '../services/db.service';
	import { fly } from 'svelte/transition';
	import type { DbConversation } from '../../types';
	import { dbReady, menuOverlapping, messageInputFocused } from '../../stores/app.store';
	import { updateMenuOverlap } from '../helpers';
	import { get } from 'svelte/store';
	import { appWindow } from "@tauri-apps/api/window";
	import { info, trace } from 'tauri-plugin-log-api';
	import { listen } from '@tauri-apps/api/event';
	import ChatSelectorItem from './ChatSelectorItem.svelte';

	export let show = true;


	let convos: DbConversation[] = [];
	let conversationId: number;
	let windowUnsub: any;
	let toggleUnsub: any;

	onMount(async () => {
		dbReady.subscribe(async ready => {
			if (!ready) return;

			convos = await db.getConversations();

			currentConversationId.subscribe((currentId) => {
				conversationId = Number(currentId);
			});
			conversationsLastUpdated.subscribe(async () => {
				convos = await db.getConversations();
			});
		});
		
		menuOverlapping.subscribe(overlap => {
			info(`Menu overlap: ${overlap}`);
			if (!overlap || !show || !get(messageInputFocused)) return;
			show = false;
		});
		windowUnsub = await appWindow.onResized(() => {
			updateMenuOverlap();
		});
		toggleUnsub = await listen('close_menu', () => {
			show = false;
		});
	});

	onDestroy(() => {
		trace('destroyed')
		windowUnsub();
		toggleUnsub();
	});
</script>

<svelte:window on:resize={updateMenuOverlap} />

{#if show}
	<div
		id="chat-selector"
		class="block fixed left-0 z-40 h-full bg-gray-900 p-5 pb-28 overflow-y-scroll"
		transition:fly={{ duration: 400, x: -300 }}>
		{#if convos?.length}
			<ul class="block list">
				{#each convos as conversation}
					<ChatSelectorItem {conversation} active={conversationId === conversation.id} />
				{/each}
			</ul>
		{:else}
			<div class="block w-56">
				<p class="text-slate-500 text-xl leading-8 text-center mt-4 mb-8">
					You don't have any conversations yet. Pick a model to start one.
				</p>
			</div>
		{/if}
	</div>
{/if}
