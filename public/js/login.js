document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    // Получаем значения полей
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    // Сбрасываем предыдущие ошибки
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.querySelectorAll('input').forEach(el => el.classList.remove('error'));
    let isValid = true;
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('email', 'Введите корректный email');
        isValid = false;
    }
    // Валидация пароля
    if (!password) {
        showError('password', 'Введите пароль');
        isValid = false;
    }
    if (isValid) {
        // Получаем список пользователей
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        // Ищем пользователя с указанным email
        const user = users.find(u => u.email === email);
        if (user) {
            // В реальном приложении здесь должна быть проверка хеша пароля
            // Для демонстрации просто сохраняем текущего пользователя
            localStorage.setItem('currentUser', JSON.stringify(user));
            // Перенаправляем на страницу поиска книг
            window.location.href = '/books';
        } else {
            showError('email', 'Пользователь с таким email не найден');
        }
    }
});

document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    if (email) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email);
        if (user) {
            alert('Инструкции по восстановлению пароля отправлены на ваш email');
        } else {
            showError('email', 'Пользователь с таким email не найден');
        }
    } else {
        showError('email', 'Введите email для восстановления пароля');
    }
});

function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    input.classList.add('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
} 