import api from "../utils/axios";

export const sendPrompt = async (payload, config = {}) => {
  const { data } = await api.post("/api/agent/chat", payload, {
    // Let the browser set multipart boundary when payload is FormData
    timeout: 120000,
    ...config,
  });
  return data;
};
