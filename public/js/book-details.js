// Book details management
const API_URL = '/api';

// Check if user has admin privileges
const isAdmin = () => {
    const userEmail = localStorage.getItem('userEmail');
    return userEmail === 'paviliy08@gmail.com';
};

// Load book details
async function loadBookDetails() {
    const bookId = window.location.pathname.split('/').pop();
    
    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load book details');
        }

        const book = await response.json();
        displayBookDetails(book);
        
        // Show/hide admin controls
        const adminControls = document.querySelector('.admin-controls');
        if (adminControls) {
            adminControls.style.display = isAdmin() ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error loading book details:', error);
        alert('Ошибка при загрузке деталей книги');
    }
}

// Display book details
function displayBookDetails(book) {
    document.getElementById('bookTitle').textContent = book.title;
    document.getElementById('bookAuthor').textContent = book.author;
    document.getElementById('bookGenre').textContent = book.genre || '-';
    document.getElementById('bookYear').textContent = book.year || '-';
    document.getElementById('bookDescription').textContent = book.description || 'Нет описания';
    
    // Display cover image if exists
    const coverImage = document.getElementById('bookCover');
    if (coverImage) {
        coverImage.src = book.coverImage || '/images/default-cover.jpg';
        coverImage.alt = book.title;
    }
    
    // Display audio player if exists
    const audioPlayer = document.getElementById('bookAudio');
    if (audioPlayer && book.audioFile) {
        audioPlayer.src = book.audioFile;
        audioPlayer.style.display = 'block';
    }
}

// Upload cover image
async function uploadCoverImage(file) {
    if (!isAdmin()) {
        alert('У вас нет прав для загрузки обложки');
        return;
    }

    const formData = new FormData();
    formData.append('coverImage', file);

    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}/cover`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload cover image');
        }

        alert('Обложка успешно загружена');
        loadBookDetails();
    } catch (error) {
        console.error('Error uploading cover:', error);
        alert('Ошибка при загрузке обложки');
    }
}

// Upload audio file
async function uploadAudioFile(file) {
    if (!isAdmin()) {
        alert('У вас нет прав для загрузки аудио');
        return;
    }

    const formData = new FormData();
    formData.append('audioFile', file);

    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}/audio`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload audio file');
        }

        alert('Аудио файл успешно загружен');
        loadBookDetails();
    } catch (error) {
        console.error('Error uploading audio:', error);
        alert('Ошибка при загрузке аудио файла');
    }
}

// Update book description
async function updateDescription(description) {
    if (!isAdmin()) {
        alert('У вас нет прав для обновления описания');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ description })
        });

        if (!response.ok) {
            throw new Error('Failed to update description');
        }

        alert('Описание успешно обновлено');
        loadBookDetails();
    } catch (error) {
        console.error('Error updating description:', error);
        alert('Ошибка при обновлении описания');
    }
}

// Add comment
async function addComment(comment) {
    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}/comments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ comment })
        });

        if (!response.ok) {
            throw new Error('Failed to add comment');
        }

        alert('Комментарий успешно добавлен');
        loadBookDetails();
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Ошибка при добавлении комментария');
    }
}

// Rate book
async function rateBook(rating) {
    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}/rate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ rating })
        });

        if (!response.ok) {
            throw new Error('Failed to rate book');
        }

        alert('Оценка успешно добавлена');
        loadBookDetails();
    } catch (error) {
        console.error('Error rating book:', error);
        alert('Ошибка при добавлении оценки');
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.startsWith('/book/')) {
        loadBookDetails();
    }
}); 