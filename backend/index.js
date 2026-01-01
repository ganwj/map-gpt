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
3. Do NOT include any JSON map actions in your response (the only JSON allowed is inside the [PLACES] block)
4. In the text response, show ONLY the place name without city/country. The city/country is ONLY needed in the [PLACES] JSON for search accuracy

At the end of EVERY response that mentions places, include a [PLACES] section with valid JSON ONLY. Format EXACTLY like this:
[PLACES]
{"version":2,"suggested":["Place Name 1 City Country","Place Name 2 City Country","Place Name 3 City Country"]}
[/PLACES]

Include city AND country with every place name for accurate searching.

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
   - Practical tips (best time to visit, tickets, reservations)

IMPORTANT RULES:
1. For TRIP PLANNING requests (creating itineraries): Create a day-by-day itinerary using "### Day X: Title" format
2. Highlight ALL places names in **bold** - use ONLY the place name (e.g., **Senso-ji Temple**, NOT **Senso-ji Temple Tokyo Japan**)
3. For FOLLOW-UP questions (like restaurant recommendations, activity suggestions, etc.): ALWAYS provide a detailed text response with descriptions FIRST, then add the [PLACES] section at the end using the v2 JSON schema (not day-by-day period text format)
4. NEVER return just the [PLACES] section alone - always include descriptive text about each place BEFORE the [PLACES] section
5. In the text response, show ONLY the place name without city/country. The city/country is ONLY needed in the [PLACES] JSON for search accuracy

Do NOT include any JSON map actions.

At the end of EVERY response, include a [PLACES] section with valid JSON ONLY (no markdown fences, no prose inside the block).

For ITINERARY responses, use this JSON schema:
[PLACES]
{
  "version": 2,
  "days": [
    {
      "key": "Day 1",
      "periods": {
        "Morning": [
          { "options": ["Narita International Airport Tokyo Japan"], "optional": false },
          { "options": ["Tokyo Station Tokyo Japan"], "optional": false, "travelTime": "1 hr by train" }
        ],
        "Afternoon": [
          { "options": ["Senso-ji Temple Tokyo Japan"], "optional": false, "travelTime": "20 min by subway" },
          { "options": ["Nakamise Street Tokyo Japan"], "optional": false, "travelTime": "5 min walk" }
        ],
        "Evening": [
          { "options": ["Ichiran Ramen Tokyo Japan"], "optional": false, "travelTime": "15 min by subway" }
        ],
        "Accommodation": [
          { "options": ["Hotel Gracery Shinjuku Tokyo Japan"], "optional": false, "travelTime": "10 min walk" }
        ]
      },
      "suggested": []
    },
    {
      "key": "Day 3 (Option A)",
      "periods": {
        "Morning": [
          { "options": ["Palace of Versailles Versailles France"], "optional": false, "travelTime": "45 min by train" }
        ],
        "Evening": [
          { "options": ["Bistrot Paul Bert Paris France", "Chez Janou Paris France"], "optional": false, "travelTime": "15 min by metro" },
          { "options": ["Seine River Cruise Paris France"], "optional": true, "travelTime": "10 min walk" }
        ]
      },
      "suggested": ["Louvre Museum Paris France"]
    }
  ]
}
[/PLACES]

IMPORTANT for [PLACES] JSON:
- Always output STRICT JSON inside the [PLACES] block (no trailing commas)
- For Option A/B days, create separate day objects with key "Day X (Option A)" and "Day X (Option B)"
- For alternatives (e.g., "Restaurant A or Restaurant B"), put BOTH in "options" for the same stop
- For optional stops, set "optional": true
- Include "travelTime" for each stop (e.g., "15 min by subway", "5 min walk") - this is the time to reach this stop from the previous one
- Suggested places MUST go in "suggested" (per day) and MUST NOT appear in periods

