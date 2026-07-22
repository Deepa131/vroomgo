const dns = require("dns").promises;
const net = require("net");
const validator = require("validator");

/**
 * ---------------------------------------------------------------------------
 * SSRF (Server-Side Request Forgery) PREVENTION
 * ---------------------------------------------------------------------------
 * WHAT IS SSRF:
 *   SSRF happens when the SERVER makes an outbound HTTP request to a URL
 *   that (fully or partially) comes from user input, and the attacker
 *   points that URL at somewhere it shouldn't be able to reach - e.g.
 *   http://169.254.169.254/latest/meta-data (cloud provider metadata, often
 *   holds credentials), http://localhost:27017 (an internal database),
 *   or http://internal-admin-service.local. Because the request is made
 *   BY THE SERVER (which usually sits inside the private network / has
 *   access cloud metadata endpoints), it bypasses network controls that
 *   would normally block an external attacker.
 *
 * WHERE THIS MATTERS IN VROOMGO:
 *   Vehicle listings store `images`/`videos` as plain strings (see
 *   vehicle.model.js). Most of these come from our own /upload-image and
 *   /upload-video endpoints, but createVehicle/updateVehicle also accept
 *   these fields directly in the JSON body, meaning a vendor COULD submit
 *   an arbitrary external URL instead of an uploaded file path. Today the
 *   server never fetches those URLs itself (the browser does, when
 *   rendering <img src>), so there's no *live* SSRF today - but the moment
 *   a future feature fetches a listing's image server-side (thumbnailing,
 *   virus scanning, re-hosting, a moderation bot, etc.), an unvalidated URL
 *   here becomes a real SSRF hole. We validate at the point of entry so
 *   that bad data can never even get saved, rather than trusting every
 *   future consumer to re-check it.
 *
 * WHAT WE BLOCK:
 *   - Any scheme other than http/https (file://, ftp://, gopher://, etc.)
 *   - localhost / 127.0.0.0/8 / ::1
 *   - Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *   - Link-local (includes cloud metadata): 169.254.0.0/16
 *   - We resolve the hostname via DNS ourselves and check the RESOLVED IP,
 *     not just the hostname string - this stops "DNS rebinding" tricks
 *     where a hostname that looks public actually resolves to a private IP.
 */

const isPrivateOrReservedIp = (ip) => {
  const type = net.isIP(ip);
  if (type === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 0) return true; // "this network"
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    return false;
  }
  return true; // not a valid IP at all -> treat as unsafe
};

/**
 * Validates that `rawUrl` is a well-formed, public http(s) URL that does not
 * resolve to a private/internal/loopback address. Throws a descriptive Error
 * if it isn't; resolves silently if it's safe.
 */
const assertSafePublicUrl = async (rawUrl) => {
  if (!validator.isURL(rawUrl, { protocols: ["http", "https"], require_protocol: true })) {
    throw new Error("URL must be a valid http:// or https:// address");
  }

  const parsed = new URL(rawUrl);

  const hostname = parsed.hostname;
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname.toLowerCase())) {
    throw new Error("URLs pointing to localhost/loopback addresses are not allowed");
  }

  // If the hostname is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error("URLs pointing to private/internal IP addresses are not allowed");
    }
    return;
  }

  // Otherwise resolve DNS ourselves and check every returned address, so a
  // hostname can't "rebind" to an internal IP after passing validation.
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (e) {
    throw new Error("Could not resolve host for the provided URL");
  }

  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new Error("URL resolves to a private/internal IP address and is not allowed");
    }
  }
};

/**
 * Validates an array of image/video values where each entry is either:
 *  - a local path we generated ourselves (starts with "/public/") -> always safe
 *  - an external http(s) URL supplied by the client -> must pass SSRF checks
 * Returns nothing; throws on the first unsafe value found.
 */
const assertSafeMediaList = async (values = []) => {
  for (const value of values) {
    if (typeof value !== "string" || !value) continue;
    if (value.startsWith("/public/")) continue; // our own uploaded file, trusted
    await assertSafePublicUrl(value);
  }
};

module.exports = { assertSafePublicUrl, assertSafeMediaList, isPrivateOrReservedIp };