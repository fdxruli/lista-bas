class AttendanceApp {
    constructor() {
        if (!this.cacheElements()) {
            console.error('No se pudo inicializar la aplicación - elementos DOM faltantes');
            return;
        }

        this.initState();
        this.bindEvents();
        this.loadInitialTab();
    }

    cacheElements() {
        this.el = {
            tabsContainer: document.querySelector('.tabs-container'),
            tabs: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content'),
            personNameInput: document.getElementById('personName'),
            addPersonBtn: document.getElementById('addPersonBtn'),
            personList: document.getElementById('personList'),
            startAttendanceBtn: document.getElementById('startAttendanceBtn'),
            shareAttendanceBtn: document.getElementById('shareAttendanceBtn'),
            finishAttendanceBtn: document.getElementById('finishAttendanceBtn'),
            attendanceList: document.getElementById('attendanceList'),
            presentCount: document.getElementById('presentCount'),
            absentCount: document.getElementById('absentCount'),
            shareDebtsBtn: document.getElementById('shareDebtsBtn'),
            debtsList: document.getElementById('debtsList'),
            totalDebt: document.getElementById('totalDebt'),
            debtorsCount: document.getElementById('debtorsCount'),
            clearAllDataBtn: document.getElementById('clearAllDataBtn'),
            historyList: document.getElementById('historyList')
        };

        const criticalElements = [
            'tabsContainer', 'personNameInput', 'personList', 'addPersonBtn'
        ];

        for (const elementName of criticalElements) {
            if (!this.el[elementName]) {
                console.error(`Elemento crítico no encontrado: ${elementName}`);
                return false;
            }
        }

        return true;
    }

    initState() {
        this.people = this.loadFromStorage('people') || [];
        this.attendanceHistory = this.loadFromStorage('attendanceHistory') || [];
        this.currentAttendance = null;
        this.weeklyPermissions = this.loadFromStorage('weeklyPermissions') || {};
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error cargando ${key} del localStorage:`, error);
            return null;
        }
    }

    bindEvents() {
        this.el.tabsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                this.showTab(e.target.dataset.tab);
            }
        });

        this.el.addPersonBtn.addEventListener('click', () => this.addPerson());
        this.el.personNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPerson();
        });

        // Evento para manejar el pegado de múltiples nombres
        this.el.personNameInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            this.processMultipleNames(pastedText);
        });

        this.el.personList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-person')) {
                const personId = e.target.dataset.personId;
                this.removePerson(personId);
            }
        });

        this.el.startAttendanceBtn.addEventListener('click', () => this.startAttendance());
        this.el.shareAttendanceBtn.addEventListener('click', () => this.shareAttendance());
        this.el.finishAttendanceBtn.addEventListener('click', () => this.finishAttendance());

        this.el.attendanceList.addEventListener('click', (e) => {
            const personId = e.target.dataset.personId;
            if (!personId) return;

            if (e.target.classList.contains('btn-present')) {
                this.markAttendance(personId, 'present');
            } else if (e.target.classList.contains('btn-absent')) {
                this.markAttendance(personId, 'absent');
            } else if (e.target.classList.contains('btn-permission')) {
                this.markAttendance(personId, 'permission');
            }
        });

        this.el.shareDebtsBtn.addEventListener('click', () => this.shareDebts());
        this.el.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    }

    processMultipleNames(text) {
        const names = text.split(/[\n,;]+/)
            .map(name => name.trim())
            .filter(name => name.length > 0);
        
        if (names.length === 0) return;
        
        if (names.length === 1) {
            this.el.personNameInput.value = names[0];
            this.el.personNameInput.focus();
            return;
        }
        
        if (confirm(`¿Agregar ${names.length} nombres a la lista?`)) {
            let addedCount = 0;
            names.forEach(name => {
                if (this.isValidName(name)) {
                    this.addPerson(name, false);
                    addedCount++;
                }
            });
            
            if (addedCount > 0) {
                this.saveAllData();
                this.loadPeopleList();
                this.showAlert(`${addedCount} nombres agregados correctamente`, 'success');
            }
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error guardando ${key} en localStorage:`, error);
            this.showAlert('Error al guardar datos. Verifica el espacio disponible.', 'error');
            return false;
        }
    }

    saveAllData() {
        this.saveToStorage('people', this.people);
        this.saveToStorage('attendanceHistory', this.attendanceHistory);
        this.saveToStorage('weeklyPermissions', this.weeklyPermissions);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    getCurrentWeek() {
        const date = new Date();
        const year = date.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const startOfWeek = new Date(date);

        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        const weekNum = Math.ceil(((startOfWeek - startOfYear) / 86400000 + 1) / 7);
        return `${year}-W${weekNum.toString().padStart(2, '0')}`;
    }

    getCurrentDate() {
        return new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadInitialTab() {
        this.showTab('manage');
    }

    showTab(tabName) {
        if (!tabName) return;

        this.el.tabContents.forEach(tab => tab.classList.remove('active'));
        this.el.tabs.forEach(tab => tab.classList.remove('active'));

        const targetTab = document.getElementById(tabName);
        const targetButton = document.querySelector(`.tab[data-tab="${tabName}"]`);

        if (targetTab) targetTab.classList.add('active');
        if (targetButton) targetButton.classList.add('active');

        const tabLoader = {
            'manage': () => this.loadPeopleList(),
            'attendance': () => this.loadAttendanceTab(),
            'debts': () => this.loadDebtsTab(),
            'history': () => this.loadHistoryTab()
        };

        if (tabLoader[tabName]) {
            tabLoader[tabName]();
        }
    }

    isValidName(name) {
        if (!name || name.trim().length === 0) {
            this.showAlert('Por favor ingresa un nombre válido', 'error');
            return false;
        }

        if (name.length > 50) {
            this.showAlert('El nombre es demasiado largo (máximo 50 caracteres)', 'error');
            return false;
        }

        if (this.people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            this.showAlert(`"${name}" ya existe en la lista`, 'error');
            return false;
        }

        return true;
    }

    addPerson(name = null, showFeedback = true) {
        const inputName = name || this.el.personNameInput.value.trim();
        
        if (!this.isValidName(inputName)) return false;

        const newPerson = {
            id: this.generateId(),
            name: inputName,
            debt: 0,
            createdAt: new Date().toISOString()
        };

        this.people.push(newPerson);
        
        if (name === null) {
            this.el.personNameInput.value = '';
        }

        if (showFeedback) {
            if (this.saveAllData()) {
                this.loadPeopleList();
                this.showAlert(`${inputName} agregado correctamente`, 'success');
                this.el.personNameInput.focus();
                
                // Destacar el nuevo elemento con animación
                const newItem = this.el.personList.lastElementChild;
                if (newItem) {
                    newItem.style.transition = 'background-color 0.5s ease';
                    newItem.style.backgroundColor = '#e8f5e9';
                    setTimeout(() => {
                        newItem.style.backgroundColor = '';
                    }, 1000);
                }
            }
        }

        return true;
    }

    removePerson(id) {
        if (!id) return;

        const person = this.people.find(p => p.id === id);
        if (!person) {
            return this.showAlert('Persona no encontrada', 'error');
        }

        if (!confirm(`¿Eliminar a "${person.name}" y todos sus registros? Esta acción no se puede deshacer.`)) {
            return;
        }

        this.people = this.people.filter(p => p.id !== id);

        this.attendanceHistory.forEach(record => {
            if (record.records && record.records[id]) {
                delete record.records[id];
            }
        });

        Object.keys(this.weeklyPermissions).forEach(week => {
            if (this.weeklyPermissions[week][id]) {
                delete this.weeklyPermissions[week][id];
            }
        });

        this.saveAllData();
        this.loadPeopleList();
        this.showAlert('Persona eliminada correctamente', 'success');
    }

    loadPeopleList() {
        const container = this.el.personList;
        if (!container) return;

        if (!this.people.length) {
            container.innerHTML = '<div class="empty-state">No hay personas registradas</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        
        this.people.forEach((person, index) => {
            const item = document.createElement('div');
            item.className = 'list-item person-item';
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = `opacity 0.3s ease, transform 0.3s ease ${index * 0.05}s`;
            
            item.innerHTML = `
                <span class="item-name">${this.escapeHtml(person.name)}</span>
                <div class="item-actions">
                    <button class="btn-danger btn-remove-person" 
                            data-person-id="${person.id}"
                            title="Eliminar persona">
                        Eliminar
                    </button>
                </div>
            `;
            fragment.appendChild(item);
            
            // Trigger reflow to enable animation
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 10);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    startAttendance() {
        if (!this.people.length) {
            return this.showAlert('Primero debes agregar personas a la lista', 'error');
        }

        const hasActiveAttendance = this.currentAttendance?.records &&
            Object.values(this.currentAttendance.records).some(status => status !== null);

        if (hasActiveAttendance &&
            !confirm('Hay un pase de lista en progreso. ¿Iniciar uno nuevo? Se perderán los datos no guardados.')) {
            return;
        }

        this.currentAttendance = {
            date: this.getCurrentDate(),
            records: Object.fromEntries(this.people.map(p => [p.id, null])),
            startTime: new Date().toISOString()
        };

        this.loadAttendanceList();
        this.showAlert('Pase de lista iniciado', 'success');
    }

    finishAttendance() {
        if (!this.currentAttendance?.records) {
            return this.showAlert('No hay pase de lista activo', 'error');
        }

        const unmarkedPeople = Object.entries(this.currentAttendance.records)
            .filter(([id, status]) => status === null)
            .map(([id]) => this.people.find(p => p.id === id)?.name)
            .filter(Boolean);

        if (unmarkedPeople.length > 0) {
            if (!confirm(`Las siguientes personas no están marcadas: ${unmarkedPeople.join(', ')}. ¿Continuar?`)) {
                return;
            }
        }

        if (confirm('¿Finalizar el pase de lista actual?')) {
            this.attendanceHistory.push({
                ...this.currentAttendance,
                finishTime: new Date().toISOString()
            });

            this.saveAllData();
            this.currentAttendance = null;
            this.loadAttendanceTab();
            this.showAlert('Asistencia registrada correctamente', 'success');
        }
    }

    markAttendance(personId, status) {
        if (!personId || !status) return;

        const person = this.people.find(p => p.id === personId);
        if (!person || !this.currentAttendance) {
            return this.showAlert('Error al marcar asistencia', 'error');
        }

        const previousStatus = this.currentAttendance.records[personId];

        if (previousStatus === 'absent' && status !== 'absent') {
            person.debt = Math.max(0, person.debt - 10);
        }

        if (status === 'permission') {
            const currentWeek = this.getCurrentWeek();

            if (!this.weeklyPermissions[currentWeek]) {
                this.weeklyPermissions[currentWeek] = {};
            }

            if (this.weeklyPermissions[currentWeek][personId] && previousStatus !== 'permission') {
                this.showAlert(`${person.name} ya usó su permiso esta semana. Se marcará como ausente.`, 'warning');
                status = 'absent';
            } else if (previousStatus !== 'permission') {
                this.weeklyPermissions[currentWeek][personId] = true;
            }
        }

        if (previousStatus === 'permission' && status !== 'permission') {
            const currentWeek = this.getCurrentWeek();
            if (this.weeklyPermissions[currentWeek]?.[personId]) {
                delete this.weeklyPermissions[currentWeek][personId];
            }
        }

        this.currentAttendance.records[personId] = status;

        if (status === 'absent' && previousStatus !== 'absent') {
            person.debt += 10;
        }

        this.saveAllData();
        this.loadAttendanceList();
        this.updateAttendanceStats();
    }

    loadAttendanceTab() {
        if (!this.currentAttendance?.records) {
            return this.showEmptyState(this.el.attendanceList, 'Inicia un pase de lista para comenzar');
        }

        this.loadAttendanceList();
    }

    loadAttendanceList() {
        if (!this.currentAttendance?.records) {
            return this.showEmptyState(this.el.attendanceList, 'Inicia un pase de lista para comenzar');
        }

        this.el.attendanceList.innerHTML = this.people.map(person => {
            const status = this.currentAttendance.records[person.id];
            const statusInfo = {
                'present': { class: 'attendance-present', text: '✅ Presente' },
                'absent': { class: 'attendance-absent', text: '❌ Ausente' },
                'permission': { class: 'attendance-permission', text: '📝 Permiso' },
                'null': { class: '', text: 'Sin marcar' }
            }[status ?? 'null'];

            const hasWeeklyPermission = this.hasWeeklyPermission(person.id);
            const isPermissionDisabled = hasWeeklyPermission && status !== 'permission';

            return `
                <div class="list-item attendance-item ${statusInfo.class}">
                    <div>
                        <strong>${this.escapeHtml(person.name)}</strong>
                        <div class="date-info">${statusInfo.text}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-success btn-present" 
                                data-person-id="${person.id}"
                                ${status === 'present' ? 'disabled' : ''}>
                            Presente
                        </button>
                        <button class="btn-danger btn-absent" 
                                data-person-id="${person.id}"
                                ${status === 'absent' ? 'disabled' : ''}>
                            Ausente
                        </button>
                        <button class="btn-warning btn-permission" 
                                data-person-id="${person.id}"
                                ${isPermissionDisabled ? 'disabled title="Ya usó permiso esta semana"' : ''}
                                ${status === 'permission' ? 'disabled' : ''}>
                            Permiso
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.updateAttendanceStats();
    }

    hasWeeklyPermission(personId) {
        const currentWeek = this.getCurrentWeek();
        return this.weeklyPermissions[currentWeek]?.[personId] || false;
    }

    updateAttendanceStats() {
        if (!this.currentAttendance?.records || !this.el.presentCount || !this.el.absentCount) return;

        const counts = Object.values(this.currentAttendance.records).reduce((acc, status) => {
            if (status === 'present') acc.present++;
            else if (status === 'absent') acc.absent++;
            else if (status === 'permission') acc.permission++;
            return acc;
        }, { present: 0, absent: 0, permission: 0 });

        this.el.presentCount.textContent = counts.present;
        this.el.absentCount.textContent = counts.absent;
    }

    shareAttendance() {
        if (!this.currentAttendance?.records) {
            return this.showAlert('Primero debes realizar un pase de lista', 'error');
        }

        const groups = this.people.reduce((acc, person) => {
            const status = this.currentAttendance.records[person.id];
            if (status && acc[status]) {
                acc[status].push(person.name);
            }
            return acc;
        }, { present: [], absent: [], permission: [] });

        let message = `📋 *Pase de Lista - ${this.currentAttendance.date}*\n\n`;

        if (groups.present.length) {
            message += `✅ *Presentes (${groups.present.length}):*\n${groups.present.map(n => `• ${n}`).join('\n')}\n\n`;
        }

        if (groups.absent.length) {
            message += `❌ *Ausentes (${groups.absent.length}):*\n${groups.absent.map(n => `• ${n}`).join('\n')}\n\n`;
        }

        if (groups.permission.length) {
            message += `📝 *Con Permiso (${groups.permission.length}):*\n${groups.permission.map(n => `• ${n}`).join('\n')}\n\n`;
        }

        this.shareToWhatsApp(message);
    }

    loadDebtsTab() {
        const debtors = this.people.filter(p => p.debt > 0);
        const total = debtors.reduce((sum, p) => sum + p.debt, 0);

        if (this.el.totalDebt) this.el.totalDebt.textContent = `$${total}`;
        if (this.el.debtorsCount) this.el.debtorsCount.textContent = debtors.length;

        if (!debtors.length) {
            return this.showEmptyState(this.el.debtsList, 'No hay adeudos pendientes');
        }

        this.el.debtsList.innerHTML = debtors
            .sort((a, b) => b.debt - a.debt)
            .map(p => `
                <div class="list-item debt-item">
                    <div>
                        <strong>${this.escapeHtml(p.name)}</strong>
                        <div class="date-info">Deuda acumulada</div>
                    </div>
                    <div class="item-name">$${p.debt}</div>
                </div>
            `).join('');
    }

    shareDebts() {
        const debtors = this.people.filter(p => p.debt > 0);
        if (!debtors.length) {
            return this.showAlert('No hay adeudos que compartir', 'info');
        }

        const total = debtors.reduce((sum, p) => sum + p.debt, 0);
        let message = `💰 *Reporte de Adeudos*\n\n*Total: $${total}*\n\n`;

        debtors
            .sort((a, b) => b.debt - a.debt)
            .forEach(p => {
                message += `• ${p.name}: $${p.debt}\n`;
            });

        message += `\n_Generado el ${this.getCurrentDate()}_`;

        this.shareToWhatsApp(message);
    }

    loadHistoryTab() {
        if (!this.attendanceHistory.length) {
            return this.showEmptyState(this.el.historyList, 'No hay historial de asistencia');
        }

        this.el.historyList.innerHTML = [...this.attendanceHistory]
            .reverse()
            .map(record => {
                const counts = Object.values(record.records).reduce((acc, status) => {
                    if (status === 'present') acc.present++;
                    else if (status === 'absent') acc.absent++;
                    else if (status === 'permission') acc.permission++;
                    return acc;
                }, { present: 0, absent: 0, permission: 0 });

                const total = counts.present + counts.absent + counts.permission;

                return `
                    <div class="list-item attendance-item">
                        <div>
                            <strong>${this.escapeHtml(record.date)}</strong>
                            <div class="date-info">
                                Total: ${total} | 
                                Presentes: ${counts.present} | 
                                Ausentes: ${counts.absent} | 
                                Permisos: ${counts.permission}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
    }

    clearAllData() {
        if (!confirm('¿Eliminar TODOS los datos?\n\nEsto incluye:\n• Todas las personas\n• Historial de asistencia\n• Registros de adeudos\n• Permisos semanales\n\nEsta acción NO se puede deshacer.')) {
            return;
        }

        if (!confirm('¿Estás completamente seguro? Esta es tu última oportunidad para cancelar.')) {
            return;
        }

        try {
            localStorage.clear();
            this.initState();
            this.currentAttendance = null;

            this.loadPeopleList();
            this.loadAttendanceTab();
            this.loadDebtsTab();
            this.loadHistoryTab();

            this.showAlert('Todos los datos han sido eliminados correctamente', 'success');
        } catch (error) {
            console.error('Error al limpiar datos:', error);
            this.showAlert('Error al eliminar los datos', 'error');
        }
    }

    showAlert(message, type = 'error') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const icon = icons[type] || icons.error;
        
        // Crear un toast notification en lugar de un alert
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;
        
        document.body.appendChild(toast);
        
        // Mostrar el toast con animación
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    showEmptyState(element, message) {
        if (element) {
            element.innerHTML = `<div class="empty-state">${this.escapeHtml(message)}</div>`;
        }
    }

    shareToWhatsApp(message) {
        try {
            const encodedMessage = encodeURIComponent(message);
            const url = `https://wa.me/?text=${encodedMessage}`;
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error al compartir en WhatsApp:', error);
            this.showAlert('Error al abrir WhatsApp', 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new AttendanceApp();
        console.log('Aplicación de asistencia inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        alert('❌ Error al cargar la aplicación. Recarga la página e inténtalo de nuevo.');
    }
});