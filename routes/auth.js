const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Регистрация пользователя
// @access  Public
router.post('/register', [
    check('username', 'Имя пользователя обязательно').not().isEmpty(),
    check('email', 'Пожалуйста, введите корректный email').isEmail(),
    check('password', 'Пароль должен содержать минимум 6 символов').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        // Проверяем, существует ли пользователь
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ msg: 'Пользователь уже существует' });
        }

        user = await User.findOne({ where: { username } });
        if (user) {
            return res.status(400).json({ msg: 'Это имя пользователя уже занято' });
        }

        // Создаем нового пользователя
        user = new User({ name: username, email, password });

        await user.save();

        // Создаем JWT токен
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   POST api/auth/login
// @desc    Авторизация пользователя
// @access  Public
router.post('/login', [
    check('email', 'Пожалуйста, введите корректный email').isEmail(),
    check('password', 'Пароль обязателен').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // Проверяем существование пользователя
        let user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ msg: 'Неверные учетные данные' });
        }

        // Проверяем пароль
        const isMatch = await user.checkPassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Неверные учетные данные' });
        }

        // Создаем JWT токен
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router; 