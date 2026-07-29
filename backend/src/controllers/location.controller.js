/**
 * Proxies geocoding requests to OpenStreetMap's Nominatim service.
 */

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "VroomGo/1.0 (https://vroomgo.com; contact@vroomgo.com)";

const fetchWithTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildLocationName = (data) => {
  const addr = data?.address || {};
  const locationName = [];

  if (addr.amenity) locationName.push(addr.amenity);
  else if (addr.shop) locationName.push(addr.shop);
  else if (addr.tourism) locationName.push(addr.tourism);
  else if (addr.neighbourhood) locationName.push(addr.neighbourhood);
  else if (addr.suburb) locationName.push(addr.suburb);
  else if (addr.village) locationName.push(addr.village);

  if (addr.city) locationName.push(addr.city);
  else if (addr.town) locationName.push(addr.town);

  if (addr.state && !locationName.includes(addr.state)) {
    locationName.push(addr.state);
  }

  if (locationName.length > 0) {
    return locationName.join(", ");
  }

  if (data?.display_name) {
    const parts = data.display_name
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.slice(0, 3).join(", ");
  }

  return null;
};

const reverseGeocode = async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ success: false, message: "Valid lat and lon query params are required" });
  }

  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.warn(`Nominatim reverse geocoding failed with status ${response.status}`);
      return res.status(200).json({ success: true, address: null });
    }

    const data = await response.json();
    const address = buildLocationName(data);
    return res.status(200).json({ success: true, address });
  } catch (error) {
    console.error("Reverse geocoding error:", error.message || error);
    return res.status(200).json({ success: true, address: null });
  }
};

const geocodeAddress = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!query) {
    return res.status(400).json({ success: false, message: "Query param 'q' is required" });
  }

  try {
    const url = `${NOMINATIM_BASE_URL}/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.warn(`Nominatim geocoding failed with status ${response.status}`);
      return res.status(200).json({ success: true, result: null });
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const result = {
        latitude: Number(data[0].lat),
        longitude: Number(data[0].lon),
        address: data[0].display_name,
      };
      return res.status(200).json({ success: true, result });
    }

    return res.status(200).json({ success: true, result: null });
  } catch (error) {
    console.error("Geocoding error:", error.message || error);
    return res.status(200).json({ success: true, result: null });
  }
};

module.exports = { reverseGeocode, geocodeAddress };