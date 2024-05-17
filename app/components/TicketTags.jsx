import React from 'react';
import PropTypes from 'prop-types';

export default class TicketTags extends React.Component {
    render() {
        const { ticket } = this.props;
        if (ticket && ticket.tags && ticket.tags.length > 0) {
            return (
                <div className="ticketTags">
                    {ticket.tags.map(({ tagName, tag }) => (
                        <span className="ticketTag" key={tag}>
                            {tagName}: {tag}
                        </span>
                    ))}
                </div>
            );
        } else return null;
    }
}

TicketTags.propTypes = {
    ticket: PropTypes.object
};
