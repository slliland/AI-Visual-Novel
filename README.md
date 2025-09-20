# AI-Powered Visual Novel Adventure

An interactive web-based visual novel where the story is generated in real-time by streaming AI responses. Users start with a prompt and guide the narrative through interactive choices, creating a unique, AI-driven adventure.

## Features

- **Interactive Storytelling**: Start your adventure with a custom prompt
- **Streaming Text with Typing Effect**: Real-time story generation with smooth character-by-character animation
- **Dynamic Character Avatars**: Character portraits change based on emotions and context
- **Choice-Driven Narrative**: Make decisions that shape the story's direction
- **Immersive Background**: Beautiful background imagery with atmospheric overlays
- **Sound Effects**: Optional subtle audio feedback for typing and interactions
- **Responsive Design**: Optimized for desktop and mobile devices
- **Error Handling**: Comprehensive error boundaries and graceful failure handling

## Characters

The visual novel features characters from Genshin Impact with multiple emotional expressions:

- **Lumine**: A traveler searching for answers
- **Tartaglia** (Childe): A battle-hungry Harbinger  
- **Venti**: A carefree bard with hidden depths
- **Zhongli**: A knowledgeable consultant with ancient wisdom
- **Narrator**: For descriptive, non-dialogue text

Each character has 15+ emotional states including: Neutral, Happy, Sad, Angry, Surprised, Thinking, Confident, and more.

## Technical Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js Route Handlers
- **Streaming**: Custom XML parser for real-time content processing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
# or  
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

### XML Streaming & Parsing

The application uses a custom streaming XML parser that processes AI responses in real-time:

1. **API Route**: `/api/story` streams XML content character by character
2. **XML Parser**: `StreamingXMLParser` class processes chunks progressively
3. **Component Updates**: UI updates dynamically as new content arrives

### XML Format

The application parses structured XML responses:

```xml
<Narrator>Descriptive text appears here</Narrator>
<character name="Lumine">
  <action expression="Happy">Character action description</action>
  <say>Character dialogue goes here</say>
</character>
<choices>
  <choice id="choice1">First choice option</choice>
  <choice id="choice2">Second choice option</choice>
</choices>
```

### Key Components

- `VisualNovel`: Main orchestrating component
- `StoryDisplay`: Handles text animation and avatar display
- `ChoiceSystem`: Interactive choice selection
- `StreamingXMLParser`: Real-time XML processing
- `ErrorBoundary`: Error handling and recovery

## Project Structure

```
src/
├── app/
│   ├── api/story/          # Streaming API endpoint
│   ├── components/         # React components
│   │   ├── VisualNovel.tsx
│   │   ├── StoryDisplay.tsx
│   │   ├── ChoiceSystem.tsx
│   │   └── ErrorBoundary.tsx
│   ├── lib/
│   │   ├── types.ts        # TypeScript definitions
│   │   └── xmlParser.ts    # XML streaming parser
│   └── globals.css         # Global styles
public/
├── avatars/                # Character portraits
│   ├── Lumine/
│   ├── Tartaglia/
│   ├── Venti/
│   └── Zhongli/
└──  sample.xml             # Sample story data
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically on every commit

### Other Platforms

The application can be deployed to any platform supporting Next.js:

- Netlify
- Railway  
- DigitalOcean App Platform
- AWS Amplify

## Development Notes

### Mock LLM Integration

Currently uses sample XML files instead of real LLM APIs to focus on parsing and UI implementation. The streaming mechanism is designed to easily integrate with real AI services like OpenAI or Anthropic.

### Adding New Characters

1. Add character portraits to `public/avatars/[CharacterName]/`
2. Update the `Speaker` type in `types.ts`
3. Add character name to avatar path mapping in `StoryDisplay.tsx`

### Extending XML Format

The parser supports extensible XML formats. Add new tag handlers in `StreamingXMLParser.processChunk()`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
