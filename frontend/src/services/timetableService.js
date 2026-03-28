import api from "./api";

export const timetableService = {
  create: (data) => api.post("/timetable/create", data),
  getRoomStatus: () => api.get("/timetable/room-status"),
  getMine: () => api.get("/timetable/mine"),
  getMyDepartmentRoomIds: () => api.get("/timetable/dept-rooms/me"),
  importFromExcel: (formData) =>
    api.post("/timetable/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  sendDepartmentEmails: (id) => api.post(`/timetable/${id}/send-department-emails`),
  getByRoom: (roomId) => api.get(`/timetable/${roomId}`),
  delete: (id) => api.delete(`/timetable/${id}`),
};
