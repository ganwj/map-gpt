import { useState, useEffect, useMemo } from 'react';
import { X, Star, Clock, Phone, Globe, MapPin, Navigation, ChevronLeft, ChevronRight, ImageOff, ArrowUpDown, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlacesAutocomplete } from '@/components/PlacesAutocomplete';
import { getCurrentLocation } from '@/lib/geolocation';
import { getCountryCodeFromAddress } from '@/lib/countryCode';
import type { PlaceData, Review, DirectionError } from '@/types';
import { API_URL, PANEL_DIMENSIONS } from '@/constants';

interface PlaceDetailsProps {
  place: PlaceData | null;
  onClose: () => void;
  onGetDirections?: (place: PlaceData, origin: string) => void;
  directionError?: DirectionError | null;
  onClearDirectionError?: () => void;
}

type ReviewSort = 'newest' | 'oldest';

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="space-y-2 pb-4 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        {review.profilePhotoUrl ? (
          <img
            src={review.profilePhotoUrl}
            alt={review.authorName}
            className="h-10 w-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">
              {review.authorName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <span className="text-sm font-medium block">{review.authorName}</span>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= (review.rating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            {review.relativeTime && (
              <span className="text-xs text-muted-foreground">
                {review.relativeTime}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {review.text}
      </p>
    </div>
  );
}

export function PlaceDetails({ place, onClose, onGetDirections, directionError, onClearDirectionError }: PlaceDetailsProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoError, setPhotoError] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSort>('newest');
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [width, setWidth] = useState<number>(PANEL_DIMENSIONS.DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [originInput, setOriginInput] = useState('');
  const [originError, setOriginError] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Extract country code from place address for autocomplete restriction
  const countryCode = useMemo(() => {
    return getCountryCodeFromAddress(place?.formattedAddress);
  }, [place?.formattedAddress]);

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setOriginError('');
    try {
      const result = await getCurrentLocation();
      setOriginInput(result.address || `${result.latitude}, ${result.longitude}`);
    } catch (error) {
      const err = error as { message?: string };
      setOriginError(err.message || 'Could not get your location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleGetDirections = async () => {
    setOriginError('');
    let finalOrigin = originInput.trim();
    
    // If no origin provided, try to get current location
    if (!finalOrigin) {
      setIsLoadingLocation(true);
      try {
        const result = await getCurrentLocation();
        finalOrigin = result.address || `${result.latitude}, ${result.longitude}`;
        setOriginInput(finalOrigin);
      } catch (error) {
        const err = error as { message?: string };
        setOriginError(err.message || 'Could not get your location. Please enter a starting location.');
        setIsLoadingLocation(false);
        return;
      }
      setIsLoadingLocation(false);
    }
    
    onGetDirections?.(place!, finalOrigin);
    // Close place details on mobile after requesting directions
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(PANEL_DIMENSIONS.MAX_WIDTH, Math.max(PANEL_DIMENSIONS.MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    setCurrentPhotoIndex(0);
    setPhotoError(false);
    setReviewSummary(null);
  }, [place]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!place?.reviews || place.reviews.length === 0) return;
      
      setIsSummaryLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/summarize-reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeName: place.displayName,
            reviews: place.reviews.slice(0, 10).map(r => ({
              rating: r.rating,
              text: r.text,
            })),
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setReviewSummary(data.summary);
        }
      } catch (error) {
        console.error('Failed to fetch review summary:', error);
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [place?.id, place?.reviews, place?.displayName]);

  const starDistribution = useMemo(() => {
    if (!place?.reviews) return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    place.reviews.forEach((r) => {
      const rating = Math.round(r.rating);
      if (rating >= 1 && rating <= 5) dist[rating]++;
    });
    return dist;
  }, [place?.reviews]);

  if (!place) return null;

  const photoUrls = place.photoUrls || [];
  const totalPhotos = photoUrls.length;

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % totalPhotos);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : star - 0.5 <= rating
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating?.toFixed(1)}</span>
        {place.userRatingCount && (
          <span className="text-sm text-muted-foreground">
            ({place.userRatingCount.toLocaleString()} reviews)
          </span>
        )}
      </div>
    );
  };

  const getPriceLevel = (level: string | undefined) => {
    if (!level) return null;
    const num = parseInt(level, 10);
    if (isNaN(num)) return level;
    return '$'.repeat(num) || 'Free';
  };

  return (
    <Card 
      className="place-details-panel flex h-full flex-col border-0 rounded-none md:border-l overflow-hidden flex-shrink-0 relative w-full md:w-auto"
      style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${width}px` : '100%' }}
    >
      {/* Resize handle - full height, wider hit area - Desktop only */}
      <div
        className={`hidden md:block absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 transition-colors z-10 ${
          isResizing ? 'bg-primary/30' : ''
        }`}
        onMouseDown={startResize}
      />
      {/* Visual indicator line - Desktop only */}
      <div className={`hidden md:block absolute left-0 top-0 bottom-0 w-px bg-border pointer-events-none ${isResizing ? 'bg-primary' : ''}`} />

      {/* Photo Carousel */}
      <div className="relative flex-shrink-0">
        {totalPhotos > 0 && !photoError ? (
          <div className="h-56 md:h-64 overflow-hidden relative bg-muted">
            <img
              src={photoUrls[currentPhotoIndex]}
              alt={`${place.displayName} - Photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
              onError={() => setPhotoError(true)}
            />
            {totalPhotos > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-gray-900"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="h-4 w-4 text-gray-900" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-gray-900"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="h-4 w-4 text-gray-900" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {currentPhotoIndex + 1} / {totalPhotos}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-40 bg-muted flex items-center justify-center">
            <ImageOff className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="hidden md:flex absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white z-10 text-gray-900"
          onClick={onClose}
        >
          <X className="h-4 w-4 text-gray-900" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{place.displayName}</h3>
            {place.types && (
              <p className="text-sm text-muted-foreground capitalize">
                {place.types[0]?.replace(/_/g, ' ')}
                {place.priceLevel && ` · ${getPriceLevel(place.priceLevel)}`}
              </p>
            )}
          </div>

          {place.rating && renderStars(place.rating)}

          {place.openingHours && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span
                  className={`text-sm font-medium ${
                    place.openingHours.isOpen ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {place.openingHours.isOpen ? 'Open now' : 'Closed'}
                </span>
              </div>
              {place.openingHours.weekdayText && (
                <div className="ml-6 space-y-1">
                  {place.openingHours.weekdayText.map((day: string, index: number) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      {day}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {place.formattedAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm">{place.formattedAddress}</p>
            </div>
          )}

          {place.phoneNumber && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${place.phoneNumber}`}
                className="text-sm text-primary hover:underline"
              >
                {place.phoneNumber}
              </a>
            </div>
          )}

          {place.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate max-w-[300px]"
              >
                {new URL(place.website).hostname}
              </a>
            </div>
          )}

          {onGetDirections && (
            <div className="space-y-2">
              <PlacesAutocomplete
                value={originInput}
                onChange={(val) => {
                  setOriginInput(val);
                  setOriginError('');
                }}
                placeholder="From (starting location)"
                showLocationButton
                onUseCurrentLocation={handleUseCurrentLocation}
                isLoadingLocation={isLoadingLocation}
                countryRestriction={countryCode}
              />
              {originError && (
                <div className="flex items-center gap-1 text-destructive text-xs">
                  <AlertCircle className="h-3 w-3" />
                  {originError}
                </div>
              )}
              {directionError && (
                <div className="flex items-center gap-1.5 text-destructive text-xs leading-none">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span className="flex-1">{directionError.message}</span>
                  <button
                    onClick={onClearDirectionError}
                    className="text-muted-foreground hover:text-destructive flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <Button
                className="w-full"
                onClick={handleGetDirections}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </div>
          )}

          {place.reviews && place.reviews.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              {/* AI Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 p-3 rounded-lg border border-purple-100 dark:border-purple-900/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">AI Summary</span>
                </div>
                {isSummaryLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing reviews...</span>
                  </div>
                ) : reviewSummary ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">{reviewSummary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Summary unavailable</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Reviews ({place.reviews.length})</h4>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as ReviewSort)}
                    className="text-sm border rounded-md px-2 py-1 bg-background"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>

              {/* Star Distribution - based on available reviews sample */}
              <div className="space-y-1 bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  Based on {place.reviews.length} of {place.userRatingCount?.toLocaleString() ?? place.reviews.length} reviews
                </p>
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3">{star}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{
                          width: `${(place.reviews?.length ?? 0) > 0 ? (starDistribution[star] / (place.reviews?.length ?? 1)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{starDistribution[star]}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {[...place.reviews]
                  .sort((a, b) => {
                    const timeA = a.relativeTime || '';
                    const timeB = b.relativeTime || '';
                    return reviewSort === 'newest' 
                      ? timeA.localeCompare(timeB)
                      : timeB.localeCompare(timeA);
                  })
                  .map((review, index) => (
                    <ReviewCard key={index} review={review} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
