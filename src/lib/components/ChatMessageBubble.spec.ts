import ChatMessageBubble from './ChatMessageBubble.svelte';
import { render, screen } from '@testing-library/svelte';
import { describe, it } from 'vitest';

const props = {
	senderType: 'human',
	text: 'Hello!'
};

describe('ChatMessageBubble', () => {
	it('is rendered', async () => {
		const component = render(ChatMessageBubble, {
			props
		});
		component.debug();
		expect(component).toBeTruthy();
		expect(screen.queryByText('Me')).toBeTruthy();
		expect(screen.queryByText('Hello!')).toBeTruthy();
	});
});
