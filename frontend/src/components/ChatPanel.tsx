import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  map_action?: MapAction | null;
  followUpSuggestions?: string[];
}

interface MapAction {
  action: 'search' | 'goto' | 'directions' | 'marker';
  query?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  title?: string;
  origin?: string;
  destination?: string;
}

interface ChatPanelProps {
  onMapAction: (action: MapAction) => void;
  selectedPlace?: { name: string; address: string; lat: number; lng: number } | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ALL_SUGGESTIONS = [
  'Show me the Eiffel Tower',
  'Find coffee shops near Times Square',
  'Directions from London to Paris',
  'Best restaurants in Tokyo',
  'Show me the Colosseum in Rome',
  'Find hotels near Central Park',
  'Directions from Sydney to Melbourne',
  'Popular attractions in Barcelona',
  'Find museums in Washington DC',
  'Show me the Great Wall of China',
  'Best pizza places in New York',
  'Find beaches near Miami',
  'Directions from Los Angeles to San Francisco',
  'Show me Machu Picchu',
  'Find shopping malls in Dubai',
];

function getRandomSuggestions(count: number): string[] {
  const shuffled = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function ChatPanel({ onMapAction, selectedPlace }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSuggestions = useMemo(() => getRandomSuggestions(3), []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (selectedPlace) {
      setInput(`Tell me about ${selectedPlace.name}`);
    }
  }, [selectedPlace]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          history: messages.slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.message,
        map_action: data.mapAction,
        followUpSuggestions: data.followUpSuggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);

      if (data.mapAction) {
        onMapAction(data.mapAction);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  const formatMessage = (content: string) => {
    const jsonPattern = /\{[\s\S]*?"action"[\s\S]*?\}/g;
    const cleanContent = content.replace(jsonPattern, '').trim();
    return cleanContent;
  };

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const latestFollowUpSuggestions = messages
    .filter((m) => m.role === 'assistant' && m.followUpSuggestions && m.followUpSuggestions.length > 0)
    .slice(-1)[0]?.followUpSuggestions || [];

  return (
    <Card className="flex h-full flex-col border-0 rounded-none">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">MapGPT</h2>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearChat}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MapPin className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-medium">Welcome to MapGPT</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Ask me about any location, get directions, or discover places around the world.
            </p>
            <div className="mt-6 space-y-2">
              {initialSuggestions.map((suggestion, idx) => (
                <SuggestionButton
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  text={suggestion}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{renderFormattedText(formatMessage(message.content))}</p>
                  {message.map_action && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => onMapAction(message.map_action!)}
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      Show on map
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {latestFollowUpSuggestions.length > 0 && (
        <div className="border-t px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {latestFollowUpSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(suggestion);
                }}
                className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent transition-colors text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about any place..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SuggestionButton({ onClick, text }: { onClick: () => void; text: string }) {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-lg border bg-background px-4 py-2 text-left text-sm transition-colors hover:bg-accent"
    >
      {text}
    </button>
  );
}
