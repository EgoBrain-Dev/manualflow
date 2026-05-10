import { auth, onAuthStateChanged, db, collection, getDocs, doc, updateDoc, getDoc } from './firebase-config.js';

let currentUser = null;
const usersTableBody = document.getElementById('usersTableBody');

async function initAdmin() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                loadUsers();
            } else {
                alert('Acesso negado. Apenas administradores podem aceder a esta página. Pode pedir ao primeiro registado para lhe dar permissão.');
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    });
}

async function loadUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        let usersHtml = '';

        querySnapshot.forEach((docSnap) => {
            const u = docSnap.data();
            const roleOptions = `
                <select class="role-select input-modern p-2 rounded border dark:bg-gray-800 dark:border-gray-600 dark:text-white" data-uid="${u.uid}">
                    <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
                    <option value="reviewer" ${u.role === 'reviewer' ? 'selected' : ''}>Revisor</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            `;

            usersHtml += `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                ${(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${u.name || 'Sem nome'}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${u.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            ${u.status || 'Ativo'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${roleOptions}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors update-role-btn" data-uid="${u.uid}">Guardar</button>
                    </td>
                </tr>
            `;
        });

        usersTableBody.innerHTML = usersHtml || '<tr><td colspan="5" class="text-center py-4">Nenhum utilizador encontrado.</td></tr>';

        // Bind events
        document.querySelectorAll('.update-role-btn').forEach(btn => {
            btn.addEventListener('click', handleRoleUpdate);
        });

    } catch (error) {
        console.error('Erro ao carregar utilizadores:', error);
        usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Erro ao carregar utilizadores.</td></tr>`;
    }
}

async function handleRoleUpdate(e) {
    const uid = e.target.getAttribute('data-uid');
    const selectEl = document.querySelector(`.role-select[data-uid="${uid}"]`);
    const newRole = selectEl.value;

    try {
        await updateDoc(doc(db, 'users', uid), {
            role: newRole
        });
        alert('Função atualizada com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        alert('Erro ao atualizar função. Verifique se a sua sessão expirou ou se tem permissões suficientes.');
    }
}

document.addEventListener('DOMContentLoaded', initAdmin);
