const { Sequelize } = require('sequelize');
const path = require('path');

// Определяем конфигурацию базы данных в зависимости от окружения
const getDatabaseConfig = () => {
    // Если есть переменная окружения DATABASE_URL (для Render), используем её
    if (process.env.DATABASE_URL) {
        return {
            dialect: 'postgres',
            url: process.env.DATABASE_URL,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            logging: false
        };
    }
    
    // Для локальной разработки используем SQLite
    return {
        dialect: 'sqlite',
        storage: path.join(__dirname, '../database.sqlite'),
        logging: false
    };
};

// Создаем подключение к базе данных
const sequelize = new Sequelize({
    ...getDatabaseConfig(),
    define: {
        timestamps: true,
        underscored: true // Используем snake_case для имен полей в БД
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Функция для инициализации базы данных
const initDatabase = async () => {
    try {
        // Проверяем подключение
        await sequelize.authenticate();
        console.log('База данных успешно подключена');
        
        // Синхронизируем модели с базой данных
        // В production используем { alter: true } для безопасного обновления схемы
        // В development можно использовать { force: true } для пересоздания таблиц
        const syncOptions = process.env.NODE_ENV === 'production' 
            ? { alter: true }
            : { alter: true };
            
        await sequelize.sync(syncOptions);
        console.log('Модели синхронизированы с базой данных');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
        // В production не завершаем процесс, а логируем ошибку
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

// Инициализируем базу данных
initDatabase();

module.exports = {
    sequelize,
    Sequelize
}; 