// Book details management
const API_URL = '/api';

// Check if user has admin privileges
const isAdmin = () => {
    const userEmail = localStorage.getItem('userEmail');
    return userEmail === 'paviliy08@gmail.com';
};

// Load book details
async function loadBookDetails() {
    if (!await checkAuth()) {
        return;
    }

    const bookId = window.location.pathname.split('/').pop();
    
    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to load book details');
        }

        const book = await response.json();
        displayBookDetails(book);
        
        // Show/hide admin controls
        const adminControls = document.querySelectorAll('.admin-controls');
        adminControls.forEach(control => {
            control.style.display = isAdmin() ? 'block' : 'none';
        });

        // Load comments
        loadComments(bookId);
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

    if (!file) {
        alert('Пожалуйста, выберите файл');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
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
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
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

    if (!file) {
        alert('Пожалуйста, выберите файл');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
        alert('Пожалуйста, выберите аудио файл');
        return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
        alert('Размер файла не должен превышать 50MB');
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
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
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

    if (!description.trim()) {
        alert('Описание не может быть пустым');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ description })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to update description');
        }

        alert('Описание успешно обновлено');
        loadBookDetails();
    } catch (error) {
        console.error('Error updating description:', error);
        alert('Ошибка при обновлении описания');
    }
}

// Load comments
async function loadComments(bookId) {
    try {
        const response = await fetch(`${API_URL}/books/${bookId}/comments`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to load comments');
        }

        const comments = await response.json();
        displayComments(comments);
    } catch (error) {
        console.error('Error loading comments:', error);
        alert('Ошибка при загрузке комментариев');
    }
}

// Display comments
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    if (comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">Пока нет комментариев</p>';
        return;
    }

    commentsList.innerHTML = comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-date">${new Date(comment.date).toLocaleDateString()}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
        </div>
    `).join('');
}

// Add comment
async function addComment(comment) {
    if (!comment.trim()) {
        alert('Комментарий не может быть пустым');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}/comments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ comment })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to add comment');
        }

        document.getElementById('commentText').value = '';
        loadComments(window.location.pathname.split('/').pop());
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Ошибка при добавлении комментария');
    }
}

// Rate book
async function rateBook(rating) {
    if (rating < 1 || rating > 5) {
        alert('Оценка должна быть от 1 до 5');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books/${window.location.pathname.split('/').pop()}/rate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ rating })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
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