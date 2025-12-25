import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, MapPin, Trash2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MapAction, SearchHistory, SelectedPlace, PlaceData, Message, PlanningPreferences, TimePeriodPlaces } from '@/types';
import { INTEREST_OPTIONS, TRAVEL_STYLES, DURATION_OPTIONS } from '@/types';
import { API_URL, getRandomSuggestions } from '@/constants';
import { ItineraryFlowchart } from './ItineraryFlowchart';

interface ChatPanelProps {
  onMapAction: (action: MapAction) => void;
  selectedPlace?: SelectedPlace | null;
  onViewPlaces?: (query?: string) => void;
  searchHistory?: SearchHistory[];
  places?: PlaceData[];
}

export function ChatPanel({ onMapAction, selectedPlace, onViewPlaces, places = [] }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [planningPrefs, setPlanningPrefs] = useState<PlanningPreferences>({
    duration: '',
    interests: [],
    travelStyle: '',
    attractions: '',
  });
  const [flowchartData, setFlowchartData] = useState<{
    day: string;
    timePeriods: TimePeriodPlaces;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSuggestions = useMemo(() => getRandomSuggestions(3), []);
  
  const toggleInterest = (interest: string) => {
    setPlanningPrefs(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };
  
  const planningSuggestions = [
    'Plan a 3-day trip to Paris',
    'Create an itinerary for Tokyo',
    'Weekend getaway to Barcelona',
  ];

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
          planningMode: isPlanningMode,
          planningPreferences: isPlanningMode ? planningPrefs : undefined,
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
        placesByDay: data.placesByDay,
        placesByTimePeriod: data.placesByTimePeriod,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);

      // Auto-trigger multiSearch when placesByDay is present
      if (data.placesByDay && Object.keys(data.placesByDay).length > 0) {
        const allPlaces = Object.values(data.placesByDay as Record<string, string[]>).flat();
        if (allPlaces.length > 0) {
          onMapAction({ action: 'multiSearch', queries: allPlaces });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          isError: true,
          failedMessage: userMessage.content,
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

  const retryMessage = (failedMessage: string) => {
    // Remove the error message and retry
    setMessages((prev) => prev.filter((m) => !m.isError));
    setInput(failedMessage);
    setTimeout(() => {
      const submitBtn = document.querySelector('[data-submit-btn]') as HTMLButtonElement;
      submitBtn?.click();
    }, 100);
  };

  const formatMessage = (content: string) => {
    const jsonPattern = /\{[\s\S]*?"action"[\s\S]*?\}/g;
    const cleanContent = content.replace(jsonPattern, '').trim();
    return cleanContent;
  };

  const renderFormattedText = (text: string) => {
    // Split by lines first to handle headers
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      // Check for markdown headers (# to ####)
      const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        const headerText = headerMatch[2];
        return (
          <div key={lineIndex} className="font-bold text-sm mt-3 mb-1">
            {headerText}
          </div>
        );
      }
      // Handle bold text within lines
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formattedParts = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIndex} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
      return (
        <span key={lineIndex}>
          {formattedParts}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  // Get follow-up suggestions from the LAST assistant message only (not any previous one)
  const lastAssistantMessage = messages.filter((m) => m.role === 'assistant').slice(-1)[0];
  const latestFollowUpSuggestions = lastAssistantMessage?.followUpSuggestions || [];

  return (
    <Card className="relative h-full border-0 rounded-none overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b p-3 bg-background">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">MapGPT</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant={isPlanningMode ? "default" : "ghost"} 
            size="sm"
            onClick={() => setIsPlanningMode(!isPlanningMode)}
            title={isPlanningMode ? "Exit planning mode" : "Plan a trip"}
            className="h-8 px-2"
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            <span className="text-xs">{isPlanningMode ? 'Planning' : 'Plan'}</span>
          </Button>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Chat Body - positioned between header and footer */}
      <div 
        className="absolute left-0 right-2 top-14 overflow-y-auto pb-4"
        ref={scrollRef}
        style={{ bottom: latestFollowUpSuggestions.length > 0 ? '165px' : '82.5px' }}
      >
        <div className="p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-8">
              {isPlanningMode ? (
                <div className="w-full max-w-sm space-y-4">
                  <div className="text-center">
                    <CalendarDays className="mx-auto mb-2 h-10 w-10 text-primary" />
                    <h3 className="text-lg font-medium">Plan Your Trip</h3>
                    <p className="text-xs text-muted-foreground">Set your preferences below</p>
                  </div>
                  
                  {/* Duration */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Duration</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {DURATION_OPTIONS.map(d => (
                        <button
                          key={d}
                          onClick={() => setPlanningPrefs(p => ({ ...p, duration: d }))}
                          className={cn(
                            "text-xs px-2 py-1 rounded-full border transition-colors",
                            planningPrefs.duration === d 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-background hover:bg-accent"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Interests</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {INTEREST_OPTIONS.map(i => (
                        <button
                          key={i}
                          onClick={() => toggleInterest(i)}
                          className={cn(
                            "text-xs px-2 py-1 rounded-full border transition-colors",
                            planningPrefs.interests.includes(i) 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-background hover:bg-accent"
                          )}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Travel Style */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Travel Style</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {TRAVEL_STYLES.map(s => (
                        <button
                          key={s}
                          onClick={() => setPlanningPrefs(p => ({ ...p, travelStyle: s }))}
                          className={cn(
                            "text-xs px-2 py-1 rounded-full border transition-colors",
                            planningPrefs.travelStyle === s 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-background hover:bg-accent"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Specific Attractions */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Must-see places (optional)</label>
                    <Input
                      value={planningPrefs.attractions}
                      onChange={(e) => setPlanningPrefs(p => ({ ...p, attractions: e.target.value }))}
                      placeholder="e.g., Eiffel Tower, Louvre..."
                      className="mt-1 h-8 text-sm"
                    />
                  </div>

                  {/* Quick Suggestions */}
                  <div className="pt-2 space-y-1.5">
                    {planningSuggestions.map((suggestion, idx) => (
                      <SuggestionButton
                        key={idx}
                        onClick={() => setInput(suggestion)}
                        text={suggestion}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
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
                    <div className="whitespace-pre-wrap">{renderFormattedText(formatMessage(message.content))}</div>
                    {/* Retry button for error messages */}
                    {message.isError && message.failedMessage && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => retryMessage(message.failedMessage!)}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Retry
                      </Button>
                    )}
                    {/* Places by day for planning mode */}
                    {message.placesByDay && Object.keys(message.placesByDay).length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/50 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">View suggested places:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(message.placesByDay).map(([day, dayPlaces]) => (
                            <Button
                              key={day}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => {
                                // Search for all places at once and show places list
                                onMapAction({ action: 'multiSearch', queries: dayPlaces });
                                onViewPlaces?.();
                                // Open flowchart if time period data is available
                                if (message.placesByTimePeriod?.[day]) {
                                  setFlowchartData({
                                    day,
                                    timePeriods: message.placesByTimePeriod[day],
                                  });
                                }
                              }}
                            >
                              <MapPin className="mr-1 h-3 w-3" />
                              {day} ({dayPlaces.length})
                            </Button>
                          ))}
                        </div>
                      </div>
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
        </div>
      </div>

      {/* Bottom Fixed Area - Suggestions + Input */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-background">
        {/* Follow-up Suggestions */}
        {latestFollowUpSuggestions.length > 0 && (
          <div className="px-3 py-2 bg-muted/30 border-t">
            <div className="flex flex-wrap gap-1.5">
              {latestFollowUpSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-accent transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any place..."
              disabled={isLoading}
              className="flex-1 h-9"
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="h-9 w-9" data-submit-btn>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Itinerary Flowchart Modal */}
      {flowchartData && (
        <ItineraryFlowchart
          day={flowchartData.day}
          timePeriods={flowchartData.timePeriods}
          places={places}
          onPlaceClick={(placeName) => {
            onMapAction({ action: 'search', query: placeName });
          }}
          onDirections={(action) => {
            onMapAction(action);
          }}
          onClose={() => setFlowchartData(null)}
        />
      )}
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
