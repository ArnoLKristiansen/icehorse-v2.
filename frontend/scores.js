// scores.js - Håndterer Magic Link Dommer-visning og Public Leaderboard

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
let magicUuid = null;
let magicJudge = null;
let activePostId = null;
let allCompetitionRiders = [];

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const magicParam = urlParams.get('magic');
    const leaderboardParam = urlParams.get('leaderboard');

    if (magicParam) {
        initMagicJudge(magicParam);
    } else if (leaderboardParam) {
        initPublicLeaderboard(leaderboardParam);
    }
});

// --- MAGIC LINK / DOMMER PANEL ---
async function initMagicJudge(uuid) {
    magicUuid = uuid;
    document.querySelectorAll('main').forEach(m => m.style.display = 'none'); // Skjul alt andet
    document.getElementById('magic-judge-section').style.display = 'block';
    
    try {
        const res = await fetch(`${API_BASE}/magic/${uuid}`);
        if (!res.ok) {
            alert('Ugyldigt eller udløbet dommer-link!');
            return;
        }
        magicJudge = await res.json();
        
        // Sæt UI
        document.getElementById('mj-title').innerText = `Dommer: ${magicJudge.club_judge.name}`;
        
        // Fyld poster dropdown
        const select = document.getElementById('mj-post-select');
        select.innerHTML = '<option value="">-- Vælg post --</option>';
        magicJudge.club_posts.forEach(post => {
            select.innerHTML += `<option value="${post.id}">${post.name}</option>`;
        });
        
        // Hent alle ryttere i stævnet på forhånd til søgning
        fetchCompetitionRidersForJudge(magicJudge.competition_id);
        
    } catch(err) {
        console.error(err);
        alert('Der opstod en fejl ved indlæsning af dit link.');
    }
}

async function fetchCompetitionRidersForJudge(compId) {
    try {
        const res = await fetch(`${API_BASE}/public/competitions/${compId}/leaderboard`); // Vi genbruger leaderboard endpointet for at få rytter-listen nemt, eller vi bygger et dedikeret.
        // Wait, leaderboard kræver normalt ikke login, så vi kan kalde det.
        if (res.ok) {
            const data = await res.json();
            allCompetitionRiders = data.leaderboard; // Har rider_id, start_number, rider_name, horse_name
        }
    } catch(err) { console.error(err); }
}

window.startJudging = function() {
    const postSelect = document.getElementById('mj-post-select');
    if (!postSelect.value) return alert('Du skal vælge en post for at starte!');
    
    activePostId = parseInt(postSelect.value);
    const postName = postSelect.options[postSelect.selectedIndex].text;
    
    document.getElementById('mj-post-selection').style.display = 'none';
    document.getElementById('mj-judging-area').style.display = 'block';
    document.getElementById('mj-active-post-name').innerText = `Bedømmer: ${postName}`;
};

window.changePost = function() {
    activePostId = null;
    document.getElementById('mj-judging-area').style.display = 'none';
    document.getElementById('mj-post-selection').style.display = 'block';
    document.getElementById('mj-score-form').style.display = 'none';
};

window.searchRider = function() {
    const query = document.getElementById('mj-rider-search').value.toLowerCase();
    const resultsContainer = document.getElementById('mj-rider-search-results');
    resultsContainer.innerHTML = '';
    
    if (query.length < 1) return;
    
    const results = allCompetitionRiders.filter(r => 
        (r.start_number && r.start_number.toString().includes(query)) ||
        r.rider_name.toLowerCase().includes(query) ||
        r.horse_name.toLowerCase().includes(query)
    );
    
    results.forEach(r => {
        const startNo = r.start_number ? `<span class="badge" style="background: var(--primary);">#${r.start_number}</span>` : '';
        resultsContainer.innerHTML += `
            <div class="list-item" style="cursor: pointer; border-left: 4px solid #10b981; margin-bottom: 0;" onclick="selectRiderToScore(${r.rider_id}, '${r.rider_name}', '${r.horse_name}', ${r.start_number})">
                <div>
                    <strong>${r.rider_name}</strong> ${startNo}
                    <div style="font-size: 0.8rem; color: var(--text-secondary);"><i class="fas fa-horse-head"></i> ${r.horse_name}</div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--text-secondary);"></i>
            </div>
        `;
    });
};

