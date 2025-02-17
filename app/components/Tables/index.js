export { default as TableCard } from './TableCard';
export { default as TableView } from './TableView';
export const changeTerminalId = (id) => ({
    type: 'CHANGE_TERMINAL_ID',
    id,
});