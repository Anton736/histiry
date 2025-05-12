// Authentication handling
const API_URL = '/api';

// Handle registration form submission
const registrationForm = document.getElementById('registrationForm');
if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            firstName: document.getElementById('firstName')?.value || '',
            lastName: document.getElementById('lastName')?.value || '',
            birthYear: document.getElementById('birthYear')?.value || '',
            gender: document.getElementById('gender')?.value || '',
            email: document.getElementById('email')?.value || '',
            password: document.getElementById('password')?.value || '',
            confirmPassword: document.getElementById('confirmPassword')?.value || ''
        };

        // Валидация на клиенте (пример)
        let hasError = false;
        if (!formData.firstName) {
            document.getElementById('firstNameError').textContent = 'Введите имя';
            hasError = true;
        } else {
            document.getElementById('firstNameError').textContent = '';
        }
        if (!formData.lastName) {
            document.getElementById('lastNameError').textContent = 'Введите фамилию';
            hasError = true;
        } else {
            document.getElementById('lastNameError').textContent = '';
        }
        if (!formData.birthYear) {
            document.getElementById('birthYearError').textContent = 'Введите год рождения';
            hasError = true;
        } else {
            document.getElementById('birthYearError').textContent = '';
        }
        if (!formData.gender) {
            document.getElementById('genderError').textContent = 'Выберите пол';
            hasError = true;
        } else {
            document.getElementById('genderError').textContent = '';
        }
        if (!formData.email) {
            document.getElementById('emailError').textContent = 'Введите email';
            hasError = true;
        } else {
            document.getElementById('emailError').textContent = '';
        }
        if (!formData.password) {
            document.getElementById('passwordError').textContent = 'Введите пароль';
            hasError = true;
        } else {
            document.getElementById('passwordError').textContent = '';
        }
        if (formData.password !== formData.confirmPassword) {
            document.getElementById('confirmPasswordError').textContent = 'Пароли не совпадают';
            hasError = true;
        } else {
            document.getElementById('confirmPasswordError').textContent = '';
        }
        if (hasError) return;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userEmail', data.email);
                document.getElementById('registerSuccess').style.display = 'block';
                setTimeout(() => { window.location.href = '/books'; }, 1500);
            } else {
                const errorMessage = data.errors?.[0]?.msg || data.msg || 'Ошибка при регистрации';
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Ошибка при регистрации. Попробуйте позже.');
        }
    });
}

// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Save token and user data to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.email);
            // Redirect to books page
            window.location.href = '/books';
        } else {
            // Show error message
            alert(data.msg || 'Ошибка при входе');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка при входе. Попробуйте позже.');
    }
});

// Check if user is authenticated
const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }

    try {
        // Verify token with server
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        window.location.href = '/login';
        return false;
    }
};

// Logout function
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    window.location.href = '/login';
};

// Add token to all API requests
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}; 