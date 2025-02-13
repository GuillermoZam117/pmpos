import { createHashHistory } from 'history';

export const history = createHashHistory();

export const navigate = (path) => {
    console.log('🚀 Navigating to:', path);
    // Use the correct path for tables
    const targetPath = path === '/main' ? '/tables' : path;
    history.push(targetPath);
};