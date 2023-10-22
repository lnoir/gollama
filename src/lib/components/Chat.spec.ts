import Chat from './Chat.svelte';
import { render, screen } from '@testing-library/svelte';
import { describe, it } from 'vitest';

describe('Chat', () => {
	it('is rendered', async () => {
		const component = render(Chat, {
			props: {
				conversationId: 0
			}
		});
		component.debug();
		expect(component).toBeTruthy();
		expect(screen.getByPlaceholderText('Select a model')).toBeTruthy();
		expect(screen.getByPlaceholderText('Type something...')).toBeTruthy();
	});
});
