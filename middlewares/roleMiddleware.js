function permit(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    // 🔹 No user attached (unauthenticated)
    if (!user) {
      console.log("[permit] no req.user. route:", req.method, req.originalUrl);
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 🔹 Always allow access to self-profile routes
    const url = req.originalUrl.toLowerCase();
    if (url.includes("/profile")) {
      console.log(`[permit] ${user.role} accessing profile — allowed`);
      return next();
    }

    // 🔹 Role-based access for other routes
    const isAllowed =
      allowedRoles.length === 0 || allowedRoles.includes(user.role);

    console.log(
      "[permit] route:",
      req.method,
      req.originalUrl,
      "allowed:",
      allowedRoles,
      "got:",
      user.role,
      "allowed?",
      isAllowed
    );

    if (!isAllowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

module.exports = { permit };
