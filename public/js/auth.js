// Authentication handling
const API_URL = '/api';

// Handle registration form submission
document.getElementById('registrationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

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
            // Save token to localStorage
            localStorage.setItem('token', data.token);
            // Redirect to books page
            window.location.href = '/books';
        } else {
            // Show error message
            const errorMessage = data.errors?.[0]?.msg || data.msg || 'Ошибка при регистрации';
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Ошибка при регистрации. Попробуйте позже.');
    }
});

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
            // Save token to localStorage
            localStorage.setItem('token', data.token);
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
const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
};

// Logout function
const logout = () => {
    localStorage.removeItem('token');
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