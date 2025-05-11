const { sequelize } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    try {
        // Синхронизируем модели с базой данных
        await sequelize.sync({ alter: true });
        console.log('База данных синхронизирована');

        // Проверяем наличие администратора
        const adminExists = await User.findOne({
            where: { role: 'admin' }
        });

        if (!adminExists && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
            // Создаем администратора
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

            await User.create({
                username: 'admin',
                email: process.env.ADMIN_EMAIL.toLowerCase(),
                password: hashedPassword,
                role: 'admin',
                isActive: true
            });

            console.log('Администратор создан');
        }
    } catch (error) {
        console.error('Ошибка при настройке базы данных:', error);
        // В production не завершаем процесс
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}

// Запускаем настройку
setupDatabase(); 