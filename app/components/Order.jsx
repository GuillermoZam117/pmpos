import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { terminalService } from '../services/terminalService';
import { List, ListItem, ListSubHeader, ListDivider, ListItemContent, ListCheckbox } from 'react-toolbox/lib/list';
import Portions from './Portions';
import OrderTags from './OrderTags';
import SelectedOrderTags from './SelectedOrderTags';
import {SelectedOrderStates} from './SelectedOrderStates';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import { getProductPortions, getOrderTagsForTerminal } from '../queries';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import * as Queries from '../queries';
import * as Actions from '../actions';

const customContentStyle = {
    'width': '95%'
};

const Order = ({ menuItem }) => {
    const dispatch = useDispatch();
    const terminalId = useSelector(state => state.terminal.get('id'));
    
    const handleAddOrder = async () => {
        try {
            const result = await terminalService.addOrder(
                terminalId, 
                menuItem.productName
            );
            dispatch({ 
                type: 'UPDATE_TICKET_AMOUNT', 
                payload: result.totalAmount 
            });
        } catch (error) {
            console.error('Error adding order:', error);
        }
    };

    return (
        <Button
            variant="contained"
            onClick={handleAddOrder}
        >
            {menuItem.caption}
        </Button>
    );
};

export default Order;