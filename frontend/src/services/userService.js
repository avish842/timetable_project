import api from "./api";

export const userService = {
  getAll: () => api.get("/users"),
  create: (data) => api.post("/users", data),
  delete: (id) => api.delete(`/users/${id}`),
};
