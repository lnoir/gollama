<script lang="ts">
  import IconCheck from 'virtual:icons/tabler/check';
	import IconTrashX from 'virtual:icons/tabler/trash-x';
	import IconEdit from 'virtual:icons/tabler/edit';
	import { db } from '../services/db.service';
	import type { DbConversation } from '../../types';
	import { goto } from '$app/navigation';
	import { conversationsLastUpdated } from '../../stores/conversation.store';
	import { pushDialog, pushMessage } from '../../stores/app.store';
	import { onMount } from 'svelte';

	type UIConvo = DbConversation & {
		edit?: boolean;
	}

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
		conversation.edit = !conversation.edit;
	}

  async function handleKeyUpOnTitleEdit(e: KeyboardEvent) {
    const target = e.target as HTMLSpanElement;
    tempTitle = target.innerText;
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
  class="group flex-auto relative !rounded-md"
  class:bg-slate-700={active}>
  {#if conversation.edit}
  <span contenteditable class="text-left p-2 rounded-none" on:keyup={handleKeyUpOnTitleEdit} role="doc-part">{conversation.title}</span>
  <button
    class="transition-all duration-500 btn-icon !bg-transparent hover:bg-slate-700 opacity-0 group-hover:opacity-100 !ml-0"
    title={`Update`}
    on:click={() => updateConversation(conversation)}>
    <IconCheck class="transition-all stroke-slate-800 hover:stroke-slate-200" />
  </button>	
  {:else}
  <a
    href={`/${conversation.id}`}
    type="button"
    class="btn text-left p-2 rounded-none"
    title={conversation.title || `Chat ${conversation.id}`}
    on:click|preventDefault={() => loadConversation(conversation.id)}>
    <span class="block w-56 overflow-hidden text-ellipsis break-all">{conversation.title || `Chat ${conversation.id}`}</span>
  </a>
  <button
    class="transition-all duration-500 btn-icon !bg-transparent hover:bg-slate-700 opacity-0 group-hover:opacity-100 !ml-0"
    title={`Edit '${conversation.title}'`}
    on:click={() => conversation.edit = !conversation.edit}>
    <IconEdit class="transition-all stroke-slate-800 hover:stroke-slate-200" />
  </button>
  <button
    class="transition-all duration-500 btn-icon !bg-transparent hover:bg-slate-700 opacity-0 group-hover:opacity-100 !ml-0"
    title={`Delete '${conversation.title}'`}
    on:click={() => handleDelete(conversation)}>
    <IconTrashX />
  </button>
  {/if}
</li>