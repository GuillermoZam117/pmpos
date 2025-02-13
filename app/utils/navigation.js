import { createHashHistory } from 'history';

export const history = createHashHistory();

export const navigate = (path) => {
    console.log('🚀 Navigation request:', path);
    const targetPath = path === '/main' ? '/tables' : path;
    console.log('📍 Navigating to:', targetPath);
    history.push(targetPath);
};