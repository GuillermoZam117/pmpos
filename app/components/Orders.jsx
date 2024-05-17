import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListSubheader from '@mui/material/ListSubheader';
import Paper from '@mui/material/Paper';
import ReactDOM from 'react-dom'; // Ensure this is the correct casing for your environment
import { postRefresh } from '../queries';
import PropTypes from 'prop-types';

export default class Orders extends React.Component {
    render() {
        const { ticket, onClick = () => {}, onOrderTagSelected = () => {} } = this.props;
        if (!ticket) return null;
        return (
            <Paper className="orders" style={{ 'borderRadius': '0' }}>
                <List subheader={<ListSubheader>Orders</ListSubheader>}>
                    {ticket.orders.map(({ uid, name, quantity, price, priceTag, portion, productId, tags, states, locked }) => (
                        <ListItem key={uid}>
                            <Order
                                name={name}
                                quantity={quantity}
                                price={price.toFixed(2)}
                                priceTag={priceTag}
                                portion={portion}
                                productId={productId}
                                orderTags={tags}
                                orderStates={states}
                                onClick={onClick}
                                orderUid={uid}
                                locked={locked}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>
        );
    }

    componentDidUpdate() {
        const node = ReactDOM.findDOMNode(this);
        if (node) {
            node.scrollTop = node.scrollHeight;
        }
    }
}

Orders.propTypes = {
    ticket: PropTypes.object,
    onClick: PropTypes.func,
    onOrderTagSelected: PropTypes.func
};
