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

When a user asks about a location or place, respond with helpful information AND include a map_action in your response to update the map.

Available map actions (include these in your response as JSON):
1. {"action": "search", "query": "search term"} - Search for a place
2. {"action": "goto", "lat": number, "lng": number, "zoom": number} - Navigate to coordinates
3. {"action": "directions", "origin": "place", "destination": "place"} - Show directions
4. {"action": "marker", "lat": number, "lng": number, "title": "label"} - Add a marker

At the end of your response, ALWAYS include 2-3 follow-up question suggestions that the user might want to ask next. Format them as:
[FOLLOWUP]
- First follow-up question
- Second follow-up question
- Third follow-up question
[/FOLLOWUP]

Make the follow-up questions relevant to the current topic. For example, if discussing the Eiffel Tower, suggest questions about nearby restaurants, best time to visit, or directions from a popular location.

Always be helpful, concise, and provide relevant map actions when appropriate.`;

const PLANNING_PROMPT = `You are MapGPT in Trip Planning Mode. You are an expert travel planner that helps users create detailed day-by-day itineraries.

When planning a trip:
1. Create a structured day-by-day itinerary with:
   - Morning, afternoon, and evening activities
   - Recommended restaurants and cafes
   - Travel time estimates between locations
   - Practical tips (best time to visit, tickets, reservations)
2. Include accommodation suggestions for each city/area visited

IMPORTANT RULES:
1. For TRIP PLANNING requests: Create a day-by-day itinerary using "### Day X: Title" format
2. HIGHLIGHT the places suggested with **bold**
3. For FOLLOW-UP questions: ALWAYS provide a detailed text response FIRST, then add the [PLACES] and [FOLLOWUP] sections at the end

Do NOT include any JSON map actions.

At the end of EVERY response, include a [PLACES] section with ALL places mentioned. Format EXACTLY like this with each day on its own line:
[PLACES]
Day 1: Colosseum Rome Italy, Roman Forum Rome Italy, Hotel Artemide Rome Italy
Day 2: Vatican Museums Rome Italy, St Peters Basilica Rome Italy, Hotel Artemide Rome Italy
[/PLACES]

For non-itinerary responses (like hotel or restaurant recommendations), use:
[PLACES]
Suggested: Hotel Artemide Rome Italy, Hotel de Russie Rome Italy, Hotel Campo de Fiori Rome Italy
[/PLACES]

At the end of your response, ALWAYS include 2-3 follow-up question suggestions that the user might want to ask next. Format them as:
[FOLLOWUP]
- First follow-up question
- Second follow-up question
- Third follow-up question
[/FOLLOWUP]

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
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: planningMode ? 2000 : 1000,
    });

    const assistantMessage = completion.choices[0].message.content;

    let mapAction = null;
    const jsonMatch = assistantMessage.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        mapAction = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // No valid JSON action found
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
        .map((line) => line.replace(/^-\s*/, '').trim())
        .filter((line) => line.length > 0 && !line.startsWith('['));
    }

    // Parse places by day for planning mode
    let placesByDay = null;
    const placesMatch = assistantMessage.match(/\[PLACES\]([\s\S]*?)(\[\/PLACES\]|$)/);
    if (placesMatch) {
      placesByDay = {};
      const placesText = placesMatch[1];
      placesText.split('\n').forEach(line => {
        // Match "Day X:" format
        const dayMatch = line.match(/Day\s*(\d+):\s*(.+)/i);
        if (dayMatch) {
          const dayNum = dayMatch[1];
          const places = dayMatch[2].split(',').map(p => p.trim()).filter(p => p);
          placesByDay[`Day ${dayNum}`] = places;
        }
        // Match "Suggested:" format for non-itinerary responses
        const suggestedMatch = line.match(/Suggested:\s*(.+)/i);
        if (suggestedMatch) {
          const places = suggestedMatch[1].split(',').map(p => p.trim()).filter(p => p);
          placesByDay['Suggested'] = places;
        }
      });
    }
    
    // Fallback: extract places from ### Day headers if [PLACES] not found
    if (!placesByDay || Object.keys(placesByDay).length === 0) {
      placesByDay = {};
      // Find all day sections and extract bold place names
      const dayHeaders = assistantMessage.matchAll(/###\s*Day\s*(\d+)[^\n]*/gi);
      const dayContents = assistantMessage.split(/###\s*Day\s*\d+[^\n]*/i);
      
      let dayIndex = 0;
      for (const match of dayHeaders) {
        dayIndex++;
        const dayNum = match[1];
        const content = dayContents[dayIndex] || '';
        // Extract bold text (place names) from this day's content
        const boldMatches = content.match(/\*\*([^*]+)\*\*/g) || [];
        const places = boldMatches
          .map(m => m.replace(/\*\*/g, '').trim())
          .filter(p => p.length > 2 && !p.match(/^(Morning|Afternoon|Evening|Tip|Travel|Note|Cuisine|Highlights|Distance)/i));
        if (places.length > 0) {
          placesByDay[`Day ${dayNum}`] = places;
        }
      }
      
      // If still no places found, extract from numbered lists (for restaurant/place recommendations)
      if (Object.keys(placesByDay).length === 0) {
        const boldMatches = assistantMessage.match(/\*\*([^*]+)\*\*/g) || [];
        const places = boldMatches
          .map(m => m.replace(/\*\*/g, '').trim())
          .filter(p => p.length > 2 && !p.match(/^(Morning|Afternoon|Evening|Tip|Travel|Note|Cuisine|Highlights|Distance)/i));
        if (places.length > 0) {
          placesByDay['Suggested Places'] = places;
        }
      }
      
      if (Object.keys(placesByDay).length === 0) {
        placesByDay = null;
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

app.post('/api/places', async (req, res) => {
  try {
    const { name, address, lat, lng, place_id } = req.body;

    const { data, error } = await supabase
      .from('saved_places')
      .insert({ name, address, lat, lng, place_id })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error saving place:', error);
    res.status(500).json({ error: 'Failed to save place' });
  }
});

app.get('/api/places', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

app.delete('/api/places/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({ error: 'Failed to delete place' });
  }
});

app.post('/api/summarize-reviews', async (req, res) => {
  try {
    const { placeName, reviews } = req.body;

    if (!reviews || reviews.length === 0) {
      return res.status(400).json({ error: 'Reviews are required' });
    }

    const reviewsText = reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars): ${r.text}`)
      .join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes customer reviews. Provide a concise 2-3 sentence summary highlighting the main positives and negatives mentioned in the reviews. Be objective and balanced.',
        },
        {
          role: 'user',
          content: `Summarize these reviews for "${placeName}":\n\n${reviewsText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const summary = completion.choices[0].message.content;
    res.json({ summary });
  } catch (error) {
    console.error('Review summary error:', error);
    res.status(500).json({ error: 'Failed to summarize reviews' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
