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
	let searchTerm = '';
	$: filteredConvos = convos.filter(convo => convo?.title?.toLowerCase().includes(searchTerm.trim().toLowerCase()));

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
		class="block fixed left-0 z-40 h-full bg-gray-900 pb-28 overflow-y-scroll"
		transition:fly={{ duration: 400, x: -300 }}>

		<div class="block z-30 sticky top-0 bg-slate-900 p-3">
			<input
				type="text"
				class="w-full px-3 py-2 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
				placeholder="Search conversations..."
				bind:value={searchTerm}
			/>
		</div>

		{#if filteredConvos?.length}
			<ul class="block list p-3">
				{#each filteredConvos as conversation}
					<ChatSelectorItem {conversation} active={conversationId === conversation.id} />
				{/each}
			</ul>
		{:else}
			<div class="block w-56">
				<p class="text-slate-500 text-xl leading-8 text-center m-4 mb-8">
					{#if searchTerm}
					Didn't find any matching conversations.
					{:else}
					You don't have any conversations yet.
					{/if}
				</p>
			</div>
		{/if}
	</div>
{/if}

