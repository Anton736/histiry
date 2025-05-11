const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');

// Валидация для регистрации
const registerValidation = [
    check('username', 'Имя пользователя обязательно')
        .not()
        .isEmpty()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Имя пользователя должно быть от 3 до 30 символов')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Имя пользователя может содержать только буквы, цифры и знак подчеркивания'),
    check('email', 'Пожалуйста, введите корректный email')
        .isEmail()
        .normalizeEmail(),
    check('password', 'Пароль должен содержать минимум 6 символов')
        .isLength({ min: 6 })
        .matches(/\d/)
        .withMessage('Пароль должен содержать хотя бы одну цифру')
        .matches(/[A-Z]/)
        .withMessage('Пароль должен содержать хотя бы одну заглавную букву')
];

// @route   POST api/auth/register
// @desc    Регистрация пользователя
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        // Проверяем, существует ли пользователь
        let user = await User.findOne({ 
            where: { 
                [Op.or]: [
                    { email: email.toLowerCase() },
                    { username: username.toLowerCase() }
                ]
            }
        });
        
        if (user) {
            if (user.email === email.toLowerCase()) {
                return res.status(400).json({ msg: 'Этот email уже зарегистрирован' });
            }
            if (user.username === username.toLowerCase()) {
                return res.status(400).json({ msg: 'Это имя пользователя уже занято' });
            }
        }

        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создаем нового пользователя
        user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'user', // По умолчанию обычный пользователь
            isActive: true
        });

        // Создаем JWT токен
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('Ошибка при создании токена:', err);
                    return res.status(500).json({ msg: 'Ошибка при создании токена' });
                }
                res.json({ 
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Ошибка при регистрации:', err);
        res.status(500).json({ msg: 'Ошибка сервера при регистрации' });
    }
});

// @route   POST api/auth/login
// @desc    Авторизация пользователя
// @access  Public
router.post('/login', [
    check('email', 'Пожалуйста, введите корректный email')
        .isEmail()
        .normalizeEmail(),
    check('password', 'Пароль обязателен')
        .exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // Проверяем существование пользователя
        const user = await User.findOne({ 
            where: { 
                email: email.toLowerCase(),
                isActive: true
            }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Неверные учетные данные' });
        }

        // Проверяем пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Увеличиваем счетчик неудачных попыток входа
            await user.increment('loginAttempts');
            
            if (user.loginAttempts >= 5) {
                await user.update({ isActive: false });
                return res.status(403).json({ 
                    msg: 'Слишком много неудачных попыток входа. Аккаунт заблокирован. Обратитесь к администратору.' 
                });
            }
            
            return res.status(400).json({ msg: 'Неверные учетные данные' });
        }

        // Сбрасываем счетчик неудачных попыток при успешном входе
        await user.update({ loginAttempts: 0 });

        // Создаем JWT токен
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('Ошибка при создании токена:', err);
                    return res.status(500).json({ msg: 'Ошибка при создании токена' });
                }
                res.json({ 
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Ошибка при входе:', err);
        res.status(500).json({ msg: 'Ошибка сервера при входе' });
    }
});

// @route   GET api/auth/me
// @desc    Получить информацию о текущем пользователе
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        
        if (!user) {
            return res.status(404).json({ msg: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (err) {
        console.error('Ошибка при получении данных пользователя:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

module.exports = router; 