/**
 * Location Service for handling geolocation, permissions, and distance calculations
 */

const LOCATION_PERMISSION_KEY = "vroomgo_location_permission_granted";
const LOCATION_PERMISSION_MODE_KEY = "vroomgo_location_permission_mode"; // 'always', 'just_this_time', or null
const USER_LOCATION_KEY = "vroomgo_user_current_location";
const VEHICLE_LOCATION_PREFIX = "vroomgo_vehicle_location_";

/**
 * Check if location permission has been granted for a specific user
 */
export const checkLocationPermission = (userId) => {
  if (typeof window === "undefined") return false;
  const key = userId ? `${LOCATION_PERMISSION_KEY}_${userId}` : LOCATION_PERMISSION_KEY;
  return localStorage.getItem(key) === "true";
};

/**
 * Grant location permission (store in localStorage)
 */
export const grantLocationPermission = (userId) => {
  if (typeof window === "undefined") return;
  const key = userId ? `${LOCATION_PERMISSION_KEY}_${userId}` : LOCATION_PERMISSION_KEY;
  localStorage.setItem(key, "true");
};

/**
 * Set location permission mode ('always' or 'just_this_time')
 */
export const setLocationPermissionMode = (mode) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCATION_PERMISSION_MODE_KEY, mode);
  localStorage.setItem(LOCATION_PERMISSION_KEY, "true");
};

/**
 * Get location permission mode
 */
export const getLocationPermissionMode = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCATION_PERMISSION_MODE_KEY) || null;
};

/**
 * Check if should show location permission prompt
 */
export const shouldShowPermissionPrompt = () => {
  if (typeof window === "undefined") return true;
  const mode = getLocationPermissionMode();
  return mode === null || mode === "just_this_time";
};

/**
 * Clear just-this-time permission (called when page unloads or on refresh)
 */
export const clearJustThisTimePermission = () => {
  if (typeof window === "undefined") return;
  const mode = getLocationPermissionMode();
  if (mode === "just_this_time") {
    localStorage.removeItem(LOCATION_PERMISSION_KEY);
    localStorage.removeItem(LOCATION_PERMISSION_MODE_KEY);
  }
};

/**
 * Request and get user's current location using Geolocation API
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    const resolvePosition = (position) => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };

    const rejectWithMessage = (error) => {
      let message = "Could not retrieve location";
      if (error.code === 1) {
        message = "Location permission denied. Please allow location access in your browser.";
      } else if (error.code === 2) {
        message = "Location is unavailable. Please try again or ensure location services are enabled.";
      } else if (error.code === 3) {
        message = "Location request timed out. Please try again.";
      } else if (error.message) {
        message = error.message;
      }

      const err = new Error(message);
      err.code = String(error.code);
      reject(err);
    };

    navigator.geolocation.getCurrentPosition(
      resolvePosition,
      (highAccuracyError) => {
        if (highAccuracyError.code !== 3) {
          rejectWithMessage(highAccuracyError);
          return;
        }

        navigator.geolocation.getCurrentPosition(resolvePosition, rejectWithMessage, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Get user's cached location
 */
export const getCachedUserLocation = () => {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem(USER_LOCATION_KEY);
  return cached ? JSON.parse(cached) : null;
};

/**
 * Cache user's location
 */
export const cacheUserLocation = (location) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(location));
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get OpenStreetMap URL for routing between two locations
 */
export const getOsmDirectionsUrl = (startLat, startLon, endLat, endLon) => {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${startLat}%2C${startLon}%3B${endLat}%2C${endLon}`;
};

/**
 * Get cached vehicle location
 */
export const getCachedVehicleLocation = (vehicleId) => {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem(`${VEHICLE_LOCATION_PREFIX}${vehicleId}`);
  return cached ? JSON.parse(cached) : null;
};

/**
 * Cache vehicle location
 */
export const cacheVehicleLocation = (vehicleId, location) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${VEHICLE_LOCATION_PREFIX}${vehicleId}`, JSON.stringify(location));
};

/**
 * Reverse geocode coordinates to address (OpenStreetMap Nominatim)
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
          "User-Agent": "vroomgo-app",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Reverse geocoding failed with status ${response.status}`);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name;
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.warn("Reverse geocoding error, using coordinates:", error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};

/**
 * Geocode address to coordinates (OpenStreetMap Nominatim)
 */
export const geocodeAddress = async (address) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
          "User-Agent": "vroomgo-app",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Geocoding failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      return {
        latitude: lat,
        longitude: lng,
        address: data[0].display_name,
      };
    }
    return null;
  } catch (error) {
    console.warn("Geocoding error:", error);
    return null;
  }
};

/**
 * Format distance for display
 */
export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

/**
 * Estimate travel time (approximate: 40km/hour average)
 */
export const estimateTravelTime = (distanceKm) => {
  const avgSpeed = 40;
  const minutes = Math.round((distanceKm / avgSpeed) * 60);

  if (minutes < 1) return "1min";
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};