import api from "./axios";

const d = (r) => r.data;

export const listAccommodationsApi = (params) => api.get("/accommodations", { params }).then(d);
export const accommodationMetaApi = () => api.get("/accommodations/meta").then(d);
export const getAccommodationApi = (id) => api.get(`/accommodations/${id}`).then(d);
/** @param {{ page?: number, limit?: number }} [params] */
export const myAccommodationsApi = (params) => api.get("/accommodations/mine", { params }).then(d);
export const createAccommodationApi = (data) => api.post("/accommodations", data).then(d);
export const updateAccommodationApi = (id, data) => api.put(`/accommodations/${id}`, data).then(d);
export const setAccommodationStatusApi = (id, status) =>
  api.patch(`/accommodations/${id}/status`, { status }).then(d);
export const deleteAccommodationApi = (id) => api.delete(`/accommodations/${id}`).then(d);
