import { sql } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Helper function to generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET || "fallback_secret_key_change_this_in_prod",
        { expiresIn: "7d" }
    );
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required" });
        }

        // Check if user already exists
        const existingUser = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "User with this email already exists" });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Default role is 'patient' if it's not provided or invalid
        const userRole = ["doctor", "admin", "patient"].includes(role) ? role : "patient";

        // Insert user
        const newUser = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${passwordHash}, ${userRole})
      RETURNING id, name, email, role, created_at
    `;

        if (userRole === 'patient') {
            try {
                await sql`
                  INSERT INTO patients (name, age, gravida)
                  VALUES (${name}, 0, 0)
                `;
            } catch (err) {
                console.error("Failed to insert into patients table:", err);
            }
        }

        const token = generateToken(newUser[0]);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: newUser[0]
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const users = await sql`SELECT * FROM users WHERE email = ${email}`;

        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = users[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = generateToken(user);

        // Remove password_hash from response
        delete user.password_hash;

        res.json({
            message: "Login successful",
            token,
            user
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMe = async (req, res) => {
    try {
        const users = await sql`SELECT id, name, email, role, created_at FROM users WHERE id = ${req.user.id}`;

        if (users.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
