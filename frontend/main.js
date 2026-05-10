window.activeClubId = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard');
    const clubSelectionSection = document.getElementById('club-selection-section');
    const loginForm = document.getElementById('login-form');
    
    // Auth Logic
    function getToken() {
        return localStorage.getItem('icehorse_token') || sessionStorage.getItem('icehorse_token');
    }

    if (getToken()) {
        checkUserClubs();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('login-remember').checked;

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch('http://192.168.1.66:8082/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                if (remember) {
                    localStorage.setItem('icehorse_token', data.access_token);
                } else {
                    sessionStorage.setItem('icehorse_token', data.access_token);
                }
                document.getElementById('login-error').style.display = 'none';
                checkUserClubs();
            } else {
                document.getElementById('login-error').style.display = 'block';
            }
        } catch (err) {
            console.error(err);
            document.getElementById('login-error').style.display = 'block';
        }
    });

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const club_name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            try {
                const response = await fetch('http://192.168.1.66:8082/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, club_name })
                });

                if (response.ok) {
                    alert("Bruger og klub oprettet! Du kan nu logge ind.");
                    document.getElementById('register-section').style.display = 'none';
                    document.getElementById('login-section').style.display = 'block';
                    document.getElementById('login-email').value = email;
                    document.getElementById('login-password').value = password;
                } else {
                    document.getElementById('reg-error').style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                document.getElementById('reg-error').style.display = 'block';
            }
        });
    }

    // MULTI-KLUB LOGIK
    async function checkUserClubs() {
        const token = getToken();
        if(!token) return;

        try {
            const response = await fetch('http://192.168.1.66:8082/clubs/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(response.ok) {
                const clubs = await response.json();
                if(clubs.length === 0) {
                    // Måske vise "Opret din første klub" skærm
                    showClubSelectionSection([]);
                } else if(clubs.length === 1) {
                    selectClub(clubs[0].id);
                } else {
                    showClubSelectionSection(clubs);
                }
            } else {
                logout();
            }
        } catch(err) {
            console.error(err);
        }
    }

    function showClubSelectionSection(clubs) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'none';
        clubSelectionSection.style.display = 'block';

        const list = document.getElementById('club-selection-list');
        list.innerHTML = '';
        clubs.forEach(c => {
            list.innerHTML += `
                <div class="list-item" style="cursor: pointer; border-left: 4px solid var(--primary);" onclick="selectClub(${c.id})">
                    <div>
                        <strong>${c.name}</strong>
                    </div>
                    <i class="fas fa-arrow-right" style="color: var(--text-secondary);"></i>
                </div>
            `;
        });
    }

    window.selectClub = function(id) {
        window.activeClubId = id;
        showDashboard();
    };

    window.showClubSelection = function() {
        checkUserClubs();
    };

    document.getElementById('create-new-club-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-club-name').value;
        const token = getToken();
        try {
            const response = await fetch('http://192.168.1.66:8082/clubs/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name })
            });
            if(response.ok) {
                const newClub = await response.json();
                document.getElementById('create-new-club-modal').style.display = 'none';
                document.getElementById('create-new-club-form').reset();
                selectClub(newClub.id);
            }
        } catch(err) { console.error(err); }
    });

    window.logout = function() {
        localStorage.removeItem('icehorse_token');
        sessionStorage.removeItem('icehorse_token');
        window.activeClubId = null;
        clubSelectionSection.style.display = 'none';
        showLogin();
    };

    function showLogin() {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
    }

    function showDashboard() {
        loginSection.style.display = 'none';
        clubSelectionSection.style.display = 'none';
        dashboardSection.style.display = 'flex';
        fetchProfile();
        fetchGlobalDirectory();
        fetchCompetitions();
        fetchClubPosts();
    }

    // Tabs navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            e.currentTarget.classList.add('active');
            const tabId = e.currentTarget.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).style.display = 'block';
            
            if (tabId === 'directory-tab') fetchGlobalDirectory();
        });
    });

    // Profile Logic
    const profileForm = document.getElementById('profile-form');
    async function fetchProfile() {
        if(!window.activeClubId) return;
        const token = getToken();
        if (!token) return;
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                document.getElementById('prof-name').value = data.name || '';
                document.getElementById('prof-contact-name').value = data.contact_name || '';
                document.getElementById('prof-phone').value = data.phone || '';
                document.getElementById('prof-contact-email').value = data.contact_email || '';
                document.getElementById('prof-zip').value = data.zip_code || '';
                document.getElementById('prof-city').value = data.city || '';
                document.getElementById('prof-address').value = data.address || '';
            }
        } catch(err) { console.error(err); }
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!window.activeClubId) return;
            const token = getToken();
            const payload = {
                name: document.getElementById('prof-name').value,
                contact_name: document.getElementById('prof-contact-name').value,
                phone: document.getElementById('prof-phone').value,
                contact_email: document.getElementById('prof-contact-email').value,
                zip_code: document.getElementById('prof-zip').value,
                city: document.getElementById('prof-city').value,
                address: document.getElementById('prof-address').value
            };
            try {
                const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    const msg = document.getElementById('prof-msg');
                    msg.style.display = 'block';
                    setTimeout(() => msg.style.display = 'none', 3000);
                }
            } catch(err) { console.error(err); }
        });
    }

    // --- GLOBALT KARTOTEK LOGIK ---
    let globalDirectory = { riders: [], judges: [] };

    async function fetchGlobalDirectory() {
        if(!window.activeClubId) return;
        const token = getToken();
        if (!token) return;
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/directory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                globalDirectory = await response.json();
                renderGlobalDirectory();
                updateCompetitionSelects();
            }
        } catch(err) { console.error(err); }
    }

    function renderGlobalDirectory() {
        const ridersList = document.getElementById('dir-riders-list');
        const judgesList = document.getElementById('dir-judges-list');
        if(!ridersList || !judgesList) return;

        ridersList.innerHTML = '';
        if (globalDirectory.riders.length === 0) {
            ridersList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Ingen ryttere oprettet endnu.</p>';
        } else {
            globalDirectory.riders.forEach(rider => {
                const badges = rider.competitions.map(c => `<span class="badge">${c.name}</span>`).join('');
                const horses = rider.horses.map(h => `<span style="font-size: 0.8rem; color: #cbd5e1; margin-right: 0.5rem;"><i class="fas fa-horse-head"></i> ${h.name}</span>`).join('');
                
                ridersList.innerHTML += `
                    <div class="list-item" style="border-left: 4px solid var(--primary); cursor: pointer;" onclick="openDirRiderModal(${rider.id})">
                        <div>
                            <strong>${rider.name}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;"><i class="fas fa-envelope"></i> ${rider.email} ${rider.phone ? `| <i class="fas fa-phone"></i> ${rider.phone}` : ''}</div>
                            <div style="margin-top: 0.5rem;">${horses}</div>
                            <div style="margin-top: 0.5rem;">${badges}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--text-secondary);"></i>
                    </div>
                `;
            });
        }

        judgesList.innerHTML = '';
        if (globalDirectory.judges.length === 0) {
            judgesList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Ingen dommere oprettet endnu.</p>';
        } else {
            globalDirectory.judges.forEach(judge => {
                const badges = judge.competitions.map(c => `<span class="badge">${c.name}</span>`).join('');
                const emailStr = judge.email || 'Ingen email';
                
                judgesList.innerHTML += `
                    <div class="list-item" style="border-left: 4px solid #10b981; cursor: pointer;" onclick="openDirJudgeModal(${judge.id})">
                        <div>
                            <strong>${judge.name}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;"><i class="fas fa-envelope"></i> ${emailStr} ${judge.phone ? `| <i class="fas fa-phone"></i> ${judge.phone}` : ''}</div>
                            <div style="margin-top: 0.5rem;">${badges}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--text-secondary);"></i>
                    </div>
                `;
            });
        }
    }

    // Modal Håndtering: Rytter
    window.openDirRiderModal = function(riderId = null) {
        const form = document.getElementById('dir-rider-form');
        form.reset();
        document.getElementById('dir-rider-horses-section').style.display = 'none';
        document.getElementById('dir-rider-id').value = '';

        if (riderId) {
            const rider = globalDirectory.riders.find(r => r.id === riderId);
            if (rider) {
                document.getElementById('dir-rider-title').innerText = 'Ret Rytter';
                document.getElementById('dir-rider-id').value = rider.id;
                document.getElementById('dir-rider-name').value = rider.name;
                document.getElementById('dir-rider-email').value = rider.email;
                document.getElementById('dir-rider-phone').value = rider.phone || '';
                
                renderRiderHorses(rider);
                document.getElementById('dir-rider-horses-section').style.display = 'block';
            }
        } else {
            document.getElementById('dir-rider-title').innerText = 'Opret Ny Rytter';
        }
        document.getElementById('dir-rider-modal').style.display = 'flex';
    };

    document.getElementById('dir-rider-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.activeClubId) return;
        const id = document.getElementById('dir-rider-id').value;
        const payload = {
            name: document.getElementById('dir-rider-name').value,
            email: document.getElementById('dir-rider-email').value,
            phone: document.getElementById('dir-rider-phone').value || null
        };

        const token = getToken();
        const url = id ? `http://192.168.1.66:8082/clubs/${window.activeClubId}/club_riders/${id}` : `http://192.168.1.66:8082/clubs/${window.activeClubId}/club_riders`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const savedRider = await response.json();
                document.getElementById('dir-rider-id').value = savedRider.id;
                document.getElementById('dir-rider-title').innerText = 'Ret Rytter';
                document.getElementById('dir-rider-horses-section').style.display = 'block';
                await fetchGlobalDirectory();
                const updatedRider = globalDirectory.riders.find(r => r.id === savedRider.id);
                if(updatedRider) renderRiderHorses(updatedRider);
                if (!id) alert("Rytter oprettet! Du kan nu tilføje heste.");
            }
        } catch(err) { console.error(err); }
    });

    // Heste Håndtering
    function renderRiderHorses(rider) {
        const list = document.getElementById('dir-rider-horses-list');
        list.innerHTML = '';
        if (rider.horses.length === 0) {
            list.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-secondary);">Ingen heste tilføjet endnu.</p>';
            return;
        }
        rider.horses.forEach(horse => {
            list.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 4px;">
                    <span><i class="fas fa-horse-head" style="color: var(--text-secondary);"></i> ${horse.name}</span>
                    <button class="btn btn-danger btn-sm" onclick="deleteHorse(${horse.id}, ${rider.id})" style="padding: 0.2rem 0.5rem;"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
    }

    document.getElementById('dir-add-horse-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.activeClubId) return;
        const riderId = document.getElementById('dir-rider-id').value;
        const horseName = document.getElementById('dir-new-horse-name').value;
        if (!riderId) return;

        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/club_riders/${riderId}/horses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: horseName })
            });
            if (response.ok) {
                document.getElementById('dir-new-horse-name').value = '';
                await fetchGlobalDirectory();
                const rider = globalDirectory.riders.find(r => r.id == riderId);
                renderRiderHorses(rider);
            }
        } catch(err) { console.error(err); }
    });

    window.deleteHorse = async function(horseId, riderId) {
        if(!window.activeClubId) return;
        if(!confirm("Vil du slette denne hest?")) return;
        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/horses/${horseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                await fetchGlobalDirectory();
                const rider = globalDirectory.riders.find(r => r.id == riderId);
                renderRiderHorses(rider);
            }
        } catch(err) { console.error(err); }
    };

    // Modal Håndtering: Dommer
    window.openDirJudgeModal = function(judgeId = null) {
        const form = document.getElementById('dir-judge-form');
        form.reset();
        document.getElementById('dir-judge-id').value = '';

        if (judgeId) {
            const judge = globalDirectory.judges.find(j => j.id === judgeId);
            if (judge) {
                document.getElementById('dir-judge-title').innerText = 'Ret Dommer';
                document.getElementById('dir-judge-id').value = judge.id;
                document.getElementById('dir-judge-name').value = judge.name;
                document.getElementById('dir-judge-email').value = judge.email || '';
                document.getElementById('dir-judge-phone').value = judge.phone || '';
            }
        } else {
            document.getElementById('dir-judge-title').innerText = 'Opret Ny Dommer';
        }
        document.getElementById('dir-judge-modal').style.display = 'flex';
    };

    document.getElementById('dir-judge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.activeClubId) return;
        const id = document.getElementById('dir-judge-id').value;
        const payload = {
            name: document.getElementById('dir-judge-name').value,
            email: document.getElementById('dir-judge-email').value || null,
            phone: document.getElementById('dir-judge-phone').value || null
        };

        const token = getToken();
        const url = id ? `http://192.168.1.66:8082/clubs/${window.activeClubId}/club_judges/${id}` : `http://192.168.1.66:8082/clubs/${window.activeClubId}/club_judges`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                document.getElementById('dir-judge-modal').style.display = 'none';
                await fetchGlobalDirectory();
            }
        } catch(err) { console.error(err); }
    });

    // --- STÆVNER LOGIK ---
    let currentCompId = null;

    async function fetchCompetitions() {
        if(!window.activeClubId) return;
        const token = getToken();
        if(!token) return;
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const comps = await response.json();
                const list = document.getElementById('competitions-list');
                list.innerHTML = '';
                comps.forEach(c => {
                    const dateStr = new Date(c.date).toLocaleDateString('da-DK');
                    const timeStr = c.start_time ? ` | <i class="far fa-clock"></i> ${c.start_time} - ${c.end_time || '?'}` : '';
                    list.innerHTML += `
                        <div class="list-item" style="cursor: pointer;" onclick="openCompetition(${c.id}, '${c.name}')">
                            <div>
                                <strong>${c.name}</strong>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);"><i class="far fa-calendar"></i> ${dateStr}${timeStr} | <i class="fas fa-map-marker-alt"></i> ${c.location}</div>
                            </div>
                            <button class="btn btn-secondary btn-sm">Vis</button>
                        </div>
                    `;
                });
            }
        } catch(err) { console.error(err); }
    }

    document.getElementById('new-comp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.activeClubId) return;
        const token = getToken();
        const payload = {
            name: document.getElementById('comp-name').value,
            date: new Date(document.getElementById('comp-date').value).toISOString(),
            start_time: document.getElementById('comp-start-time')?.value || null,
            end_time: document.getElementById('comp-end-time')?.value || null,
            location: document.getElementById('comp-location').value
        };
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                document.getElementById('new-comp-form').reset();
                document.getElementById('new-comp-form').style.display = 'none';
                fetchCompetitions();
            }
        } catch(err) { console.error(err); }
    });

    // STÆVNE DETALJER
    window.openCompetition = function(id, name) {
        currentCompId = id;
        document.getElementById('competitions-list').style.display = 'none';
        document.getElementById('new-comp-form').style.display = 'none';
        document.getElementById('competition-details').style.display = 'block';
        document.getElementById('detail-comp-name').innerText = name;
        
        document.getElementById('competition-details').scrollIntoView({ behavior: 'smooth' });
        
        showCompTab('riders');
        updateCompetitionSelects();
    };

    window.deleteCompetition = async function() {
        if(!currentCompId || !window.activeClubId) return;
        if(!confirm('Er du sikker på, at du vil slette dette stævne? Alt data (ryttere, dommere, scores) forbundet med stævnet vil gå tabt!')) return;
        
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions/${currentCompId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if(response.ok) {
                document.getElementById('competition-details').style.display = 'none';
                document.getElementById('competitions-list').style.display = 'flex';
                fetchCompetitions();
            } else {
                alert('Kunne ikke slette stævnet. Prøv igen.');
            }
        } catch(err) {
            console.error(err);
            alert('Der opstod en fejl.');
        }
    };

    window.showCompTab = function(tab) {
        document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('comp-riders-section').style.display = 'none';
        document.getElementById('comp-judges-section').style.display = 'none';

        if(tab === 'riders') {
            document.querySelectorAll('.detail-tab-btn')[0].classList.add('active');
            document.getElementById('comp-riders-section').style.display = 'block';
            fetchCompRiders();
        } else {
            document.querySelectorAll('.detail-tab-btn')[1].classList.add('active');
            document.getElementById('comp-judges-section').style.display = 'block';
            fetchCompJudges();
        }
    };

    function updateCompetitionSelects() {
        const riderSelect = document.getElementById('comp-rider-select');
        const judgeSelect = document.getElementById('comp-judge-select');
        if(!riderSelect || !judgeSelect) return;

        riderSelect.innerHTML = '<option value="">-- Vælg rytter --</option>';
        globalDirectory.riders.forEach(r => {
            riderSelect.innerHTML += `<option value="${r.id}">${r.name} (${r.email})</option>`;
        });

        judgeSelect.innerHTML = '<option value="">-- Vælg dommer --</option>';
        globalDirectory.judges.forEach(j => {
            judgeSelect.innerHTML += `<option value="${j.id}">${j.name}</option>`;
        });
    }

    window.updateHorseSelect = function() {
        const riderId = document.getElementById('comp-rider-select').value;
        const horseSelect = document.getElementById('comp-horse-select');
        horseSelect.innerHTML = '<option value="">-- Vælg hest --</option>';
        if(!riderId) return;

        const rider = globalDirectory.riders.find(r => r.id == riderId);
        if(rider && rider.horses) {
            rider.horses.forEach(h => {
                horseSelect.innerHTML += `<option value="${h.id}">${h.name}</option>`;
            });
        }
    };

    // Tilknyt Rytter
    document.getElementById('add-comp-rider-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.activeClubId || !currentCompId) return;

        const riderId = document.getElementById('comp-rider-select').value;
        const horseId = document.getElementById('comp-horse-select').value;
        const startNumber = document.getElementById('comp-start-number').value;

        if(!riderId || !horseId) {
            alert("Du skal vælge både rytter og hest.");
            return;
        }

        const payload = {
            club_rider_id: parseInt(riderId),
            horse_id: parseInt(horseId),
            start_number: startNumber ? parseInt(startNumber) : null
        };

        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions/${currentCompId}/riders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if(response.ok) {
                document.getElementById('add-comp-rider-form').reset();
                updateHorseSelect(); 
                fetchCompRiders();
                fetchGlobalDirectory();
            }
        } catch(err) { console.error(err); }
    });

    async function fetchCompRiders() {
        if(!window.activeClubId || !currentCompId) return;
        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions/${currentCompId}/riders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(response.ok) {
                const riders = await response.json();
                const list = document.getElementById('comp-riders-list');
                list.innerHTML = '';
                riders.forEach(r => {
                    list.innerHTML += `
                        <div class="list-item" style="border-left: 4px solid var(--primary);">
                            <div>
                                <strong>${r.club_rider.name}</strong> 
                                ${r.start_number ? `<span class="badge" style="background: var(--primary);">#${r.start_number}</span>` : ''}
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;"><i class="fas fa-horse-head"></i> ${r.horse.name}</div>
                            </div>
                            <button class="btn btn-danger btn-sm" onclick="deleteCompRider(${r.id})"><i class="fas fa-unlink"></i> Fjern</button>
                        </div>
                    `;
                });
            }
        } catch(err) { console.error(err); }
    }

    window.deleteCompRider = async function(compRiderId) {
        if(!window.activeClubId || !currentCompId) return;
        if(!confirm("Fjern rytter fra stævnet?")) return;
        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions/${currentCompId}/riders/${compRiderId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(response.ok) {
                fetchCompRiders();
                fetchGlobalDirectory();
            }
        } catch(err) { console.error(err); }
    };

    // Tilknyt Dommer
    document.getElementById('add-comp-judge-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.activeClubId || !currentCompId) return;

        const judgeId = document.getElementById('comp-judge-select').value;
        const role = document.getElementById('comp-judge-role').value;
        const postIds = Array.from(document.querySelectorAll('.post-checkbox:checked')).map(cb => parseInt(cb.value));

        if(!judgeId) return;

        const payload = {
            club_judge_id: parseInt(judgeId),
            role: role,
            post_ids: postIds
        };

        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions/${currentCompId}/judges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if(response.ok) {
                document.getElementById('add-comp-judge-form').reset();
                fetchCompJudges();
                fetchGlobalDirectory();
            }
        } catch(err) { console.error(err); }
    });

    async function fetchCompJudges() {
        if(!window.activeClubId || !currentCompId) return;
        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions/${currentCompId}/judges`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(response.ok) {
                const judges = await response.json();
                const list = document.getElementById('comp-judges-list');
                list.innerHTML = '';
                judges.forEach(j => {
                    const postBadges = j.club_posts && j.club_posts.length > 0 
                        ? j.club_posts.map(p => `<span class="badge" style="background: var(--primary); margin-right: 0.3rem;">${p.name}</span>`).join('')
                        : '<span style="font-size: 0.8rem; color: var(--text-secondary);">Ingen poster tilknyttet</span>';
                        
                    list.innerHTML += `
                        <div class="list-item" style="border-left: 4px solid #10b981;">
                            <div>
                                <strong>${j.club_judge.name}</strong>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;">Rolle: ${j.role}</div>
                                <div style="margin-top: 0.5rem;">${postBadges}</div>
                            </div>
                            <button class="btn btn-danger btn-sm" onclick="deleteCompJudge(${j.id})"><i class="fas fa-unlink"></i> Fjern</button>
                        </div>
                    `;
                });
            }
        } catch(err) { console.error(err); }
    }

    window.deleteCompJudge = async function(compJudgeId) {
        if(!window.activeClubId || !currentCompId) return;
        if(!confirm("Fjern dommer fra stævnet?")) return;
        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/competitions/${currentCompId}/judges/${compJudgeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(response.ok) {
                fetchCompJudges();
                fetchGlobalDirectory();
            }
        } catch(err) { console.error(err); }
    };

    // --- KLUB POSTER ---
    let clubPosts = [];

    window.fetchClubPosts = async function() {
        if(!window.activeClubId) return;
        const token = getToken();
        if(!token) return;
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/club_posts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(response.ok) {
                clubPosts = await response.json();
                renderClubPosts();
                updateCompetitionJudgePostsCheckboxes();
            }
        } catch(err) { console.error(err); }
    };

    function renderClubPosts() {
        const list = document.getElementById('club-posts-list');
        if(!list) return;
        list.innerHTML = '';
        clubPosts.forEach(p => {
            const locStr = p.location ? ` | <i class="fas fa-map-marker-alt"></i> ${p.location}` : '';
            const descStr = p.description ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;">${p.description}</div>` : '';
            list.innerHTML += `
                <div class="list-item" style="border-left: 4px solid var(--primary);">
                    <div>
                        <strong>${p.name}</strong><span style="font-size: 0.8rem; color: var(--text-secondary);">${locStr}</span>
                        ${descStr}
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="deleteClubPost(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
    }

    document.getElementById('club-post-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.activeClubId) return;
        const token = getToken();
        const payload = {
            name: document.getElementById('club-post-name').value,
            location: document.getElementById('club-post-location').value || null,
            description: document.getElementById('club-post-description').value || null
        };
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/club_posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if(response.ok) {
                document.getElementById('club-post-form').reset();
                fetchClubPosts();
            }
        } catch(err) { console.error(err); }
    });

    window.deleteClubPost = async function(postId) {
        if(!window.activeClubId) return;
        if(!confirm("Slet post/klasse?")) return;
        const token = getToken();
        try {
            const response = await fetch(`http://192.168.1.66:8082/clubs/${window.activeClubId}/club_posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(response.ok) {
                fetchClubPosts();
            }
        } catch(err) { console.error(err); }
    };

    function updateCompetitionJudgePostsCheckboxes() {
        const container = document.getElementById('comp-judge-posts-checkboxes');
        if(!container) return;
        container.innerHTML = '';
        if(clubPosts.length === 0) {
            container.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-secondary);">Ingen poster oprettet i klubben endnu.</span>';
        } else {
            clubPosts.forEach(p => {
                container.innerHTML += `
                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer;">
                        <input type="checkbox" class="post-checkbox" value="${p.id}" style="width: auto; margin: 0;">
                        <span>${p.name}</span>
                    </label>
                `;
            });
        }
    }
});
