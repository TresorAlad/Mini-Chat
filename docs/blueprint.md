# **App Name**: AquaChat

## Core Features:

- User Authentication: Allow users to sign up, log in, and log out securely using JWT. Passwords will be hashed for protection.
- User Management & Search: Manage user profiles, display a list of registered users, and enable searching for users by username. Show online/offline status.
- Real-time Messaging: Send and receive messages instantly via WebSockets, with immediate display in the chat interface and full message history.
- Conversation Management: Automatically create one-on-one conversations between users. Display a list of ongoing conversations for quick access.
- AI Quick Reply Suggestions: Suggest concise, contextually relevant replies to incoming messages, acting as a tool to speed up conversations.
- Data Storage (MongoDB): Persist user accounts, chat messages, and conversation data using MongoDB, following the provided schema.

## Style Guidelines:

- Primary color: '#A2D2FF' (blue, HSL: 206, 100, 82) - Main interactive elements and sent messages, evoking clarity and a modern aesthetic.
- Background color: '#F8FAFC' (off-white, HSL: 220, 16, 98) - Provides a clean, modern canvas that ensures high readability and a spacious feel.
- Accent color: '#FFC8DD' (light pink, HSL: 334, 100, 90) - Used for call-to-action elements, offering a warm and inviting contrast to the cool primary.
- Secondary color: '#BDE0FE' (light blue, HSL: 208, 97, 87) - For subtle highlights or less prominent interactive elements, creating visual harmony.
- Text color: '#1E1E1E' (dark charcoal, HSL: 0, 0, 12) - Ensures excellent readability against light backgrounds, contributing to the app's clean aesthetic.
- Font family: 'Inter' (sans-serif) for all text elements, providing a modern, objective, and highly readable experience across the application.
- Clean, line-art style icons with subtle rounding to complement the overall design aesthetic and ensure intuitive user navigation.
- A responsive two-column layout with a persistent sidebar displaying conversations and user lists, and a dynamic main chat area.
- Chat messages are presented in distinct bubbles: sent messages are right-aligned with the primary color background, while received messages are left-aligned with a white background.
- Subtle and fluid transitions for state changes, message arrivals, and interactions to enhance the real-time feel and user experience without being obtrusive.