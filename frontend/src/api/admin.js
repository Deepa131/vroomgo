import axiosInstance from "./axios";

export const adminApi = {
  getStats: async () => {
    const { data } = await axiosInstance.get("/admin/stats");
    return data;
  },
  getAllUsers: async (params = {}) => {
    const { data } = await axiosInstance.get("/admin/users", { params });
    return data;
  },
  getUserById: async (id) => {
    const { data } = await axiosInstance.get(`/admin/users/${id}`);
    return data;
  },
  createUser: async (formData) => {
    const { data } = await axiosInstance.post("/admin/users", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  updateUser: async (id, formData) => {
    const { data } = await axiosInstance.put(`/admin/users/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  deleteUser: async (id) => {
    const { data } = await axiosInstance.delete(`/admin/users/${id}`);
    return data;
  },
  getAllVehicles: async (params = {}) => {
    const { data } = await axiosInstance.get("/admin/vehicles", { params });
    return data;
  },
  updateVehicleStatus: async (id, approvalStatus) => {
    const { data } = await axiosInstance.put(`/admin/vehicles/${id}/status`, { approvalStatus });
    return data;
  },
  deleteVehicle: async (id) => {
    const { data } = await axiosInstance.delete(`/admin/vehicles/${id}`);
    return data;
  },
  getAuditLogs: async (params = {}) => {
    const { data } = await axiosInstance.get("/admin/audit-logs", { params });
    return data;
  },
  getIpAccessList: async () => {
    const { data } = await axiosInstance.get("/admin/ip-access");
    return data;
  },
  upsertIpAccess: async (payload) => {
    const { data } = await axiosInstance.post("/admin/ip-access", payload);
    return data;
  },
  deleteIpAccess: async (id) => {
    const { data } = await axiosInstance.delete(`/admin/ip-access/${id}`);
    return data;
  },
};
