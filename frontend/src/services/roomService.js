import api from "./api";

export const roomService = {
  getAll: () => api.get("/rooms"),
  create: (data) => api.post("/rooms", data),
  delete: (id) => api.delete(`/rooms/${id}`),
};
