<script lang="ts">
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import hljs from 'highlight.js';
	import DOMPurify from 'dompurify';
	import { afterUpdate, onDestroy, onMount, tick } from 'svelte';
	import CopyButton from './Buttons/ButtonCopy.svelte';
	import { open } from '@tauri-apps/api/shell';

	export let senderType = '';
	export let text = '';
	export let parse = true;

	const classes: any = {
		human: {
			tab: 'bg-slate-950 bg-opacity-50',
			body: 'bg-slate-950 bg-opacity-50 rounded-tl-none',
		},
		ai: {
			tab: 'bg-zinc-900',
			body: 'bg-zinc-900 bg-opacity-50 rounded-tr-none',
		}
	};

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
	renderer.link = (href, title, text) => {
		return `<a href=${href} title=${text} target="_blank" class="ext-link text-[#66a0de]">${text}</a>`
	}

	onMount(async () => {
		sanitizedText = await sanitize(text || '');
		console.log({sanitizedText})
		await tick();
		applyCodeClipper();
		applyExternalLinkHandling();
	});

	onDestroy(() => {
		const links = getLinks();
		for (const link of links) {
			(link as any).removeEventListener('click', linkOpener);
		}
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
			el.classList.add('whitespace-break-spaces')
			el.appendChild(target);
			new CopyButton({
				target,
				hydrate: true,
				props: {
					text: el.innerText,
					title: 'Copy this block',
					position: 'top',
					classes: 'absolute bottom-0 right-0'
				}
			});
		});
	}

	function getLinks() {
		const links = root?.querySelectorAll('a.ext-link');
		return links;
	}
	
	function applyExternalLinkHandling() {
		const links = getLinks();
		if (!links) return;
		for (const link of links) {
			(link as any).addEventListener('click', linkOpener);
		}
	}

	function linkOpener(e: any) {
		e.preventDefault();
		e.stopPropagation();
		console.log('@linkOpener', e);
		open(e.target.href);
		return false;
	}
</script>

<div class="tab" bind:this={root}>
	<div class="flex w-full font-bold" class:justify-end={senderType === 'ai'}>
		<div class="font-bold py-1 px-3 rounded-t-md {classes[senderType].tab}">
			{senderType === 'ai' ? 'AI' : 'Me'}
		</div>
	</div>
	<div
		class="rounded-md {classes[senderType].body}">
		<slot name="notes" />
		<!-- prettier-ignore -->
		<div class="p-4 whitespace-pre-wrap">
			{@html sanitizedText}
		</div>
		<slot name="images" />
		<slot name="footer" />
	</div>
</div>