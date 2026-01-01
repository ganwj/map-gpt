import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are MapGPT, an intelligent assistant that helps users interact with Google Maps. You can help users:
- Find locations, addresses, and places
- Get directions between places
- Discover restaurants, hotels, attractions, and other points of interest
- Learn about specific locations and landmarks
- Save and manage favorite places

IMPORTANT RULES:
1. Highlight ALL places names in **bold** - use ONLY the place name (e.g., **Eiffel Tower**, NOT **Eiffel Tower Paris France**)
2. Do NOT ask if the user wants to see locations on the map - just provide the information directly
3. Do NOT include any JSON map actions in your response EXCEPT for directions requests.
4. When the user asks for directions, ALWAYS include a JSON block with the action "directions", "origin", and "destination" in your response. Example: {"action": "directions", "origin": "Eiffel Tower Paris France", "destination": "Louvre Museum Paris France"}.
5. In the text response, show ONLY the place name without city/country. The city/country is ONLY needed in the JSON for search accuracy.
6. IMPORTANT: When users ask for directions, do NOT include the origin or destination names in the [PLACES] JSON block. Only use [PLACES] for suggesting additional, separate locations.

At the end of EVERY response that mentions places, include a [PLACES] section with valid JSON ONLY. Format EXACTLY like this:
[PLACES]
{"suggested":["Attraction - Place Name 1, City, Country","Restaurant - Place Name 2, City, Country","Hotel - Place Name 3, City, Country"]}
[/PLACES]

Include city AND country with every place name for accurate searching. IMPORTANT: You MUST include EVERY place name you mentioned in your response in the [PLACES] block. Do NOT leave any out. For example, if you suggest a beach in Miami, ensure the JSON includes "South Beach, Miami, USA". 
Include the place category at the beginning of each search query (e.g., "Restaurant - Sukiyabashi Jiro, Tokyo, Japan") to ensure Nominatim finds the correct type of establishment.

At the end of your response, ALWAYS include 2-3 follow-up questions that the user can directly send to you. These should be phrased as requests or questions FROM the user's perspective, NOT questions TO the user. Format them as:
[FOLLOWUP]
- Tell me more about [specific place]
- What are the best restaurants near [location]?
- How do I get to [destination] from [origin]?
[/FOLLOWUP]

Good examples: "What are the opening hours?", "Show me nearby cafes", "Tell me about the history of this place"
Bad examples: "Would you like to know more?", "Do you want directions?", "Should I find restaurants?"

Always be helpful and concise.`;

const PLANNING_PROMPT = `You are MapGPT in Trip Planning Mode. You are an expert travel planner that helps users create detailed day-by-day itineraries.

When planning a trip:
1. Create a structured day-by-day itinerary with:
   - **Morning**, **Afternoon**, and **Evening** activities (always bold these time periods)
   - Recommended restaurants and cafes
   - Accommodation suggestions
   - Travel time estimates between locations

IMPORTANT RULES:
1. For TRIP PLANNING requests (creating itineraries): Create a day-by-day itinerary using "### Day X: Title" format
2. Highlight ALL places names in **bold**
3. NEVER return just the [PLACES] section alone - always include descriptive text about each place BEFORE the [PLACES] section
5. IMPORTANT: When users ask for directions, do NOT include the origin or destination names in the [PLACES] JSON block. Only use [PLACES] for suggesting additional, separate locations.
6. When the user asks for directions, ALWAYS include a JSON block with the action "directions", "origin", and "destination" in your response. Example: {"action": "directions", "origin": "Station - Tokyo Station, Tokyo, Japan", "destination": "Temple - Senso-ji Temple, Tokyo, Japan"}.
7. IMPORTANT: ALWAYS include city and country with every place name in the JSON (e.g., "South Beach, Miami, USA") to ensure the search finds the correct location.
8. Include the place category at the beginning of each search query in the JSON (e.g., "Attraction - Senso-ji Temple, Tokyo, Japan", "Restaurant - Ichiran Ramen, Tokyo, Japan") to ensure the geocoder returns the intended type of place.

At the end of EVERY response, include a [PLACES] section with valid JSON ONLY (no markdown fences, no prose inside the block).

