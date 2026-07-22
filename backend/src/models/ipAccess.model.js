const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Admin-managed IP block/allow list. Independent of the automatic
 * sliding-window IP lockout in utils/ipAccessControl.js: this collection
 * holds rules an admin has *manually* set (e.g. permanently block a known
 * abusive IP, or allow-list an office/VPN egress IP so it's never rate
 * limited or auto-blocked).
 */
const IpAccessSchema = new Schema(
  {
    ip: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["block", "allow"], required: true },
    reason: { type: String, default: "", trim: true },
    source: { type: String, enum: ["manual", "auto"], default: "manual" },
    // null/undefined = permanent, otherwise the rule is ignored once this
    // timestamp has passed (still visible in the admin list for auditing).
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const IpAccessModel = mongoose.model("IpAccess", IpAccessSchema);

module.exports = { IpAccessModel };
