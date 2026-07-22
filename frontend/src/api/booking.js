import axiosInstance from "./axios";

export const bookingApi = {
  create: async (payload) => {
    const { data } = await axiosInstance.post("/bookings/book", payload);
    return data;
  },
  getVendorBookings: async (vendorId, status) => {
    const { data } = await axiosInstance.get(`/bookings/vendor/${vendorId}`, {
      params: status ? { status } : {},
    });
    return data;
  },
  getCustomerBookings: async (customerId, status) => {
    const { data } = await axiosInstance.get(`/bookings/customer/${customerId}`, {
      params: status ? { status } : {},
    });
    return data;
  },
  getById: async (bookingId) => {
    const { data } = await axiosInstance.get(`/bookings/${bookingId}`);
    return data;
  },
  updateStatus: async (bookingId, status) => {
    const { data } = await axiosInstance.put(`/bookings/${bookingId}/status`, { status });
    return data;
  },
  update: async (bookingId, payload) => {
    const { data } = await axiosInstance.put(`/bookings/${bookingId}`, payload);
    return data;
  },
  cancel: async (bookingId) => {
    const { data } = await axiosInstance.delete(`/bookings/${bookingId}`);
    return data;
  },
};

export const favoriteApi = {
  add: async (vehicleId) => {
    const { data } = await axiosInstance.post("/favorites", { vehicleId });
    return data;
  },
  remove: async (vehicleId) => {
    const { data } = await axiosInstance.delete(`/favorites/${vehicleId}`);
    return data;
  },
  getMine: async () => {
    const { data } = await axiosInstance.get("/favorites");
    return data;
  },
};
