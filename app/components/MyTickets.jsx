import React from 'react';
import AppBar from '@mui/material/AppBar'; // Updated import for MUI
import Paper from '@mui/material/Paper'; // Updated import for MUI
import List from '@mui/material/List'; // Updated import for MUI
import ListItem from '@mui/material/ListItem'; // Updated import for MUI
import ListSubheader from '@mui/material/ListSubheader'; // Updated import for MUI
import ListItemText from '@mui/material/ListItemText'; // Updated import for MUI
import { connect } from 'react-redux';
import { getTerminalTickets } from '../queries';
import * as Actions from '../actions';
import { shouldComponentUpdate } from 'react-addons-pure-render-mixin';

const Total = (p) => {
    return <b>{p.total}</b>
}

class MyTicketLine extends React.Component {

    constructor(props) {
        super(props);
        this.shouldComponentUpdate = shouldComponentUpdate.bind(this);
    }

    render() {
        const { ticket, onClick = () => {} } = this.props;
        return (
            <ListItem button onClick={onClick.bind(null, ticket.id)}>
                <ListItemText>
                    <div style={{ 'display': 'flex', 'margin': '4px' }}>
                        <span className="myListTicketNumber">{ticket.number}</span>
                        <span className="myListEntity">{ticket.entities.map(x => x.name).join()}</span>
                        <span className="myListRemaining">{ticket.remaining.toFixed(2)}</span>
                    </div>
                </ListItemText>
            </ListItem>
        )
    }
}

class MyTickets extends React.Component {

    loadItems(terminalId = this.props.terminalId) {
        this.props.loadMyTicketsRequest();
        getTerminalTickets(terminalId, (items) => {
            this.props.ticketsRefreshed();
            if (items) this.props.loadMyTicketsSuccess(items);
            else this.props.loadMyTicketsFailure();
        });
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.ticketsNeedsRefresh && !nextProps.isFetching) {
            if (this.props.ticket) {
                this.props.ticketsRefreshed();
                return;
            }
            console.log('Reload 3', nextProps);
            this.loadItems(nextProps.terminalId);
        } else if (nextProps.terminalId && this.props.ticket && nextProps.ticket == undefined) {
            console.log('Reload 1', nextProps.ticket, this.props.ticket);
            this.loadItems(nextProps.terminalId);
        } else if (nextProps.terminalId && nextProps.terminalId !== this.props.terminalId) {
            console.log('Reload 2', nextProps.terminalId, this.props.terminalId);
            this.loadItems(nextProps.terminalId);
        }
    }

    render() {
        if (this.props.ticket && !this.props.ticketsNeedsRefresh) return null;
        if (!this.props.items) return (<div>Loading...</div>);
        return (
            <Paper className="myTickets" style={{ 'borderRadius': '0' }}>
                <List subheader={<ListSubheader>My Tickets</ListSubheader>}>
                    {this.props.items.sort((x, y) => new Date(y.lastOrderDate) - new Date(x.lastOrderDate))
                        .map((x) => <MyTicketLine key={x.id} ticket={x} onClick={this.props.onClick} />)}
                </List>
            </Paper>
        );
    }
}

const mapStateToProps = state => ({
    isFetching: state.myTickets.get('isFetching'),
    items: state.myTickets.get('items'),
    ticketsNeedsRefresh: state.myTickets.get('ticketsNeedsRefresh'),
    terminalId: state.app.get('terminalId')
});

const mapDispatchToProps = {
    loadMyTicketsRequest: Actions.loadMyTicketsRequest,
    loadMyTicketsSuccess: Actions.loadMyTicketsSuccess,
    loadMyTicketsFailure: Actions.loadMyTicketsFailure,
    ticketsRefreshed: Actions.ticketsRefreshed
};

export default connect(mapStateToProps, mapDispatchToProps)(MyTickets);
