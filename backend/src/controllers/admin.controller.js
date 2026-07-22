const { UserModel } = require("../models/user.model");
const { VehicleModel } = require("../models/vehicle.model");
const { BookingModel } = require("../models/booking.model");
const { AuditLogModel } = require("../models/auditLog.model");
const { IpAccessModel } = require("../models/ipAccess.model");
const { invalidateManualCache } = require("../utils/ipAccessControl");
const { subscribeToAlerts } = require("../utils/alerts");
const { logEvent } = require("../utils/audit");

const sanitize = (userDoc) => {
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  const { password, resetPasswordToken, resetPasswordExpire, ...safe } = obj;
  return safe;
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, phone } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "fullName, email and password are required" });
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const userData = {
      fullName,
      email: email.toLowerCase(),
      password,
      role: ["customer", "vendor", "admin"].includes(role) ? role : "customer",
      phone,
    };

    if (req.file) {
      userData.profilePicture = `/public/profile_pictures/${req.file.filename}`;
    }

    const newUser = await UserModel.create(userData);

    return res.status(201).json({ success: true, message: "User created successfully", data: sanitize(newUser) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ success: false, message: "Page must be a positive integer" });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: "Limit must be an integer between 1 and 100" });
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      UserModel.countDocuments(),
    ]);

    const safeUsers = users.map(sanitize);

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: safeUsers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, message: "User retrieved successfully", data: sanitize(user) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.file) {
      updateData.profilePicture = `/public/profile_pictures/${req.file.filename}`;
    } else if (updateData.profilePicture === "null") {
      updateData.profilePicture = "default-avatar.png";
    }
    if (!updateData.password) delete updateData.password;

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, message: "User updated successfully", data: sanitize(updatedUser) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, message: "User deleted successfully", data: { _id: deletedUser._id } });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getStats = async (_req, res) => {
  try {
    const [totalUsers, totalVehicles, totalBookings, pendingVehicles, activeBookings] = await Promise.all([
      UserModel.countDocuments(),
      VehicleModel.countDocuments(),
      BookingModel.countDocuments(),
      VehicleModel.countDocuments({ approvalStatus: "pending" }),
      BookingModel.countDocuments({ status: { $in: ["pending", "confirmed", "active"] } }),
    ]);

    return res.status(200).json({
      success: true,
      data: { totalUsers, totalVehicles, totalBookings, pendingVehicles, activeBookings },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 25;

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ success: false, message: "Page must be a positive integer" });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: "Limit must be an integer between 1 and 100" });
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLogModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLogModel.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully",
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// --- IP-based blocking / allow-listing (manual, admin-managed rules) ---

const listIpAccess = async (_req, res) => {
  try {
    const entries = await IpAccessModel.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: entries });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const upsertIpAccess = async (req, res) => {
  try {
    const { ip, type, reason, expiresAt } = req.body;
    if (!ip || !["block", "allow"].includes(type)) {
      return res.status(400).json({ success: false, message: "ip and type ('block' | 'allow') are required" });
    }

    const entry = await IpAccessModel.findOneAndUpdate(
      { ip },
      { ip, type, reason: reason || "", expiresAt: expiresAt || null, source: "manual" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    invalidateManualCache();
    await logEvent({
      action: type === "block" ? "IP_MANUAL_BLOCKED" : "IP_MANUAL_ALLOWED",
      userId: req.user._id,
      email: req.user.email,
      req,
      details: `IP ${ip}`,
    });

    return res.status(200).json({ success: true, message: "IP access rule saved", data: entry });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

const deleteIpAccess = async (req, res) => {
  try {
    const deleted = await IpAccessModel.findByIdAndDelete(req.params.id);
    invalidateManualCache();

    if (deleted) {
      await logEvent({
        action: "IP_RULE_REMOVED",
        userId: req.user._id,
        email: req.user.email,
        req,
        details: `IP ${deleted.ip}`,
      });
    }

    return res.status(200).json({ success: true, message: "IP access rule removed" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// --- Real-time security monitoring (Server-Sent Events) ---

const streamAlerts = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(`event: ping\ndata: "connected"\n\n`);

  const unsubscribe = subscribeToAlerts((event) => {
    res.write(`event: alert\ndata: ${JSON.stringify(event)}\n\n`);
  });

  // Keep the connection alive through proxies/load balancers that would
  // otherwise time out an idle HTTP connection.
  const keepAlive = setInterval(() => res.write(":\n\n"), 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getStats,
  getAuditLogs,
  listIpAccess,
  upsertIpAccess,
  deleteIpAccess,
  streamAlerts,
};
