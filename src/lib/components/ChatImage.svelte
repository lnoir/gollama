
<script lang="ts">
	import { onMount } from 'svelte';

  export let image: any;
  let url: string;
  let arr:any;

  onMount(() => {
    if (!image) return;
    const json = JSON.parse(image.imageData);
    arr = Object.values(json);
    const raw = arrayBufferToBase64(arr);
    url = `data:${image.mimeType};base64,${raw}`;
  });

  export function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
</script>

<img src={url} alt="Prompted" class="block mx-auto mb-12 max-w-sm rounded-md"/>