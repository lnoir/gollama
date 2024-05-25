<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import type { ProgressMessage as ProgressNotification } from '../../stores/conversation.store';

  export let notification: ProgressNotification;
</script>

<div transition:fade={{duration: 900}} class="flex items-center text-sm">
  <div class="bg-blue-500 text-white p-2 rounded-full mr-4">
    &gt;&gt;
  </div>
  <p class="text-sm">{notification.message}</p>
</div>

