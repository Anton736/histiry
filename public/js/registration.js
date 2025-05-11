document.addEventListener('DOMContentLoaded', function() {
    const API_URL = window.location.origin; // Получаем текущий домен (включая порт 8080)
    const form = document.getElementById('registrationForm');
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Предпросмотр аватара
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarUpload = document.getElementById('avatarUpload');
    
    if (avatarPreview && avatarUpload) {
        avatarPreview.addEventListener('click', function() {
            avatarUpload.click();
        });
        
        avatarUpload.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Функция для отображения ошибок
    function showError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + 'Error');
        
        if (input) {
            input.classList.add('error');
            input.focus();
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    // Функция для сброса ошибок
    function resetErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });
        document.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));
    }

    // Функция для валидации формы
    function validateForm() {
        resetErrors();
        let isValid = true;

        const username = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Валидация имени пользователя
        if (!username) {
            showError('name', 'Введите имя пользователя');
            isValid = false;
        } else if (username.length < 3) {
            showError('name', 'Имя пользователя должно быть не менее 3 символов');
            isValid = false;
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            showError('name', 'Имя пользователя может содержать только буквы, цифры и знак подчеркивания');
            isValid = false;
        }

        // Валидация email
        if (!email) {
            showError('email', 'Введите email');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('email', 'Введите корректный email');
            isValid = false;
        }

        // Валидация пароля
        if (!password) {
            showError('password', 'Введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            showError('password', 'Пароль должен быть не менее 6 символов');
            isValid = false;
        } else if (!/\d/.test(password)) {
            showError('password', 'Пароль должен содержать хотя бы одну цифру');
            isValid = false;
        } else if (!/[A-Z]/.test(password)) {
            showError('password', 'Пароль должен содержать хотя бы одну заглавную букву');
            isValid = false;
        }

        // Проверка совпадения паролей
        if (password !== confirmPassword) {
            showError('confirmPassword', 'Пароли не совпадают');
            isValid = false;
        }

        return isValid;
    }

    // Обработка отправки формы
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        // Блокируем кнопку отправки
        submitButton.disabled = true;
        submitButton.textContent = 'Регистрация...';

        try {
            const username = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Сохраняем токен
                localStorage.setItem('token', data.token);
                
                // Показываем сообщение об успехе
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = 'Регистрация успешна! Перенаправление...';
                form.appendChild(successMessage);

                // Перенаправляем на страницу книг
                setTimeout(() => {
                    window.location.href = '/books';
                }, 1500);
            } else {
                // Обработка ошибок от сервера
                if (data.errors && Array.isArray(data.errors)) {
                    data.errors.forEach(error => {
                        showError(error.param, error.msg);
                    });
                } else if (data.msg) {
                    showError('email', data.msg);
                } else {
                    throw new Error('Неизвестная ошибка');
                }
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                showError('email', 'Сервер недоступен. Пожалуйста, попробуйте позже.');
            } else {
                showError('email', 'Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
            }
        } finally {
            // Разблокируем кнопку отправки
            submitButton.disabled = false;
            submitButton.textContent = 'Зарегистрироваться';
        }
    });
}); 