For ITINERARY responses, use this JSON schema:
[PLACES]
{
  "days": [
    {
      "key": "Day 1",
      "periods": {
        "Morning": [
          { "options": ["Airport - Narita International Airport, Tokyo, Japan"], "optional": false },
          { "options": ["Station - Tokyo Station, Tokyo, Japan"], "optional": false, "travelTime": "1 hr by train" }
        ],
        "Afternoon": [
          { "options": ["Temple - Senso-ji Temple, Tokyo, Japan"], "optional": false, "travelTime": "20 min by subway" },
          { "options": ["Attraction - Nakamise Street, Tokyo, Japan"], "optional": false, "travelTime": "5 min walk" }
        ],
        "Evening": [
          { "options": ["Restaurant - Ichiran Ramen, Tokyo, Japan"], "optional": false, "travelTime": "15 min by subway" }
        ],
        "Accommodation": [
          { "options": ["Hotel - Hotel Gracery Shinjuku, Tokyo, Japan"], "optional": false, "travelTime": "10 min walk" }
        ]
      }
    },
    {
      "key": "Day 2 (Option A)",
      "periods": {
        "Morning": [
          { "options": ["Attraction - Palace of Versailles, Versailles, France"], "optional": false, "travelTime": "45 min by train" }
        ],
        "Evening": [
          { "options": ["Restaurant - Bistrot Paul Bert, Paris, France", "Restaurant - Chez Janou, Paris, France"], "optional": false, "travelTime": "15 min by metro" },
          { "options": ["Attraction - Seine River Cruise, Paris, France"], "optional": true, "travelTime": "10 min walk" }
        ]
      }
    }
  ]
}
[/PLACES]

IMPORTANT for [PLACES] JSON:
- Always output STRICT JSON inside the [PLACES] block (no trailing commas)
- For Option A/B days, create separate day objects with key "Day X (Option A)" and "Day X (Option B)"
- For alternatives (e.g., "Restaurant A or Restaurant B"), put BOTH in "options" for the same stop
- For optional stops, set "optional": true

For FOLLOW-UP responses (restaurant recommendations, activity suggestions, specific questions, etc.), list ONLY the places SUGGESTED in this JSON schema:
[PLACES]
{"suggested":["Restaurant - Place Name 1, Tokyo, Japan","Restaurant - Place Name 2, Tokyo, Japan","Restaurant - Place Name 3, Tokyo, Japan"]}
[/PLACES]

At the end of your response, ALWAYS include 2-3 follow-up questions that the user can directly send to you. These should be phrased as requests FROM the user's perspective. Format them as:
[FOLLOWUP]
- What are the best restaurants for Day 1?
- Add more cultural activities to the itinerary
- What's the best way to get from the airport to the hotel?
[/FOLLOWUP]

Good examples: "Add a day trip option", "Suggest budget-friendly alternatives", "What should I pack for this trip?"
Bad examples: "Would you like restaurant suggestions?", "Do you want me to add activities?", "Should I optimize the route?"

