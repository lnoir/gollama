<script lang="ts">
	import IconTrash from 'virtual:icons/tabler/trash';
	import { pushDialog } from '../../../stores/app.store';
	import { db } from '../../services/db.service';
	import { createEventDispatcher, onMount } from 'svelte';

	export let id: number;
	export let classes = '';
  const title = "Delete message";
  const dispatch = createEventDispatcher();
	let finalClasses = 'btn';

	onMount(() => {
		if (classes) finalClasses += ` ${classes}`;
	});

	function deleteMessage() {
		db.deleteMessage(id);
    dispatch('delete');
	}

  function handleClick() {
    pushDialog({
			type: 'confirm',
			title: 'Delete message',
			body: `Are you sure want to delete this message?`,
			response: (remove) => {
        if (remove) deleteMessage();
      }
		});
  }
</script>

<button
	class="btn {finalClasses}"
	{title}
	on:click={handleClick}>
	<IconTrash />
</button>
