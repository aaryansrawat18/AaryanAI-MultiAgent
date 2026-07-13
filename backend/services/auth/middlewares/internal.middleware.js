export const requireInternal = (req, res, next) => {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  const header = req.headers["x-internal-secret"];

  if (!secret || header !== secret) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  next();
};
