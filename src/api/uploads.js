import api from "./axios";

export const uploadImagesApi = (files) => {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  return api
    .post("/uploads/images", form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      transformRequest: (data) => data,
    })
    .then((r) => r.data);
};
