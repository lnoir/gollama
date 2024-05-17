<script lang="ts">
  import { menuOpen, messageInputFocused, settingsOpen } from '../../stores/app.store';
  import { responseStatus } from '../../stores/conversation.store';
  import { createEventDispatcher } from 'svelte';
  import { runJsCodeInWorker } from '$lib/helpers';
  
  import IconMessage from 'virtual:icons/tabler/message';
  import IconX from 'virtual:icons/tabler/x';
  import IconCode from 'virtual:icons/tabler/code';
  import IconUpload from 'virtual:icons/tabler/upload';
	import type { ImageUpload } from '../../types';
  
  const dispatch = createEventDispatcher();
	const codeTag = '@code';
  
  export let disabled: boolean; 
  export let prompt = '';
  
  let fileInput: HTMLInputElement;
  let imagePreviews: ImageUpload[] = [];
  let currentImageIndex = 0;

  $: isCode = (
    prompt?.trim().startsWith('@code') ||
    (prompt?.startsWith('```') && prompt?.endsWith('```'))
  );
  
  function abort() {
    dispatch('abort');
  }
  
  async function updateFocused(focused: boolean) {
    messageInputFocused.update(() => focused);
    if (focused) {
      menuOpen.update(_ => false);
      settingsOpen.update(_ => false);
    }
  }
  
  async function handleKeyUp(e: KeyboardEvent) {
    prompt = (e.target as HTMLTextAreaElement).value;
		if (!prompt) return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') {
      if (isCode) return runCode(prompt);
			sendInput();
    }
    return true;
  }

	function sendInput() {
		const data = { 
			input: prompt, images: imagePreviews
		};
		dispatch('send', data);
		imagePreviews = [];
	}
  
  async function runCode(text: string) {
    let code = text.trim().replace(codeTag, '').replace(/(```)/g, '');
    try {
      const output = await runJsCodeInWorker({ code });
      dispatch('output', output);
    } catch (err: any) {
      dispatch('error', err.message);
    }
  }
  
  function triggerFileInput() {
    fileInput.click();
  }

	function showNextImage() {
		if (currentImageIndex < imagePreviews.length - 1) {
			currentImageIndex += 1;
		}
	}

	function showPreviousImage() {
		if (currentImageIndex > 0) {
			currentImageIndex -= 1;
		}
	}
  
  function handleFileSelection(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      for (const file of target.files) {
        const reader = new FileReader();
        const readerRaw = new FileReader();
        
        reader.onloadend = () => {
					// Read the file as a base64 string
          const base64String = reader.result as string;
          
          // Read the file as raw binary data
          readerRaw.onloadend = () => {
            const rawArrayBuffer = readerRaw.result as ArrayBuffer;
            imagePreviews = [...imagePreviews, { base64: base64String, file, raw: rawArrayBuffer }];
          };
          readerRaw.readAsArrayBuffer(file);
        };
        reader.readAsDataURL(file);
      }
    }
    target.value = '';
  }
  
  function removeImagePreview(index: number) {
    let temp = [...imagePreviews];
		temp.splice(index, 1);
		if (imagePreviews.length >= index) {
			currentImageIndex = index - 1;
		}
		imagePreviews = temp;
  }
</script>

<div class="fixed left-0 bottom-0 w-full z-30">
  <div class="flex w-2/3 m-4 mx-auto max-w-3xl min-h-16 dark:bg-slate-900 rounded-md border border-slate-500 relative">
		{#if imagePreviews.length > 0}
			<div 
				class="absolute bottom-full mb-2 right-0 w-24 h-24 bg-white dark:bg-gray-800 p-2 border border-gray-500 rounded-md group"
			>
				<img src={imagePreviews[currentImageIndex].base64} alt="Thumbnails" class="w-full h-full object-cover rounded-md"/>
				<button 
					class="absolute top-0 right-0 bg-gray-700 text-white rounded-full p-1 m-1 opacity-0 group-hover:opacity-100"
					on:click={() => removeImagePreview(currentImageIndex)}
				>
					<IconX class="w-4 h-4"/>
				</button>
				{#if currentImageIndex > 0}
					<button 
						class="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white rounded-full p-1 m-1 opacity-0 group-hover:opacity-100"
						on:click={showPreviousImage}
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
				{/if}
				{#if currentImageIndex < imagePreviews.length - 1}
					<button 
						class="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white rounded-full p-1 m-1 opacity-0 group-hover:opacity-100"
						on:click={showNextImage}
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-4 h-4">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19l7-7-7-7" />
						</svg>
					</button>
				{/if}
			</div>
		{/if}
	
    <textarea
      id="message-input"
      class="textarea min-h-16 rounded-none rounded-s-md border-none overflow-hidden w-full bg-transparent dark:bg-slate-900 px-4 py-2 max-h-48"
      placeholder="Type something..."
      autocapitalize="off"
      autocomplete="off"
      value={prompt}
      on:keyup={handleKeyUp}
      on:focus={() => updateFocused(true)}
      on:blur={() => updateFocused(false)}
      disabled={disabled}
    />
    <input
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      bind:this={fileInput}
      on:change={handleFileSelection}
    />
    <div id="input-button-panel" class="flex p-2 bg-">
      {#if $responseStatus !== 'idle'}
        <button class="btn" on:click={abort} title="Cancel">
          <IconX />
        </button>
      {:else if isCode}
        <button class="btn" on:click={() => runCode(prompt)} title="Run">
          <IconCode />
        </button>
      {:else}
        <button class="btn" on:click={sendInput} title="Send">
          <IconMessage />
        </button>
      {/if}
      <button class="btn" on:click={triggerFileInput} title="Upload Image">
        <IconUpload />
      </button>
    </div>
  </div>
</div>
