document.addEventListener('DOMContentLoaded', function() {
    // Предпросмотр аватара
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarUpload = document.getElementById('avatarUpload');
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

    // Регистрация
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        // Сброс ошибок
        document.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
            el.textContent = '';
        });
        document.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));

        // Получаем значения
        const name = document.getElementById('name').value.trim();
        const surname = document.getElementById('surname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const birthDate = document.getElementById('birthDate').value;
        const gender = document.getElementById('gender').value;
        const interests = document.getElementById('interests').value;
        // Валидация
        let isValid = true;
        if (!name) { showError('name', 'Введите имя'); isValid = false; }
        if (!surname) { showError('surname', 'Введите фамилию'); isValid = false; }
        if (!email) { showError('email', 'Введите email'); isValid = false; }
        if (!password) { showError('password', 'Введите пароль'); isValid = false; }
        if (password.length < 6) { showError('password', 'Пароль должен быть не менее 6 символов'); isValid = false; }
        if (password !== confirmPassword) { showError('confirmPassword', 'Пароли не совпадают'); isValid = false; }
        if (!birthDate) { showError('birthDate', 'Укажите дату рождения'); isValid = false; }
        if (!gender) { showError('gender', 'Выберите пол'); isValid = false; }
        if (!isValid) return;
        // Отправка на сервер
        try {
            const resp = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name + ' ' + surname,
                    email,
                    password
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                localStorage.setItem('token', data.token);
                // Можно получить пользователя через /api/auth/me, если нужно
                window.location.href = '/books';
            } else {
                const err = await resp.json();
                if (err.errors && Array.isArray(err.errors)) {
                    err.errors.forEach(e => showError(e.param, e.msg));
                } else if (err.msg) {
                    showError('email', err.msg);
                } else {
                    alert('Ошибка регистрации');
                }
            }
        } catch (error) {
            alert('Ошибка сервера');
        }
    });
});

function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    if (input) input.classList.add('error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
} 