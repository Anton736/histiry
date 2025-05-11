const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./config/database');
require('dotenv').config();

const app = express();

// Проверка подключения к базе данных
sequelize.authenticate()
    .then(() => console.log('База данных подключена успешно'))
    .catch(err => {
        console.error('Ошибка подключения к базе данных:', err);
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    });

// Настройка безопасности
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }
}));

// Ограничение количества запросов
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: process.env.NODE_ENV === 'production' ? 50 : 100, // меньше запросов в production
    message: { error: 'Слишком много запросов, попробуйте позже' }
});

// Применяем ограничение только к API
app.use('/api/', limiter);

// Настройка CORS
const corsOptions = {
    origin: '*', // Разрешаем запросы с любого домена
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    exposedHeaders: ['x-auth-token'],
    credentials: true,
    maxAge: 86400 // 24 часа
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Создаем директорию для загрузок, если её нет
const uploadDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadDir)) {
    require('fs').mkdirSync(uploadDir, { recursive: true });
}

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});

const fileFilter = (req, file, cb) => {
    // Разрешаем только определенные типы файлов
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'audio/mpeg', 'audio/mp3'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Неподдерживаемый тип файла'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024 // 10MB по умолчанию
    }
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// Маршруты API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));

// Маршруты для веб-страниц
const serveStaticPage = (page) => (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
};

app.get('/', serveStaticPage('index'));
app.get('/books', serveStaticPage('books_search'));
app.get('/book/:id', serveStaticPage('book_details'));
app.get('/login', serveStaticPage('login'));
app.get('/register', serveStaticPage('registration'));

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Страница не найдена' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);

    // Обработка ошибок Multer
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Файл слишком большой' });
        }
        return res.status(400).json({ error: 'Ошибка загрузки файла' });
    }

    // Обработка других ошибок
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Внутренняя ошибка сервера' 
        : err.message;

    res.status(statusCode).json({ error: message });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Получен сигнал SIGTERM, закрываем соединения...');
    sequelize.close().then(() => {
        console.log('Соединения с базой данных закрыты');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Сервер запущен на порту ${PORT} в режиме ${process.env.NODE_ENV || 'development'}`);
}); 