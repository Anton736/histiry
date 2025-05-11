const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Ограничение попыток входа
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 попыток
    message: { msg: 'Слишком много попыток входа. Попробуйте позже.' }
});

// Ограничение попыток регистрации
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3, // максимум 3 попытки
    message: { msg: 'Слишком много попыток регистрации. Попробуйте позже.' }
});

// Валидация для регистрации
const registerValidation = [
    check('username', 'Имя пользователя обязательно')
        .not()
        .isEmpty()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Имя пользователя должно быть от 3 до 30 символов')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Имя пользователя может содержать только буквы, цифры и знак подчеркивания')
        .custom(async (value) => {
            const user = await User.findOne({ where: { username: value.toLowerCase() } });
            if (user) {
                throw new Error('Это имя пользователя уже занято');
            }
            return true;
        }),
    check('email', 'Пожалуйста, введите корректный email')
        .isEmail()
        .normalizeEmail()
        .custom(async (value) => {
            const user = await User.findOne({ where: { email: value.toLowerCase() } });
            if (user) {
                throw new Error('Этот email уже зарегистрирован');
            }
            return true;
        }),
    check('password', 'Пароль должен содержать минимум 6 символов')
        .isLength({ min: 6 })
        .matches(/\d/)
        .withMessage('Пароль должен содержать хотя бы одну цифру')
        .matches(/[A-Z]/)
        .withMessage('Пароль должен содержать хотя бы одну заглавную букву')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Пароль должен содержать хотя бы один специальный символ')
];

// @route   POST api/auth/register
// @desc    Регистрация пользователя
// @access  Public
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        // Хешируем пароль
        const salt = await bcrypt.genSalt(12); // Увеличиваем сложность
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создаем нового пользователя
        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'user',
            isActive: true,
            lastLoginAt: new Date()
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
            { 
                expiresIn: '24h',
                algorithm: 'HS512' // Используем более безопасный алгоритм
            },
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
router.post('/login', loginLimiter, [
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
                await user.update({ 
                    isActive: false,
                    lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // Блокировка на 30 минут
                });
                return res.status(403).json({ 
                    msg: 'Слишком много неудачных попыток входа. Аккаунт заблокирован на 30 минут.' 
                });
            }
            
            return res.status(400).json({ msg: 'Неверные учетные данные' });
        }

        // Проверяем, не заблокирован ли аккаунт
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            return res.status(403).json({ 
                msg: `Аккаунт заблокирован до ${user.lockedUntil.toLocaleString()}`
            });
        }

        // Сбрасываем счетчик неудачных попыток и обновляем время последнего входа
        await user.update({ 
            loginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date()
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
            { 
                expiresIn: '24h',
                algorithm: 'HS512'
            },
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
            attributes: { 
                exclude: ['password', 'loginAttempts', 'lockedUntil'] 
            }
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

// @route   POST api/auth/logout
// @desc    Выход пользователя
// @access  Private
router.post('/logout', auth, async (req, res) => {
    try {
        // В будущем здесь можно добавить логику для инвалидации токена
        res.json({ msg: 'Выход выполнен успешно' });
    } catch (err) {
        console.error('Ошибка при выходе:', err);
        res.status(500).json({ msg: 'Ошибка сервера при выходе' });
    }
});

module.exports = router; 