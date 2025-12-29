import { useState } from 'react';
import { Sunrise, Sun, Sunset, Hotel, MapPin, ChevronDown, ChevronUp, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TimePeriodPlaces, PlaceData, MapAction } from '@/types';

interface ItineraryFlowchartProps {
  day: string;
  timePeriods: TimePeriodPlaces;
  places: PlaceData[];
  onPlaceClick: (placeName: string) => void;
  onDirections: (action: MapAction) => void;
  onClose: () => void;
}

const TIME_PERIOD_CONFIG = {
  Morning: { icon: Sunrise, label: 'Morning', color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  Afternoon: { icon: Sun, label: 'Afternoon', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
  Evening: { icon: Sunset, label: 'Evening', color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30' },
  Accommodation: { icon: Hotel, label: 'Stay', color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
};

type TimePeriodKey = keyof typeof TIME_PERIOD_CONFIG;

export function ItineraryFlowchart({ day, timePeriods, places, onPlaceClick, onDirections, onClose }: ItineraryFlowchartProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set(['Morning', 'Afternoon', 'Evening', 'Accommodation']));

  const togglePeriod = (period: string) => {
    setExpandedPeriods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(period)) {
        newSet.delete(period);
      } else {
        newSet.add(period);
      }
      return newSet;
    });
  };

  // Find matching PlaceData for a place name
  const findPlaceData = (placeName: string): PlaceData | undefined => {
    const normalizedName = placeName.toLowerCase().split(' ').slice(0, 3).join(' ');
    return places.find(p => 
      p.displayName.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(p.displayName.toLowerCase().split(' ').slice(0, 2).join(' '))
    );
  };

  const orderedPeriods: TimePeriodKey[] = ['Morning', 'Afternoon', 'Evening', 'Accommodation'];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full md:max-w-md md:mx-4 bg-background md:rounded-2xl rounded-t-2xl shadow-2xl border overflow-hidden max-h-[85vh] md:max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base md:text-lg">{day}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Flowchart Content */}
        <ScrollArea className="h-[calc(85vh-120px)] md:h-[60vh] md:max-h-[500px]">
          <div className="p-4 space-y-2">
            {orderedPeriods.map((period, periodIndex) => {
              const periodPlaces = timePeriods[period];
              if (!periodPlaces || periodPlaces.length === 0) return null;

              const config = TIME_PERIOD_CONFIG[period];
              const Icon = config.icon;
              const isExpanded = expandedPeriods.has(period);
              const isLast = periodIndex === orderedPeriods.filter(p => timePeriods[p]?.length).length - 1;

              return (
                <div key={period} className="relative">
                  {/* Time Period Header */}
                  <button
                    onClick={() => togglePeriod(period)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                      config.bgColor,
                      "hover:opacity-80"
                    )}
                  >
                    <div className={cn("p-2 rounded-full bg-background shadow-sm", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium flex-1 text-left">{config.label}</span>
                    <span className="text-xs text-muted-foreground mr-2">{periodPlaces.length} places</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Places List */}
                  {isExpanded && (
                    <div className="ml-6 mt-2 space-y-1">
                      {periodPlaces.map((placeName, placeIndex) => {
                        const placeData = findPlaceData(placeName);
                        const isLastPlace = placeIndex === periodPlaces.length - 1;
                        const nextPlace = periodPlaces[placeIndex + 1];
                        
                        return (
                          <div key={placeIndex} className="relative">
                            <div className="flex items-start gap-3">
                              {/* Vertical connector line */}
                              <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" 
                                style={{ 
                                  top: placeIndex === 0 ? '12px' : '0',
                                  bottom: isLastPlace && isLast ? '50%' : '0'
                                }} 
                              />
                              
                              {/* Dot */}
                              <div className={cn(
                                "relative z-10 w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center flex-shrink-0 mt-1",
                                config.color.replace('text-', 'border-')
                              )}>
                                <div className={cn("w-2 h-2 rounded-full", config.color.replace('text-', 'bg-'))} />
                              </div>

                              {/* Place Card */}
                              <button
                                onClick={() => {
                                  onPlaceClick(placeName);
                                  onClose();
                                }}
                                className="flex-1 text-left p-3 rounded-lg border bg-background hover:bg-accent transition-colors group"
                              >
                                <p className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                                  {(() => {
                                    // Extract just the place name (remove location suffix like "Tokyo Japan")
                                    const displayName = placeName.replace(/\*\*/g, '').split(' ').slice(0, -2).join(' ') || placeName.replace(/\*\*/g, '');
                                    // Apply bold formatting for text between **
                                    return displayName.split('**').map((part, i) => 
                                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                    );
                                  })()}
                                </p>
                                {placeData && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {placeData.rating && (
                                      <span className="text-xs text-muted-foreground">
                                        ⭐ {placeData.rating}
                                      </span>
                                    )}
                                    {placeData.types?.[0] && (
                                      <span className="text-xs text-muted-foreground capitalize">
                                        {placeData.types[0].replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            </div>
                            
                            {/* Directions button between places */}
                            {nextPlace && (
                              <div className="ml-6 my-1 flex items-center gap-2">
                                <div className="w-6 flex justify-center">
                                  <div className="w-0.5 h-6 bg-border" />
                                </div>
                                <button
                                  onClick={() => {
                                    onDirections({
                                      action: 'directions',
                                      origin: placeName,
                                      destination: nextPlace,
                                    });
                                    onClose();
                                  }}
                                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors"
                                >
                                  <Navigation className="h-3 w-3" />
                                  <span>Get directions & travel time</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Connector to next period */}
                  {!isLast && (
                    <div className="flex justify-center py-2">
                      <div className="w-0.5 h-4 bg-border" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 md:p-3 border-t bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            Tap a place to view details on the map
          </p>
        </div>
      </div>
    </div>
  );
}