window.selectRiderToScore = function(riderId, riderName, horseName, startNo) {
    document.getElementById('mj-rider-search-results').innerHTML = '';
    document.getElementById('mj-rider-search').value = '';
    
    // Tjek om dommeren allerede har givet point til denne rytter på denne post
    const riderData = allCompetitionRiders.find(r => r.rider_id === riderId);
    let existingScore = null;
    if (riderData && riderData.details) {
        existingScore = riderData.details.find(d => d.post_id === activePostId && d.judge_id === magicJudge.id);
    }

    if (existingScore) {
        const confirmMsg = `Du har allerede bedømt denne ekvipage på denne post.\n\nTidligere point: ${existingScore.points}\nKommentar: ${existingScore.comment || 'Ingen kommentar'}\n\nVil du åbne for at overskrive resultatet?`;
        if (!confirm(confirmMsg)) {
            return; // Afbryd hvis dommeren ikke vil overskrive
        }
        document.getElementById('mj-score-id').value = existingScore.score_id;
        document.getElementById('mj-points').value = existingScore.points;
        document.getElementById('mj-comment').value = existingScore.comment || '';
    } else {
        document.getElementById('mj-score-id').value = ''; 
        document.getElementById('mj-points').value = '';
        document.getElementById('mj-comment').value = '';
    }
    
    document.getElementById('mj-score-form').style.display = 'block';
    document.getElementById('mj-rider-id').value = riderId;
    
    const num = startNo ? `#${startNo} - ` : '';
    document.getElementById('mj-selected-rider-name').innerText = `${num}${riderName} på ${horseName}`;
};

window.cancelScore = function() {
    document.getElementById('mj-score-form').style.display = 'none';
    document.getElementById('mj-rider-id').value = '';
};

