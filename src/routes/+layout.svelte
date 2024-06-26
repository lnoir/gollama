<script lang="ts">
	import Settings from '$components/Settings.svelte';
	import { fade } from 'svelte/transition';
	import '../app.css';
	import 'highlight.js/styles/codepen-embed.min.css';

	import { Modal, initializeStores, type ModalComponent, Toast, getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import ChatSelector from '$components/ChatSelector.svelte';
	import TopBar from '$components/TopBar.svelte';
	import { onMount } from 'svelte';
	import { dialogQueue, menuOpen, messageQueue, settingsOpen } from '../stores/app.store';
	import { showModal, showToast } from '$lib/helpers';
	import type { AppDialogOptions, AppMessageOptions } from '../types';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	import { appWindow } from '@tauri-apps/api/window';

	const modalRegistry: Record<string, ModalComponent> = {
		settings: { ref: Settings }
	};

	initializeStores();

	let modalStore = getModalStore();
	let toastStore = getToastStore();

	onMount(async () => {
		await appWindow.setTitle(`gollama ${import.meta.env.DEV ? ' [DEV]' : ''}`);
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
		menuOpen.subscribe(console.log);
	});
</script>

<Toast padding="py-2 px-3" />
<Modal components={modalRegistry} width="w-modal" transitionIn={fade} transitionOut={fade} />

<div class="fixed h-full w-full top-0 left-0 p-0 m-9=0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-gray-950 via-gray-900 to-gray-900">
	<div class="flex flex-col h-full w-full justify-center">
		<span class="text-2xl m-auto text-slate-800 text-opacity-40">gOllama</span>
	</div>
</div>

<TopBar />

<section id="main" class="p-0 pt-16 overflow-auto h-screen overscroll-none">
	<ChatSelector show={$menuOpen} />
	<SettingsPanel show={$settingsOpen} />
	<slot />
</section>
