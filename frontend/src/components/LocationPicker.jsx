import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { MapPin, Loader2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import OsmMapPicker from "./OsmMapPicker";
import LocationPermissionModal from "./LocationPermissionModal";
import {
  getCurrentLocation,
  checkLocationPermission,
  grantLocationPermission,
  reverseGeocode,
  geocodeAddress,
  cacheUserLocation,
  getCachedUserLocation,
  setLocationPermissionMode,
  shouldShowPermissionPrompt,
} from "../services/locationService";

export default function LocationPicker({
  onLocationSelect,
  defaultLocation,
  title = "Select Location",
  userId,
  askForPermission = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmedLocation, setConfirmedLocation] = useState(defaultLocation || null);
  const [confirmedAddress, setConfirmedAddress] = useState(defaultLocation?.address || "");
  const [draftLocation, setDraftLocation] = useState(defaultLocation || null);
  const [draftAddress, setDraftAddress] = useState(defaultLocation?.address || "");
  const [, setPermissionGranted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const autoRequestedRef = useRef(false);

  const defaultCenter = useMemo(() => {
    if (draftLocation) {
      return [draftLocation.latitude, draftLocation.longitude];
    }
    return [27.7172, 85.324]; // Kathmandu
  }, [draftLocation]);

  useEffect(() => {
    const hasPermission = checkLocationPermission(userId);
    setPermissionGranted(hasPermission);
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;
    if (draftLocation && !draftAddress) {
      reverseGeocode(draftLocation.latitude, draftLocation.longitude)
        .then((address) => setDraftAddress(address))
        .catch(() => null);
    }
  }, [isOpen, draftLocation, draftAddress]);

  useEffect(() => {
    if (!defaultLocation) return;
    setConfirmedLocation(defaultLocation);
    setDraftLocation(defaultLocation);
    if (defaultLocation.address) {
      setConfirmedAddress(defaultLocation.address);
      setDraftAddress(defaultLocation.address);
    } else if (defaultLocation.latitude && defaultLocation.longitude) {
      // Fetch address for default location if not provided
      reverseGeocode(defaultLocation.latitude, defaultLocation.longitude).then((addr) => {
        if (addr) {
          setConfirmedAddress(addr);
          setDraftAddress(addr);
        }
      }).catch(err => console.error("Error fetching default location address:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLocation]);

  const handleRequestLocation = useCallback(async () => {
    setLoading(true);
    const permissionToastId = toast.loading("Requesting location permission...");
    try {
      const location = await getCurrentLocation();
      setDraftLocation(location);
      cacheUserLocation(location);

      const address = await reverseGeocode(location.latitude, location.longitude);
      setDraftAddress(address);

      if (!checkLocationPermission(userId)) {
        grantLocationPermission(userId);
      }
      setPermissionGranted(true);

      toast.success("Location detected", { id: permissionToastId });
    } catch (error) {
      let message = "Could not access your location. You can still select location manually on the map.";
      if (error instanceof Error && error.message) {
        message = error.message;
      }
      toast.error(message, { id: permissionToastId });
      const isTimeoutError = error?.code === "3" || /timed out/i.test(error?.message || "");
      if (isTimeoutError) {
        console.warn("Location timeout:", error?.message || error);
      } else {
        console.error("Location error:", error?.message || error);
      }
    } finally {
      setLoading(false);
      setShowPermissionModal(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isOpen) {
      autoRequestedRef.current = false;
      return;
    }

    if (showPermissionModal) return;
    if (autoRequestedRef.current) return;
    autoRequestedRef.current = true;

    const needsPermissionPrompt = shouldShowPermissionPrompt();

    if (askForPermission && needsPermissionPrompt) {
      setShowPermissionModal(true);
      return;
    }

    const cached = getCachedUserLocation();
    if (cached) {
      setDraftLocation(cached);
      reverseGeocode(cached.latitude, cached.longitude).then((address) => {
        if (address) setDraftAddress(address);
      });
      return;
    }

    if (!askForPermission) {
      handleRequestLocation();
      return;
    }

    handleRequestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showPermissionModal, askForPermission, handleRequestLocation, userId]);

  const handleConfirm = async () => {
    if (!draftLocation) {
      toast.error("Please select a location");
      return;
    }

    let address = draftAddress;
    
    // If no address yet, fetch it before confirming
    if (!address) {
      try {
        address = await reverseGeocode(draftLocation.latitude, draftLocation.longitude);
        setDraftAddress(address);
      } catch (error) {
        console.error("Error fetching address on confirm:", error);
        address = `${draftLocation.latitude.toFixed(4)}, ${draftLocation.longitude.toFixed(4)}`;
      }
    }

    setConfirmedLocation(draftLocation);
    setConfirmedAddress(address);
    onLocationSelect(draftLocation, address);
    setIsOpen(false);
    toast.success("Location confirmed");
  };

  const handlePermissionAlways = async () => {
    setLocationPermissionMode("always");
    setPermissionGranted(true);
    await handleRequestLocation();
  };

  const handlePermissionJustThisTime = async () => {
    setLocationPermissionMode("just_this_time");
    setPermissionGranted(true);
    await handleRequestLocation();
  };

  const handlePermissionCancel = () => {
    setShowPermissionModal(false);
    autoRequestedRef.current = false;
    setIsOpen(false);
  };

  const handleCancel = () => {
    setDraftLocation(confirmedLocation);
    setDraftAddress(confirmedAddress);
    setIsOpen(false);
    autoRequestedRef.current = false;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Enter a location to search.");
      return;
    }

    setSearchError(null);
    setSearching(true);
    try {
      const result = await geocodeAddress(searchQuery.trim());
      if (!result) {
        setSearchError("Location not found. Try a different search term or click on the map.");
        setSearching(false);
        return;
      }
      setSearchError(null);
      const nextAddress = result.address || searchQuery.trim();
      setDraftLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        address: nextAddress,
      });
      setDraftAddress(nextAddress);
      toast.success("Found: " + nextAddress);
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Search failed. Try again or use the map.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-full">
      <LocationPermissionModal
        isOpen={showPermissionModal}
        loading={loading}
        onAlways={handlePermissionAlways}
        onJustThisTime={handlePermissionJustThisTime}
        onCancel={handlePermissionCancel}
      />

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/15 bg-ink-900/60 px-4 py-2.5 transition hover:border-ember-500"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MapPin size={18} className="shrink-0 text-ember-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {confirmedAddress || "Click to select location"}
            </p>
          </div>
        </div>
        <ChevronDown size={18} className="shrink-0 text-white/40 transition-colors group-hover:text-ember-500" />
      </div>

      {isOpen && !showPermissionModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />

          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-card">
            <div className="flex items-center justify-between bg-gradient-to-r from-ember-600 to-ember-500 p-4 text-white">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <MapPin size={20} />
                {title}
              </h2>
              <button onClick={() => setIsOpen(false)} className="rounded p-1 transition-colors hover:bg-black/20">
                ✕
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      // Clear error when user types again
                      if (searchError) setSearchError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !searching) {
                        event.preventDefault();
                        handleSearch();
                      }
                    }}
                    type="text"
                    placeholder="Search for an address or landmark..."
                    className="input flex-1"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="btn-primary shrink-0 text-sm disabled:opacity-60"
                  >
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>
                {searchError && <p className="text-xs text-rose-400">{searchError}</p>}
              </div>

              {loading && (
                <div className="flex items-center gap-2 rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3">
                  <Loader2 size={18} className="animate-spin text-ember-500" />
                  <p className="text-sm text-ember-300">Detecting your location...</p>
                </div>
              )}

              {!loading && draftLocation && (
                <div className="flex items-center gap-2 rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3">
                  <MapPin size={18} className="shrink-0 text-ember-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ember-300">Selected Location</p>
                    {draftAddress ? (
                      <p className="break-words text-xs text-white/60">{draftAddress}</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-ember-500" />
                        <p className="text-xs text-white/60">Fetching location name...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="h-80 min-h-80 w-full overflow-hidden rounded-lg border border-white/10">
                <OsmMapPicker
                  center={defaultCenter}
                  selectedLocation={draftLocation}
                  onSelect={async (lat, lng) => {
                    const loc = { latitude: lat, longitude: lng };
                    setDraftLocation(loc);
                    
                    // Fetch address - let it take full time (up to 12s)
                    try {
                      const address = await reverseGeocode(lat, lng);
                      if (address) {
                        setDraftAddress(address);
                      }
                    } catch (error) {
                      console.error("Error fetching address:", error);
                      setDraftAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                    }
                  }}
                  onDragEnd={async (lat, lng) => {
                    const loc = { latitude: lat, longitude: lng };
                    setDraftLocation(loc);
                    
                    // Fetch address - let it take full time (up to 12s)
                    try {
                      const address = await reverseGeocode(lat, lng);
                      if (address) {
                        setDraftAddress(address);
                      }
                    } catch (error) {
                      console.error("Error fetching address:", error);
                      setDraftAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                    }
                  }}
                />
              </div>

              <p className="text-center text-xs text-white/40">
                Click on the map or drag the marker to update the location
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 bg-ink-900/60 px-4 py-3">
              <button onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={!draftLocation} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                Confirm Location
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}