<script lang="ts">
	import Settings from '$components/Settings.svelte';
	import { fade } from 'svelte/transition';
	import '../app.css';
	import 'highlight.js/styles/codepen-embed.min.css';

	import { Modal, initializeStores, type ModalComponent, Toast, getModalStore, getToastStore, type ToastStore, type ModalStore } from '@skeletonlabs/skeleton';
	import ChatSelector from '$components/ChatSelector.svelte';
	import TopBar from '$components/TopBar.svelte';
	import { onMount } from 'svelte';
	import { dialogQueue, messageQueue } from '../stores/app.store';
	import { showModal, showToast } from '$lib/helpers';
	import type { AppDialogOptions, AppMessageOptions } from '../types';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	let showMenu = true;
	let showSettings = false;

	const modalRegistry: Record<string, ModalComponent> = {
		settings: { ref: Settings }
	};

	initializeStores();

	let modalStore = getModalStore();
	let toastStore = getToastStore();

	onMount(() => {
		messageQueue.subscribe((messages) => {
			if (!messages.length) return;
      const data = messages.shift();
			if (data) {
		  	showToast(toastStore, data as AppMessageOptions);
      }
			return messages;
		});
		dialogQueue.subscribe((dialogs) => {
			if (!dialogs) return;
			const data = dialogs.shift();
			if (data) {
			  showModal(modalStore, data as AppDialogOptions);
      }
			return dialogs;
		});
	});
</script>

<Toast />
<Modal components={modalRegistry} width="w-modal" transitionIn={fade} transitionOut={fade} />

<div class="fixed h-full w-full top-0 left-0 p-0 m-9=0 pointer-events-none">
	<div class="flex flex-col h-full w-full justify-center">
		<span class="text-3xl m-auto text-slate-700">gOllama</span>
	</div>
</div>

<TopBar
	on:toggleMenu={(e) => (showMenu = e.detail)}
	on:toggleSettings={(e) => (showSettings = e.detail)}
/>

<div class="p-0 pt-16 overflow-auto h-screen">
	<ChatSelector show={showMenu} />
	<SettingsPanel show={showSettings} />
	<slot />
</div>
