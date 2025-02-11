import React from 'react';
import { Button } from '@mui/material'; // Updated import for MUI
import { connect } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import { changeEntityOfTerminalTicket, getEntityScreenItems } from '../../queries';
import * as Actions from '../../actions';
import PropTypes from 'prop-types'; // Use PropTypes for prop type checking

class EntityListButton extends React.Component {
    render() {
        const style = {
            color: this.props.labelColor,
            backgroundColor: this.props.color,
            margin: '4px',
            height: 'auto',
            minHeight: '65px',
            flex: '1 1 11%',
            lineHeight: '1.3',
            wordWrap: 'break-word',
            whiteSpace: 'normal'
        };

        return (
            <Button
                style={style}
                className='entityButton'
                onClick={this.props.onClick}>
                <ReactMarkdown>{this.props.caption}</ReactMarkdown>
            </Button>
        );
    }
}

EntityListButton.propTypes = {
    labelColor: PropTypes.string,
    color: PropTypes.string,
    caption: PropTypes.string,
    onClick: PropTypes.func
};

class EntityList extends React.Component {
    loadItems(name) {
        this.props.loadEntityScreenRequest(name);
        getEntityScreenItems(name, (items) => {
            this.props.loadEntityScreenSuccess(name, items);
        })
    }

    componentDidMount() {
        this.loadItems(this.props.location.query.screenName);
    }

    selectEntity = (entityName) => {
        changeEntityOfTerminalTicket(this.props.location.query.terminalId, 'Tables', entityName, () => {
            this.context.router.push('/');
        });
    }

    render() {
        if (this.props.isFetching) {
            return <p>Loading...</p>;
        }

        if (!this.props.items || this.props.items.length === 0) {
            return (
                <div className="entityList">
                    <p>No tables available</p>
                </div>
            );
        }

        return (
            <div className="entityList">
                {this.props.items.map(x =>
                    <EntityListButton
                        key={x.name}
                        caption={x.caption || x.name}
                        labelColor={x.labelColor || '#ffffff'}
                        color={x.color || '#2196f3'}
                        onClick={() => this.selectEntity(x.name)} />
                )}
            </div>
        );
    }
}

EntityList.contextTypes = {
    router: PropTypes.object
}

const mapStateToProps = state => ({
    name: state.entityList.get('name'),
    isFetching: state.entityList.get('isFetching'),
    items: state.entityList.get('items')
})

const mapDispatchToProps = {
    loadEntityScreenRequest: Actions.loadEntityScreenRequest,
    loadEntityScreenSuccess: Actions.loadEntityScreenSuccess
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(EntityList)
