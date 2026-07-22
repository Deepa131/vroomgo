import axiosInstance from "./axios";

export const authApi = {
  getCaptcha: async () => {
    const { data } = await axiosInstance.get("/auth/captcha");
    return data;
  },
  register: async (payload) => {
    const { data } = await axiosInstance.post("/auth/register", payload);
    return data;
  },
  login: async (payload) => {
    const { data } = await axiosInstance.post("/auth/login", payload);
    return data;
  },
  verifyOtp: async (payload) => {
    const { data } = await axiosInstance.post("/auth/verify-otp", payload);
    return data;
  },
  resendOtp: async (payload) => {
    const { data } = await axiosInstance.post("/auth/resend-otp", payload);
    return data;
  },
  getMe: async () => {
    const { data } = await axiosInstance.get("/auth/me");
    return data;
  },
  logout: async () => {
    const { data } = await axiosInstance.post("/auth/logout");
    return data;
  },
  forgotPassword: async (payload) => {
    const { data } = await axiosInstance.post("/auth/forgot-password", payload);
    return data;
  },
  resetPassword: async (token, payload) => {
    const { data } = await axiosInstance.post(`/auth/reset-password/${token}`, payload);
    return data;
  },
  magicLinkRequest: async (payload) => {
    const { data } = await axiosInstance.post("/auth/magic-link/request", payload);
    return data;
  },
  magicLinkVerify: async (token) => {
    const { data } = await axiosInstance.post("/auth/magic-link/verify", { token });
    return data;
  },
  exportProfile: async () => {
    const { data } = await axiosInstance.get("/auth/profile/export");
    return data;
  },
  importProfile: async (payload) => {
    const { data } = await axiosInstance.post("/auth/profile/import", { data: payload });
    return data;
  },
  updateProfile: async (userId, formData) => {
    const { data } = await axiosInstance.put(`/auth/${userId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  updateProfilePicture: async (formData) => {
    const { data } = await axiosInstance.put("/auth/profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};