For FOLLOW-UP responses (restaurant recommendations, activity suggestions, specific questions, etc.), list ONLY the places SUGGESTED in this JSON schema:
[PLACES]
{"version":2,"suggested":["Restaurant Name Tokyo Japan","Restaurant Name 2 Tokyo Japan","Restaurant Name 3 Tokyo Japan"]}
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
      max_output_tokens: planningMode ? 4000 : 2000,
      reasoning: { effort: planningMode ? 'low' : 'minimal' }
    });

    const assistantMessage = response.output_text;

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
        .map((line) => line.replace(/^[\-\*]\s*/, '').trim())
        .filter((line) => line.length > 0 && !line.startsWith('['));
    }

    // Parse places by day for planning mode
    let placesByDay = null;
    let placesByTimePeriod = null;
    let placesV2 = null;
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
          if (parsed && parsed.version === 2) {
            placesV2 = parsed;
          }
        } catch (e) {
        }
      }

      placesByDay = {};
      placesByTimePeriod = {};

      if (placesV2) {
        const periodsOrder = ['Morning', 'Afternoon', 'Evening', 'Accommodation'];
        if (Array.isArray(placesV2.days)) {
          for (const day of placesV2.days) {
            const dayKey = typeof day?.key === 'string' ? day.key.trim() : '';
            if (!dayKey) continue;
            if (!placesByDay[dayKey]) placesByDay[dayKey] = [];
            if (!placesByTimePeriod[dayKey]) placesByTimePeriod[dayKey] = {};

            const periods = day?.periods && typeof day.periods === 'object' ? day.periods : {};
            for (const period of periodsOrder) {
              const stops = Array.isArray(periods?.[period]) ? periods[period] : [];
              if (!stops || stops.length === 0) continue;

              const periodPlaces = [];
              for (const stop of stops) {
                const rawOptions = Array.isArray(stop?.options) ? stop.options : [];
                const options = rawOptions.map((v) => String(v).trim()).filter(Boolean);
                if (options.length === 0) continue;
                const joined = options.join(' | ');
                periodPlaces.push(stop?.optional ? `Optional: ${joined}` : joined);
                placesByDay[dayKey].push(...options);
              }

              if (periodPlaces.length > 0) {
                placesByTimePeriod[dayKey][period] = periodPlaces;
              }
            }

            const suggested = Array.isArray(day?.suggested) ? day.suggested.map((v) => String(v).trim()).filter(Boolean) : [];
            if (suggested.length > 0) {
              placesByDay[dayKey].push(...suggested);
            }

            placesByDay[dayKey] = Array.from(new Set(placesByDay[dayKey]));
          }
        } else if (Array.isArray(placesV2.suggested)) {
          const suggested = placesV2.suggested.map((v) => String(v).trim()).filter(Boolean);
          if (suggested.length > 0) {
            placesByDay['Suggested'] = Array.from(new Set(suggested));
          }
        }
      } else {
        let lastDayKey = null;
        let lastPeriod = null;
        trimmed.split('\n').forEach(line => {
        const cleanedLine = (line || '').replace(/^[\-\*]\s*/, '').trim();
        if (!cleanedLine) return;

        // Match "Alternative:" or "Alternatively," format for alternatives
        const altLineMatch = cleanedLine.match(/^(Alternative|Alt|Option|Alternatively)[,:\-]\s*(.+)$/i);
        if (altLineMatch && lastDayKey && lastPeriod && placesByTimePeriod[lastDayKey]?.[lastPeriod]) {
          // Extract place names from the alternative text (look for bold text or text before parentheses)
          let altText = altLineMatch[2];
          // Try to extract bold place names first
          const boldMatches = altText.match(/\*\*([^*]+)\*\*/g);
          let altPlaces = [];
          if (boldMatches && boldMatches.length > 0) {
            altPlaces = boldMatches.map(m => m.replace(/\*\*/g, '').trim()).filter(p => p);
          } else {
            // Fallback: split by comma or extract text before parentheses
            altPlaces = altText
              .split(',')
              .map(p => p.replace(/\s*\([^)]*\)/g, '').trim())
              .filter(p => p && p.length > 2);
          }

          if (altPlaces.length > 0) {
            // Store as a single grouped alternative entry for UI (split by | in frontend)
            placesByTimePeriod[lastDayKey][lastPeriod].push(`Alternative: ${altPlaces.join(' | ')}`);
            // Also include these alternatives in the flat list for map searching
            if (!placesByDay[lastDayKey]) placesByDay[lastDayKey] = [];
            placesByDay[lastDayKey].push(...altPlaces);
          }
          return;
        }

        // Match "Day X Option A/B Period:" format (e.g., "Day 3 Option A Morning:")
        const optionPeriodMatch = cleanedLine.match(/Day\s*(\d+)\s*Option\s*([A-Z])\s*(Morning|Afternoon|Evening|Accommodation):\s*(.+)/i);
        if (optionPeriodMatch) {
          const dayNum = optionPeriodMatch[1];
          const option = optionPeriodMatch[2].toUpperCase();
          const period = optionPeriodMatch[3];
          const placesRaw = optionPeriodMatch[4];
          // Handle pipe-separated alternatives (or choices)
          const places = placesRaw.split(',').map(p => p.trim()).filter(p => p);
          const dayKey = `Day ${dayNum} (Option ${option})`;

          lastDayKey = dayKey;
          lastPeriod = period;
          
          // Add to placesByDay (flat list for map) - expand pipe-separated alternatives
          if (!placesByDay[dayKey]) placesByDay[dayKey] = [];
          places.forEach(place => {
            if (place.includes('|')) {
              // Split pipe-separated alternatives and add each
              place.split('|').forEach(p => placesByDay[dayKey].push(p.trim()));
            } else {
              placesByDay[dayKey].push(place);
            }
          });
          
          // Add to placesByTimePeriod (structured for flowchart) - keep pipe format for UI
          if (!placesByTimePeriod[dayKey]) placesByTimePeriod[dayKey] = {};
          placesByTimePeriod[dayKey][period] = places;
          return;
        }

        // Match "Day X Period:" format (e.g., "Day 1 Morning:", "Day 2 Accommodation:")
        const timePeriodMatch = cleanedLine.match(/Day\s*(\d+)\s*(Morning|Afternoon|Evening|Accommodation):\s*(.+)/i);
        if (timePeriodMatch) {
          const dayNum = timePeriodMatch[1];
          const period = timePeriodMatch[2];
          const placesRaw = timePeriodMatch[3];
          // Handle pipe-separated alternatives (or choices)
          const places = placesRaw.split(',').map(p => p.trim()).filter(p => p);
          const dayKey = `Day ${dayNum}`;

          lastDayKey = dayKey;
          lastPeriod = period;
          
          // Add to placesByDay (flat list for map) - expand pipe-separated alternatives
          if (!placesByDay[dayKey]) placesByDay[dayKey] = [];
          places.forEach(place => {
            if (place.includes('|')) {
              // Split pipe-separated alternatives and add each
              place.split('|').forEach(p => placesByDay[dayKey].push(p.trim()));
            } else {
              placesByDay[dayKey].push(place);
            }
          });
          
          // Add to placesByTimePeriod (structured for flowchart) - keep pipe format for UI
          if (!placesByTimePeriod[dayKey]) placesByTimePeriod[dayKey] = {};
          placesByTimePeriod[dayKey][period] = places;
          return;
        }
        // Match simple "Day X:" format (fallback)
        const dayMatch = cleanedLine.match(/Day\s*(\d+):\s*(.+)/i);
        if (dayMatch) {
          const dayNum = dayMatch[1];
          const places = dayMatch[2].split(',').map(p => p.trim()).filter(p => p);
          placesByDay[`Day ${dayNum}`] = places;
        }
        // Match "Suggested:" format for non-itinerary responses
        const suggestedMatch = cleanedLine.match(/Suggested:\s*(.+)/i);
        if (suggestedMatch) {
          const places = suggestedMatch[1].split(',').map(p => p.trim()).filter(p => p);
          placesByDay['Suggested'] = places;
        }
        });
      }
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
          .filter(p => p.length > 2 && !p.match(/^(Morning|Afternoon|Evening|Tip|Travel|Note|Cuisine|Highlights|Distance|Option\s*[A-Z])/i));
        if (places.length > 0) {
          placesByDay[`Day ${dayNum}`] = places;
        }
        
        // Also check for "Option A/B" format if no places found yet
        if (places.length === 0) {
          const optionMatches = content.matchAll(/Option\s*[A-Z][:\s]+([^\n(]+)/gi);
          const optionPlaces = [];
          for (const optMatch of optionMatches) {
            const optPlace = optMatch[1].trim();
            if (optPlace && optPlace.length > 2) {
              optionPlaces.push(optPlace);
            }
          }
          if (optionPlaces.length > 0) {
            placesByDay[`Day ${dayNum}`] = optionPlaces;
          }
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
      placesByTimePeriod,
      placesV2,
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

app.post('/api/summarize-reviews', async (req, res) => {
  try {
    const { placeName, reviews } = req.body;

    if (!reviews || reviews.length === 0) {
      return res.status(400).json({ error: 'Reviews are required' });
    }

    const reviewsText = reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars): ${r.text}`)
      .join('\n\n');

    // console.log('Calling Responses API...');
    // console.log('openai.responses exists:', !!openai.responses);
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      instructions: 'You are a helpful assistant that summarizes customer reviews. Provide a concise 2-3 sentence summary highlighting the main positives and negatives mentioned in the reviews. Be objective and balanced.',
      input: `Summarize these reviews for "${placeName}":\n\n${reviewsText}`,
      max_output_tokens: 1000,
      reasoning: { effort: "minimal" }
    });

    const summary = response.output_text;
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
