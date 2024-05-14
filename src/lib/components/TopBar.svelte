<script lang="ts">
	import { onMount } from 'svelte';
	import {
		currentConversationId,
		currentConversationMessageCount
	} from '../../stores/conversation.store';
	import { availableModels, menuOpen, selectedModel, settings, settingsOpen } from '../../stores/app.store';
	import { AppBar } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';

	import IconMenu from 'virtual:icons/tabler/menu';
	import IconMessage from 'virtual:icons/tabler/message';
	import IconSettings from 'virtual:icons/tabler/settings';
	import ModelSelect from './ModelSelect.svelte';
	import type { Model, SettingsMap } from '../../types';
	import { db } from '../services/db.service';
	import { ollamaService } from '../services/ollama.service';

	let models: Model[] = [];
	let model = '';

	onMount(async () => {
		await getModels();
		let savedSettings = (await db.getSettingsMap()) as SettingsMap;
		settings.set(savedSettings);
		selectedModel.update(() => {
			model = savedSettings.default_model || '';
			return model;
		});
	});
	
	async function getModels() {
		models = await ollamaService.getModels();
		availableModels.set(models);
	}

	function toggleMenu() {
		menuOpen.update(state => !state);
	}

	function toggleSettings() {
		settingsOpen.update(state => !state);
	}

	function newConversation() {
		currentConversationId.update(() => 0);
		currentConversationMessageCount.update(() => 0);
		goto('/');
	}
</script>

<div class="fixed w-full h-fit top-0 left-0 z-40">
	<AppBar>
		<svelte:fragment slot="lead">
			<button
				class="inline-block relative py-2 px-3 btn variant-outline rounded-md top-0"
				on:click={toggleMenu}>
				<IconMenu class="h-5 w-5" />
			</button>
			<button
				class="btn flex justify-between variant-ghost-primary rounded-xl py-1.5 px-4 mx-2 !cursor-pointer"
				on:click={newConversation}>
				<IconMessage class="h-5 w-5" /><span>New Conversation</span>
			</button>
			<ModelSelect {models} {model} on:refresh={getModels} />
		</svelte:fragment>
		<svelte:fragment slot="trail">
			<div class="flex justify-between">
				<button class="btn variant-outline px-3 rounded-md ml-2 top-0"
					on:click={toggleSettings}>
					<IconSettings class="h-5 w-5" />
				</button>
			</div>
		</svelte:fragment>
		<svelte:fragment slot="headline" />
	</AppBar>
</div>
