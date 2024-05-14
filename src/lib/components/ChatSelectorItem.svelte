<script lang="ts">
  import IconCheck from 'virtual:icons/tabler/check';
  import IconDotsVertical from 'virtual:icons/tabler/dots-vertical';
	import { db } from '../services/db.service';
	import type { UIConvo } from '../../types';
	import { goto } from '$app/navigation';
	import { conversationsLastUpdated } from '../../stores/conversation.store';
	import { pushDialog, pushMessage } from '../../stores/app.store';
	import { onMount } from 'svelte';
	import ChatSelectorItemMenu from './ChatSelectorItemMenu.svelte';

  export let active = false;
  export let conversation: UIConvo;

  let tempTitle = '';

  onMount(() => {
    tempTitle = conversation.title || tempTitle;
  });

  function loadConversation(id?: number) {
		goto(`/${id || ''}`, { replaceState: true });
	}

	async function updateConversation(conversation: UIConvo) {
		await db.updateConversation(conversation.id!, {title: tempTitle});
		conversation.edit = false;
	}

  async function handleKeyUpOnTitleEdit(e: KeyboardEvent) {
    const target = e.target as HTMLSpanElement;
    tempTitle = target.innerText;
  }

  async function handleEdit(conversation: UIConvo) {
    conversation.edit = true;
  }

  async function handleDelete(conversation: UIConvo) {
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
					message: 'Conversation has been removed'
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

<li
  class="group flex justify-between relative !rounded-md text-sm hover:bg-slate-{active ? 700 : 800}"
  class:bg-slate-700={active}>
  {#if conversation.edit}
  <span contenteditable class="text-left p-2 rounded-none" on:keyup={handleKeyUpOnTitleEdit} role="doc-part">{conversation.title}</span>
  <button
    class="transition-all duration-800 btn-icon h-6 !bg-transparent hover:bg-slate-700 opacity-0 group-hover:opacity-100 !ml-0"
    title={`Update`}
    on:click={() => updateConversation(conversation)}>
    <IconCheck class="transition-all stroke-slate-800 hover:stroke-slate-200" />
  </button>	
  {:else}
  <a
    href={`/${conversation.id}`}
    type="button"
    class="btn text-left text-sm p-1 rounded-none"
    title={conversation.title || `Chat ${conversation.id}`}
    on:click|preventDefault={() => loadConversation(conversation.id)}>
    <span class="block w-56 overflow-hidden text-ellipsis break-all text-gray-400 group-hover:text-gray-200">{conversation.title || `Chat ${conversation.id}`}</span>
  </a>
		<div
			class="menu-overlay flex justify-end transition-all duration-500 absolute z-10 right-0 w-24 opacity-0 group-hover:opacity-100 bg-transparent bg-gradient-to-l from-slate-900 rounded-md">
			<button
				class="transition-all duration-500 btn-icon h- !bg-transparent hover:bg-slate-700 opacity-0 group-hover:opacity-100 ml-2"
				title={`Update`}
				on:click={() => (conversation.showMenu = true)}>
				<IconDotsVertical class="transition-all stroke-slate-800 hover:stroke-slate-200" />
			</button>
		</div>
  {/if}
  <div class="right-0">
    <ChatSelectorItemMenu
      {conversation}
      on:edit={() => handleEdit(conversation)}
      on:delete={() => handleDelete(conversation)}
    />
  </div>
</li>