<script lang="ts">
  import IconTrashX from 'virtual:icons/tabler/trash-x';
  import IconEdit from 'virtual:icons/tabler/edit';
  import IconX from 'virtual:icons/tabler/x';
	import type { UIConvo } from '../../types';
	import { createEventDispatcher } from 'svelte';
	import { fade, type FadeParams } from 'svelte/transition';

  export let conversation: UIConvo;

  const dispatch = createEventDispatcher();

  function onClickEdit() {
    conversation.showMenu = false;
    dispatch('edit');
  }

  function onClickDelete() {
    conversation.showMenu = false;
    dispatch('delete');
  }

</script>

{#if conversation.showMenu}
  <div
    class="absolute flex justify-center opacity-0 z-10 w-full top-0 left-0 bg-slate-800 transition-opacity duration-500 rounded-md"
    class:opacity-100={conversation.showMenu}
    transition:fade={{delay: 0, duration: 150}}>
    <button
      class="transition-opacity duration-500 btn-icon h-8 !bg-transparent hover:bg-slate-700 opacity-100 !ml-0"
      title={`Edit Conversation Title`}
      on:click={onClickEdit}>
      <IconEdit class="transition-all stroke-slate-800 hover:stroke-slate-200" />
    </button>
    <button
      class="transition-opacity duration-500 btn-icon h-8 !bg-transparent hover:bg-slate-700 opacity-100 !ml-0"
      title={`Delete '${conversation.title}'`}
      on:click={onClickDelete}>
      <IconTrashX />
    </button>
    <button
      class="transition-opacity duration-500 btn-icon h-8 !bg-transparent hover:bg-slate-700 opacity-100 !ml-0"
      title={`Cancel`}
      on:click={() => (conversation.showMenu = false)}>
      <IconX />
    </button>
  </div>

{/if}