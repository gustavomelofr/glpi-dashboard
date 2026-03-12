/**
 * GLPI Dashboard Logic with Supabase Backend
 */

class Dashboard {
    constructor() {
        this.config = window.CONFIG;
        this.tickets = [];
        this.filteredTickets = [];
        this.charts = {};

        // Paging state
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.itemsPerPageFull = 10; // More items on the dedicated page
        this.currentView = 'dashboard';

        // Map state
        this.map = null;
        this.markers = [];
        this.coordinates = {
            'SEDES (Sede)': [-15.7631, -47.8836],
            'default': [-15.7631, -47.8836],
            'CECON RIACHO FUNDO I': [-15.8833, -48.0175],
            'CENTRO POP BRASÍLIA': [-15.813, -47.896],
            'CRAS BRASILIA': [-15.8207, -47.9048],
            'CRAS BRAZLÂNDIA': [-15.656, -48.196],
            'CRAS CEILÂNDIA NORTE': [-15.816, -48.113],
            'CRAS CEILÂNDIA P SUL': [-15.8417, -48.1161],
            'CRAS CEILÂNDIA SUL': [-15.821, -48.113],
            'CRAS FERCAL': [-15.600, -47.869],
            'CRAS ITAPOÃ': [-15.748, -47.769],
            'CRAS PARANOÁ': [-15.768, -47.779],
            'CRAS PLANALTINA': [-15.616, -47.666],
            'CRAS PORTO RICO': [-16.0350, -48.0179],
            'CRAS RECANTO DAS EMAS': [-15.915, -48.099],
            'CRAS RECANTO DAS EMAS II': [-15.920, -48.105],
            'CRAS RIACHO FUNDO I': [-15.883, -48.017],
            'CRAS SAMAMBAIA SUL': [-15.890, -48.105],
            'CRAS SOBRADINHO': [-15.653, -47.791],
            'CRAS SOBRADINHO II': [-15.640, -47.780],
            'CREAS GAMA': [-16.016, -48.066],
            'CREAS PLANALTINA': [-15.610, -47.650],
            'RESTAURANTE COMUNITÁRIO -  BRAZLANDIA': [-15.656, -48.196],
            'RESTAURANTE COMUNITÁRIO - ESTRUTURAL': [-15.783, -47.983],
            'RESTAURANTE COMUNITÁRIO - PLANALTINA': [-15.616, -47.666],
            'RESTAURANTE COMUNITÁRIO - RECANTO DAS EMAS': [-15.915, -48.099],
            'RESTAURANTE COMUNITÁRIO - SAMAMBAIA EXPANSÃO': [-15.882, -48.104],
            'RESTAURANTE COMUNITÁRIO - SOBRADINHO II': [-15.640, -47.780],
            'RESTAURANTE COMUNITÁRIO - SOL NASCENTE': [-15.816, -48.113],
            'RESTAURANTE COMUNITÁRIO - SÃO SEBASTIÃO': [-15.910, -47.760]
        };

        this.sedesEntities = [
            'AJL  – Acessória Jurídico Legislativo',
            'ASCOM',
            'ASSESP – Assessoria Especial',
            'CAISAN – Câmara Instersetorial de Segurança Alimentar e Nutricional do DF',
            'COIG – Coordenação de Inovação e Governança',
            'COIT - Coordenação de Infraestrutura e Transformação Digital',
            'DIGESAN – Diretoria de Acompanhamento de Equipamentos de Segurança Alimentar e Nutricional',
            'DINF – Gerência de Engenharia e Infraestrutura',
            'GADP – Gerência de Acompanhamento e Desenvolvimento de Pessoas',
            'GEAP – Gerência de Arquivo e Protocolo',
            'Não informada',
            'SAIAFA – Serviço de Acolhimento Institucional p/ Adultos e Famílias do Areal',
            'SAIM – Serviço de Acolhimento Institucional p/ Mulheres',
            'SAIPI – Serv. Acolhimento Inst. p/ Pessoas Idosas',
            'SUAG  - Subsecretaria de Administração Geral',
            'SUGIP – Subsecretária de Gestão da Informação, Formação, Parceiros e Redes',
            'SUGIP – Subsecretária de Gestão da Informação, Formaão, Parceiros e Redes',
            'SUGIP – Subsecretária de Gesto da Informação, Formação, Parceiros e Redes',
            'SUGIP – Subsecretria de Gestão da Informação, Formação, Parceiros e Redes',
            'Sala de Treinamento 4º andar – SUGIP',
            'ULOM – Unidade de Logística, Obras e Manutenção'
        ];

        this.init();
    }

    async init() {
        // Initialize Lucide icons
        lucide.createIcons();

        // Setup Chart defaults for light theme
        Chart.defaults.color = '#64748b';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.05)';

        // Custom color palette matching the Stitch design
        this.colors = {
            blue: '#135bec',
            orange: '#f97316',
            purple: '#8b5cf6',
            green: '#22c55e',
            red: '#ef4444',
            lightBlue: '#e0e9fe'
        };

        // Set up event listeners
        document.getElementById('refresh-btn').addEventListener('click', () => this.fetchData());

