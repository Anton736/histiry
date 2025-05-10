const { Sequelize } = require('sequelize');
const path = require('path');

// Создаем подключение к SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false, // Отключаем логирование SQL-запросов
    define: {
        timestamps: true // Добавляем поля createdAt и updatedAt
    }
});

// Функция для инициализации базы данных
const initDatabase = async () => {
    try {
        // Проверяем подключение
        await sequelize.authenticate();
        console.log('База данных успешно подключена');
        
        // Синхронизируем модели с базой данных, но не пересоздаем таблицы
        await sequelize.sync({ alter: false });
        console.log('Модели синхронизированы с базой данных');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
    }
};

// Инициализируем базу данных
initDatabase();

module.exports = {
    sequelize,
    Sequelize
}; 