import proxy from "express-http-proxy";

export const proxyWithUser = (serviceUrl) => {
  return proxy(serviceUrl, {
    // Multipart FormData (chat + file upload) must be streamed as-is.
    // Parsing/re-serializing breaks boundary + binary fields.
    parseReqBody: (req) => {
      const contentType = req.headers["content-type"] || "";
      return !contentType.includes("multipart/form-data");
    },

    // PDF / image generation can take longer than the default proxy timeout
    timeout: 120000,

    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user) {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
        proxyReqOpts.headers["x-user-email"] = srcReq.user.email;
        proxyReqOpts.headers["x-user-avatar"] = srcReq.user.avatar;
      }

      return proxyReqOpts;
    },
  });
};