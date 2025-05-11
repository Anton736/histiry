// Books management
const API_URL = '/api';

// Load books on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/books') {
        loadBooks();
    }
});

// Load books with search and filters
async function loadBooks(page = 1, search = '', genre = '', year = '') {
    try {
        const queryParams = new URLSearchParams({
            page,
            limit: 10,
            ...(search && { search }),
            ...(genre && { genre }),
            ...(year && { year })
        });

        const response = await fetch(`${API_URL}/books?${queryParams}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load books');
        }

        const data = await response.json();
        displayBooks(data.books);
        updatePagination(data.totalPages, data.currentPage);
    } catch (error) {
        console.error('Error loading books:', error);
        alert('Ошибка при загрузке книг');
    }
}

// Display books in the table
function displayBooks(books) {
    const tbody = document.querySelector('#booksTable tbody');
    if (!tbody) return;

    tbody.innerHTML = books.map(book => `
        <tr>
            <td><a href="/book/${book.id}">${book.title}</a></td>
            <td>${book.author}</td>
            <td>${book.genre || '-'}</td>
            <td>${book.year || '-'}</td>
            <td>
                <button onclick="editBook(${book.id})" class="btn-edit">Редактировать</button>
                <button onclick="deleteBook(${book.id})" class="btn-delete">Удалить</button>
            </td>
        </tr>
    `).join('');
}

// Add new book
async function addBook(formData) {
    try {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to add book');
        }

        alert('Книга успешно добавлена');
        loadBooks();
    } catch (error) {
        console.error('Error adding book:', error);
        alert('Ошибка при добавлении книги');
    }
}

// Edit book
async function editBook(id) {
    try {
        const response = await fetch(`${API_URL}/books/${id}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load book');
        }

        const book = await response.json();
        // Populate form with book data
        document.getElementById('bookId').value = book.id;
        document.getElementById('title').value = book.title;
        document.getElementById('author').value = book.author;
        document.getElementById('genre').value = book.genre || '';
        document.getElementById('year').value = book.year || '';
        document.getElementById('description').value = book.description || '';
    } catch (error) {
        console.error('Error loading book:', error);
        alert('Ошибка при загрузке книги');
    }
}

// Delete book
async function deleteBook(id) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete book');
        }

        alert('Книга успешно удалена');
        loadBooks();
    } catch (error) {
        console.error('Error deleting book:', error);
        alert('Ошибка при удалении книги');
    }
}

// Search books
function searchBooks() {
    const searchInput = document.getElementById('searchInput');
    const genreSelect = document.getElementById('genreFilter');
    const yearInput = document.getElementById('yearFilter');

    loadBooks(1, searchInput.value, genreSelect.value, yearInput.value);
}

// Update pagination
function updatePagination(totalPages, currentPage) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;

    let html = '';
    
    // Previous button
    html += `<button onclick="loadBooks(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Предыдущая</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="loadBooks(${i})" ${i === currentPage ? 'class="active"' : ''}>${i}</button>`;
    }
    
    // Next button
    html += `<button onclick="loadBooks(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Следующая</button>`;
    
    pagination.innerHTML = html;
}

// Handle book form submission
document.getElementById('bookForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        genre: document.getElementById('genre').value,
        year: document.getElementById('year').value,
        description: document.getElementById('description').value
    };

    const bookId = document.getElementById('bookId').value;
    
    if (bookId) {
        // Update existing book
        try {
            const response = await fetch(`${API_URL}/books/${bookId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to update book');
            }

            alert('Книга успешно обновлена');
            loadBooks();
        } catch (error) {
            console.error('Error updating book:', error);
            alert('Ошибка при обновлении книги');
        }
    } else {
        // Add new book
        addBook(formData);
    }
}); 