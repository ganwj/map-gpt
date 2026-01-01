import { useMemo, useState, type ReactNode } from 'react';
import { Sunrise, Sun, Sunset, Hotel, ChevronRight, X, Calendar, Star, ArrowRight, Check, Navigation, Clock } from 'lucide-react';
// All icons used: Calendar (header), Star (rating), ChevronRight (arrow), ArrowRight (alternatives label), Check (selected option)
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TimePeriodPlaces, PlaceData, MapAction, PlacesV2Day, PlacesV2Stop } from '@/types';

interface ItineraryFlowchartProps {
  day: string;
  timePeriods?: TimePeriodPlaces;
  dayV2?: PlacesV2Day | null;
  places: PlaceData[];
  directionSummaries?: Record<string, { mode: 'driving' | 'walking' | 'bicycling' | 'transit'; duration: string; distance: string }>;
  onPlaceClick: (placeName: string) => void;
  onDirections: (action: MapAction) => void;
  onRequestTravelTime?: (origin: string, destination: string) => void;
  onClose: () => void;
}

const TIME_PERIOD_CONFIG = {
  Morning: { icon: Sunrise, label: 'Morning', color: 'text-amber-600', bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40', accent: 'amber', borderColor: 'border-amber-200 dark:border-amber-800' },
  Afternoon: { icon: Sun, label: 'Afternoon', color: 'text-orange-600', bgColor: 'bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/40 dark:to-rose-950/40', accent: 'orange', borderColor: 'border-orange-200 dark:border-orange-800' },
  Evening: { icon: Sunset, label: 'Evening', color: 'text-indigo-600', bgColor: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40', accent: 'indigo', borderColor: 'border-indigo-200 dark:border-indigo-800' },
  Accommodation: { icon: Hotel, label: 'Stay', color: 'text-emerald-600', bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40', accent: 'emerald', borderColor: 'border-emerald-200 dark:border-emerald-800' },
};

type TimePeriodKey = keyof typeof TIME_PERIOD_CONFIG;

export function ItineraryFlowchart({ day, timePeriods, dayV2, places, onPlaceClick, onDirections, onClose }: Omit<ItineraryFlowchartProps, 'directionSummaries' | 'onRequestTravelTime'>) {
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState<Record<string, number>>({});

  const cleanPlaceName = (placeName: string) => {
    let cleaned = placeName.replace(/\*\*/g, '').trim();
    // Remove "Alternative:", "Alt:", "Option:" prefixes
    cleaned = cleaned.replace(/^\s*(alternative|alt|option)\s*[:\-]\s*/i, '').trim();
    // Remove "Accommodation:" prefix
    cleaned = cleaned.replace(/^\s*accommodation\s*[:\-]\s*/i, '').trim();
    return cleaned;
  };

  const stripLocationSuffix = (placeName: string) => {
    let cleaned = cleanPlaceName(placeName);
    // Remove text in parentheses like "(exterior & surroundings)"
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length <= 2) return cleaned;
    return parts.slice(0, -2).join(' ') || cleaned;
  };

  const normalizeForMatch = (value: string) => {
    return stripLocationSuffix(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const renderBoldText = (rawPlaceName: string, displayText: string) => {
    const parts = rawPlaceName.split('**');
    const boldSegments = parts.filter((_, i) => i % 2 === 1).map(s => s.trim()).filter(Boolean);
    if (boldSegments.length === 0) return displayText;

    let nodes: ReactNode[] = [displayText];
    for (const seg of boldSegments) {
      const nextNodes: ReactNode[] = [];
      for (const node of nodes) {
        if (typeof node !== 'string') {
          nextNodes.push(node);
          continue;
        }
        const split = node.split(seg);
        if (split.length === 1) {
          nextNodes.push(node);
          continue;
        }
        split.forEach((chunk, idx) => {
          if (chunk) nextNodes.push(chunk);
          if (idx < split.length - 1) nextNodes.push(<strong key={`${seg}-${idx}`}>{seg}</strong>);
        });
      }
      nodes = nextNodes;
    }

    return nodes;
  };

  // Find matching PlaceData for a place name
  const findPlaceData = (placeName: string): PlaceData | undefined => {
    const needle = normalizeForMatch(placeName);
    if (!needle) return undefined;

    // Also prepare the raw cleaned name for substring matching
    const cleanedName = cleanPlaceName(placeName).toLowerCase();

    let best: { score: number; place: PlaceData } | null = null;
    for (const p of places) {
      const displayName = (p.displayName || '').toLowerCase();
      const normalizedDisplayName = normalizeForMatch(p.displayName || '');
      const normalizedAddr = normalizeForMatch(p.formattedAddress || '');
      let score = 0;

      // Exact match after normalization
      if (normalizedDisplayName === needle) score += 100;
      
      // Check if display name is contained in the itinerary place name (common case)
      // e.g., "Senso-ji Temple" in "Senso-ji Temple Tokyo Japan"
      if (displayName && cleanedName.includes(displayName)) score += 80;
      if (displayName && cleanedName.startsWith(displayName)) score += 20;
      
      // Partial match
      if (normalizedDisplayName.includes(needle) || needle.includes(normalizedDisplayName)) score += 50;
      if (normalizedAddr.includes(needle) || needle.includes(normalizedAddr)) score += 10;

      if (score > 0 && (!best || score > best.score)) {
        best = { score, place: p };
      }
    }
    return best?.place;
  };

  type Stop = { options: string[]; isOptional: boolean; isSuggestion: boolean; travelTime?: string };
  
  // Check if text is NOT a visitable place (travel info, tips, etc.)
  const isNonPlace = (text: string): boolean => {
    const lower = text.toLowerCase();
    return /^(travel time|tip:|tips:|note:|practical tip|book|reservations?)/i.test(lower) ||
           /^\d+[-–]\d+\s*(min|hour|km|m\b)/i.test(lower) ||
           /^(metro|bus|walk|train)\s*(from|to)/i.test(lower);
  };
  
  // Check if a place is a suggestion (restaurants, accommodations recommendations)  
  const isSuggestionPlace = (text: string): boolean => {
    const lower = text.toLowerCase();
    return /^(luxury|mid-range|budget|dining option|restaurant suggestion|hotel suggestion)/i.test(lower) ||
           /accommodation suggestion/i.test(lower);
  };
  
  // Clean symbols from place names
  const cleanSymbols = (text: string): string => {
    return text
      .replace(/[''`]+/g, "'")  // Normalize quotes
      .replace(/[""]|&quot;/g, '"')  // Normalize double quotes
      .replace(/\s+/g, ' ')  // Normalize spaces
      .trim();
  };
  
  const buildStops = (periodPlaces: string[]): Stop[] => {
    const stops: Stop[] = [];
    for (const raw of periodPlaces) {
      const trimmed = cleanSymbols((raw || '').trim());
      if (!trimmed) continue;
      
      // Skip non-place items like travel time info, tips
      if (isNonPlace(trimmed)) continue;

      // Check if optional - handle "Optional:" or "- Optional:" patterns
      const isOptional = /^[-–]?\s*optional\s*[:\-]/i.test(trimmed);
      const withoutOptional = trimmed.replace(/^[-–]?\s*optional\s*[:\-]\s*/i, '').trim();
      
      // Check if suggestion
      const isSuggestion = isSuggestionPlace(withoutOptional);
      
      const withoutPrefix = withoutOptional.replace(/^\s*(alternative|alternatively|alt|option)[,:\-]\s*/i, '').trim();
      const isAlt = /^\s*(alternative|alternatively|alt|option)[,:\-]/i.test(withoutOptional);

      // Parse "X or Y" patterns - handle ", or" and " or " variations
      let inlineAlternatives: string[] = [];
      if (/,?\s+or\s+/i.test(withoutPrefix)) {
        // Check for pattern like "Dinner at X or Y" or "Dinner in the area: X, or Y"
        const orMatch = withoutPrefix.match(/^(.+?)\s+at\s+(.+?),?\s+or\s+(.+)$/i);
        const areaMatch = withoutPrefix.match(/^(.+?)\s+(?:in|at)\s+(?:the\s+)?(.+?)\s+area[:\s]+(.+?),?\s+or\s+(.+)$/i);
        
        if (areaMatch) {
          const [, prefix, , place1, place2] = areaMatch;
          inlineAlternatives = [`${prefix} at ${place1}`.trim(), `${prefix} at ${place2}`.trim()];
        } else if (orMatch) {
          const [, prefix, place1, place2] = orMatch;
          inlineAlternatives = [`${prefix} at ${place1}`.trim(), `${prefix} at ${place2}`.trim()];
        } else {
          // Simple "X, or Y" or "X or Y" pattern
          inlineAlternatives = withoutPrefix.split(/,?\s+or\s+/i).map(s => s.trim()).filter(Boolean);
        }
      } else {
        inlineAlternatives = withoutPrefix
          .split('|')
          .map(s => s.trim())
          .filter(Boolean);
      }

      if (isAlt && stops.length > 0) {
        stops[stops.length - 1].options.push(...inlineAlternatives);
        continue;
      }

      stops.push({ 
        options: inlineAlternatives.length > 0 ? inlineAlternatives : [withoutPrefix],
        isOptional,
        isSuggestion,
        travelTime: undefined
      });
    }
    return stops;
  };

  // Separate Accommodation from regular time periods
  const activityPeriods: TimePeriodKey[] = ['Morning', 'Afternoon', 'Evening'];
  const buildPeriodStops = (period: TimePeriodKey): Stop[] => {
    const v2Periods = dayV2?.periods && typeof dayV2.periods === 'object' ? dayV2.periods : null;
    const v2Stops = Array.isArray((v2Periods as Record<string, unknown> | null)?.[period])
      ? ((v2Periods as Record<string, unknown>)[period] as PlacesV2Stop[])
      : null;

    if (v2Stops && v2Stops.length > 0) {
      const stops: Stop[] = [];
      for (const stop of v2Stops) {
        const rawOptions = Array.isArray(stop?.options) ? stop.options : [];
        const options = rawOptions.map((v) => String(v).trim()).filter(Boolean);
        if (options.length === 0) continue;
        stops.push({ 
          options, 
          isOptional: Boolean(stop?.optional), 
          isSuggestion: false,
          travelTime: stop?.travelTime || undefined
        });
      }
      if (stops.length > 0) return stops;
    }

    const periodPlaces = timePeriods?.[period];
    if (periodPlaces && periodPlaces.length > 0) {
      return buildStops(periodPlaces);
    }
    return [];
  };

  const stopsByPeriod = useMemo(() => {
    const result: Record<string, Stop[]> = {};
    for (const period of activityPeriods) {
      const stops = buildPeriodStops(period);
      if (stops.length > 0) {
        result[period] = stops;
      }
    }
    return result;
  }, [dayV2, timePeriods]);

  // Accommodation stops (separate section, no directions)
  const accommodationStops = useMemo(() => {
    return buildPeriodStops('Accommodation');
  }, [dayV2, timePeriods]);

  const suggestedPlaces = useMemo(() => {
    const suggested = dayV2?.suggested;
    const raw = Array.isArray(suggested) ? suggested : [];
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }, [dayV2]);

  const nonEmptyPeriods = activityPeriods.filter(p => (stopsByPeriod[p]?.length ?? 0) > 0);
  const totalStops = Object.values(stopsByPeriod).reduce((acc, stops) => acc + stops.length, 0) + accommodationStops.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full md:max-w-lg md:mx-4 bg-background md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] md:max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          <div className="relative flex items-center justify-between p-4 md:p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-xl">{day}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {nonEmptyPeriods.length + (accommodationStops.length > 0 ? 1 : 0)} sections • {totalStops} stops
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Timeline Content */}
        <ScrollArea className="h-[calc(90vh-160px)] md:h-[calc(85vh-180px)]">
          <div className="p-4 md:p-5">
            {nonEmptyPeriods.map((period, periodIdx) => {
              const periodStops = stopsByPeriod[period];
              if (!periodStops || periodStops.length === 0) return null;

              const config = TIME_PERIOD_CONFIG[period];
              const Icon = config.icon;
              // const isLastPeriod = periodIdx === nonEmptyPeriods.length - 1; // Unused after removing period transition
              // const nextPeriod = nonEmptyPeriods[periodIdx + 1]; // Unused after removing period transition

              return (
                <div key={period} className="relative">
                  {/* Time Period Section */}
                  <div className={cn("rounded-2xl border overflow-hidden mb-4", config.borderColor)}>
                    {/* Period Header */}
                    <div className={cn("flex items-center gap-3 p-4", config.bgColor)}>
                      <div className={cn("p-2.5 rounded-xl bg-background/80 backdrop-blur-sm shadow-sm", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{config.label}</h3>
                        <p className="text-xs text-muted-foreground">{periodStops.length} {periodStops.length === 1 ? 'destination' : 'destinations'}</p>
                      </div>
                    </div>

                    {/* Stops */}
                    <div className="divide-y divide-border/50 bg-background">
                      {periodStops.map((stop, stopIdx) => {
                        const stopKey = `${period}:::${stopIdx}`;
                        const selectedIdx = selectedAlternativeIndex[stopKey] ?? 0;
                        const selected = stop.options[Math.min(selectedIdx, stop.options.length - 1)] || stop.options[0];
                        const hasAlternatives = stop.options.length > 1;
                        // const selectedPlaceData = findPlaceData(selected); // Unused after removing ratings and types
                        const displayName = stripLocationSuffix(selected) || cleanPlaceName(selected);
                        
                        // Check if there's a next stop for connector (unused after changing directions logic)
                        // const nextStop = periodStops[stopIdx + 1];
                        // const hasNextStop = !!nextStop;

                        // Check if this is the first stop and there's a previous period with stops
                        const isFirstStop = stopIdx === 0;
                        const prevPeriodIdx = periodIdx - 1;
                        const prevPeriod = prevPeriodIdx >= 0 ? nonEmptyPeriods[prevPeriodIdx] : null;
                        const prevPeriodStops = prevPeriod ? stopsByPeriod[prevPeriod] : null;
                        const lastStopOfPrevPeriod = prevPeriodStops && prevPeriodStops.length > 0 ? prevPeriodStops[prevPeriodStops.length - 1] : null;
                        const showPeriodTransitionDirections = isFirstStop && lastStopOfPrevPeriod && !lastStopOfPrevPeriod.isSuggestion && !stop.isSuggestion;

                        return (
                          <div key={stopIdx} className="relative">
                            {/* Main Place Card */}
                            <div className="pt-4">
                              <div className="flex items-start gap-3">
                                {/* Step Number */}
                                <div className={cn(
                                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                  config.bgColor, config.color
                                )}>
                                  {stopIdx + 1}
                                </div>

                                {/* Place Info */}
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() => {
                                      onPlaceClick(cleanPlaceName(selected));
                                      onClose();
                                    }}
                                    className="w-full text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-base line-clamp-2">
                                        {renderBoldText(selected, displayName)}
                                      </p>
                                      {stop.isOptional && (
                                        <span className="flex-shrink-0 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                          Optional
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {stop.travelTime && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                          <Clock className="h-3 w-3" />
                                          {stop.travelTime}
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {/* Alternatives Selector */}
                                  {hasAlternatives && (
                                    <div className="mt-3 p-3 bg-muted/50 rounded-xl">
                                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <ArrowRight className="h-3 w-3" />
                                        Alternative options
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {stop.options.map((opt, optIdx) => {
                                          const isActive = optIdx === selectedIdx;
                                          const optDisplayName = stripLocationSuffix(opt) || cleanPlaceName(opt);
                                          return (
                                            <button
                                              key={optIdx}
                                              onClick={() => setSelectedAlternativeIndex(prev => ({ ...prev, [stopKey]: optIdx }))}
                                              className={cn(
                                                "px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5",
                                                isActive
                                                  ? "bg-primary text-primary-foreground shadow-sm"
                                                  : "bg-background border hover:border-primary/50 hover:bg-accent"
                                              )}
                                            >
                                              {isActive && <Check className="h-3 w-3" />}
                                              <span className="truncate max-w-[120px]">{optDisplayName}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* View Details Arrow */}
                                <button
                                  onClick={() => {
                                    onPlaceClick(cleanPlaceName(selected));
                                    onClose();
                                  }}
                                  className="flex-shrink-0 p-2 rounded-full hover:bg-accent transition-colors"
                                >
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </button>
                              </div>
                            </div>

                            {/* Period Transition Directions - show after first stop */}
                            {showPeriodTransitionDirections && (
                              <div className="flex justify-center py-4">
                                <button
                                  onClick={() => {
                                    const lastStopKey = `${prevPeriod}:::${prevPeriodStops!.length - 1}`;
                                    const lastIdx = selectedAlternativeIndex[lastStopKey] ?? 0;
                                    const lastSelected = lastStopOfPrevPeriod!.options[Math.min(lastIdx, lastStopOfPrevPeriod!.options.length - 1)] || lastStopOfPrevPeriod!.options[0];
                                    onDirections({
                                      action: 'directions',
                                      origin: cleanPlaceName(lastSelected),
                                      destination: cleanPlaceName(selected),
                                    });
                                    onClose();
                                  }}
                                  className="flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30"
                                >
                                  <Navigation className="h-4 w-4" />
                                  <span>Get Directions</span>
                                </button>
                              </div>
                            )}

                            {/* Get Directions from previous stop - hide for suggestions */}
                            {stopIdx > 0 && !stop.isSuggestion && !periodStops[stopIdx - 1].isSuggestion && (
                              <div className="flex justify-center py-4">
                                <button
                                  onClick={() => {
                                    const prevStopKey = `${period}:::${stopIdx - 1}`;
                                    const prevIdx = selectedAlternativeIndex[prevStopKey] ?? 0;
                                    const prevSelected = periodStops[stopIdx - 1].options[Math.min(prevIdx, periodStops[stopIdx - 1].options.length - 1)] || periodStops[stopIdx - 1].options[0];
                                    onDirections({
                                      action: 'directions',
                                      origin: cleanPlaceName(prevSelected),
                                      destination: cleanPlaceName(selected),
                                    });
                                    onClose();
                                  }}
                                  className="flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30"
                                >
                                  <Navigation className="h-4 w-4" />
                                  <span>Get Directions</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                                  </div>
              );
            })}

            {/* Accommodation Section - No directions */}
            {accommodationStops.length > 0 && (
              <div className="mt-4">
                <div className={cn("rounded-2xl border overflow-hidden mb-4", TIME_PERIOD_CONFIG.Accommodation.borderColor)}>
                  <div className={cn("flex items-center gap-3 p-4", TIME_PERIOD_CONFIG.Accommodation.bgColor)}>
                    <div className={cn("p-2.5 rounded-xl bg-background/80 backdrop-blur-sm shadow-sm", TIME_PERIOD_CONFIG.Accommodation.color)}>
                      <Hotel className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{TIME_PERIOD_CONFIG.Accommodation.label}</h3>
                      <p className="text-xs text-muted-foreground">{accommodationStops.length} {accommodationStops.length === 1 ? 'option' : 'options'}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-border/50 bg-background">
                    {accommodationStops.map((stop, stopIdx) => {
                      const stopKey = `Accommodation:::${stopIdx}`;
                      const selectedIdx = selectedAlternativeIndex[stopKey] ?? 0;
                      const selected = stop.options[Math.min(selectedIdx, stop.options.length - 1)] || stop.options[0];
                      const hasAlternatives = stop.options.length > 1;
                      // const selectedPlaceData = findPlaceData(selected); // Unused after removing ratings and types
                      const displayName = stripLocationSuffix(selected) || cleanPlaceName(selected);

                      return (
                        <div key={stopIdx} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                              TIME_PERIOD_CONFIG.Accommodation.bgColor, TIME_PERIOD_CONFIG.Accommodation.color
                            )}>
                              {stopIdx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => {
                                  onPlaceClick(cleanPlaceName(selected));
                                  onClose();
                                }}
                                className="w-full text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-base line-clamp-2">
                                    {renderBoldText(selected, displayName)}
                                  </p>
                                  {stop.isOptional && (
                                    <span className="flex-shrink-0 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                      Optional
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {stop.travelTime && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                      <Clock className="h-3 w-3" />
                                      {stop.travelTime}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {hasAlternatives && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-xl">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <ArrowRight className="h-3 w-3" />
                                    Alternative options
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {stop.options.map((opt, optIdx) => {
                                      const isActive = optIdx === selectedIdx;
                                      const optDisplayName = stripLocationSuffix(opt) || cleanPlaceName(opt);
                                      return (
                                        <button
                                          key={optIdx}
                                          onClick={() => setSelectedAlternativeIndex(prev => ({ ...prev, [stopKey]: optIdx }))}
                                          className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5",
                                            isActive
                                              ? "bg-primary text-primary-foreground shadow-sm"
                                              : "bg-background border hover:border-primary/50 hover:bg-accent"
                                          )}
                                        >
                                          {isActive && <Check className="h-3 w-3" />}
                                          <span className="truncate max-w-[120px]">{optDisplayName}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                onPlaceClick(cleanPlaceName(selected));
                                onClose();
                              }}
                              className="flex-shrink-0 p-2 rounded-full hover:bg-accent transition-colors"
                            >
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Section - No directions */}
            {suggestedPlaces.length > 0 && (
              <div className="mt-4">
                <div className="rounded-2xl border overflow-hidden mb-4">
                  <div className="flex items-center gap-3 p-4 bg-muted/40">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">Suggested</h3>
                      <p className="text-xs text-muted-foreground">{suggestedPlaces.length} {suggestedPlaces.length === 1 ? 'place' : 'places'}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-border/50 bg-background">
                    {suggestedPlaces.map((place, idx) => {
                      const selectedPlaceData = findPlaceData(place);
                      const displayName = stripLocationSuffix(place) || cleanPlaceName(place);
                      return (
                        <div key={`${place}-${idx}`} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-muted text-muted-foreground">
                              {idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => {
                                  onPlaceClick(cleanPlaceName(place));
                                  onClose();
                                }}
                                className="w-full text-left"
                              >
                                <p className="font-semibold text-base line-clamp-2">
                                  {renderBoldText(place, displayName)}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {selectedPlaceData?.rating && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                                      <Star className="h-3 w-3 fill-current" />
                                      {selectedPlaceData.rating.toFixed(1)}
                                    </span>
                                  )}
                                  {selectedPlaceData?.types?.[0] && (
                                    <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded-full">
                                      {selectedPlaceData.types[0].replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </div>
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                onPlaceClick(cleanPlaceName(place));
                                onClose();
                              }}
                              className="flex-shrink-0 p-2 rounded-full hover:bg-accent transition-colors"
                            >
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

      </div>
    </div>
  );
}
