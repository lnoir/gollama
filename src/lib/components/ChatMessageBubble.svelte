<script lang="ts">
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import hljs from 'highlight.js';
	import DOMPurify from 'dompurify';
	import { afterUpdate, onMount, tick } from 'svelte';
	import CopyButton from './Buttons/ButtonCopy.svelte';

	export let senderType = '';
	export let text = '';
	export let parse = true;

	let root: HTMLElement;
	let sanitizedText = '';

	const marked = new Marked(
		markedHighlight({
			async: false,
			langPrefix: 'hljs language-',
			highlight(code) {
				return hljs.highlightAuto(code).value;
			}
		})
	);

	const renderer = new marked.Renderer();
	renderer.list = (body, ordered) => {
		const tag = ordered ? 'ol' : 'ul';
		return `<${tag} class="list-decimal ml-8">${body}</${tag}>`;
	};
	renderer.listitem = (body) => {
		return `<li>${body}</li>`;
	};

	onMount(async () => {
		sanitizedText = await sanitize(text || '');
		await tick();
		applyCodeClipper();
	});

	afterUpdate(async () => {
		sanitizedText = await sanitize(text);
	});

	async function sanitize(s: string) {
		if (!parse) return s;
		return DOMPurify.sanitize(await marked.parse(s?.trim() || '', {renderer}));
	}

	function applyCodeClipper() {
		const codeblocks = root?.querySelectorAll('pre > code');
		if (!codeblocks) return;
		codeblocks.forEach((e) => {
			const target = document.createElement('div');
			const el = e.parentElement as HTMLElement;
			el.classList.add('relative');
			el.appendChild(target);
			new CopyButton({
				target,
				hydrate: true,
				props: {
					text: el.innerText,
					title: 'Copy this block',
					position: 'top'
				}
			});
		});
	}
</script>

<div class="tab" bind:this={root}>
	<div class="flex w-full font-bold" class:justify-end={senderType === 'ai'}>
		<div
			class="font-bold py-1 px-3 rounded-t-md"
			class:bg-zinc-900={senderType === 'ai'}
			class:bg-slate-900={senderType === 'human'}>
			{senderType === 'ai' ? 'AI' : 'Me'}
		</div>
	</div>
	<div
		class="p-4 whitespace-pre-wrap rounded-md overflow-y-scroll"
		class:bg-zinc-900={senderType === 'ai'}
		class:rounded-tr-none={senderType === 'ai'}
		class:rounded-tl-none={senderType === 'human'}
		class:bg-slate-900={senderType === 'human'}>
		<!-- prettier-ignore -->
		{@html sanitizedText}
	</div>
</div>

<style>
	/* prettier-ignore svelte(unused-css-selector) */
	ol {
		list-style-type: decimal !important;
	}
</style>