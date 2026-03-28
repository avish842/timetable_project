import api from "./api";

export const swapService = {
  getAll: () => api.get("/swaps"),
  getEligibleSlots: (timetableId) => api.get(`/swaps/eligible-slots?timetableId=${timetableId}`),
  create: (data) => api.post("/swaps", data),
  targetApprove: (id) => api.post(`/swaps/${id}/target-approve`),
  targetReject: (id, reason) => api.post(`/swaps/${id}/target-reject`, { reason }),
  cancel: (id, reason) => api.post(`/swaps/${id}/cancel`, { reason }),
  adminFinalize: (id, note) => api.post(`/swaps/${id}/admin-finalize`, { note }),
  adminReject: (id, reason) => api.post(`/swaps/${id}/admin-reject`, { reason }),
};
