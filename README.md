# MapGPT

An interactive Google Maps application with AI chatbot capabilities. Ask questions about locations, get directions, plan trips, and discover places around the world.

[![Application Image](https://i.postimg.cc/23R6zrH2/Screenshot_2025_12_26_035419.png)](https://postimg.cc/SYdqdFbM)

Try now at https://map-gpt-weld.vercel.app/

## Features

- **AI-Powered Chat**: Natural language interface to interact with the map
- **Location Search**: Find any place, address, or point of interest
- **Directions**: Get driving, walking, cycling, and transit directions between locations
- **Place Discovery**: Discover restaurants, hotels, attractions, and more
- **Trip Planning Mode**: Plan multi-day itineraries with time-period organization (Morning, Afternoon, Evening)
- **Itinerary Flowchart**: Visual flowchart view of daily itineraries with quick directions between places
- **Places Details**: Searchable list of discovered places with photos, ratings, and AI-generated summary
- **Interactive Map**: Click on the map to learn about locations

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
- Supabase account

## Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file and add the below variables:

```env
DATABASE_URL=your_supabase_postgres_url_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
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

Create `.env` file and add the below variables:

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

### Trip Planning Mode

1. Click the **Plan** button in the chat header
2. Set your preferences:
   - **Duration**: Select trip length (1-2 days, 3-4 days, etc.)
   - **Interests**: Choose from Food, Culture, Shopping, Nature, etc.
   - **Travel Style**: Budget, Mid-range, or Luxury
3. Enter your destination and any specific requirements
4. Click day buttons to view the itinerary flowchart
5. Use "Get directions & travel time" between places

## Testing

Run the test suite:

```bash
cd frontend
npm run test
```

Tests cover:
- Component rendering and interactions
- Type definitions
- Utility functions

## Project Structure

```
map-gpt/
├── backend/
│   ├── index.js          # Express server with API routes
│   ├── db.js             # Supabase database connection
│   ├── .env              # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── GoogleMap.tsx            # Google Maps component
│   │   │   ├── ChatPanel.tsx            # AI chat interface
│   │   │   ├── PlacesList.tsx           # Places panel with search
│   │   │   ├── PlaceDetails.tsx         # Place details view
│   │   │   ├── ItineraryFlowchart.tsx   # Trip itinerary flowchart
│   │   │   ├── PlacesAutocomplete.tsx   # Places search autocomplete
│   │   │   └── SearchBar.tsx            # Map search bar
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript type definitions
│   │   ├── constants/
│   │   │   └── index.ts          # App constants
│   │   ├── hooks/
│   │   │   └── useGeolocation.ts # Geolocation hook
│   │   ├── lib/
│   │   │   ├── utils.ts          # Utility functions
│   │   │   ├── geolocation.ts    # Geolocation helpers
│   │   │   └── countryCode.ts    # Country code utilities
│   │   ├── App.tsx               # Main application
│   │   └── main.tsx              # Entry point
│   ├── .env              # Environment variables
│   └── package.json
└── README.md
```
