import axiosInstance from "./axios";

export const vehicleApi = {
  getAll: async (params = {}) => {
    const { data } = await axiosInstance.get("/vehicles", { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await axiosInstance.get(`/vehicles/${id}`);
    return data;
  },
  getByVendor: async (vendorId) => {
    const { data } = await axiosInstance.get(`/vehicles/vendor/${vendorId}`);
    return data;
  },
  create: async (payload) => {
    const { data } = await axiosInstance.post("/vehicles", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await axiosInstance.put(`/vehicles/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await axiosInstance.delete(`/vehicles/${id}`);
    return data;
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("images", file);
    const { data } = await axiosInstance.post("/vehicles/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  uploadVideo: async (file) => {
    const formData = new FormData();
    formData.append("videos", file);
    const { data } = await axiosInstance.post("/vehicles/upload-video", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export const categoryApi = {
  getAll: async () => {
    const { data } = await axiosInstance.get("/vehicle-categories");
    return data;
  },
  create: async (payload) => {
    const { data } = await axiosInstance.post("/vehicle-categories", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await axiosInstance.put(`/vehicle-categories/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await axiosInstance.delete(`/vehicle-categories/${id}`);
    return data;
  },
};
