const mongoose = require("mongoose");

const { Schema } = mongoose;

const AuditLogSchema = new Schema(
  {
    action: { type: String, required: true }, // e.g. LOGIN_SUCCESS, LOGIN_FAILED, ACCOUNT_LOCKED
    user: { type: Schema.Types.ObjectId, ref: "User" }, // may be absent (e.g. failed login for unknown email)
    email: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    details: { type: String, default: "" },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });

const AuditLogModel = mongoose.model("AuditLog", AuditLogSchema);

module.exports = { AuditLogModel };
