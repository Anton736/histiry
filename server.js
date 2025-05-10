const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Настройка безопасности
app.use(helmet()); // Защита от различных веб-уязвимостей

// Ограничение количества запросов
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // максимум 100 запросов с одного IP
});
app.use(limiter);

// Настройка CORS
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-auth-token'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Статические файлы (CSS, JS, изображения)
app.use('/uploads', express.static('uploads')); // Загруженные файлы

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

// Импортируем модели
const User = require('./models/User');
const Book = require('./models/Book');

// Маршруты для API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));

// Маршруты для веб-страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/books', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'books_search.html'));
});

app.get('/book/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'book_details.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registration.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// Настройка для работы с Fly.io
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
        res.redirect(`https://${req.headers.host}${req.url}`);
    } else {
        next();
    }
});

app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
}); 