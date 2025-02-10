import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from '@mui/material';
import Icon from '@mui/material/Icon';

const CommandButtonComponent = ({ command }) => {
    const handleClick = (event) => {
        try {
            command.onClick(event);
        } catch (error) {
            console.error('Error executing command:', error);
        }
    };

    return (
        <Tooltip title={command.tooltip || command.caption} arrow>
            <Button
                variant="contained"
                color="primary"
                onClick={handleClick}
                disabled={command.disabled}
                startIcon={command.icon && <Icon>{command.icon}</Icon>}
                sx={{
                    minWidth: '120px',
                    m: 0.5,
                    backgroundColor: command.color || 'primary.main',
                    '&:hover': {
                        backgroundColor: command.hoverColor || 'primary.dark',
                    }
                }}
            >
                {command.caption}
            </Button>
        </Tooltip>
    );
};

CommandButtonComponent.propTypes = {
    command: PropTypes.shape({
        id: PropTypes.string,
        caption: PropTypes.string.isRequired,
        tooltip: PropTypes.string,
        icon: PropTypes.string,
        color: PropTypes.string,
        hoverColor: PropTypes.string,
        disabled: PropTypes.bool,
        onClick: PropTypes.func.isRequired
    }).isRequired
};

export default React.memo(CommandButtonComponent);