const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Функция для извлечения токена из заголовков
const extractToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }
    return req.header('x-auth-token');
};

// Middleware для проверки роли пользователя
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                msg: 'Требуется авторизация',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                msg: 'Доступ запрещен',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

// Основной middleware аутентификации
const auth = async (req, res, next) => {
    try {
        // Получаем токен
        const token = extractToken(req);

        // Проверяем наличие токена
        if (!token) {
            return res.status(401).json({ 
                msg: 'Требуется авторизация',
                code: 'AUTH_REQUIRED'
            });
        }

        try {
            // Верифицируем токен
            const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ['HS512'] // Указываем конкретный алгоритм
            });
            
            // Проверяем существование пользователя
            const user = await User.findOne({
                where: {
                    id: decoded.user.id,
                    isActive: true
                },
                attributes: { 
                    exclude: [
                        'password',
                        'resetPasswordToken',
                        'resetPasswordExpires',
                        'emailVerificationToken',
                        'emailVerificationExpires',
                        'twoFactorSecret'
                    ]
                }
            });

            if (!user) {
                return res.status(401).json({
                    msg: 'Пользователь не найден или деактивирован',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Проверяем, не был ли изменен пароль после выдачи токена
            if (user.changedPasswordAfter(decoded.iat)) {
                return res.status(401).json({
                    msg: 'Пароль был изменен. Пожалуйста, войдите снова',
                    code: 'PASSWORD_CHANGED'
                });
            }

            // Проверяем, не заблокирован ли аккаунт
            if (user.isLocked()) {
                return res.status(403).json({
                    msg: `Аккаунт заблокирован до ${user.lockedUntil.toLocaleString()}`,
                    code: 'ACCOUNT_LOCKED'
                });
            }

            // Проверяем верификацию email для определенных действий
            if (req.path.startsWith('/api/books') && !user.emailVerified) {
                return res.status(403).json({
                    msg: 'Требуется подтверждение email',
                    code: 'EMAIL_NOT_VERIFIED'
                });
            }

            // Добавляем пользователя в запрос
            req.user = {
                ...decoded.user,
                ...user.toJSON()
            };
            
            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    msg: 'Срок действия токена истек',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    msg: 'Недействительный токен',
                    code: 'INVALID_TOKEN'
                });
            }
            
            throw err;
        }
    } catch (err) {
        console.error('Ошибка аутентификации:', err);
        res.status(500).json({
            msg: 'Ошибка сервера при аутентификации',
            code: 'AUTH_ERROR'
        });
    }
};

module.exports = {
    auth,
    checkRole,
    // Экспортируем для тестирования
    _extractToken: extractToken
}; 