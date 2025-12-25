# MapGPT

An interactive Google Maps application with AI chatbot capabilities. Ask questions about locations, get directions, and discover places around the world.

## Features

- **AI-Powered Chat**: Natural language interface to interact with the map
- **Location Search**: Find any place, address, or point of interest
- **Directions**: Get driving directions between locations
- **Place Discovery**: Discover restaurants, hotels, attractions, and more
- **Interactive Map**: Click on the map to learn about locations
- **Chat History**: Conversations are saved to Supabase

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **Maps**: Google Maps JavaScript API

## Prerequisites

- Node.js 18+
- Google Maps API Key (with Places API enabled)
- OpenAI API Key
- Supabase project (already configured)

## Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

Edit `.env` file and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Start the backend server:

```bash
npm run dev
```

The backend will run on http://localhost:3001

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Edit `.env` file and add your Google Maps API key:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_API_URL=http://localhost:3001
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on http://localhost:5173

## Getting API Keys

### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your domain for production

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key

## Usage

1. Start both backend and frontend servers
2. Open http://localhost:5173 in your browser
3. Use the chat panel to:
   - Search for places: "Show me the Eiffel Tower"
   - Get directions: "Directions from New York to Boston"
   - Find nearby places: "Find coffee shops near Kuala Lumpur"
   - Learn about locations: "Tell me about the Colosseum in Rome"

## Project Structure

```
map-gpt/
├── backend/
│   ├── index.js        # Express server with API routes
│   ├── .env            # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── GoogleMap.tsx # Google Maps component
│   │   │   └── ChatPanel.tsx # AI chat interface
│   │   ├── App.tsx           # Main application
│   │   └── main.tsx          # Entry point
│   ├── .env            # Environment variables
│   └── package.json
└── README.md
```

## API Endpoints

- `POST /api/chat` - Send a message to the AI chatbot
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id/messages` - Get messages for a conversation
- `DELETE /api/conversations/:id` - Delete a conversation
- `POST /api/places` - Save a place
- `GET /api/places` - List saved places
- `DELETE /api/places/:id` - Delete a saved place

## License

ISC
