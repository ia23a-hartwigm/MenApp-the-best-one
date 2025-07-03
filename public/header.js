// header.js
document.addEventListener('DOMContentLoaded', function() {
    // Header-HTML-Template
    const headerHTML = `
    <nav class="navigation">
        <div class="logo">
            <a href="/index.html">MenApp</a>
        </div>
        <div class="user-info" id="userInfo" style="display: none; float: left; margin-left: 15px;">
            <span id="userName"></span>
        </div>
        <ul class="nav-links">
            <li><a href="/index.html">Speiseplan</a></li>
            <li><a href="/warenkorb.html">Warenkorb</a></li>
            <li><a href="/login/login.html">Login</a></li>
            <li id="adminLink" style="display: none;"><a href="/admin">Admin</a></li>
        </ul>
    </nav>`;

    // Header als erstes Element im Body einfügen
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Aktiven Menüpunkt markieren
    markActiveNavItem();

    // Login-Status prüfen
    checkLoginStatus();
});

// Markiert den aktiven Menüpunkt
function markActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links li a');

    navLinks.forEach(link => {
        // Aktiven Link finden und markieren
        if (currentPath === link.getAttribute('href') ||
            (currentPath.includes(link.getAttribute('href')) && link.getAttribute('href') !== '/index.html')) {
            link.parentElement.classList.add('active');
        }
    });
}


// Prüft den Login-Status
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        if (data.loggedIn && data.userId) {
            // Benutzerinfo anzeigen
            const userInfo = document.getElementById('userInfo');
            const userNameElement = document.getElementById('userName');

            userInfo.style.display = 'inline-block';

            // Benutzernamen abrufen
            try {
                const nameResponse = await fetch('/api/user/name', {
                    credentials: 'include'
                });
                if (nameResponse.ok) {
                    const nameData = await nameResponse.json();
                    if (nameData.success) {
                        userNameElement.textContent = nameData.name;
                    }
                }
            } catch (error) {
                console.error('Fehler beim Abrufen des Benutzernamens:', error);
            }

            // Admin-Status prüfen
            try {
                const adminResponse = await fetch('/api/user/isAdmin', {
                    credentials: 'include'
                });
                if (adminResponse.ok) {
                    const adminData = await adminResponse.json();
                    if (adminData.success && adminData.isAdmin) {
                        document.getElementById('adminLink').style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Fehler beim Prüfen der Admin-Rechte:', error);
            }
        }
    } catch (error) {
        console.error('Fehler beim Prüfen des Login-Status:', error);
    }
}