        // Remove automatic filters - trigger only via "Aplicar" button or Enter key
        document.getElementById('ticket-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterTickets();
        });
        document.getElementById('ticket-search-full').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterTickets();
        });

        document.getElementById('apply-filters').addEventListener('click', () => {
            this.filterTickets();
            // Scroll to top to ensure results are visible
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.scrollTop = 0;
        });

        document.getElementById('clear-filters').addEventListener('click', () => this.resetFilters());

        // Nav listeners
        document.getElementById('nav-dashboard').addEventListener('click', (e) => { e.preventDefault(); this.switchView('dashboard'); this.closeSidebar(); });
        document.getElementById('nav-tickets').addEventListener('click', (e) => { e.preventDefault(); this.switchView('tickets'); this.closeSidebar(); });
        document.getElementById('nav-teams').addEventListener('click', (e) => { e.preventDefault(); this.switchView('teams'); this.closeSidebar(); });
        document.getElementById('nav-reports').addEventListener('click', (e) => { e.preventDefault(); this.switchView('reports'); this.closeSidebar(); });

        // Mobile Sidebar Toggle
        const mobileBtn = document.getElementById('mobile-menu-btn');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('open');
            });
        }

        // Initial fetch
        await this.fetchData();

        // Initialize Map after first fetch
        this.initMap();

        // Theme Setup
        this.initTheme();
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
    }

    switchView(view) {
        this.currentView = view;
        const dashView = document.getElementById('dashboard-view');
        const ticketsView = document.getElementById('tickets-view');
        const teamsView = document.getElementById('teams-view');
        const reportsView = document.getElementById('reports-view');

        const dashNav = document.getElementById('nav-dashboard');
        const ticketsNav = document.getElementById('nav-tickets');
        const teamsNav = document.getElementById('nav-teams');
        const reportsNav = document.getElementById('nav-reports');

        const viewTitle = document.getElementById('view-title');

        // Hide all
        dashView.style.display = 'none';
        ticketsView.style.display = 'none';
        teamsView.style.display = 'none';
        reportsView.style.display = 'none';

        dashNav.classList.remove('active');
        ticketsNav.classList.remove('active');
        teamsNav.classList.remove('active');
        reportsNav.classList.remove('active');

        if (view === 'dashboard') {
            dashView.style.display = 'block';
            dashNav.classList.add('active');
            viewTitle.innerText = 'Dashboard';
            this.renderTable();
        } else if (view === 'tickets') {
            ticketsView.style.display = 'block';
            ticketsNav.classList.add('active');
            viewTitle.innerText = 'Chamados';
            this.renderTable();
        } else if (view === 'teams') {
            teamsView.style.display = 'block';
            teamsNav.classList.add('active');
            viewTitle.innerText = 'Times';
            this.renderTeams();
        } else if (view === 'reports') {
            reportsView.style.display = 'block';
            reportsNav.classList.add('active');
            viewTitle.innerText = 'Relatórios';
            this.showReportsMain();
        }

        this.currentPage = 1;
    }

    showReportsMain() {
        document.getElementById('reports-main-view').style.display = 'block';
        document.getElementById('reports-detail-view').style.display = 'none';
        this.renderReports();
    }

    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.updateThemeUI();
        }
    }

    renderReports() {
        const grid = document.getElementById('reports-month-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const monthlyData = {};
        this.filteredTickets.forEach(ticket => {
            const dateStr = ticket.data_atualizacao || ticket.inserido_em;
            if (!dateStr) return;

            const parts = dateStr.split(' ');
            const dateParts = parts[0].split('-');
            if (dateParts.length !== 3) return;

            const day = dateParts[0];
            const month = dateParts[1];
            const yearVal = dateParts[2];

            const d = new Date(`${yearVal}-${month}-${day}`);
            if (isNaN(d.getTime())) return;

            const monthName = d.toLocaleDateString('pt-BR', { month: 'long' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            const yearNum = d.getFullYear();
            const monthKey = `${capitalizedMonth} ${yearNum}`;
            const sortKey = `${yearNum}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[sortKey]) {
                monthlyData[sortKey] = { label: monthKey, tickets: [] };
            }
            monthlyData[sortKey].tickets.push(ticket);
        });

        const sortedKeys = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
        this.monthlyData = monthlyData; // Store for detail access

        if (sortedKeys.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum chamado disponível para relatórios.</div>';
            return;
        }

        sortedKeys.forEach(key => {
            const data = monthlyData[key];
            const card = document.createElement('div');
            card.className = 'team-card';
            card.style.cursor = 'pointer';
            card.onclick = () => this.showMonthlyDetail(key);

            card.innerHTML = `
                <div class="team-card-header">
                    <div class="team-icon">
                        <i data-lucide="calendar"></i>
                    </div>
                    <div class="team-info">
                        <h3>${data.label}</h3>
                        <span>${data.tickets.length} Chamados Gerenciados</span>
                    </div>
                </div>
                <div class="team-stats">
                    <div class="team-stat-item">
                        <span>
                            <span class="label">Volume Mensal</span>
                        </span>
                        <div class="progress-bar">
                            <div class="progress" style="width: 100%; background: var(--primary);"></div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">VER DETALHES</span>
                        <i data-lucide="chevron-right" style="width: 16px; color: var(--primary);"></i>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        lucide.createIcons({ props: { size: 16 }, nameAttr: 'data-lucide' });
    }

    showMonthlyDetail(monthKey) {
        const data = this.monthlyData[monthKey];
        if (!data) return;

        document.getElementById('reports-main-view').style.display = 'none';
        document.getElementById('reports-detail-view').style.display = 'block';
        document.getElementById('report-detail-title').innerText = `Chamados de ${data.label}`;

        const container = document.getElementById('reports-month-content');
        container.innerHTML = '';

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';

        data.tickets.forEach(ticket => {
            const statusClass = this.getStatusClass(ticket.status);
            const prioClass = this.getPrioClass(ticket.prioridade);

            const item = document.createElement('div');
            item.className = 'glass-card-inner';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '12px 16px';
            item.style.background = 'var(--bg-main, rgba(0,0,0,0.02))';
            item.style.borderRadius = '12px';
            item.style.border = '1px solid var(--border-color)';

            item.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">#${ticket.id}</span>
                        <span style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px;" title="${ticket.titulo}">${ticket.titulo || 'Sem título'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem; color: var(--text-muted);">
                        <span><i data-lucide="user" style="width: 12px; display: inline; margin-right: 4px;"></i>${ticket.requerente || 'N/A'}</span>
                        <span><i data-lucide="map-pin" style="width: 12px; display: inline; margin-right: 4px;"></i>${ticket.entidade || 'N/A'}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span class="${prioClass}" style="font-size: 0.75rem;">${ticket.prioridade || 'Média'}</span>
                    <span class="status-badge ${statusClass}">${ticket.status || 'Novo'}</span>
                </div>
            `;
            list.appendChild(item);
        });

        container.appendChild(list);
        lucide.createIcons({ props: { size: 14 }, nameAttr: 'data-lucide' });

        // Scroll to top of report
        document.querySelector('.main-content').scrollTop = 0;
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateThemeUI();

        // Re-render charts to update fonts/colors
        this.updateCharts();
    }

    updateThemeUI() {
        const btn = document.getElementById('theme-toggle');
        const isDark = document.body.classList.contains('dark-mode');
        btn.innerHTML = isDark ?
            '<i data-lucide="sun" style="width: 16px;"></i><span>Modo Claro</span>' :
            '<i data-lucide="moon" style="width: 16px;"></i><span>Modo Escuro</span>';
        lucide.createIcons();

        // Update Chart defaults
        Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
        Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    }

    async fetchData() {
        const statusText = document.getElementById('status-text');
        const statusDot = document.querySelector('.status-dot');

        try {
            statusText.innerText = 'Sincronizando...';
            statusDot.className = 'status-dot';

            // Fetch all from Supabase via PostgREST using pagination to bypass 1000 limit
            let allData = [];
            let offset = 0;
            const limit = 1000;

            while (true) {
                const response = await fetch(`${this.config.SUPABASE_URL}/rest/v1/${this.config.TABLE_NAME}?select=*&order=id.desc&limit=${limit}&offset=${offset}`, {
                    headers: {
                        'apikey': this.config.SUPABASE_KEY,
                        'Authorization': `Bearer ${this.config.SUPABASE_KEY}`
                    }
                });

                if (!response.ok) throw new Error('Falha ao buscar dados do Supabase');

                const data = await response.json();
                allData = allData.concat(data);

                if (data.length < limit) break; // Finished loading
                offset += limit;
            }

            this.tickets = allData;
            this.filteredTickets = [...this.tickets];
            this.cloudTickets = [...this.tickets];

            // Populate filter dropdowns
            this.populateFilters();

            // Reset to page 1 on fresh fetch
            this.currentPage = 1;

            // Update UI
            this.updateStats();
            this.renderTable();
            this.updateCharts();
            this.updateMapMarkers();

            statusText.innerText = 'Conectado';
            statusDot.className = 'status-dot online';

        } catch (error) {
            console.error('Erro detalhado:', error);
            statusText.innerText = 'Erro Supabase';
            statusDot.className = 'status-dot';
            alert(`Erro ao carregar dados do Supabase: ${error.message}\nVerifique a sua conexão e as chaves no config.js.`);
        }
    }

    updateStats() {
        const total = this.filteredTickets.length;
        console.log('Updating stats, total tickets:', total);
        const open = this.filteredTickets.filter(t => t.status?.toLowerCase().includes('aberto') || t.status?.toLowerCase().includes('novo')).length;
        const pending = this.filteredTickets.filter(t => t.status?.toLowerCase().includes('pendente') || t.status === '4').length;
        const closed = this.filteredTickets.filter(t => t.status?.toLowerCase().includes('fechado') || t.status?.toLowerCase().includes('solucionado')).length;

        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-open').innerText = open;
        document.getElementById('stat-pending').innerText = pending;
        document.getElementById('stat-closed').innerText = closed;
    }

    renderTable() {
        console.log('Rendering table...');
        const tableBody = document.getElementById('tickets-table-body');
        const tableBodyFull = document.getElementById('tickets-table-body-full');

        if (!tableBody || !tableBodyFull) return;

        // Clear both
        tableBody.innerHTML = '';
        tableBodyFull.innerHTML = '';

        const itemsPerPage = this.currentView === 'dashboard' ? this.itemsPerPage : this.itemsPerPageFull;
        const start = (this.currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = this.filteredTickets.slice(start, end);

        pageData.forEach(ticket => {
            const statusClass = this.getStatusClass(ticket.status);
            const prioClass = this.getPrioClass(ticket.prioridade);

            // Row for Dashboard (Simplified)
            const rowShort = document.createElement('tr');
            rowShort.innerHTML = `
                <td>#${ticket.id}</td>
                <td title="${ticket.titulo}"><strong>${ticket.titulo?.substring(0, 35)}${ticket.titulo?.length > 35 ? '...' : ''}</strong></td>
                <td>${ticket.requerente || 'N/A'}</td>
                <td class="${prioClass}">${ticket.prioridade || 'Média'}</td>
                <td><span class="status-badge ${statusClass}">${ticket.status}</span></td>
            `;
            tableBody.appendChild(rowShort);

            // Row for Full View (Details)
            const rowFull = document.createElement('tr');
            rowFull.innerHTML = `
                <td>#${ticket.id}</td>
                <td><strong>${ticket.titulo}</strong></td>
                <td>${ticket.requerente || 'N/A'}</td>
                <td>${ticket.tecnico || '-'}</td>
                <td>${ticket.grupo || '-'}</td>
                <td>${ticket.entidade || '-'}</td>
                <td class="${prioClass}">${ticket.prioridade || 'Média'}</td>
                <td><span class="status-badge ${statusClass}">${ticket.status}</span></td>
            `;
            tableBodyFull.appendChild(rowFull);
        });

        this.updatePagination();
    }

    renderTeams() {
        const container = document.getElementById('teams-container');
        if (!container) return;
        container.innerHTML = '';

        // Group tickets by group
        const groups = {};
        this.filteredTickets.forEach(t => {
            const gName = t.grupo || 'Sem Grupo';
            if (!groups[gName]) {
                groups[gName] = { name: gName, total: 0, open: 0, closed: 0 };
            }
            groups[gName].total++;
            if (t.status === 'Fechado' || t.status === 'Solucionado') {
                groups[gName].closed++;
            } else {
                groups[gName].open++;
            }
        });

        // Convert to array and sort by total
        const sortedGroups = Object.values(groups).sort((a, b) => b.total - a.total);

        sortedGroups.forEach(group => {
            const card = document.createElement('div');
            card.className = 'team-card glass-card';

            const openPercent = group.total > 0 ? (group.open / group.total * 100).toFixed(0) : 0;
            const closedPercent = group.total > 0 ? (group.closed / group.total * 100).toFixed(0) : 0;

            card.innerHTML = `
                <div class="team-card-header">
                    <div class="team-icon">
                        <i data-lucide="users"></i>
                    </div>
                    <div class="team-info">
                        <h3>${group.name}</h3>
                        <span>${group.total} Chamados Totais</span>
                    </div>
                </div>
                <div class="team-stats">
                    <div class="team-stat-item">
                        <span class="label">Abertos</span>
                        <span class="value">${group.open}</span>
                        <div class="progress-bar"><div class="progress" style="width: ${openPercent}%; background: #ef4444;"></div></div>
                    </div>
                    <div class="team-stat-item">
                        <span class="label">Fechados</span>
                        <span class="value">${group.closed}</span>
                        <div class="progress-bar"><div class="progress" style="width: ${closedPercent}%; background: #22c55e;"></div></div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button class="btn-premium" style="flex: 1; justify-content: center;" onclick="dashboard.filterByGroup('${group.name}')">
                        Ver Chamados
                    </button>
                    <button class="btn-premium" style="flex: 1; justify-content: center; background: var(--background-light);" onclick="dashboard.showTeamMembers('${group.name}')">
                        Integrantes
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        lucide.createIcons({ props: { size: 18 }, nameAttr: 'data-lucide' });
    }

    filterByGroup(groupName) {
        document.getElementById('filter-grupo').value = groupName === 'Sem Grupo' ? '' : groupName;
        this.filterTickets();
        this.switchView('tickets');
    }

    showTeamMembers(groupName) {
        const modal = document.getElementById('members-modal');
        const list = document.getElementById('members-list');
        const title = document.getElementById('modal-team-name');

        if (!modal || !list || !title) return;

        title.innerText = groupName;
        list.innerHTML = '';

        // Extract unique technicians for this group
        const members = [...new Set(
            this.tickets
                .filter(t => (t.grupo || 'Sem Grupo') === groupName)
                .map(t => t.tecnico)
                .filter(Boolean)
        )].sort();

        if (members.length === 0) {
            list.innerHTML = '<div class="member-item"><span class="member-name">Nenhum integrante encontrado</span></div>';
        } else {
            members.forEach(name => {
                const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const item = document.createElement('div');
                item.className = 'member-item';
                item.innerHTML = `
                    <div class="member-avatar">${initials}</div>
                    <span class="member-name">${name}</span>
                `;
                list.appendChild(item);
            });
        }

        modal.style.display = 'flex';
        lucide.createIcons({ props: { size: 16 }, nameAttr: 'data-lucide' });
    }

    closeModal() {
        const modal = document.getElementById('members-modal');
        if (modal) modal.style.display = 'none';
    }

    updatePagination() {
        const totalItems = this.filteredTickets.length;
        const itemsPerPage = this.currentView === 'dashboard' ? this.itemsPerPage : this.itemsPerPageFull;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        const suffix = this.currentView === 'dashboard' ? '' : '-full';
        const container = document.getElementById(`pagination-controls${suffix}`);

        // Update range info
        const startIdx = totalItems === 0 ? 0 : (this.currentPage - 1) * itemsPerPage + 1;
        const endIdx = Math.min(this.currentPage * itemsPerPage, totalItems);

        document.getElementById(`pg-start${suffix}`).innerText = startIdx;
        document.getElementById(`pg-end${suffix}`).innerText = endIdx;
        document.getElementById(`pg-total${suffix}`).innerText = totalItems;

        container.innerHTML = '';
        if (totalPages <= 1) return;

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pg-btn';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.innerHTML = '<i data-lucide="chevron-left"></i>';
        prevBtn.onclick = () => { this.currentPage--; this.renderTable(); };
        container.appendChild(prevBtn);

        // Page numbers
        if (this.currentPage > 2) {
            const btn = document.createElement('button');
            btn.className = 'pg-btn';
            btn.innerText = '1';
            btn.onclick = () => { this.currentPage = 1; this.renderTable(); };
            container.appendChild(btn);
            if (this.currentPage > 3) container.insertAdjacentHTML('beforeend', '<span class="pg-dots">...</span>');
        }

        const btn = document.createElement('button');
        btn.className = 'pg-btn active';
        btn.innerText = this.currentPage;
        container.appendChild(btn);

        if (this.currentPage < totalPages - 1) {
            if (this.currentPage < totalPages - 2) container.insertAdjacentHTML('beforeend', '<span class="pg-dots">...</span>');
            const btnLast = document.createElement('button');
            btnLast.className = 'pg-btn';
            btnLast.innerText = totalPages;
            btnLast.onclick = () => { this.currentPage = totalPages; this.renderTable(); };
            container.appendChild(btnLast);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pg-btn';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.innerHTML = '<i data-lucide="chevron-right"></i>';
        nextBtn.onclick = () => { this.currentPage++; this.renderTable(); };
        container.appendChild(nextBtn);

        lucide.createIcons({ props: { size: 16 }, nameAttr: 'data-lucide' });
    }

    getStatusClass(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('aberto') || s.includes('novo')) return 'status-aberto';
        if (s.includes('pendente')) return 'status-pendente';
        if (s.includes('fechado') || s.includes('solucionado')) return 'status-fechado';
        return '';
    }

    getPrioClass(prio) {
        const p = (prio || '').toLowerCase();
        if (p.includes('alta') || p.includes('urgente')) return 'prio-high';
        if (p.includes('baixa')) return 'prio-low';
        return 'prio-medium';
    }

    updateCharts() {
        this.renderCriticalAlerts();
        this.renderStatusChart();
        this.renderPriorityGroupChart();
        this.renderLeaderboard();
        this.renderLocationStatusChart();
        this.renderTopicsCloud();
        this.renderReports();
    }

    filterCritical() {
        document.getElementById('ticket-search').value = '';
        document.getElementById('filter-tecnico').value = '';
        document.getElementById('filter-grupo').value = '';
        document.getElementById('filter-localidade').value = '';

        this.filteredTickets = this.tickets.filter(t => {
            const isCritical = t.prioridade?.toLowerCase().includes('alta') || t.prioridade?.toLowerCase().includes('urgente');
            const isOpen = t.status?.toLowerCase().includes('aberto') || t.status?.toLowerCase().includes('novo');
            return isCritical && isOpen;
        });

        this.currentPage = 1;
        this.switchView('dashboard');
        this.updateStats();
        this.updateCharts();
        this.updateMapMarkers();
        this.renderTable();
    }

    renderCriticalAlerts() {
        const alertEl = document.getElementById('critical-alerts');
        const countSpan = document.getElementById('critical-count');
        if (!alertEl || !countSpan) return;

        const count = this.tickets.filter(t => {
            const isCritical = t.prioridade?.toLowerCase().includes('alta') || t.prioridade?.toLowerCase().includes('urgente');
            const isOpen = t.status?.toLowerCase().includes('aberto') || t.status?.toLowerCase().includes('novo');
            return isCritical && isOpen;
        }).length;

        if (count > 0) {
            countSpan.innerText = count;
            alertEl.style.display = 'flex';
        } else {
            alertEl.style.display = 'none';
        }
    }

    renderLeaderboard() {
        console.log('Rendering leaderboard...');
        const container = document.getElementById('leaderboard-container');
        if (!container) {
            console.error('Leaderboard container not found!');
            return;
        }
        container.innerHTML = '';

        console.log('Processing leaderboard for', this.filteredTickets.length, 'tickets');

        // Count resolved/closed tickets per technician
        const techCounts = {};
        this.filteredTickets.forEach(t => {
            const isClosed = t.status?.toLowerCase().includes('fechado') || t.status?.toLowerCase().includes('solucionado');
            if (isClosed && t.tecnico) {
                techCounts[t.tecnico] = (techCounts[t.tecnico] || 0) + 1;
            }
        });

        // Sort top 5
        const topTechs = Object.entries(techCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (topTechs.length === 0) {
            container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Dados insuficientes</span>';
            return;
        }

        topTechs.forEach((tech, index) => {
            const name = tech[0];
            const score = tech[1];
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Medals for top 3
            let medal = '';
            if (index === 0) medal = '🥇 ';
            if (index === 1) medal = '🥈 ';
            if (index === 2) medal = '🥉 ';

            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '8px 12px';
            item.style.background = 'var(--bg-main)';
            item.style.borderRadius = '12px';
            item.style.border = '1px solid var(--border)';

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="member-avatar" style="width: 36px; height: 36px; font-size: 0.85rem;">${initials}</div>
                    <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${medal}${name.split(' ')[0]} ${name.split(' ').pop()}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: 800; color: var(--primary); font-size: 1.1rem;">${score}</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderPriorityGroupChart() {
        const ctx = document.getElementById('priorityGroupChart')?.getContext('2d');
        if (!ctx) return;

        // Group by Group, count by Priority
        const groups = {};
        this.filteredTickets.forEach(t => {
            const g = t.grupo || 'Sem Grupo';
            const p = t.prioridade?.toLowerCase() || 'média';

            if (!groups[g]) groups[g] = { alta: 0, media: 0, baixa: 0 };

            if (p.includes('alta') || p.includes('urgente')) groups[g].alta++;
            else if (p.includes('baixa')) groups[g].baixa++;
            else groups[g].media++;
        });

        // Top 5 groups by total tickets
        const topGroups = Object.keys(groups)
            .sort((a, b) => (groups[b].alta + groups[b].media + groups[b].baixa) - (groups[a].alta + groups[a].media + groups[a].baixa))
            .slice(0, 5);

        const labels = topGroups.map(g => g.length > 15 ? g.substring(0, 15) + '...' : g);
        const dataAlta = topGroups.map(g => groups[g].alta);
        const dataMedia = topGroups.map(g => groups[g].media);
        const dataBaixa = topGroups.map(g => groups[g].baixa);

        if (this.charts.priorityGroup) this.charts.priorityGroup.destroy();

        this.charts.priorityGroup = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Alta/Urgente', data: dataAlta, backgroundColor: this.colors.red },
                    { label: 'Média', data: dataMedia, backgroundColor: this.colors.orange },
                    { label: 'Baixa', data: dataBaixa, backgroundColor: this.colors.green }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
                },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }
                }
            }
        });
    }

    renderLocationStatusChart() {
        const ctx = document.getElementById('locationStatusChart')?.getContext('2d');
        if (!ctx) return;

        // Group by Location, count by Status
        const locs = {};
        this.filteredTickets.forEach(t => {
            const l = t.entidade || 'Não Inf.';
            const s = (t.status || '').toLowerCase();

            if (!locs[l]) locs[l] = { aberto: 0, pendente: 0, fechado: 0 };

            if (s.includes('aberto') || s.includes('novo')) locs[l].aberto++;
            else if (s.includes('pendente')) locs[l].pendente++;
            else if (s.includes('fechado') || s.includes('solucionado')) locs[l].fechado++;
        });

        // Top 5 locations by total
        const topLocs = Object.keys(locs)
            .sort((a, b) => (locs[b].aberto + locs[b].pendente + locs[b].fechado) - (locs[a].aberto + locs[a].pendente + locs[a].fechado))
            .slice(0, 5);

        const labels = topLocs.map(l => l.length > 15 ? l.substring(0, 15) + '...' : l);

        if (this.charts.locationStatus) this.charts.locationStatus.destroy();

        this.charts.locationStatus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Abertos', data: topLocs.map(l => locs[l].aberto), backgroundColor: this.colors.red },
                    { label: 'Pendentes', data: topLocs.map(l => locs[l].pendente), backgroundColor: this.colors.orange },
                    { label: 'Fechados', data: topLocs.map(l => locs[l].fechado), backgroundColor: this.colors.green }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    y: { stacked: true, grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }
                }
            }
        });
    }

    renderTopicsCloud() {
        const container = document.getElementById('topics-cloud');
        if (!container) return;
        container.innerHTML = '';

        // Extremely simple stop words list
        const stopWords = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'e', 'ou', 'mas', 'que', 'se', 'como', 'sobre', 'mais', 'ao', 'aos', 'para', 'pelo', 'pela', 'pelos', 'pelas', 'é', 'são', 'foi', 'foram', 'ser', 'estar', 'ter', 'fazer', 'ir', 'não', 'sim', 'já', 'ainda', 'até', 'após', 'entre', 'desde', 'qual', 'quais', 'quem', 'onde', 'quando', 'porque', 'porquê', 'isso', 'isto', 'aquilo', 'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas', 'teu', 'tua', 'teus', 'tuas', 'chamado', 'solicitação', 'problema', 'erro', 'falha', 'ajuda', 'suporte', 'atendimento', 'para']);

        const wordCounts = {};
        const ticketsToCount = this.cloudTickets || this.tickets;
        ticketsToCount.forEach(t => {
            if (!t.titulo) return;
            const words = t.titulo.toLowerCase().replace(/[^\w\sà-úÀ-Ú]/g, '').split(/\s+/);
            words.forEach(w => {
                if (w.length > 3 && !stopWords.has(w)) {
                    wordCounts[w] = (wordCounts[w] || 0) + 1;
                }
            });
        });

        const topWords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12);

        if (topWords.length === 0) {
            container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Nenhum tópico encontrado</span>';
            return;
        }

        topWords.forEach(word => {
            const tag = document.createElement('div');

            // Cloud formatting: Scale font size dramatically based on count (from 0.8rem up to 2.8rem)
            const maxCount = topWords[0][1];
            const ratio = word[1] / maxCount;
            const size = 0.85 + (ratio * 2.15); // scales from 0.85rem to 3.0rem
            const opacity = 0.5 + (ratio * 0.5); // scales from 0.5 to 1.0

            tag.style.color = 'var(--primary)';
            tag.style.opacity = opacity;
            tag.style.padding = '4px 8px';
            tag.style.fontSize = `${size}rem`;
            tag.style.fontWeight = ratio > 0.6 ? '800' : '600';
            tag.style.display = 'inline-block';
            tag.style.cursor = 'pointer';
            tag.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            tag.style.lineHeight = '1';
            tag.style.whiteSpace = 'nowrap';

            tag.innerText = word[0];

            // Hover effect
            tag.onmouseover = () => {
                tag.style.transform = 'scale(1.1) translateY(-2px)';
                tag.style.opacity = '1';
                tag.style.color = '#1e3a8a'; // Darker blue
                tag.style.textShadow = '0 4px 12px rgba(30, 58, 138, 0.15)';
            };
            tag.onmouseout = () => {
                tag.style.transform = 'scale(1) translateY(0)';
                tag.style.opacity = opacity;
                tag.style.color = 'var(--primary)';
                tag.style.textShadow = 'none';
            };

            // Click to search
            tag.onclick = () => {
                document.getElementById('ticket-search').value = word[0];
                this.filterTickets();
            };

            container.appendChild(tag);
        });
    }

    renderStatusChart() {
        // ... (existing code handles this well)
        const ctx = document.getElementById('statusChart').getContext('2d');

        // Count statuses
        const counts = {};
        this.filteredTickets.forEach(t => {
            const s = t.status || 'Outros';
            counts[s] = (counts[s] || 0) + 1;
        });

        if (this.charts.status) this.charts.status.destroy();

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: [
                        this.colors.blue, this.colors.orange, this.colors.green,
                        this.colors.purple, this.colors.red, '#cbd5e1'
                    ],
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 11 }
                        }
                    }
                },
                cutout: '75%',
                radius: '90%'
            }
        });
    }

    // Handled by new functions

    initMap() {
        const mapEl = document.getElementById('map');
        if (!mapEl) return;

        // Center on Brasília
        this.map = L.map('map', {
            zoomControl: false,
            dragging: !L.Browser.mobile,
            scrollWheelZoom: false
        }).setView([-15.7938, -47.8828], 10);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Initialize Cluster Group
        this.markerClusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            maxClusterRadius: 40,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                // Find total tickets in this cluster
                let totalTickets = 0;
                cluster.getAllChildMarkers().forEach(m => {
                    totalTickets += m.options.ticketCount || 1;
                });

                const size = Math.min(Math.max(totalTickets * 0.5 + 30, 35), 60);
                return L.divIcon({
                    html: `<div class="map-cluster-bubble" style="width:${size}px; height:${size}px; line-height:${size}px;">${totalTickets}</div>`,
                    className: 'custom-cluster-icon',
                    iconSize: L.point(size, size)
                });
            }
        });
        this.map.addLayer(this.markerClusterGroup);

        this.updateMapMarkers();
    }

    updateMapMarkers() {
        if (!this.map || !this.markerClusterGroup) return;

        // Clear existing markers
        this.markerClusterGroup.clearLayers();
        this.markers = [];

        // Aggregate tickets by entity, grouping administrative ones into SEDES
        const entityCounts = {};
        this.filteredTickets.forEach(ticket => {
            let ent = ticket.entidade || 'Não informada';

            // Check if this entity should be mapped to SEDES
            if (this.sedesEntities.includes(ent)) {
                ent = 'SEDES (Sede)';
            }

            entityCounts[ent] = (entityCounts[ent] || 0) + 1;
        });

        // Add markers for entities with coordinates
        Object.entries(entityCounts).forEach(([entity, count]) => {
            let coords = this.coordinates[entity];
            let name = entity;

            if (!coords) {
                coords = this.coordinates['default'];
                if (entity !== 'SEDES (Sede)') {
                    name = `${entity} (Localização Padrão)`;
                }
            }

            // Small jitter for markers at the exact same location
            const lat = coords[0] + (Math.random() - 0.5) * 0.0005;
            const lng = coords[1] + (Math.random() - 0.5) * 0.0005;

            const size = Math.min(Math.max(count * 2, 12), 40);

            const markerIcon = L.divIcon({
                html: `<div class="map-marker-bubble" style="width:${size}px; height:${size}px; background:${this.colors.blue}ee;"></div>`,
                className: 'custom-marker-icon',
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
            });

            const marker = L.marker([lat, lng], {
                icon: markerIcon,
                ticketCount: count
            })
                .bindPopup(`<strong>${name}</strong><br>${count} Chamados`);

            this.markerClusterGroup.addLayer(marker);
            this.markers.push(marker);
        });
    }

    populateFilters() {
        const tecnicos = [...new Set(this.tickets.map(t => t.tecnico).filter(Boolean))].sort();
        const grupos = [...new Set(this.tickets.map(t => t.grupo).filter(Boolean))].sort();
        const unidades = [...new Set(this.tickets.map(t => t.entidade).filter(Boolean))].sort();

        this.updateSelect('filter-tecnico', tecnicos, 'Todos os Técnicos');
        this.updateSelect('filter-grupo', grupos, 'Todos os Grupos');
        this.updateSelect('filter-localidade', unidades, 'Todas as Localidades');
    }

    updateSelect(id, values, defaultText) {
        const select = document.getElementById(id);
        const currentValue = select.value;
        select.innerHTML = `<option value="">${defaultText}</option>` +
            values.map(v => `<option value="${v}" ${v === currentValue ? 'selected' : ''}>${v}</option>`).join('');
    }

    resetFilters() {
        document.getElementById('ticket-search').value = '';
        document.getElementById('filter-tecnico').value = '';
        document.getElementById('filter-grupo').value = '';
        document.getElementById('filter-localidade').value = '';
        document.getElementById('filter-data-inicio').value = '';
        document.getElementById('filter-data-fim').value = '';
        this.filterTickets();
    }

    filterTickets() {
        console.log('Filtering tickets...');
        const queryDash = document.getElementById('ticket-search').value.toLowerCase();
        const queryFull = document.getElementById('ticket-search-full').value.toLowerCase();
        const query = this.currentView === 'dashboard' ? queryDash : queryFull;

        const tecnico = document.getElementById('filter-tecnico').value;
        const grupo = document.getElementById('filter-grupo').value;
        const localidade = document.getElementById('filter-localidade').value;
        const dataInicio = document.getElementById('filter-data-inicio').value;
        const dataFim = document.getElementById('filter-data-fim').value;

        // Sync values between search boxes if needed (or just use one, but current layout has two)
        if (this.currentView === 'dashboard') {
            document.getElementById('ticket-search-full').value = document.getElementById('ticket-search').value;
        } else {
            document.getElementById('ticket-search').value = document.getElementById('ticket-search-full').value;
        }

        this.filteredTickets = [];
        this.cloudTickets = [];

        this.tickets.forEach(t => {
            const matchesSearch = !query ||
                (t.titulo && t.titulo.toLowerCase().includes(query)) ||
                (t.requerente && t.requerente.toLowerCase().includes(query));

            const matchesTecnico = !tecnico || t.tecnico === tecnico;
            const matchesGrupo = !grupo || t.grupo === grupo;
            const matchesLocalidade = !localidade || t.entidade === localidade;

            // Date filtering (Manual parsing for DD-MM-YYYY)
            let matchesDate = true;
            if (t.data_atualizacao && (dataInicio || dataFim)) {
                try {
                    const parts = t.data_atualizacao.split(' ');
                    const dateParts = parts[0].split('-');
                    if (dateParts.length === 3) {
                        const ticketDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // YYYY-MM-DD
                        if (dataInicio && ticketDate < dataInicio) matchesDate = false;
                        if (dataFim && ticketDate > dataFim) matchesDate = false;
                    } else {
                        matchesDate = false;
                    }
                } catch (e) {
                    console.error('Error parsing date for ticket:', t.id, t.data_atualizacao);
                    matchesDate = false;
                }
            } else if ((dataInicio || dataFim) && !t.data_atualizacao) {
                matchesDate = false;
            }

            const matchesDropdowns = matchesTecnico && matchesGrupo && matchesLocalidade && matchesDate;

            if (matchesDropdowns && matchesSearch) {
                this.filteredTickets.push(t);
            }
            if (matchesDropdowns) {
                this.cloudTickets.push(t);
            }
        });

        this.currentPage = 1;

        console.log('Filtered tickets count:', this.filteredTickets.length);
        if (this.currentView === 'dashboard' || this.currentView === 'tickets') {
            this.renderTable();
        } else if (this.currentView === 'teams') {
            this.renderTeams();
        }

        this.updateStats();
        this.updateCharts();
        this.updateMapMarkers();

        // Reset scroll after filtering to ensure user sees the update
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
            console.log('Scroll reset to top after filtering');
        }
    }
}

// Start Dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
