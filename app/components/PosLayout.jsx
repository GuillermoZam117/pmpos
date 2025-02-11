import React from 'react';
import { useSelector } from 'react-redux';
import EntityList from './Entities/EntityList';
import Menu from './Menu/Menu';
import Orders from './Orders';
import Commands from './Commands';

const PosLayout = () => {
    const ticket = useSelector(state => state.app.get('ticket'));
    const terminalId = useSelector(state => state.app.get('terminalId'));

    return (
        <div className="pos-layout">
            <div className="pos-header">
                <h1>SambaPOS</h1>
            </div>
            
            <div className="pos-content">
                <div className="pos-left">
                    <EntityList terminalId={terminalId} />
                </div>
                
                <div className="pos-center">
                    <Menu />
                </div>
                
                <div className="pos-right">
                    <Orders ticket={ticket} />
                    <Commands />
                </div>
            </div>
        </div>
    );
};

export default PosLayout;