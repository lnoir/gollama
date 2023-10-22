<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import {
		currentConversationId,
		currentConversationMessageCount
	} from '../../stores/conversation.store';
	import { AppBar } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';

	import IconMenu from 'virtual:icons/tabler/menu';
	import IconMessage from 'virtual:icons/tabler/message';
	import IconSettings from 'virtual:icons/tabler/settings';

	const dispatch = createEventDispatcher();

	onMount(() => {});

	let showMenu = true;
	let showSettings = false;

	function toggleMenu() {
		showMenu = !showMenu;
		dispatch('toggleMenu', showMenu);
	}

	function toggleSettings() {
		showSettings = !showSettings;
		dispatch('toggleSettings', showSettings);
	}

	function newConversation() {
		currentConversationId.update(() => 0);
		currentConversationMessageCount.update(() => 0);
		goto('/', { replaceState: true });
	}
</script>

<div class="fixed w-full h-fit top-0 left-0 z-40">
	<AppBar>
		<svelte:fragment slot="lead">
			<button
				class="inline-block relative py-2 px-3 btn variant-outline rounded-md top-0"
				on:click={toggleMenu}>
				<IconMenu size={20} />
			</button>
			<button
				class="btn flex justify-between variant-ghost-primary rounded-xl py-2 px-4 mx-2 !cursor-pointer"
				on:click={newConversation}>
				<IconMessage size={20} /><span>New Conversation</span>
			</button>
		</svelte:fragment>
		<svelte:fragment slot="trail">
			<button class="btn variant-outline px-3 rounded-md ml-2 top-0"
				on:click={toggleSettings}>
				<IconSettings size={20} />
			</button>
		</svelte:fragment>
		<svelte:fragment slot="headline" />
	</AppBar>
</div>
