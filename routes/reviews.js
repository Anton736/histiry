const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const Book = require('../models/Book');

// @route   POST api/reviews
// @desc    Добавить отзыв
// @access  Private
router.post('/', [
    auth,
    [
        check('book', 'ID книги обязателен').not().isEmpty(),
        check('rating', 'Рейтинг обязателен').isInt({ min: 1, max: 5 }),
        check('text', 'Текст отзыва обязателен').not().isEmpty()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { book, rating, text } = req.body;

        // Проверяем существование книги
        const bookExists = await Book.findById(book);
        if (!bookExists) {
            return res.status(404).json({ msg: 'Книга не найдена' });
        }

        // Проверяем, не оставлял ли пользователь уже отзыв
        const existingReview = await Review.findOne({
            book,
            user: req.user.id
        });

        if (existingReview) {
            return res.status(400).json({ msg: 'Вы уже оставили отзыв на эту книгу' });
        }

        const newReview = new Review({
            book,
            user: req.user.id,
            rating,
            text
        });

        const review = await newReview.save();

        // Добавляем отзыв в книгу
        bookExists.reviews.push(review._id);
        await bookExists.save();

        res.json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   PUT api/reviews/:id
// @desc    Обновить отзыв
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({ msg: 'Отзыв не найден' });
        }

        // Проверяем, принадлежит ли отзыв пользователю
        if (review.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Пользователь не авторизован' });
        }

        const { rating, text } = req.body;
        
        if (rating) review.rating = rating;
        if (text) review.text = text;

        await review.save();
        res.json(review);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Отзыв не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

// @route   DELETE api/reviews/:id
// @desc    Удалить отзыв
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({ msg: 'Отзыв не найден' });
        }

        // Проверяем, принадлежит ли отзыв пользователю
        if (review.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Пользователь не авторизован' });
        }

        // Удаляем отзыв из книги
        const book = await Book.findById(review.book);
        if (book) {
            book.reviews = book.reviews.filter(
                reviewId => reviewId.toString() !== review._id.toString()
            );
            await book.save();
        }

        await review.remove();
        res.json({ msg: 'Отзыв удален' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Отзыв не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router; 