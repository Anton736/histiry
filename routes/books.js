const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Book = require('../models/Book');

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// @route   GET api/books
// @desc    Получить все книги
// @access  Public
router.get('/', async (req, res) => {
    try {
        const books = await Book.find()
            .populate('reviews')
            .populate('comments')
            .sort({ createdAt: -1 });
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
        const book = await Book.findById(req.params.id)
            .populate('reviews')
            .populate('comments');
        
        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        res.json(book);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }
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
        const { title, author, description, genre } = req.body;
        const coverImage = req.files['coverImage'][0].path;
        const audioFile = req.files['audioFile'][0].path;

        const newBook = new Book({
            title,
            author,
            description,
            genre,
            coverImage,
            audioFile
        });

        const book = await newBook.save();
        res.json(book);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   PUT api/books/:id
// @desc    Обновить книгу
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        const { title, author, description, genre } = req.body;
        
        // Обновляем только предоставленные поля
        if (title) book.title = title;
        if (author) book.author = author;
        if (description) book.description = description;
        if (genre) book.genre = genre;

        await book.save();
        res.json(book);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

// @route   DELETE api/books/:id
// @desc    Удалить книгу
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        await book.remove();
        res.json({ msg: 'Книга удалена' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router; 