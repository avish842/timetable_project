import api from "./api";

export const slotService = {
  getByTimetable: (timetableId) =>
    api.get(`/slots?timetableId=${timetableId}`),
  update: (slotId, data) => api.put(`/slots/${slotId}`, data),
};
