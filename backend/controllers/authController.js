import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../config/db.js';

// Create JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        }
    );
};

// Set authentication cookie
const setAuthCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    });
};

// Auth register user
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await sql`
            SELECT id
            FROM users
            WHERE email = ${email}
        `;

        if (existingUser.length > 0) {
            return res.status(400).json({
                message: 'User already exists',
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user
        const newUser = await sql`
            INSERT INTO users (name, email, password)
            VALUES (${name}, ${email}, ${hashedPassword})
            RETURNING
                id,
                name,
                email,
                storage_used,
                storage_limit,
                created_at,
                updated_at
        `;

        const user = newUser[0];

        // Generate JWT token
        const token = generateToken(user);

        // Set JWT in HTTP-only cookie
        setAuthCookie(res, token);

        return res.status(201).json({
            message: 'User registered successfully',
            user,
        });
    } catch (error) {
        console.error('Error registering user:', error);

        return res.status(500).json({
            message: 'Internal server error',
        });
    }
};

// Auth login user
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const users = await sql`
            SELECT *
            FROM users
            WHERE email = ${email}
        `;

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password',
            });
        }

        const user = users[0];

        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid email or password',
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Set JWT in HTTP-only cookie
        setAuthCookie(res, token);

        // Remove password before sending user data
        const { password: _, ...userWithoutPassword } = user;

        return res.status(200).json({
            message: 'Login successful',
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error('Error logging in:', error);

        return res.status(500).json({
            message: 'Internal server error',
        });
    }
};

// Get currently authenticated user
export const getMe = async (req, res) => {
    try {
        // Get user ID from verified JWT
        const userId = req.user.id;

        // Get user from database
        const users = await sql`
            SELECT
                id,
                name,
                email,
                storage_used,
                storage_limit,
                created_at,
                updated_at
            FROM users
            WHERE id = ${userId}
        `;

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            user: users[0],
        });
    } catch (error) {
        console.error('Error fetching current user:', error);

        return res.status(500).json({
            message: 'Internal server error',
        });
    }
};

// Auth logout user
export const logoutUser = async (req, res) => {
    try {
        // Clear authentication cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production'
                ? 'none'
                : 'lax',
            path: '/',
        });

        return res.status(200).json({
            message: 'Logout successful',
        });
    } catch (error) {
        console.error('Error logging out:', error);

        return res.status(500).json({
            message: 'Internal server error',
        });
    }
};

