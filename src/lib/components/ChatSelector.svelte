<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { conversationsLastUpdated, currentConversationId } from '../../stores/conversation.store';
	import { db } from '../services/db.service';
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import IconTrashX from 'virtual:icons/tabler/trash-x';
	import type { DbConversation } from '../../types';
	import { dbReady, menuOverlapping, messageInputFocused, pushDialog, pushMessage } from '../../stores/app.store';
	import { updateMenuOverlap } from '../helpers';
	import { get } from 'svelte/store';
	import { appWindow } from "@tauri-apps/api/window";
	import { info } from 'tauri-plugin-log-api';

	export let show = true;

	let convos: DbConversation[] = [];
	let conversationId: number;
	let windowUnsub: any;

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
			menuOverlapping.subscribe(overlap => {
				info(`Menu overlap: ${overlap}`);
				if (!overlap || !show || !get(messageInputFocused)) return;
				show = false;
			});
		});
		windowUnsub = await appWindow.onResized(() => {
			updateMenuOverlap();
		});
	});

	onDestroy(() => {
		windowUnsub();
	});

	function loadConversation(id?: number) {
		goto(`/${id || ''}`, { replaceState: true });
	}

	async function handleDelete(conversation: DbConversation) {
		if (!conversation.id) return false;
		const { id } = conversation;
		const deleteConversation = async (canDelete: boolean) => {
			if (canDelete) {
				await db.deleteConversation(id);
				conversationsLastUpdated.update(() => new Date());
				pushMessage({
					type: 'info',
					level: 'info',
					title: 'Coversation deleted',
					message: 'Conversation has been remove'
				});
			}
		};
		pushDialog({
			type: 'confirm',
			title: 'Delete conversation',
			body: `Are you sure want to delete '${conversation.title}'?`,
			response: deleteConversation
		});
	}
</script>

<svelte:window on:resize={updateMenuOverlap} />

{#if show}
	<div
		id="chat-selector"
		class="block fixed left-0 z-40 h-full bg-gray-900 p-5 pb-28 overflow-y-scroll"
		transition:fly={{ duration: 400, x: -300 }}>
		{#if convos?.length}
			<ul class="block list">
				{#each convos as convo}
					<li
						class="group flex-auto relative !rounded-md"
						class:bg-slate-700={conversationId === convo.id}>
						<a
							href={`/${convo.id}`}
							type="button"
							class="btn text-left p-2 rounded-none"
							title={convo.title || `Chat ${convo.id}`}
							on:click|preventDefault={() => loadConversation(convo.id)}>
							<span class="block w-56 overflow-hidden text-ellipsis break-all"
								>{convo.title || `Chat ${convo.id}`}</span>
						</a>
						<button
							class="transition-all duration-500 btn-icon !bg-transparent opacity-0 group-hover:opacity-100"
							on:click={() => handleDelete(convo)}>
							<IconTrashX />
						</button>
					</li>
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
