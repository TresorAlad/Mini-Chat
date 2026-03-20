'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating quick reply suggestions
 * based on an incoming chat message. It aims to provide concise and contextually
 * relevant reply options to help users respond faster.
 *
 * - suggestQuickReplies - The main function to call for getting quick reply suggestions.
 * - QuickReplySuggestionsInput - The input type for the suggestQuickReplies function.
 * - QuickReplySuggestionsOutput - The return type for the suggestQuickReplies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuickReplySuggestionsInputSchema = z.object({
  incomingMessage: z.string().describe('The incoming chat message to which quick replies should be suggested.'),
});
export type QuickReplySuggestionsInput = z.infer<typeof QuickReplySuggestionsInputSchema>;

const QuickReplySuggestionsOutputSchema = z.object({
  replies: z.array(z.string()).describe('An array of suggested quick replies, each concise and relevant.'),
});
export type QuickReplySuggestionsOutput = z.infer<typeof QuickReplySuggestionsOutputSchema>;

export async function suggestQuickReplies(input: QuickReplySuggestionsInput): Promise<QuickReplySuggestionsOutput> {
  return aiQuickReplySuggestionsFlow(input);
}

const quickReplyPrompt = ai.definePrompt({
  name: 'quickReplyPrompt',
  input: { schema: QuickReplySuggestionsInputSchema },
  output: { schema: QuickReplySuggestionsOutputSchema },
  prompt: `You are a helpful assistant designed to suggest quick, concise, and contextually relevant replies to chat messages.
Provide 3 short, distinct reply options based on the incoming message.
Keep replies brief, typically one to five words, and suitable for a casual chat.

Incoming Message:
{{{incomingMessage}}}

Your suggested replies should be in a JSON array format, for example:
["Ok, thanks!", "Sounds good", "Got it."]
`,
});

const aiQuickReplySuggestionsFlow = ai.defineFlow(
  {
    name: 'aiQuickReplySuggestionsFlow',
    inputSchema: QuickReplySuggestionsInputSchema,
    outputSchema: QuickReplySuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await quickReplyPrompt(input);
    return output!;
  }
);
