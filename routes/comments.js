const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Book = require('../models/Book');

// @route   POST api/comments
// @desc    Добавить комментарий
// @access  Private
router.post('/', [
    auth,
    [
        check('book', 'ID книги обязателен').not().isEmpty(),
        check('text', 'Текст комментария обязателен').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { book, text } = req.body;

        // Проверяем существование книги
        const bookExists = await Book.findById(book);
        if (!bookExists) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        const newComment = new Comment({
            book,
            user: req.user.id,
            text
        });

        const comment = await newComment.save();

        // Добавляем комментарий в книгу
        bookExists.comments.push(comment._id);
        await bookExists.save();

        res.json(comment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   PUT api/comments/:id
// @desc    Обновить комментарий
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        
        if (!comment) {
            return res.status(404).json({ msg: 'Комментарий не найден' });
        }

        // Проверяем, принадлежит ли комментарий пользователю
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Пользователь не авторизован' });
        }

        const { text } = req.body;
        if (text) comment.text = text;

        await comment.save();
        res.json(comment);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Комментарий не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

// @route   DELETE api/comments/:id
// @desc    Удалить комментарий
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        
        if (!comment) {
            return res.status(404).json({ msg: 'Комментарий не найден' });
        }

        // Проверяем, принадлежит ли комментарий пользователю
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Пользователь не авторизован' });
        }

        // Удаляем комментарий из книги
        const book = await Book.findById(comment.book);
        if (book) {
            book.comments = book.comments.filter(
                commentId => commentId.toString() !== comment._id.toString()
            );
            await book.save();
        }

        await comment.remove();
        res.json({ msg: 'Комментарий удален' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Комментарий не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router; 