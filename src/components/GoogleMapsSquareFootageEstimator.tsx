'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Ruler, Trash2 } from 'lucide-react';

type EstimateMeta = {
    address?: string;
};

type GoogleMapsSquareFootageEstimatorProps = {
    onEstimateChange: (squareFootage: number | null, meta?: EstimateMeta) => void;
};

type GoogleWindow = Window & typeof globalThis & {
    google?: any;
    __trendcastGoogleMapsPromise?: Promise<any>;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_LIBRARIES = 'places,geometry,drawing';
const SQM_TO_SQFT = 10.7639104;

function loadGoogleMapsScript(apiKey: string) {
    const w = window as GoogleWindow;
    if (w.google?.maps) {
        return Promise.resolve(w.google);
    }

    if (w.__trendcastGoogleMapsPromise) {
        return w.__trendcastGoogleMapsPromise;
    }

    w.__trendcastGoogleMapsPromise = new Promise((resolve, reject) => {
        const callbackName = `trendcastInitMaps_${Date.now()}`;
        (w as any)[callbackName] = () => {
            try {
                resolve(w.google);
            } finally {
                delete (w as any)[callbackName];
            }
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${GOOGLE_MAPS_LIBRARIES}&callback=${callbackName}&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            delete (w as any)[callbackName];
            w.__trendcastGoogleMapsPromise = undefined;
            reject(new Error('Google Maps failed to load. Check API key, billing, and allowed origins.'));
        };

        document.head.appendChild(script);
    });

    return w.__trendcastGoogleMapsPromise;
}

function formatNumber(value: number) {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function GoogleMapsSquareFootageEstimator({ onEstimateChange }: GoogleMapsSquareFootageEstimatorProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const addressInputRef = useRef<HTMLInputElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const polygonRef = useRef<any>(null);
    const drawingManagerRef = useRef<any>(null);
    const polygonListenerRefs = useRef<any[]>([]);
    const selectedAddressRef = useRef('');
    const onEstimateChangeRef = useRef(onEstimateChange);
    const estimatedSqFtRef = useRef<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selectedAddress, setSelectedAddress] = useState('');
    const [estimatedSqFt, setEstimatedSqFt] = useState<number | null>(null);

    useEffect(() => {
        onEstimateChangeRef.current = onEstimateChange;
    }, [onEstimateChange]);

    useEffect(() => {
        estimatedSqFtRef.current = estimatedSqFt;
    }, [estimatedSqFt]);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            setIsLoading(false);
            setLoadError('Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map-based square footage.');
            return;
        }

        let mounted = true;

        const clearPolygonListeners = () => {
            for (const listener of polygonListenerRefs.current) {
                if (listener?.remove) listener.remove();
            }
            polygonListenerRefs.current = [];
        };

        const setEstimate = (sqFt: number | null) => {
            setEstimatedSqFt(sqFt);
            onEstimateChangeRef.current(sqFt, {
                address: selectedAddressRef.current || undefined,
            });
        };

        const computeAreaSqFt = (google: any, polygon: any) => {
            const path = polygon?.getPath?.();
            if (!path || path.getLength() < 3) {
                setEstimate(null);
                return;
            }
            const sqMeters = google.maps.geometry.spherical.computeArea(path);
            const sqFt = Math.max(1, Math.round(sqMeters * SQM_TO_SQFT));
            setEstimate(sqFt);
        };

        const attachPolygonListeners = (google: any, polygon: any) => {
            clearPolygonListeners();
            const path = polygon.getPath();
            polygonListenerRefs.current = [
                path.addListener('set_at', () => computeAreaSqFt(google, polygon)),
                path.addListener('insert_at', () => computeAreaSqFt(google, polygon)),
                path.addListener('remove_at', () => computeAreaSqFt(google, polygon)),
            ];
        };

        loadGoogleMapsScript(GOOGLE_MAPS_API_KEY)
            .then((google) => {
                if (!mounted || !mapContainerRef.current || !addressInputRef.current) return;

                const map = new google.maps.Map(mapContainerRef.current, {
                    center: { lat: 39.8283, lng: -98.5795 },
                    zoom: 4,
                    mapTypeId: 'satellite',
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: true,
                    fullscreenControl: true,
                });
                mapRef.current = map;

                const marker = new google.maps.Marker({ map });
                markerRef.current = marker;

                const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
                    fields: ['geometry', 'formatted_address', 'name'],
                    componentRestrictions: { country: 'us' },
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place?.geometry?.location) return;

                    if (place.geometry.viewport) {
                        map.fitBounds(place.geometry.viewport);
                    } else {
                        map.setCenter(place.geometry.location);
                        map.setZoom(20);
                    }

                    marker.setPosition(place.geometry.location);
                    const address = place.formatted_address || place.name || '';
                    selectedAddressRef.current = address;
                    setSelectedAddress(address);
                    if (estimatedSqFtRef.current !== null) {
                        onEstimateChangeRef.current(estimatedSqFtRef.current, { address: address || undefined });
                    }
                });

                const drawingManager = new google.maps.drawing.DrawingManager({
                    drawingMode: google.maps.drawing.OverlayType.POLYGON,
                    drawingControl: true,
                    drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
                    },
                    polygonOptions: {
                        fillColor: '#22c55e',
                        fillOpacity: 0.25,
                        strokeColor: '#22c55e',
                        strokeOpacity: 0.9,
                        strokeWeight: 2,
                        editable: true,
                    },
                });
                drawingManager.setMap(map);
                drawingManagerRef.current = drawingManager;

                google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon: any) => {
                    if (polygonRef.current) {
                        polygonRef.current.setMap(null);
                    }

                    polygonRef.current = polygon;
                    drawingManager.setDrawingMode(null);
                    attachPolygonListeners(google, polygon);
                    computeAreaSqFt(google, polygon);
                });

                setIsLoading(false);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                setIsLoading(false);
                setLoadError(error instanceof Error ? error.message : 'Google Maps failed to initialize.');
            });

        return () => {
            mounted = false;
            for (const listener of polygonListenerRefs.current) {
                if (listener?.remove) listener.remove();
            }
            polygonListenerRefs.current = [];

            if (polygonRef.current) {
                polygonRef.current.setMap(null);
            }
            if (drawingManagerRef.current) {
                drawingManagerRef.current.setMap(null);
            }
            if (markerRef.current) {
                markerRef.current.setMap(null);
            }
            mapRef.current = null;
        };
    }, []);

    const clearPolygon = () => {
        if (polygonRef.current) {
            polygonRef.current.setMap(null);
            polygonRef.current = null;
        }
        setEstimatedSqFt(null);
        onEstimateChangeRef.current(null, {
            address: selectedAddressRef.current || undefined,
        });
    };

    return (
        <div className="space-y-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Google Maps Square Footage (Optional)
            </label>
            <div className="rounded-xl border border-white/10 bg-[#161616] p-3">
                <div className="mb-3 flex items-center gap-2 text-sm text-gray-200">
                    <MapPin className="h-4 w-4 text-blue-300" />
                    <input
                        ref={addressInputRef}
                        type="text"
                        placeholder="Search property address..."
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                    />
                </div>

                <div ref={mapContainerRef} className="h-64 w-full rounded-lg border border-white/10 bg-[#0f0f0f]" />

                {isLoading && (
                    <div className="mt-3 inline-flex items-center gap-2 text-xs text-blue-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading Google Maps...
                    </div>
                )}

                {loadError && (
                    <p className="mt-3 text-xs text-amber-300">
                        {loadError}
                    </p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                        <Ruler className="h-3.5 w-3.5" />
                        {estimatedSqFt === null
                            ? 'Draw a polygon around the service area to estimate sq ft'
                            : `${formatNumber(estimatedSqFt)} sq ft selected`}
                    </div>
                    <button
                        type="button"
                        onClick={clearPolygon}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-xs text-gray-300 hover:bg-[#202020]"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear Area
                    </button>
                </div>

                {selectedAddress ? (
                    <p className="mt-2 text-xs text-gray-400">Address: {selectedAddress}</p>
                ) : null}
            </div>
        </div>
    );
}
