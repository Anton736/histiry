const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Book = require('../models/Book');

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

// @route   GET api/books
// @desc    Получить все книги
// @access  Public
router.get('/', async (req, res) => {
    try {
        const books = await Book.findAll({
            include: [
                { model: require('../models/Review') },
                { model: require('../models/Comment') }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(books);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   GET api/books/:id
// @desc    Получить книгу по ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id, {
            include: [
                { model: require('../models/Review') },
                { model: require('../models/Comment') }
            ]
        });
        
        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        res.json(book);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   POST api/books
// @desc    Добавить новую книгу
// @access  Private
router.post('/', [
    auth,
    upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'audioFile', maxCount: 1 }
    ]),
    [
        check('title', 'Название обязательно').not().isEmpty(),
        check('author', 'Автор обязателен').not().isEmpty(),
        check('description', 'Описание обязательно').not().isEmpty(),
        check('genre', 'Жанр обязателен').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        if (!req.files || !req.files['coverImage'] || !req.files['audioFile']) {
            return res.status(400).json({ msg: 'Необходимо загрузить обложку и аудио файл' });
        }

        const { title, author, description, genre } = req.body;
        const coverImage = req.files['coverImage'][0].path;
        const audioFile = req.files['audioFile'][0].path;

        const book = await Book.create({
            title,
            author,
            description,
            genre,
            coverImage,
            audioFile,
            userId: req.user.id
        });

        res.json(book);
    } catch (err) {
        console.error(err.message);
        // Удаляем загруженные файлы в случае ошибки
        if (req.files) {
            Object.values(req.files).forEach(files => {
                files.forEach(file => {
                    fs.unlink(file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Ошибка при удалении файла:', unlinkErr);
                    });
                });
            });
        }
        res.status(500).send('Ошибка сервера');
    }
});

// @route   PUT api/books/:id
// @desc    Обновить книгу
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        
        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        // Проверяем, является ли пользователь владельцем книги
        if (book.userId !== req.user.id) {
            return res.status(403).json({ msg: 'Нет прав на редактирование этой книги' });
        }

        const { title, author, description, genre } = req.body;
        
        await book.update({
            title: title || book.title,
            author: author || book.author,
            description: description || book.description,
            genre: genre || book.genre
        });

        res.json(book);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   DELETE api/books/:id
// @desc    Удалить книгу
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        
        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        // Проверяем, является ли пользователь владельцем книги
        if (book.userId !== req.user.id) {
            return res.status(403).json({ msg: 'Нет прав на удаление этой книги' });
        }

        // Удаляем связанные файлы
        if (book.coverImage) {
            fs.unlink(book.coverImage, (err) => {
                if (err) console.error('Ошибка при удалении обложки:', err);
            });
        }
        if (book.audioFile) {
            fs.unlink(book.audioFile, (err) => {
                if (err) console.error('Ошибка при удалении аудио файла:', err);
            });
        }

        await book.destroy();
        res.json({ msg: 'Книга удалена' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router; 