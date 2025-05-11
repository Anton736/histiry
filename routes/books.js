const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const { auth, checkRole } = require('../middleware/auth');
const Book = require('../models/Book');
const User = require('../models/User');
const { Op } = require('sequelize');

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'coverImage') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения разрешены для обложки'), false);
        }
    } else if (file.fieldname === 'audioFile') {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Только аудио файлы разрешены'), false);
        }
    } else {
        cb(new Error('Неподдерживаемый тип файла'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Валидация для создания/обновления книги
const bookValidation = [
    check('title', 'Название книги обязательно')
        .not()
        .isEmpty()
        .trim()
        .isLength({ min: 1, max: 255 }),
    check('author', 'Автор обязателен')
        .not()
        .isEmpty()
        .trim()
        .isLength({ min: 1, max: 255 }),
    check('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }),
    check('year')
        .optional()
        .isInt({ min: 1000, max: new Date().getFullYear() })
        .withMessage('Год должен быть между 1000 и текущим годом'),
    check('genre')
        .optional()
        .isIn(['fiction', 'non-fiction', 'science', 'history', 'biography', 'other'])
        .withMessage('Недопустимый жанр')
];

// @route   GET api/books
// @desc    Получить список книг
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            sort = 'createdAt', 
            order = 'DESC',
            search,
            genre,
            year
        } = req.query;

        const offset = (page - 1) * limit;
        const where = {};

        // Поиск по названию или автору
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { author: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Фильтр по жанру
        if (genre) {
            where.genre = genre;
        }

        // Фильтр по году
        if (year) {
            where.year = year;
        }

        const { count, rows: books } = await Book.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[sort, order]],
            include: [{
                model: User,
                as: 'addedBy',
                attributes: ['id', 'username']
            }]
        });

        res.json({
            books,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalBooks: count
        });
    } catch (err) {
        console.error('Ошибка при получении списка книг:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// @route   GET api/books/:id
// @desc    Получить книгу по ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'addedBy',
                attributes: ['id', 'username']
            }]
        });

        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        res.json(book);
    } catch (err) {
        console.error('Ошибка при получении книги:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// @route   POST api/books
// @desc    Добавить новую книгу
// @access  Private (требуется подтверждение email)
router.post('/', [auth, bookValidation], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const book = await Book.create({
            ...req.body,
            addedById: req.user.id
        });

        res.status(201).json(book);
    } catch (err) {
        console.error('Ошибка при добавлении книги:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// @route   PUT api/books/:id
// @desc    Обновить книгу
// @access  Private (только автор или модератор)
router.put('/:id', [auth, bookValidation], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const book = await Book.findByPk(req.params.id);

        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        // Проверяем права на редактирование
        if (book.addedById !== req.user.id && req.user.role !== 'moderator' && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Нет прав на редактирование' });
        }

        await book.update(req.body);
        res.json(book);
    } catch (err) {
        console.error('Ошибка при обновлении книги:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// @route   DELETE api/books/:id
// @desc    Удалить книгу
// @access  Private (только автор или администратор)
router.delete('/:id', auth, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);

        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        // Проверяем права на удаление
        if (book.addedById !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Нет прав на удаление' });
        }

        await book.destroy();
        res.json({ msg: 'Книга удалена' });
    } catch (err) {
        console.error('Ошибка при удалении книги:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// @route   POST api/books/:id/approve
// @desc    Одобрить книгу (только для модераторов)
// @access  Private (только модератор)
router.post('/:id/approve', [auth, checkRole('moderator', 'admin')], async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);

        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        await book.update({ 
            isApproved: true,
            approvedAt: new Date(),
            approvedById: req.user.id
        });

        res.json(book);
    } catch (err) {
        console.error('Ошибка при одобрении книги:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// @route   POST api/books/:id/reject
// @desc    Отклонить книгу (только для модераторов)
// @access  Private (только модератор)
router.post('/:id/reject', [auth, checkRole('moderator', 'admin')], async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ msg: 'Требуется указать причину отклонения' });
    }

    try {
        const book = await Book.findByPk(req.params.id);

        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        await book.update({ 
            isApproved: false,
            rejectionReason: reason,
            rejectedAt: new Date(),
            rejectedById: req.user.id
        });

        res.json(book);
    } catch (err) {
        console.error('Ошибка при отклонении книги:', err);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

module.exports = router; 