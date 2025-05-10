// Загрузка популярных книг
async function loadPopularBooks() {
    try {
        const response = await fetch('/api/books/popular');
        const books = await response.json();
        const booksGrid = document.getElementById('popular-books');
        
        books.forEach(book => {
            const bookCard = createBookCard(book);
            booksGrid.appendChild(bookCard);
        });
    } catch (error) {
        console.error('Ошибка при загрузке популярных книг:', error);
    }
}

// Создание карточки книги
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    card.innerHTML = `
        <img src="${book.coverUrl}" alt="${book.title}">
        <h3>${book.title}</h3>
        <p>${book.author}</p>
        <div class="book-rating">
            <span class="stars">${'★'.repeat(Math.round(book.rating))}${'☆'.repeat(5-Math.round(book.rating))}</span>
            <span class="rating-value">${book.rating.toFixed(1)}</span>
        </div>
        <a href="/book/${book._id}" class="btn-primary">Подробнее</a>
    `;
    
    return card;
}

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('token');
    const loginBtn = document.querySelector('.btn-login');
    const registerBtn = document.querySelector('.btn-register');
    
    if (token) {
        // Пользователь авторизован
        loginBtn.textContent = 'Профиль';
        loginBtn.href = '/profile';
        registerBtn.style.display = 'none';
    }
}

// Обработка формы поиска
function handleSearch(event) {
    event.preventDefault();
    const searchInput = document.querySelector('.search-input');
    const query = searchInput.value.trim();
    
    if (query) {
        window.location.href = `/books?search=${encodeURIComponent(query)}`;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка популярных книг на главной странице
    if (document.getElementById('popular-books')) {
        loadPopularBooks();
    }
    
    // Проверка авторизации
    checkAuth();
    
    // Обработчик формы поиска
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
}); 