<script lang="ts">
	import IconTrash from 'virtual:icons/tabler/trash';
	import { pushDialog } from '../../../stores/app.store';
	import { db } from '../../services/db.service';
	import { createEventDispatcher } from 'svelte';

	export let id: number;
  const title = "Delete message";
  const dispatch = createEventDispatcher();

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
	class="btn absolute z-20 right-0 bottom-5"
	{title}
	on:click={handleClick}>
	<IconTrash />
</button>
