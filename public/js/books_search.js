let booksList = document.querySelector('.books-list');
let searchInput = document.getElementById('searchInput');
let bookCards = [];
let allBooks = [];

// Загрузка книг с сервера
async function loadBooks() {
    try {
        const response = await fetch('/api/books');
        allBooks = await response.json();
        renderBooks(allBooks);
    } catch (error) {
        booksList.innerHTML = '<div class="error-message">Ошибка при загрузке книг</div>';
    }
}

// Рендер книг
function renderBooks(books) {
    booksList.innerHTML = '';
    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.setAttribute('data-id', book.id);

        // Обложка
        if (book.image_path) {
            const img = document.createElement('img');
            img.src = `/uploads/${book.image_path}`;
            img.className = 'book-image';
            card.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'book-image-placeholder';
            placeholder.textContent = 'Нет изображения';
            card.appendChild(placeholder);
        }

        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = async function() {
            if (confirm('Вы уверены, что хотите удалить эту книгу?')) {
                try {
                    const resp = await fetch(`/api/books/${book.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (resp.ok) {
                        loadBooks();
                    } else {
                        alert('Ошибка при удалении книги');
                    }
                } catch (e) {
                    alert('Ошибка при удалении книги');
                }
            }
        };
        card.appendChild(deleteBtn);

        // Заголовок (переход на страницу книги)
        const titleElement = document.createElement('div');
        titleElement.className = 'book-title';
        titleElement.textContent = book.title;
        titleElement.onclick = function() {
            window.location.href = `/book/${book.id}`;
        };
        card.appendChild(titleElement);

        // Автор
        const authorElement = document.createElement('div');
        authorElement.className = 'book-author';
        authorElement.textContent = book.author;
        card.appendChild(authorElement);

        booksList.appendChild(card);
    });
    bookCards = document.querySelectorAll('.book-card');
}

// Поиск по книгам
function filterBooks() {
    const query = searchInput.value.toLowerCase();
    const filtered = allBooks.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );
    renderBooks(filtered);
}

searchInput.addEventListener('input', filterBooks);

// Добавление книги (пример, если есть форма)
async function addBook(title, author, imageFile, audioFile) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    if (imageFile) formData.append('coverImage', imageFile);
    if (audioFile) formData.append('audioFile', audioFile);
    try {
        const resp = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        if (resp.ok) {
            loadBooks();
        } else {
            alert('Ошибка при добавлении книги');
        }
    } catch (e) {
        alert('Ошибка при добавлении книги');
    }
}

// Загрузка книг при старте
document.addEventListener('DOMContentLoaded', loadBooks);

// Загрузка данных пользователя
function loadUserProfile() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        document.getElementById('userAvatar').src = currentUser.avatar || 'https://via.placeholder.com/40';
        document.getElementById('userName').textContent = `${currentUser.name} ${currentUser.surname}`;
        document.getElementById('profileAvatar').src = currentUser.avatar || 'https://via.placeholder.com/60';
        document.getElementById('profileName').textContent = `${currentUser.name} ${currentUser.surname}`;
        document.getElementById('profileEmail').textContent = currentUser.email;
    } else {
        window.location.href = '/login';
    }
}

document.getElementById('userProfile').addEventListener('click', function() {
    document.getElementById('profileDropdown').classList.toggle('active');
});

document.getElementById('editProfileBtn').addEventListener('click', function() {
    window.location.href = '/register?edit=true';
});

document.getElementById('changeAvatarBtn').addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                currentUser.avatar = e.target.result;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                document.getElementById('userAvatar').src = e.target.result;
                document.getElementById('profileAvatar').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
});

document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-profile') && !e.target.closest('.profile-dropdown')) {
        document.getElementById('profileDropdown').classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', loadUserProfile);

function openAvatarModal(imageSrc) {
    const modal = document.getElementById('avatarModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    modal.style.display = 'flex';
}

function closeAvatarModal() {
    const modal = document.getElementById('avatarModal');
    modal.style.display = 'none';
}

document.getElementById('modalClose').addEventListener('click', closeAvatarModal);
document.getElementById('avatarModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeAvatarModal();
    }
});

document.getElementById('userAvatar').addEventListener('click', function(e) {
    e.stopPropagation();
    openAvatarModal(this.src);
});

document.getElementById('profileAvatar').addEventListener('click', function(e) {
    e.stopPropagation();
    openAvatarModal(this.src);
});

// --- ДОБАВЛЯЕМ ОБРАБОТЧИКИ ДЛЯ КНОПКИ И INPUT'ОВ ---
document.addEventListener('DOMContentLoaded', function() {
    // Кнопка добавления книги
    document.getElementById('addBookBtn').addEventListener('click', function() {
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();
        const imageFile = document.getElementById('bookImage').files[0];
        const audioFile = document.getElementById('bookAudio').files[0];
        if (!title || !author) {
            alert('Пожалуйста, заполните все поля');
            return;
        }
        addBook(title, author, imageFile, audioFile);
        // Очищаем форму
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookImage').value = '';
        document.getElementById('bookAudio').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('audioPreview').innerHTML = '';
    });

    // Предпросмотр изображения
    document.getElementById('bookImage').addEventListener('change', function() {
        const preview = document.getElementById('imagePreview');
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(this.files[0]);
        } else {
            preview.style.display = 'none';
        }
    });

    // Предпросмотр аудио
    document.getElementById('bookAudio').addEventListener('change', function() {
        const preview = document.getElementById('audioPreview');
        if (this.files && this.files[0]) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = URL.createObjectURL(this.files[0]);
            preview.innerHTML = '';
            preview.appendChild(audio);
        } else {
            preview.innerHTML = '';
        }
    });
}); 