document.getElementById('mj-score-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const riderId = document.getElementById('mj-rider-id').value;
    const scoreId = document.getElementById('mj-score-id').value;
    const points = document.getElementById('mj-points').value;
    const comment = document.getElementById('mj-comment').value;
    
    const payload = {
        points: parseFloat(points),
        comment: comment || null,
        club_post_id: activePostId,
        competition_rider_id: parseInt(riderId)
    };
    
    try {
        let res;
        if (scoreId) {
            // Opdater eksisterende
            res = await fetch(`${API_BASE}/magic/${magicUuid}/scores/${scoreId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Opret ny
            res = await fetch(`${API_BASE}/magic/${magicUuid}/scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        if (res.ok) {
            alert('Score gemt!');
            cancelScore();
            fetchCompetitionRidersForJudge(magicJudge.competition_id); // Opdater listen i baggrunden
        } else {
            const err = await res.json();
            alert(`Fejl: ${err.detail}`);
        }
    } catch(err) { console.error(err); }
});

// --- PUBLIC LEADERBOARD ---
async function initPublicLeaderboard(compId) {
    document.querySelectorAll('main').forEach(m => m.style.display = 'none'); // Skjul alt andet
    document.getElementById('public-leaderboard-section').style.display = 'block';
    
    renderLeaderboard(compId, document.getElementById('pl-list'), document.getElementById('pl-title'));
}

window.renderLeaderboard = async function(compId, listElement, titleElement) {
    if (!listElement) return;
    listElement.innerHTML = '<p style="text-align: center;">Henter resultater...</p>';
    
    try {
        const res = await fetch(`${API_BASE}/public/competitions/${compId}/leaderboard`);
        if (!res.ok) {
            listElement.innerHTML = '<p style="color: #ef4444; text-align: center;">Kunne ikke hente leaderboard.</p>';
            return;
        }
        
        const data = await res.json();
        if (titleElement) titleElement.innerText = `Leaderboard: ${data.competition_name}`;
        
        listElement.innerHTML = '';
        
        if (data.leaderboard.length === 0) {
            listElement.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Ingen ryttere tilmeldt endnu.</p>';
            return;
        }
        
        data.leaderboard.forEach((r, index) => {
            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            
            const startNo = r.start_number ? `<span class="badge" style="background: rgba(255,255,255,0.2);">#${r.start_number}</span>` : '';
            
            // Progress indikator
            const progressPct = data.total_expected_posts_per_rider > 0 ? (r.posts_completed / data.total_expected_posts_per_rider) * 100 : 0;
            
            // Byg detaljer (skjult som standard)
            let detailsHtml = '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border); display: none;" class="lb-details">';
            if (r.details.length === 0) {
                detailsHtml += '<p style="font-size: 0.85rem; color: var(--text-secondary);">Ingen bedømmelser endnu.</p>';
            } else {
                r.details.forEach(d => {
                    detailsHtml += `
                        <div style="margin-bottom: 0.8rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 6px;">
                            <div style="display: flex; justify-content: space-between;">
                                <strong>${d.post_name}</strong>
                                <span style="color: #10b981; font-weight: bold;">${d.points.toFixed(2)} p</span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Dommer: ${d.judge_name}</div>
                            ${d.comment ? `<div style="font-size: 0.9rem; font-style: italic; color: #cbd5e1;">"${d.comment}"</div>` : ''}
                        </div>
                    `;
                });
            }
            detailsHtml += '</div>';

            listElement.innerHTML += `
                <div class="list-item" style="border-left: 4px solid #fbbf24; flex-direction: column; align-items: stretch;" onclick="this.querySelector('.lb-details').style.display = this.querySelector('.lb-details').style.display === 'none' ? 'block' : 'none'">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="font-size: 1.5rem; width: 30px; text-align: center; color: var(--text-secondary);">${medal || (index+1)}</div>
                            <div>
                                <strong style="font-size: 1.1rem;">${r.rider_name}</strong> ${startNo}
                                <div style="font-size: 0.85rem; color: var(--text-secondary);"><i class="fas fa-horse-head"></i> ${r.horse_name}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.3rem; font-weight: bold; color: #fbbf24;">${r.total_score.toFixed(2)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Fremdrift: ${r.posts_completed}/${data.total_expected_posts_per_rider} poster</div>
                        </div>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 0.8rem; overflow: hidden;">
                        <div style="height: 100%; width: ${progressPct}%; background: #fbbf24; transition: width 0.5s;"></div>
                    </div>
                    
                    ${detailsHtml}
                </div>
            `;
        });
        
    } catch(err) { console.error(err); }
};

// Injection til den primære Admin Stævne detalje visning
window.addEventListener('load', () => {
    // Override showCompTab fra main.js til at håndtere leaderboard tab
    const originalShowCompTab = window.showCompTab;
    if (originalShowCompTab) {
        window.showCompTab = function(tab) {
            originalShowCompTab(tab); // Kalder den originale (som fjerner active class og skjuler andre sektioner)
            
            // Opret leaderboard sektionen dynamisk under stævne detaljer hvis den ikke findes
            let lbSection = document.getElementById('comp-leaderboard-section');
            if (!lbSection) {
                lbSection = document.createElement('div');
                lbSection.id = 'comp-leaderboard-section';
                lbSection.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="color: #fbbf24;"><i class="fas fa-trophy"></i> Resultater</h4>
                        <button class="btn btn-primary btn-sm" onclick="window.open('?leaderboard=' + currentCompId, '_blank')"><i class="fas fa-external-link-alt"></i> Åbn Offentligt Link</button>
                    </div>
                    <div id="admin-pl-list" style="display: flex; flex-direction: column; gap: 1rem;"></div>
                `;
                document.getElementById('competition-details').appendChild(lbSection);
            }
            
            lbSection.style.display = 'none';
            
            if (tab === 'leaderboard') {
                document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.detail-tab-btn')[2].classList.add('active'); // Gør Resultater tab aktiv
                document.getElementById('comp-riders-section').style.display = 'none';
                document.getElementById('comp-judges-section').style.display = 'none';
                
                lbSection.style.display = 'block';
                // Brug renderLeaderboard fra scores.js
                if (typeof currentCompId !== 'undefined') {
                    window.renderLeaderboard(currentCompId, document.getElementById('admin-pl-list'), null);
                }
            }
        };
    }
});
