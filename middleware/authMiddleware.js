import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "fallback_secret_key_change_this_in_prod"
        );
        req.user = decoded; // add user to request payload
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Requires one of these roles: ${roles.join(", ")}`,
            });
        }
        next();
    };
};