import { appconfig } from '../config';
import { tokenService } from './tokenService';

export const userService = {
    validatePin: async (pin) => {
        const config = appconfig();
        const token = await tokenService.getValidAccessToken();

        try {
            // Prefer fast SQL-backed endpoint when available (does not touch token logic)
            try {
                const send = process.env.REACT_APP_SEND_INTERNAL_KEY === 'true';
                const apiKey = process.env.INTERNAL_API_KEY || localStorage.getItem('X_INTERNAL_API_KEY');
                const headers = { 'Content-Type': 'application/json' };
                if (send && apiKey) headers['X-INTERNAL-API-KEY'] = apiKey;
                const resp = await fetch('/internal-api/validate-admin', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ pin })
                });
                if (resp.ok) {
                    const json = await resp.json();
                    if (json?.ok) {
                        if (json.isAdmin) {
                            return { pin, name: json.name || '*', role: json.roleName || 'Admin' };
                        } else {
                            throw new Error('PIN pertenece a usuario sin privilegios');
                        }
                    }
                }
            } catch (_) { /* fall back to GraphQL */ }

            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: `
                        query {
                            getUser(pin: "${pin}") {
                                name
                                role
                                roleName
                                isAdmin
                                pin
                            }
                        }
                    `
                })
            });

            const result = await response.json();
            console.log('GraphQL Response:', result);

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            // Check if we got a valid user name back
            if (result.data?.getUser?.name) {
                const user = result.data.getUser || {};
                // If server echoes PIN, verify it matches
                if (user.pin && String(user.pin) !== String(pin)) {
                    throw new Error('PIN inválido');
                }

                // Normalize booleans/strings and roles
                const rawRole = (user.roleName || user.role || '').toString();
                const roleNorm = rawRole.normalize('NFD').replace(/\p{Diacritic}/gu, '');
                const roleLc = roleNorm.toLowerCase();
                const roleUp = roleNorm.toUpperCase();
                const isAdminFlag = (() => {
                    const v = user.isAdmin;
                    if (typeof v === 'boolean') return v;
                    if (typeof v === 'string') return ['true','1','yes','si','sí'].includes(v.toLowerCase());
                    if (typeof v === 'number') return v === 1;
                    return false;
                })();

                // Server-defined privileged roles only (no client overrides)
                const allowed = ['admin','administrador','administrator'];

                const isPrivileged = isAdminFlag || allowed.includes(roleLc) || roleUp === 'ADMIN' || roleUp.startsWith('ADMIN');
                if (!isPrivileged) {
                    // Fallback: attempt role lookup by user name from server
                    try {
                        const rolesResp = await fetch(config.GQLurl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ query: 'query { getUsers { name roleName isAdmin } }' })
                        });
                        const rolesJson = await rolesResp.json();
                        const arr = rolesJson?.data?.getUsers || [];
                        const matched = arr.find(u => u?.name === user.name);
                        if (matched) {
                            const mRoleNorm = (matched.roleName || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '');
                            const mRoleLc = mRoleNorm.toLowerCase();
                            const mRoleUp = mRoleNorm.toUpperCase();
                            const mAdmin = !!(matched.isAdmin === true || matched.isAdmin === 1 || (typeof matched.isAdmin === 'string' && ['true','1','yes','si','sí'].includes((matched.isAdmin || '').toLowerCase())));
                            if (mAdmin || allowed.includes(mRoleLc) || mRoleUp === 'ADMIN' || mRoleUp.startsWith('ADMIN')) {
                                return { pin, name: user.name, role: matched.roleName || (mAdmin ? 'Admin' : 'User') };
                            }
                        }
                    } catch {}

                    // Last resort: trust current session/admin flags if available
                    try {
                        const storedIsAdmin = localStorage.getItem('pmpos_user_isAdmin');
                        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
                        const sessionIsAdmin = !!(storedIsAdmin === '1' || (typeof storedIsAdmin === 'string' && ['1','true','yes','si','sí'].includes(storedIsAdmin.toLowerCase())) || (storedUser && storedUser.isAdmin === true));
                        if (sessionIsAdmin) {
                            return { pin, name: user.name, role: rawRole || 'Admin' };
                        }
                    } catch {}
                    throw new Error('PIN pertenece a usuario sin privilegios');
                }
                return { pin, name: user.name, role: rawRole || (isAdminFlag ? 'Admin' : 'User') };
            }

            throw new Error('PIN inválido');

        } catch (error) {
            console.error('Error validando PIN:', error);
            
            // Provide more specific error messages
            if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
                throw new Error('Error de conexión. Verifique la conexión con el servidor.');
            }
            
            if (error.message.includes('500') || error.message.includes('Internal server error')) {
                throw new Error('Error del servidor. El sistema de validación de PIN no está disponible.');
            }
            
            if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                throw new Error('Sesión expirada. Inicie sesión nuevamente.');
            }
            
            // For invalid PIN or other GraphQL errors, preserve original message
            throw error;
        }
    }
};