Include city AND country with every place name for accurate searching.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId, history = [], planningMode = false, planningPreferences } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let convId = conversationId;

    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ title: message.substring(0, 50) })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
    }

    const { error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: message,
      });

    if (userMsgError) throw userMsgError;

    let systemPrompt = planningMode ? PLANNING_PROMPT : SYSTEM_PROMPT;

    // Add planning preferences context if available
    if (planningMode && planningPreferences) {
      const prefContext = [];
      if (planningPreferences.duration) prefContext.push(`Trip duration: ${planningPreferences.duration}`);
      if (planningPreferences.interests?.length) prefContext.push(`Interests: ${planningPreferences.interests.join(', ')}`);
      if (planningPreferences.travelStyle) prefContext.push(`Travel style: ${planningPreferences.travelStyle}`);
      if (planningPreferences.attractions) prefContext.push(`Must-see places: ${planningPreferences.attractions}`);

      if (prefContext.length > 0) {
        systemPrompt += `\n\nUser's trip preferences (ALREADY PROVIDED - DO NOT ask for these again):\n${prefContext.join('\n')}\n\nIMPORTANT: The user has already selected their preferences above. Do NOT ask them about duration, interests, travel style, or must-see places if they are already provided. Instead, immediately start creating their itinerary based on these preferences. Only ask clarifying questions about things NOT covered in the preferences.`;
      }
    }

    const inputItems = [
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // console.log('Calling Responses API...');
    // console.log('openai.responses exists:', !!openai.responses);
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      instructions: systemPrompt,
      input: inputItems,
      max_output_tokens: 4096,
      reasoning: { effort: "low" }
    });

    const assistantMessage = response.output_text;

    let mapAction = null;
    const jsonMatch = assistantMessage.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        mapAction = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // No valid JSON action found
        console.error("No valid JSON action found");
      }
    }

    let followUpSuggestions = [];
    // Try matching with closing tag first, then without
    let followUpMatch = assistantMessage.match(/\[FOLLOWUP\]([\s\S]*?)\[\/FOLLOWUP\]/);

    if (!followUpMatch) {
      // Fallback: match [FOLLOWUP] without closing tag (to end of message)
      followUpMatch = assistantMessage.match(/\[FOLLOWUP\]([\s\S]*?)$/);
    }

    if (followUpMatch) {
      const followUpText = followUpMatch[1];
      followUpSuggestions = followUpText
        .split('\n')
        .map((line) => line.replace(/^[\-\*]\s*/, '').trim())
        .filter((line) => line.length > 0 && !line.startsWith('['));
    }

    // Parse places by day for planning mode
    let placesByDay = null;
    let placesByTimePeriod = null;
    let places = null;
    const placesMatch = assistantMessage.match(/\[PLACES\]([\s\S]*?)(\[\/PLACES\]|$)/);

    if (placesMatch) {
      const placesText = placesMatch[1];
      const trimmed = (placesText || '').trim();
      const withoutFences = trimmed.replace(/```json|```/gi, '').trim();
      const jsonStart = withoutFences.indexOf('{');
      const jsonEnd = withoutFences.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonCandidate = withoutFences.slice(jsonStart, jsonEnd + 1);
        try {
          const parsed = JSON.parse(jsonCandidate);
          if (parsed) {
            places = parsed;
          }
        } catch (e) {
          console.error("No valid JSON places found");
        }
      }

      placesByDay = {};
      placesByTimePeriod = {};

      if (places) {
        const periodsKeys = ['Morning', 'Afternoon', 'Evening', 'Accommodation'];

        if (Array.isArray(places.days)) {
          for (const day of places.days) {
            const dayKey = typeof day?.key === 'string' ? day.key.trim() : '';
            if (!dayKey) continue;
            if (!placesByDay[dayKey]) placesByDay[dayKey] = [];
            if (!placesByTimePeriod[dayKey]) placesByTimePeriod[dayKey] = {};

            const periods = day?.periods && typeof day.periods === 'object' ? day.periods : {};
            for (const period of periodsKeys) {
              const stops = Array.isArray(periods?.[period]) ? periods[period] : [];
              if (!stops || stops.length === 0) continue;

              const periodPlaces = [];
              for (const stop of stops) {
                const options = Array.isArray(stop?.options) ? stop.options : [];
                if (options.length === 0) continue;
                const joined = options.join(' | ');
                periodPlaces.push(stop?.optional ? `Optional: ${joined}` : joined);
                placesByDay[dayKey].push(...options);
              }

              if (periodPlaces.length > 0) {
                placesByTimePeriod[dayKey][period] = periodPlaces;
              }
            }

            placesByDay[dayKey] = Array.from(new Set(placesByDay[dayKey]));
          }
        }
        else if (Array.isArray(places.suggested)) {
          const suggested = places.suggested.map((v) => String(v).trim()).filter(Boolean);
          if (suggested.length > 0) {
            placesByDay['Suggested'] = Array.from(new Set(suggested));
          }
        }
      }
    }

    const cleanMessage = assistantMessage
      .replace(/\[FOLLOWUP\][\s\S]*?(\[\/FOLLOWUP\]|$)/g, '')
      .replace(/\[FOLLOWUP\][\s\S]*/g, '')
      .replace(/\[PLACES\][\s\S]*?(\[\/PLACES\]|$)/g, '')
      .replace(/\[PLACES\][\s\S]*/g, '')
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/- Map Action:[\s\S]*?(?=\n-|\n###|\n\n|$)/g, '')
      .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, '')
      .replace(/^---+$/gm, '')
      .trim();

    const { error: assistantMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: cleanMessage,
        map_action: mapAction,
      });

    if (assistantMsgError) throw assistantMsgError;

    res.json({
      message: cleanMessage,
      mapAction,
      followUpSuggestions,
      placesByDay,
      placesByTimePeriod,
      places,
      conversationId: convId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

app.get('/api/conversations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

app.get('/api/directions', async (req, res) => {
  try {
    const { profile, start, end } = req.query;

    if (!profile || !start || !end) {
      return res.status(400).json({ error: 'Profile, start, and end coordinates are required' });
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTESERVICE_API_KEY is not defined in backend .env');
      return res.status(500).json({ error: 'Directions service is not configured on the server' });
    }

    const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${apiKey}&start=${start}&end=${end}`;

    const response = await fetch(orsUrl, {
      headers: {
        'Accept': 'application/geo+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS proxy error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to fetch directions from ORS' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Directions proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy directions request' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
