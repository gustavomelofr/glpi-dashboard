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
            purple: '#7c4dff',
            teal: '#2dd4bf',
            orange: '#fb923c',
            blue: '#3b82f6',
            green: '#10b981',
            red: '#ef4444',
            bg: '#effaf8'
        };

        // Set up event listeners
        const addListener = (id, event, callback) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, callback);
        };

        addListener('refresh-btn', 'click', () => this.fetchData());

        const search = document.getElementById('ticket-search');
        if (search) {
            search.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.filterTickets();
            });
        }

        const searchFull = document.getElementById('ticket-search-full');
        if (searchFull) {
            searchFull.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.filterTickets();
            });
        }

        addListener('apply-filters', 'click', () => {
            this.filterTickets();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.scrollTop = 0;
        });

        addListener('clear-filters', 'click', () => this.resetFilters());

        // Nav listeners
        addListener('nav-dashboard', 'click', (e) => { e.preventDefault(); this.switchView('dashboard'); this.closeSidebar(); });
        addListener('nav-tickets', 'click', (e) => { e.preventDefault(); this.switchView('tickets'); this.closeSidebar(); });
        addListener('nav-teams', 'click', (e) => { e.preventDefault(); this.switchView('teams'); this.closeSidebar(); });
        addListener('nav-reports', 'click', (e) => { e.preventDefault(); this.switchView('reports'); this.closeSidebar(); });
        addListener('nav-finance', 'click', (e) => { e.preventDefault(); this.switchView('finance'); this.closeSidebar(); });
        addListener('nav-equipamentos', 'click', (e) => { e.preventDefault(); this.switchView('equipamentos'); this.closeSidebar(); });
        addListener('nav-tecnicos', 'click', (e) => { e.preventDefault(); this.switchView('tecnicos'); this.closeSidebar(); });

        // Mobile Sidebar Toggle
        const mobileBtn = document.getElementById('mobile-menu-btn');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.classList.toggle('open');
            });
        }

        // Theme Setup
        this.initTheme();
        addListener('theme-toggle', 'click', () => this.toggleTheme());

        // Sidebar Setup
        this.initSidebar();
        addListener('sidebar-toggle', 'click', () => this.toggleSidebar());

        // Initial fetch
        await this.fetchData();
        await this.fetchEquipamentos();

        // Initialize Map after first fetch
        this.initMap();
        
        // Hide loader after all initial data is ready
        this.hideLoader();
    }

    hideLoader() {
        const loader = document.getElementById('loader-wrapper');
        if (loader) {
            // Apply a slight delay to ensure smooth transition and give a "premium" feel
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.visibility = 'hidden';
                // Remove from DOM after transition to avoid any interaction issues
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.remove();
                    }
                }, 500);
            }, 800); 
        }
    }

    switchView(view) {
        this.currentView = view;
        const views = ['dashboard-view', 'tickets-view', 'teams-view', 'tecnicos-view', 'reports-view', 'finance-view', 'equipamentos-view'];
        const navs = ['nav-dashboard', 'nav-tickets', 'nav-teams', 'nav-tecnicos', 'nav-reports', 'nav-finance', 'nav-equipamentos'];
        views.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        navs.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('active'); });

        const viewTitle = document.getElementById('view-title');
        const filterBar = document.querySelector('.filter-bar');
        if (filterBar) filterBar.style.display = view === 'equipamentos' ? 'none' : '';

        if (view === 'dashboard') {
            document.getElementById('dashboard-view').style.display = 'block';
            document.getElementById('nav-dashboard').classList.add('active');
            viewTitle.innerText = 'Dashboard';
            this.renderTable();
        } else if (view === 'tickets') {
            document.getElementById('tickets-view').style.display = 'block';
            document.getElementById('nav-tickets').classList.add('active');
            viewTitle.innerText = 'Chamados';
            this.renderTable();
        } else if (view === 'teams') {
            document.getElementById('teams-view').style.display = 'block';
            document.getElementById('nav-teams').classList.add('active');
            viewTitle.innerText = 'Times';
            this.renderTeams();
        } else if (view === 'tecnicos') {
            document.getElementById('tecnicos-view').style.display = 'block';
            document.getElementById('nav-tecnicos').classList.add('active');
            viewTitle.innerText = 'Técnicos';
            this.renderTecnicos();
        } else if (view === 'reports') {
            document.getElementById('reports-view').style.display = 'block';
            document.getElementById('nav-reports').classList.add('active');
            viewTitle.innerText = 'Relatórios';
            this.showReportsMain();
        } else if (view === 'finance') {
            document.getElementById('finance-view').style.display = 'block';
            document.getElementById('nav-finance').classList.add('active');
            viewTitle.innerText = 'Financeiro';
            this.renderFinance();
        } else if (view === 'equipamentos') {
            document.getElementById('equipamentos-view').style.display = 'block';
            document.getElementById('nav-equipamentos').classList.add('active');
            viewTitle.innerText = 'Equipamentos';
            this.renderEquipamentos();
        }
        this.currentPage = 1;
    }

    showReportsMain() {
        document.getElementById('reports-main-view').style.display = 'block';
        document.getElementById('reports-detail-view').style.display = 'none';
        this.renderReports();
    }

    // ─── Equipamentos ───────────────────────────────────────────────

    async fetchEquipamentos() {
        try {
            const [computadores, monitores] = await Promise.all([
                this.fetchAll('computadores_glpi', '*', 'nome.asc'),
                this.fetchAll('monitores_glpi', '*', 'nome.asc')
            ]);
            this.computadores = computadores;
            this.monitores = monitores;
        } catch (err) {
            console.error('Erro ao buscar equipamentos:', err);
            this.computadores = this.computadores || [];
            this.monitores = this.monitores || [];
        }

        // Populate entidade filter with all unique values from both tables
        const entidades = [...new Set([
            ...(this.computadores || []).map(c => c.entidade),
            ...(this.monitores || []).map(m => m.entidade)
        ].filter(Boolean).sort())];

        const sel = document.getElementById('eq-filter-entidade');
        if (sel) {
            sel.innerHTML = '<option value="">Todas as Entidades</option>';
            entidades.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e;
                opt.textContent = e;
                sel.appendChild(opt);
            });
        }

        // Update stat cards
        const totalComp = (this.computadores || []).length;
        const totalAtivo = (this.computadores || []).filter(c => c.ativo === true).length;
        const totalMon = (this.monitores || []).length;
        const elC = document.getElementById('eq-total-computadores');
        const elA = document.getElementById('eq-ativos');
        const elM = document.getElementById('eq-total-monitores');
        if (elC) elC.innerText = totalComp;
        if (elA) elA.innerText = totalAtivo;
        if (elM) elM.innerText = totalMon;

        // Pre-filtered copies
        this.filteredComputadores = [...(this.computadores || [])];
        this.filteredMonitores = [...(this.monitores || [])];

        // Pagination state
        this.eqPageComp = 1;
        this.eqPageMon = 1;
        this.eqPerPage = 15;
    }

    filterEquipamentos() {
        const query = (document.getElementById('eq-search')?.value || '').toLowerCase();
        const entidade = document.getElementById('eq-filter-entidade')?.value || '';

        this.filteredComputadores = (this.computadores || []).filter(c => {
            const matchQ = !query || [c.nome, c.usuario, c.modelo, c.fabricante, c.entidade, c.ip].some(f => (f || '').toLowerCase().includes(query));
            const matchE = !entidade || c.entidade === entidade;
            return matchQ && matchE;
        });

        this.filteredMonitores = (this.monitores || []).filter(m => {
            const matchQ = !query || [m.nome, m.usuario, m.modelo, m.fabricante, m.entidade].some(f => (f || '').toLowerCase().includes(query));
            const matchE = !entidade || m.entidade === entidade;
            return matchQ && matchE;
        });

        this.eqPageComp = 1;
        this.eqPageMon = 1;
        this.renderEquipamentos();
    }

    switchEquipamentoTab(tab) {
        document.getElementById('eq-panel-computadores').style.display = tab === 'computadores' ? 'block' : 'none';
        document.getElementById('eq-panel-monitores').style.display = tab === 'monitores' ? 'block' : 'none';
        document.getElementById('tab-computadores').classList.toggle('active', tab === 'computadores');
        document.getElementById('tab-monitores').classList.toggle('active', tab === 'monitores');
        this.currentEquipamentoTab = tab;
    }

    renderEquipamentos() {
        if (!this.computadores) return; // not yet loaded

        const compData = this.filteredComputadores || this.computadores;
        const monData = this.filteredMonitores || this.monitores;

        // ── Computadores table ──
        const compBody = document.getElementById('eq-body-computadores');
        const pgComp = document.getElementById('eq-pagination-computadores');
        const pageC = this.eqPageComp || 1;
        const perPage = this.eqPerPage || 15;
        const startC = (pageC - 1) * perPage;
        const pageDataC = compData.slice(startC, startC + perPage);

        if (compBody) {
            if (pageDataC.length === 0) {
                compBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">Nenhum computador encontrado.</td></tr>';
            } else {
                compBody.innerHTML = pageDataC.map(c => {
                    const ativo = c.ativo === true;
                    const badge = ativo
                        ? '<span class="eq-badge eq-badge-ativo">Ativo</span>'
                        : '<span class="eq-badge eq-badge-inativo">Inativo</span>';
                    return `<tr>
                        <td><strong>${c.nome || '—'}</strong></td>
                        <td>${c.tipo || '—'}</td>
                        <td>${[c.fabricante, c.modelo].filter(Boolean).join(' / ') || '—'}</td>
                        <td>${c.usuario || '—'}</td>
                        <td style="font-size:0.8rem;">${c.entidade || '—'}</td>
                        <td style="font-size:0.8rem;">${c.sistema_operacional || '—'}</td>
                        <td>${badge}</td>
                    </tr>`;
                }).join('');
            }
        }

        // Pagination for computadores
        if (pgComp) {
            const total = compData.length;
            const pages = Math.ceil(total / perPage);
            pgComp.innerHTML = `<span>${startC + 1}–${Math.min(startC + perPage, total)} de ${total}</span>`;
            if (pages > 1) {
                const prev = document.createElement('button');
                prev.className = 'pg-btn'; prev.innerText = '←';
                prev.disabled = pageC === 1;
                prev.onclick = () => { this.eqPageComp--; this.renderEquipamentos(); };
                const next = document.createElement('button');
                next.className = 'pg-btn'; next.innerText = '→';
                next.disabled = pageC >= pages;
                next.onclick = () => { this.eqPageComp++; this.renderEquipamentos(); };
                pgComp.appendChild(prev);
                pgComp.appendChild(next);
            }
        }

        // ── Monitores table ──
        const monBody = document.getElementById('eq-body-monitores');
        const pgMon = document.getElementById('eq-pagination-monitores');
        const pageM = this.eqPageMon || 1;
        const startM = (pageM - 1) * perPage;
        const pageDataM = monData.slice(startM, startM + perPage);

        if (monBody) {
            if (pageDataM.length === 0) {
                monBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">Nenhum monitor encontrado.</td></tr>';
            } else {
                monBody.innerHTML = pageDataM.map(m => `<tr>
                    <td><strong>${m.nome || '—'}</strong></td>
                    <td>${[m.fabricante, m.modelo].filter(Boolean).join(' / ') || '—'}</td>
                    <td>${m.usuario || '—'}</td>
                    <td style="font-size:0.8rem;">${m.entidade || '—'}</td>
                    <td style="font-size:0.8rem;">${m.ultima_atualizacao || '—'}</td>
                </tr>`).join('');
            }
        }

        if (pgMon) {
            const total = monData.length;
            const pages = Math.ceil(total / perPage);
            pgMon.innerHTML = `<span>${startM + 1}–${Math.min(startM + perPage, total)} de ${total}</span>`;
            if (pages > 1) {
                const prev = document.createElement('button');
                prev.className = 'pg-btn'; prev.innerText = '←';
                prev.disabled = pageM === 1;
                prev.onclick = () => { this.eqPageMon--; this.renderEquipamentos(); };
                const next = document.createElement('button');
                next.className = 'pg-btn'; next.innerText = '→';
                next.disabled = pageM >= pages;
                next.onclick = () => { this.eqPageMon++; this.renderEquipamentos(); };
                pgMon.appendChild(prev);
                pgMon.appendChild(next);
            }
        }

        lucide.createIcons({ props: { size: 14 }, nameAttr: 'data-lucide' });
    }

    // ─── Finance ─────────────────────────────────────────────────────

    renderFinance() {
        const tickets = this.filteredTickets;
        
        // Calculate Metrics
        const costs = tickets.map(t => parseFloat(t.custo_fixo) || 0);
        const totalCost = costs.reduce((a, b) => a + b, 0);
        const avgCost = totalCost / (tickets.length || 1);
        const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

        const elTotalCost = document.getElementById('fin-total-cost');
        const elAvgCost = document.getElementById('fin-avg-cost');
        const elMaxCost = document.getElementById('fin-max-cost');

        if (elTotalCost) elTotalCost.innerText = totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elAvgCost) elAvgCost.innerText = avgCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (elMaxCost) elMaxCost.innerText = maxCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        this.renderFinanceEvolutionChart();
        this.renderFinanceEntityChart();
        this.renderFinanceGroupChart();
        this.renderFinanceTable();
    }

    renderFinanceEvolutionChart() {
        const ctx = document.getElementById('financeEvolutionChart')?.getContext('2d');
        if (!ctx) return;

        // Group by month
        const monthlyCosts = {};
        this.filteredTickets.forEach(t => {
            const dateStr = t.data_atualizacao || t.inserido_em;
            if (!dateStr) return;

            const parts = dateStr.split(' ');
            const dateParts = parts[0].split('-');
            if (dateParts.length !== 3) return;

            // Handle DD-MM-YYYY format from data_atualizacao
            const d = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            if (isNaN(d.getTime())) return;

            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

            if (!monthlyCosts[monthKey]) {
                monthlyCosts[monthKey] = { label: monthLabel, total: 0 };
            }
            monthlyCosts[monthKey].total += parseFloat(t.custo_fixo) || 0;
        });

        const sortedKeys = Object.keys(monthlyCosts).sort();
        const labels = sortedKeys.map(k => monthlyCosts[k].label);
        const data = sortedKeys.map(k => monthlyCosts[k].total);

        if (this.charts.financeEvolution) this.charts.financeEvolution.destroy();

        this.charts.financeEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Custo Total',
                    data: data,
                    borderColor: this.colors.blue,
                    backgroundColor: this.colors.blue + '22',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: { callback: value => 'R$ ' + value.toLocaleString('pt-BR') }
                    }
                }
            }
        });
    }

    renderFinanceEntityChart() {
        const ctx = document.getElementById('financeEntityChart')?.getContext('2d');
        if (!ctx) return;

        const entities = {};
        this.filteredTickets.forEach(t => {
            const ent = t.entidade || 'Não informada';
            entities[ent] = (entities[ent] || 0) + (parseFloat(t.custo_fixo) || 0);
        });

        const sortedEntities = Object.entries(entities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (this.charts.financeEntity) this.charts.financeEntity.destroy();

        this.charts.financeEntity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedEntities.map(e => e[0].substring(0, 15)),
                datasets: [{
                    label: 'Custo por Entidade',
                    data: sortedEntities.map(e => e[1]),
                    backgroundColor: this.colors.purple
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    renderFinanceGroupChart() {
        const ctx = document.getElementById('financeGroupChart')?.getContext('2d');
        if (!ctx) return;

        const groups = {};
        this.filteredTickets.forEach(t => {
            const g = t.grupo || 'Sem Grupo';
            groups[g] = (groups[g] || 0) + (parseFloat(t.custo_fixo) || 0);
        });

        const sortedGroups = Object.entries(groups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (this.charts.financeGroup) this.charts.financeGroup.destroy();

        this.charts.financeGroup = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedGroups.map(g => g[0]),
                datasets: [{
                    data: sortedGroups.map(g => g[1]),
                    backgroundColor: [this.colors.blue, this.colors.orange, this.colors.green, this.colors.purple, this.colors.red],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    renderFinanceTable() {
        const tableBody = document.getElementById('finance-table-body');
        if (!tableBody) return;

        // Reuse pagination logic pattern but for finance
        const itemsPerPage = 10;
        const page = this.finPage || 1;
        const start = (page - 1) * itemsPerPage;
        const pageData = this.filteredTickets.slice(start, start + itemsPerPage);

        tableBody.innerHTML = pageData.map(t => {
            const cost = parseFloat(t.custo_fixo) || 0;
            return `<tr>
                <td>#${t.id}</td>
                <td title="${t.titulo}"><strong>${t.titulo?.substring(0, 30)}...</strong></td>
                <td>${t.entidade || 'N/A'}</td>
                <td>${t.grupo || 'N/A'}</td>
                <td>${t.data_atualizacao?.split(' ')[0] || 'N/A'}</td>
                <td style="font-weight: 700; color: var(--primary);">R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>`;
        }).join('');

        const total = this.filteredTickets.length;
        document.getElementById('fin-pagination-info').innerText = `Mostrando ${start + 1} - ${Math.min(start + itemsPerPage, total)} de ${total}`;
        
        // Simple pagination
        const controls = document.getElementById('fin-pagination-controls');
        controls.innerHTML = '';
        const pages = Math.ceil(total / itemsPerPage);
        if (pages > 1) {
            const prev = document.createElement('button');
            prev.className = 'pg-btn'; prev.innerHTML = '<i data-lucide="chevron-left"></i>';
            prev.disabled = page === 1;
            prev.onclick = () => { this.finPage = page - 1; this.renderFinanceTable(); };
            
            const next = document.createElement('button');
            next.className = 'pg-btn'; next.innerHTML = '<i data-lucide="chevron-right"></i>';
            next.disabled = page >= pages;
            next.onclick = () => { this.finPage = page + 1; this.renderFinanceTable(); };
            
            controls.appendChild(prev);
            controls.appendChild(next);
            lucide.createIcons({ props: { size: 14 }, nameAttr: 'data-lucide' });
        }
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

    initSidebar() {
        const isMinimized = localStorage.getItem('sidebar-minimized') === 'true';
        if (isMinimized) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.add('minimized');
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const isMinimized = sidebar.classList.toggle('minimized');
            localStorage.setItem('sidebar-minimized', isMinimized);
            
            // Trigger window resize to help Chart.js and other layout-dependent components
            setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
        }
    }

    renderReports() {
        const grid = document.getElementById('reports-month-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const monthlyData = {};
        this.tickets.forEach(ticket => {
            // Filtrar apenas chamados com status 'Fechado' para o relatório mensal
            const isClosed = ticket.status === 'Fechado';
            if (!isClosed) return;

            const dateStr = ticket.data_atualizacao;
            if (!dateStr) return;

            const parts = dateStr.split(' ');
            const dateParts = parts[0].split('-');
            if (dateParts.length !== 3) return;

            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const yearVal = parseInt(dateParts[2]);
            
            // Usar construtor numérico para evitar problemas de fuso horário com strings ISO
            const d = new Date(yearVal, month - 1, day);
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

        // Calculate Monthly Finances
        const totalCost = data.tickets.reduce((sum, t) => sum + (parseFloat(t.custo_fixo) || 0), 0);
        const avgCost = totalCost / (data.tickets.length || 1);
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

        // Add Financial Summary Header
        const summaryCard = document.createElement('div');
        summaryCard.className = 'glass-card';
        summaryCard.style.padding = '24px';
        summaryCard.style.marginBottom = '24px';
        summaryCard.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)';
        summaryCard.style.color = 'white';
        summaryCard.style.border = 'none';

        summaryCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button onclick="dashboard.switchView('relatorios')" class="action-icon" style="background: rgba(255,255,255,0.2); color: white; border: none; width: 32px; height: 32px;">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    <div>
                        <span style="font-size: 0.8rem; opacity: 0.8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Relatório de Atividades</span>
                        <h2 style="font-size: 1.8rem; margin: 0;">${data.label}</h2>
                    </div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button onclick="dashboard.downloadExcel('${monthKey}')" class="glass-card" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 10px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <i data-lucide="file-spreadsheet"></i>
                        Baixar Excel
                    </button>
                    <button onclick="dashboard.downloadPDF('${monthKey}')" class="glass-card" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 10px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <i data-lucide="file-down"></i>
                        Baixar PDF
                    </button>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                <div>
                    <span style="font-size: 0.8rem; opacity: 0.8; font-weight: 500; text-transform: uppercase;">Investimento Total</span>
                    <h2 style="font-size: 1.8rem; margin-top: 4px;">${formatter.format(totalCost)}</h2>
                </div>
                <div>
                    <span style="font-size: 0.8rem; opacity: 0.8; font-weight: 500; text-transform: uppercase;">Ticket Médio</span>
                    <h3 style="font-size: 1.4rem; margin-top: 4px;">${formatter.format(avgCost)}</h3>
                </div>
                <div>
                    <span style="font-size: 0.8rem; opacity: 0.8; font-weight: 500; text-transform: uppercase;">Volume de Chamados</span>
                    <h3 style="font-size: 1.4rem; margin-top: 4px;">${data.tickets.length}</h3>
                </div>
            </div>
        `;
        container.appendChild(summaryCard);

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';

        data.tickets.forEach(ticket => {
            const statusClass = this.getStatusClass(ticket.status);
            const prioClass = this.getPrioClass(ticket.prioridade);
            const cost = parseFloat(ticket.custo_fixo) || 0;

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
                        <span><i data-lucide="tag" style="width: 12px; display: inline; margin-right: 4px;"></i>${ticket.categoria || 'N/A'}</span>
                        <span><i data-lucide="map-pin" style="width: 12px; display: inline; margin-right: 4px;"></i>${ticket.entidade || 'N/A'}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    ${cost > 0 ? `<span style="font-weight: 700; color: var(--secondary); font-size: 0.85rem; background: rgba(45, 212, 191, 0.1); padding: 4px 8px; border-radius: 6px;">${formatter.format(cost)}</span>` : ''}
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

    downloadPDF(monthKey) {
        const data = this.monthlyData[monthKey];
        if (!data) return;

        // Use window.jspdf if using UMD
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

        // Total Cost Calculation
        const totalCost = data.tickets.reduce((sum, t) => sum + (parseFloat(t.custo_fixo) || 0), 0);
        const avgCost = totalCost / (data.tickets.length || 1);

        // PDF Header
        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.text("Relatório de Chamados - SEDES", 14, 22);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Período: ${data.label}`, 14, 32);
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 38);

        // Summary Box
        doc.setDrawColor(200);
        doc.setFillColor(245, 247, 250);
        doc.rect(14, 45, 182, 25, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("INVESTIMENTO TOTAL", 20, 52);
        doc.text("TICKET MÉDIO", 80, 52);
        doc.text("TOTAL DE CHAMADOS", 140, 52);

        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text(formatter.format(totalCost), 20, 62);
        doc.text(formatter.format(avgCost), 80, 62);
        doc.text(data.tickets.length.toString(), 140, 62);

        // Table Data
        const tableRows = data.tickets.map(t => [
            `#${t.id}`,
            t.titulo || 'Sem título',
            t.categoria || 'N/A',
            t.entidade || 'N/A',
            t.prioridade || 'Média',
            t.status || 'Novo',
            formatter.format(parseFloat(t.custo_fixo) || 0)
        ]);

        doc.autoTable({
            startY: 80,
            head: [['ID', 'Título', 'Categoria', 'Entidade', 'Prioridade', 'Status', 'Custo']],
            body: tableRows,
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { top: 80 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 'auto' },
                6: { halign: 'right', cellWidth: 25 }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }

        doc.save(`Relatorio_Chamados_${data.label.replace(' ', '_')}.pdf`);
    }

    downloadExcel(monthKey) {
        const data = this.monthlyData[monthKey];
        if (!data) return;

        const results = data.tickets.map(t => ({
            'ID': t.id,
            'Título': t.titulo || 'Sem título',
            'Categoria': t.categoria || 'N/A',
            'Entidade': t.entidade || 'N/A',
            'Prioridade': t.prioridade || 'Média',
            'Status': t.status || 'Novo',
            'Técnico': t.tecnico || '-',
            'Grupo': t.grupo || '-',
            'Data': t.data_atualizacao || '-',
            'Custo': parseFloat(t.custo_fixo) || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(results);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados");

        // Largura das colunas
        const colWidths = [
            { wch: 15 }, // ID
            { wch: 40 }, // Título
            { wch: 30 }, // Categoria
            { wch: 30 }, // Entidade
            { wch: 15 }, // Prioridade
            { wch: 15 }, // Status
            { wch: 20 }, // Técnico
            { wch: 20 }, // Grupo
            { wch: 20 }, // Data
            { wch: 12 }  // Custo
        ];
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `Relatorio_Chamados_${data.label.replace(' ', '_')}.xlsx`);
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
        
        if (btn) {
            btn.innerHTML = isDark ?
                '<i data-lucide="sun"></i>' :
                '<i data-lucide="moon"></i>';
        }
        
        lucide.createIcons();

        // Update Chart defaults for theme
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
            Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
        }
    }

    async fetchAll(tableName, select = '*', order = 'id.desc') {
        let allData = [];
        let offset = 0;
        const limit = 1000;
        const headers = { 
            'apikey': this.config.SUPABASE_KEY, 
            'Authorization': `Bearer ${this.config.SUPABASE_KEY}` 
        };

        console.log(`Fetching all records from ${tableName}...`);

        while (true) {
            const url = `${this.config.SUPABASE_URL}/rest/v1/${tableName}?select=${select}&order=${order}&limit=${limit}&offset=${offset}`;
            const response = await fetch(url, { headers });

            if (!response.ok) {
                console.error(`Error fetching ${tableName}:`, response.status, response.statusText);
                throw new Error(`Falha ao buscar dados de ${tableName}`);
            }

            const data = await response.json();
            allData = allData.concat(data);

            if (data.length < limit) break;
            offset += limit;
        }
        
        console.log(`Total ${tableName} fetched: ${allData.length}`);
        return allData;
    }

    async fetchData() {
        const statusText = document.getElementById('status-text');
        const statusDot = document.querySelector('.status-dot');

        try {
            statusText.innerText = 'Sincronizando...';
            statusDot.className = 'status-dot';
            
            // Fetch all from Supabase via helper
            this.tickets = await this.fetchAll(this.config.TABLE_NAME, '*', 'id.desc');
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
        console.log('--- updateStats called ---', total);
        
        if (total === 0 && this.tickets.length > 0) {
            console.warn('WARNING: filteredTickets is 0 but tickets is not! Why?');
        }

        const open = this.filteredTickets.filter(t => t.status?.toLowerCase().includes('aberto') || t.status?.toLowerCase().includes('novo')).length;
        const pending = this.filteredTickets.filter(t => t.status?.toLowerCase().includes('pendente') || t.status === '4').length;
        const closed = this.filteredTickets.filter(t => t.status?.toLowerCase().includes('fechado') || t.status?.toLowerCase().includes('solucionado')).length;

        const elTotal = document.getElementById('stat-total');
        const elOpen = document.getElementById('stat-open');
        const elPending = document.getElementById('stat-pending');
        const elClosed = document.getElementById('stat-closed');

        if (elTotal) elTotal.innerText = total;
        if (elOpen) elOpen.innerText = open;
        if (elPending) elPending.innerText = pending;
        if (elClosed) elClosed.innerText = closed;
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
                <td title="${ticket.categoria}"><strong>${ticket.categoria?.substring(0, 35)}${ticket.categoria?.length > 35 ? '...' : ''}</strong></td>
                <td class="${prioClass}">${ticket.prioridade || 'Média'}</td>
                <td><span class="status-badge ${statusClass}">${ticket.status}</span></td>
                <td>${ticket.data_atualizacao || '-'}</td>
            `;
            tableBody.appendChild(rowShort);

            // Row for Full View (Details)
            const rowFull = document.createElement('tr');
            rowFull.innerHTML = `
                <td>#${ticket.id}</td>
                <td><strong>${ticket.titulo}</strong></td>
                <td title="${ticket.categoria}">${ticket.categoria || 'N/A'}</td>
                <td>${ticket.tecnico || '-'}</td>
                <td>${ticket.grupo || '-'}</td>
                <td>${ticket.entidade || '-'}</td>
                <td class="${prioClass}">${ticket.prioridade || 'Média'}</td>
                <td><span class="status-badge ${statusClass}">${ticket.status}</span></td>
                <td>${ticket.data_atualizacao || '-'}</td>
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

    renderTecnicos() {
        const container = document.getElementById('tecnicos-container');
        const rankingContainer = document.getElementById('tecnicos-ranking');
        if (!container || !rankingContainer) return;
        container.innerHTML = '';
        rankingContainer.innerHTML = '';

        // Group tickets by technician
        const excludedTechs = [
            "Luciana Torrezan",
            "Elton Santos Batista",
            "Francisco Stanley Hicardo de Oliveira Farias",
            "Débora Lima Jardim Franco",
            "Weverton dos Santos Luciano",
            "Andrezza Barbosa",
            "Andre Rangel Fernandes"
        ];

        const techs = {};
        this.filteredTickets.forEach(t => {
            const tName = t.tecnico || 'Sem Atribuição';
            if (excludedTechs.includes(tName)) return;

            if (!techs[tName]) {
                techs[tName] = { name: tName, total: 0, open: 0, closed: 0 };
            }
            techs[tName].total++;
            if (t.status === 'Fechado' || t.status === 'Solucionado') {
                techs[tName].closed++;
            } else {
                techs[tName].open++;
            }
        });

        // Convert to array and sort by closed (performance)
        const sortedTechs = Object.values(techs).sort((a, b) => b.closed - a.closed || b.total - a.total);

        // Render Ranking (Top 3)
        if (sortedTechs.length > 0) {
            const rankingHeader = document.createElement('div');
            rankingHeader.className = 'chart-header';
            rankingHeader.style.marginBottom = '20px';
            rankingHeader.innerHTML = `
                <h3>🏆 Produtividade Técnica</h3>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Ranking por chamados solucionados</div>
            `;
            rankingContainer.appendChild(rankingHeader);

            const podium = document.createElement('div');
            podium.style.display = 'flex';
            podium.style.gap = '16px';
            podium.style.marginBottom = '24px';
            podium.style.flexWrap = 'wrap';

            sortedTechs.slice(0, 3).forEach((tech, index) => {
                const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                const initials = tech.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                
                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.flex = '1';
                card.style.minWidth = '240px';
                card.style.borderLeft = `4px solid ${medalColors[index]}`;
                card.style.display = 'flex';
                card.style.alignItems = 'center';
                card.style.gap = '16px';
                card.style.padding = '20px';
                card.style.position = 'relative';
                card.style.overflow = 'hidden';
                
                card.innerHTML = `
                    <div style="position: absolute; right: -10px; top: -10px; font-size: 4rem; font-weight: 900; color: rgba(255,255,255,0.03); z-index: 0;">#${index + 1}</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: ${medalColors[index]}; min-width: 45px; z-index: 1;">#${index + 1}</div>
                    <div style="flex: 1; z-index: 1;">
                        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main); margin-bottom: 2px;">${tech.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">${tech.closed} resolvidos</div>
                    </div>
                    <div class="icon-circle" style="background: ${medalColors[index]}20; color: ${medalColors[index]}; width: 40px; height: 40px; min-width: 40px; z-index: 1;">
                        <i data-lucide="award"></i>
                    </div>
                `;
                podium.appendChild(card);
            });
            rankingContainer.appendChild(podium);
        }

        // Render Grid
        sortedTechs.forEach(tech => {
            const card = document.createElement('div');
            card.className = 'team-card glass-card';

            const openPercent = tech.total > 0 ? (tech.open / tech.total * 100).toFixed(0) : 0;
            const closedPercent = tech.total > 0 ? (tech.closed / tech.total * 100).toFixed(0) : 0;

            card.innerHTML = `
                <div class="team-card-header">
                    <div class="team-icon">
                        <i data-lucide="user-cog"></i>
                    </div>
                    <div class="team-info">
                        <h3>${tech.name}</h3>
                        <span>${tech.total} Chamados Totais</span>
                    </div>
                </div>
                <div class="team-stats">
                    <div class="team-stat-item">
                        <span class="label">Abertos <span>${tech.open}</span></span>
                        <div class="progress-bar"><div class="progress" style="width: ${openPercent}%; background: #ef4444;"></div></div>
                    </div>
                    <div class="team-stat-item">
                        <span class="label">Fechados <span>${tech.closed}</span></span>
                        <div class="progress-bar"><div class="progress" style="width: ${closedPercent}%; background: #10b981;"></div></div>
                    </div>
                </div>
                <div style="margin-top: 16px;">
                    <button class="btn-premium" style="width: 100%; justify-content: center;" onclick="dashboard.filterByTech('${tech.name}')">
                        Ver Atividades
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    filterByTech(techName) {
        const filterEl = document.getElementById('filter-tecnico');
        if (filterEl) {
            filterEl.value = (techName === 'Sem Atribuição' || techName === 'Sem Técnico') ? '' : techName;
        }
        this.filterTickets();
        this.switchView('tickets');
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
        this.renderCharts(); // Base charts
        this.renderMiniCharts(); // MIGHTY mini charts
        if (this.currentView === 'finance') {
            this.renderFinance();
        }
    }

    renderMiniCharts() {
        const miniCharts = ['total', 'open', 'pending', 'closed'];
        miniCharts.forEach(type => {
            const ctx = document.getElementById(`chart-mini-${type}`)?.getContext('2d');
            if (!ctx) return;

            if (this.charts[`mini-${type}`]) this.charts[`mini-${type}`].destroy();

            // Randomish data for the "trend" look from inspiration
            const data = Array.from({ length: 7 }, () => Math.floor(Math.random() * 50) + 10);
            
            this.charts[`mini-${type}`] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['', '', '', '', '', '', ''],
                    datasets: [{
                        data: data,
                        backgroundColor: type === 'total' ? this.colors.purple : 
                                        (type === 'open' ? this.colors.teal : 
                                        (type === 'pending' ? this.colors.orange : this.colors.green)),
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false, beginAtZero: true }
                    }
                }
            });
        });
    }

    renderCharts() {
        this.renderCriticalAlerts();
        try { this.renderStatusChart(); } catch(e) { console.error(e); }
        try { this.renderPriorityGroupChart(); } catch(e) { console.error(e); }
        this.renderLeaderboard();
        try { this.renderLocationStatusChart(); } catch(e) { console.error(e); }
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
        const el = document.getElementById('statusChart');
        if (!el) return;
        const ctx = el.getContext('2d');

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
        const statuses = [...new Set(this.tickets.map(t => t.status).filter(Boolean))].sort();

        this.updateSelect('filter-tecnico', tecnicos, 'Todos os Técnicos');
        this.updateSelect('filter-grupo', grupos, 'Todos os Grupos');
        this.updateSelect('filter-localidade', unidades, 'Todas as Localidades');
        this.updateSelect('filter-status', statuses, 'Todos os Status');
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
        document.getElementById('filter-status').value = '';
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
        const status = document.getElementById('filter-status').value;
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
                (t.categoria && t.categoria.toLowerCase().includes(query)) ||
                (t.requerente && t.requerente.toLowerCase().includes(query));

            const matchesTecnico = !tecnico || t.tecnico === tecnico;
            const matchesGrupo = !grupo || t.grupo === grupo;
            const matchesLocalidade = !localidade || t.entidade === localidade;
            const matchesStatus = !status || t.status === status;

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

            const matchesDropdowns = matchesTecnico && matchesGrupo && matchesLocalidade && matchesStatus && matchesDate;

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
        } else if (this.currentView === 'tecnicos') {
            this.renderTecnicos();
        } else if (this.currentView === 'finance') {
            this.renderFinance();
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
