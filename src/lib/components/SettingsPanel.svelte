<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import Settings from './Settings.svelte';

	export let show = true;
</script>
{#if show}

	<div
		class="block fixed right-0 z-40 h-full bg-gray-900 p-5 pb-28 overflow-y-scroll"
		transition:fly={{ duration: 400, x: 300 }}>

		<Settings />
	</div>
{/if}
