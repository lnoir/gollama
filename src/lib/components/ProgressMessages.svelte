<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { progressNotifications, type ProgressMessage } from '../../stores/conversation.store';
	import ProgressMessageItem from './ProgressMessageItem.svelte';

  const unsubs = [];
  let messages: ProgressMessage[] = [];

  onMount(() => {

  });
</script>

{#if $progressNotifications.length}
<div class="flex items-center justify-center py-2">
  <div class="bg-gray-800 text-white rounded-lg p-4 mb-6">

    {#each $progressNotifications.slice(-1) as notification}
    <ProgressMessageItem {notification} />
    {/each}

  </div>

  <!--
  <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
    Cancel
  </button>
  -->
</div>
{/if}

