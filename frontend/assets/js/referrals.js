/**
 * Network Engineers Toolkit - Referrals Module
 * Handles colleague referral functionality
 */

// Refer Colleague Modal
function showReferColleagueModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Refer a Colleague</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="referralForm">
                    <div class="form-group">
                        <label for="refereeEmail">Colleague's Email *</label>
                        <input type="email" id="refereeEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="refereeName">Colleague's Name</label>
                        <input type="text" id="refereeName">
                    </div>
                    <div class="form-group">
                        <label for="referralMessage">Personal Message (Optional)</label>
                        <textarea id="referralMessage" rows="3" 
                                  placeholder="Add a personal note to your invitation..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Send Invitation</button>
                </form>
                <div id="referralResult" class="result-container" style="display: none;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };

    // Form submission
    const form = modal.querySelector('#referralForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        await sendReferral(modal);
    };
}

async function sendReferral(modal) {
    const form = modal.querySelector('#referralForm');
    const resultDiv = modal.querySelector('#referralResult');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const formData = {
        referee_email: form.querySelector('#refereeEmail').value,
        referee_name: form.querySelector('#refereeName').value,
        message: form.querySelector('#referralMessage').value
    };

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const response = await fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REFERRALS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(CONFIG.TOKEN_KEY)}`
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            resultDiv.innerHTML = `
                <div class="success">
                    <h4>✅ Invitation Sent Successfully!</h4>
                    <p>Your colleague will receive an email invitation with a registration link.</p>
                    <p><strong>Referral Code:</strong> <code>${result.referral.referral_code}</code></p>
                    <p><small>This code expires in 30 days.</small></p>
                </div>
            `;
            form.style.display = 'none';
        } else {
            resultDiv.innerHTML = `
                <div class="error">
                    <h4>❌ Error</h4>
                    <p>${result.error}</p>
                </div>
            `;
        }
        
        resultDiv.style.display = 'block';

    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error">
                <h4>❌ Error</h4>
                <p>Failed to send invitation. Please check your connection and try again.</p>
            </div>
        `;
        resultDiv.style.display = 'block';
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Invitation';
    }
}

// My Referrals functionality
async function showMyReferrals() {
    try {
        const response = await fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.REFERRALS, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(CONFIG.TOKEN_KEY)}`
            }
        });

        const result = await response.json();
        
        if (response.ok) {
            displayReferrals(result.referrals);
        } else {
            showNotification('Failed to load referrals', 'error');
        }

    } catch (error) {
        showNotification('Failed to load referrals', 'error');
    }
}

function displayReferrals(referrals) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>My Referrals</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="referrals-stats">
                    <div class="stat-card">
                        <h4>${referrals.length}</h4>
                        <p>Total Referrals</p>
                    </div>
                    <div class="stat-card">
                        <h4>${referrals.filter(r => r.status === 'registered').length}</h4>
                        <p>Registered</p>
                    </div>
                    <div class="stat-card">
                        <h4>${referrals.filter(r => r.status === 'pending').length}</h4>
                        <p>Pending</p>
                    </div>
                </div>
                <div class="referrals-list">
                    ${referrals.length === 0 ? 
                        '<div class="empty-state"><p>You haven\'t made any referrals yet.</p><button onclick="showReferColleagueModal()" class="btn btn-primary">Refer Your First Colleague</button></div>' :
                        referrals.map(referral => `
                            <div class="referral-item">
                                <div class="referral-info">
                                    <strong>${referral.referee_name || referral.referee_email}</strong>
                                    <span class="status status-${referral.status}">${referral.status}</span>
                                </div>
                                <div class="referral-details">
                                    <p><strong>Email:</strong> ${referral.referee_email}</p>
                                    <p><strong>Code:</strong> <code>${referral.referral_code}</code></p>
                                    <p><strong>Sent:</strong> ${new Date(referral.created_at).toLocaleDateString()}</p>
                                    ${referral.registered_at ? 
                                        `<p><strong>Registered:</strong> ${new Date(referral.registered_at).toLocaleDateString()}</p>` : 
                                        `<p><strong>Expires:</strong> ${new Date(referral.expires_at).toLocaleDateString()}</p>`
                                    }
                                    ${referral.message ? `<p><strong>Message:</strong> "${referral.message}"</p>` : ''}
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// Validate referral code on registration page
async function validateReferralCode(code) {
    if (!code) return null;

    try {
        const response = await fetch(CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.VALIDATE_REFERRAL(code));
        const result = await response.json();
        
        if (response.ok && result.valid) {
            return result.referral;
        }
        return null;
    } catch (error) {
        console.error('Error validating referral code:', error);
        return null;
    }
}

// Show referral info on registration page
function showReferralInfo(referral) {
    const referralInfo = document.createElement('div');
    referralInfo.className = 'referral-info-banner';
    referralInfo.innerHTML = `
        <div class="referral-banner">
            <h4>🎉 You've been invited by ${referral.referrer_name}!</h4>
            <p>Complete your registration to join the Network Engineers Toolkit.</p>
        </div>
    `;
    
    const form = document.querySelector('.registration-form');
    if (form) {
        form.insertBefore(referralInfo, form.firstChild);
    }
}

// Initialize referral functionality on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for referral code in URL on registration page
    if (window.location.pathname.includes('register')) {
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get('ref');
        
        if (referralCode) {
            validateReferralCode(referralCode).then(referral => {
                if (referral) {
                    showReferralInfo(referral);
                    // Store referral code for registration
                    sessionStorage.setItem('referral_code', referralCode);
                }
            });
        }
    }
});
