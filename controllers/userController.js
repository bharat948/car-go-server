const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { getUserByUsername, getUsers, saveUser } = require('../lib/db');

const VALID_ROLES = ['sender', 'courier'];

const register = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const existing = getUserByUsername(username);
        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const userRole = role && VALID_ROLES.includes(role) ? role : 'sender';

        const newUser = {
            id: uuidv4(),
            username,
            password: hashedPassword,
            friends: [],
            role: userRole,
        };

        saveUser(newUser);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = getUserByUsername(username);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role || 'sender' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        const safeUser = { id: user.id, username: user.username, role: user.role || 'sender' };
        res.status(200).json({ message: 'Login successful', user: safeUser, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

const logoutUser = (req, res) => {
    res.status(200).json({ message: 'User logged out successfully' });
};

module.exports = {
    register,
    login,
    logoutUser,
};
