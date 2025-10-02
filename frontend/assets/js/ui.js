/**
 * Network Engineers Toolkit - UI Module
 */

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, CONFIG.NOTIFICATION_DURATION);
}

/**
 * Show/hide modal
 */
function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (show) {
        modal.classList.add('show');
    } else {
        modal.classList.remove('show');
    }
}

/**
 * Setup modal close handlers
 */
function setupModalHandlers() {
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Close modal when clicking close button
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('show');
        });
    });
}

/**
 * Setup navigation
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = item.getAttribute('data-page');

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show target page
            pages.forEach(page => page.classList.remove('active'));
            const pageElement = document.getElementById(`${targetPage}-page`);
            if (pageElement) {
                pageElement.classList.add('active');

                // Load page data if needed
                if (targetPage === 'account') {
                    loadAccountPage();
                }
            }
        });
    });
}

/**
 * Update user interface with current user info
 */
function updateUserInterface() {
    const user = authManager.getCurrentUser();
    if (!user) return;

    // Update user name in nav
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = `${user.firstName} ${user.lastName}`;
    }

    // Show/hide admin sections
    const adminSections = document.querySelectorAll('[data-role="admin"]');
    adminSections.forEach(section => {
        section.style.display = user.role === 'admin' ? 'block' : 'none';
    });
}

/**
 * Load account page data
 */
async function loadAccountPage() {
    try {
        // Load account info
        const accountData = await api.getAccountInfo();
        
        document.getElementById('account-name').textContent = accountData.name;
        document.getElementById('account-status-detail').textContent = accountData.status;
        document.getElementById('users-info').textContent = 
            `${accountData.currentUsers} / ${accountData.maxUsers}`;
        
        // Update dashboard stat
        const userCountElement = document.getElementById('user-count');
        if (userCountElement) {
            userCountElement.textContent = accountData.currentUsers;
        }

        // Load current user profile
        const user = authManager.getCurrentUser();
        document.getElementById('profile-email').value = user.email;
        document.getElementById('profile-first-name').value = user.firstName;
        document.getElementById('profile-last-name').value = user.lastName;

        // Load users list if admin
        if (authManager.isAdmin()) {
            await loadUsersList();
        } else {
            const usersSection = document.getElementById('users-section');
            if (usersSection) {
                usersSection.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Failed to load account data:', error);
        showNotification('Failed to load account information', 'error');
    }
}

/**
 * Load users list (admin only)
 */
async function loadUsersList() {
    try {
        const data = await api.listUsers();
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        usersList.innerHTML = '';

        if (data.users.length === 0) {
            usersList.innerHTML = '<p>No users found</p>';
            return;
        }

        data.users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-info">
                    <h4>
                        ${user.firstName} ${user.lastName}
                        <span class="user-badge ${user.role}">${user.role}</span>
                    </h4>
                    <p>${user.email}</p>
                    <p style="font-size: 0.85rem; opacity: 0.7;">
                        Last login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </p>
                </div>
                <div class="user-actions">
                    ${user.id !== authManager.getCurrentUser().id ? `
                        <button class="btn btn-sm btn-secondary" onclick="editUser('${user.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Delete</button>
                    ` : ''}
                </div>
            `;
            usersList.appendChild(userItem);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Failed to load users', 'error');
    }
}

/**
 * Edit user (placeholder for future implementation)
 */
function editUser(userId) {
    showNotification('Edit user functionality coming soon', 'info');
}

/**
 * Delete user
 */
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        await api.deleteUser(userId);
        showNotification('User deleted successfully', 'success');
        await loadUsersList();
    } catch (error) {
        console.error('Failed to delete user:', error);
        showNotification(error.message || 'Failed to delete user', 'error');
    }
}

/**
 * Setup profile form
 */
function setupProfileForm() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('profile-first-name').value;
        const lastName = document.getElementById('profile-last-name').value;

        try {
            const data = await api.updateProfile(firstName, lastName);
            authManager.updateCurrentUser(data.user);
            updateUserInterface();
            showNotification('Profile updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update profile:', error);
            showNotification(error.message || 'Failed to update profile', 'error');
        }
    });
}

/**
 * Setup password change form
 */
function setupPasswordForm() {
    const passwordForm = document.getElementById('password-form');
    if (!passwordForm) return;

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;

        try {
            await api.changePassword(currentPassword, newPassword);
            showNotification('Password changed successfully', 'success');
            passwordForm.reset();
        } catch (error) {
            console.error('Failed to change password:', error);
            showNotification(error.message || 'Failed to change password', 'error');
        }
    });
}

/**
 * Setup add user modal
 */
function setupAddUserModal() {
    const addUserBtn = document.getElementById('add-user-btn');
    if (!addUserBtn) return;

    addUserBtn.addEventListener('click', () => {
        toggleModal('add-user-modal', true);
    });

    const addUserForm = document.getElementById('add-user-form');
    if (!addUserForm) return;

    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('new-user-email').value;
        const firstName = document.getElementById('new-user-first-name').value;
        const lastName = document.getElementById('new-user-last-name').value;
        const password = document.getElementById('new-user-password').value;
        const role = document.getElementById('new-user-role').value;

        try {
            await api.createUser(email, password, firstName, lastName, role);
            showNotification('User created successfully', 'success');
            toggleModal('add-user-modal', false);
            addUserForm.reset();
            await loadUsersList();
        } catch (error) {
            console.error('Failed to create user:', error);
            showNotification(error.message || 'Failed to create user', 'error');
        }
    });
}

/**
 * Initialize UI components
 */
function initializeUI() {
    setupModalHandlers();
    setupNavigation();
    updateUserInterface();
    setupProfileForm();
    setupPasswordForm();
    setupAddUserModal();
}
