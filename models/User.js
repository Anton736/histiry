const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 30],
            is: /^[a-zA-Z0-9_]+$/
        }
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(60), // bcrypt хеш всегда 60 символов
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'admin', 'moderator'),
        allowNull: false,
        defaultValue: 'user'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 5
        }
    },
    lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    passwordChangedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    emailVerificationToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
                user.passwordChangedAt = new Date();
            }
            // Приводим username и email к нижнему регистру
            user.username = user.username.toLowerCase();
            user.email = user.email.toLowerCase();
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
                user.passwordChangedAt = new Date();
            }
            if (user.changed('username')) {
                user.username = user.username.toLowerCase();
            }
            if (user.changed('email')) {
                user.email = user.email.toLowerCase();
                user.emailVerified = false; // Сбрасываем верификацию при смене email
            }
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            unique: true,
            fields: ['username']
        },
        {
            fields: ['role']
        },
        {
            fields: ['isActive']
        }
    ],
    timestamps: true,
    paranoid: true // Включаем мягкое удаление
});

// Метод для проверки пароля
User.prototype.checkPassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

// Метод для проверки, не был ли изменен пароль после выдачи токена
User.prototype.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Метод для инкремента попыток входа
User.prototype.incrementLoginAttempts = async function() {
    this.loginAttempts += 1;
    this.lastLoginAttempt = new Date();
    
    if (this.loginAttempts >= 5) {
        this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Блокировка на 30 минут
    }
    
    await this.save();
};

// Метод для сброса попыток входа
User.prototype.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lastLoginAttempt = null;
    this.lockedUntil = null;
    this.lastLoginAt = new Date();
    await this.save();
};

// Метод для проверки, заблокирован ли аккаунт
User.prototype.isLocked = function() {
    return this.lockedUntil && this.lockedUntil > new Date();
};

// Метод для генерации токена сброса пароля
User.prototype.generatePasswordResetToken = async function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
    
    await this.save();
    
    return resetToken;
};

// Метод для генерации токена верификации email
User.prototype.generateEmailVerificationToken = async function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    
    await this.save();
    
    return verificationToken;
};

// Метод для проверки токена сброса пароля
User.prototype.checkPasswordResetToken = function(token) {
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    return this.resetPasswordToken === hashedToken && 
           this.resetPasswordExpires > new Date();
};

// Метод для проверки токена верификации email
User.prototype.checkEmailVerificationToken = function(token) {
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    return this.emailVerificationToken === hashedToken && 
           this.emailVerificationExpires > new Date();
};

module.exports = User; 