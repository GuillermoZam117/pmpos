import React, { useEffect, useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { 
    AppBar, 
    Paper, 
    List, 
    ListItem, 
    ListSubheader, 
    ListItemText 
} from '@mui/material';
import { connect } from 'react-redux';
import { getTerminalTickets } from '../queries';
import * as Actions from '../actions';

const Total = memo(({ total }) => {
    return <b>{total}</b>;
});

Total.propTypes = {
    total: PropTypes.number.isRequired
};

const MyTicketLine = memo(({ ticket, onClick = () => {} }) => {
    const handleClick = useCallback(() => {
        onClick(ticket.id);
    }, [ticket.id, onClick]);

    return (
        <ListItem button onClick={handleClick}>
            <ListItemText>
                <div style={{ display: 'flex', margin: '4px' }}>
                    <span className="myListTicketNumber">{ticket.number}</span>
                    <span className="myListEntity">
                        {ticket.entities.map(x => x.name).join()}
                    </span>
                    <span className="myListRemaining">
                        {ticket.remaining.toFixed(2)}
                    </span>
                </div>
            </ListItemText>
        </ListItem>
    );
});

MyTicketLine.propTypes = {
    ticket: PropTypes.shape({
        id: PropTypes.string.isRequired,
        number: PropTypes.string.isRequired,
        entities: PropTypes.arrayOf(
            PropTypes.shape({
                name: PropTypes.string.isRequired
            })
        ).isRequired,
        remaining: PropTypes.number.isRequired
    }).isRequired,
    onClick: PropTypes.func
};

const MyTickets = ({ 
    terminalId,
    ticket,
    items,
    ticketsNeedsRefresh,
    isFetching,
    loadMyTicketsRequest,
    loadMyTicketsSuccess,
    loadMyTicketsFailure,
    ticketsRefreshed,
    onClick
}) => {
    const loadItems = useCallback((currentTerminalId = terminalId) => {
        loadMyTicketsRequest();
        getTerminalTickets(currentTerminalId, (items) => {
            ticketsRefreshed();
            if (items) {
                loadMyTicketsSuccess(items);
            } else {
                loadMyTicketsFailure();
            }
        });
    }, [terminalId, loadMyTicketsRequest, loadMyTicketsSuccess, loadMyTicketsFailure, ticketsRefreshed]);

    useEffect(() => {
        if (terminalId) {
            loadItems();
        }
    }, [terminalId, loadItems]);

    useEffect(() => {
        if (ticketsNeedsRefresh && !isFetching) {
            if (ticket) {
                ticketsRefreshed();
                return;
            }
            loadItems(terminalId);
        }
    }, [ticketsNeedsRefresh, isFetching, ticket, terminalId, loadItems, ticketsRefreshed]);

    if (ticket && !ticketsNeedsRefresh) return null;
    if (!items) return <div>Loading...</div>;

    return (
        <Paper className="myTickets" sx={{ borderRadius: 0 }}>
            <List subheader={<ListSubheader>My Tickets</ListSubheader>}>
                {items
                    .sort((x, y) => new Date(y.lastOrderDate) - new Date(x.lastOrderDate))
                    .map((x) => (
                        <MyTicketLine 
                            key={x.id} 
                            ticket={x} 
                            onClick={onClick} 
                        />
                    ))}
            </List>
        </Paper>
    );
};

MyTickets.propTypes = {
    terminalId: PropTypes.string,
    ticket: PropTypes.object,
    items: PropTypes.array,
    ticketsNeedsRefresh: PropTypes.bool,
    isFetching: PropTypes.bool,
    loadMyTicketsRequest: PropTypes.func.isRequired,
    loadMyTicketsSuccess: PropTypes.func.isRequired,
    loadMyTicketsFailure: PropTypes.func.isRequired,
    ticketsRefreshed: PropTypes.func.isRequired,
    onClick: PropTypes.func
};

const mapStateToProps = (state) => ({
    terminalId: state.app?.get('terminalId') || '',
    ticket: state.app?.get('ticket') || null,
    items: state.app?.get('items') || [],
    ticketsNeedsRefresh: state.app?.get('ticketsNeedsRefresh') || false,
    isFetching: state.app?.get('isFetching') || false
});

const mapDispatchToProps = {
    loadMyTicketsRequest: Actions.loadMyTicketsRequest,
    loadMyTicketsSuccess: Actions.loadMyTicketsSuccess,
    loadMyTicketsFailure: Actions.loadMyTicketsFailure,
    ticketsRefreshed: Actions.ticketsRefreshed
};

export default connect(mapStateToProps, mapDispatchToProps)(memo(MyTickets));
