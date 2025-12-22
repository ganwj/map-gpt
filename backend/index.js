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

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId, history = [] } = req.body;

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

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
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
      max_tokens: 1000,
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
    const followUpMatch = assistantMessage.match(/\[FOLLOWUP\]([\s\S]*?)\[\/FOLLOWUP\]/);
    if (followUpMatch) {
      const followUpText = followUpMatch[1];
      followUpSuggestions = followUpText
        .split('\n')
        .map((line) => line.replace(/^-\s*/, '').trim())
        .filter((line) => line.length > 0);
    }

    const cleanMessage = assistantMessage
      .replace(/\[FOLLOWUP\][\s\S]*?\[\/FOLLOWUP\]/g, '')
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
