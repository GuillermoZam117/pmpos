import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import CommandButtonComponent from './CommandButton';

// Botones de acción
const Commands = ({ commands = [] }) => {
    return (
        <Box 
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                p: 1
            }}
        >
            {commands.map(command => (
                <CommandButtonComponent 
                    key={command.id} 
                    command={command} 
                />
            ))}
        </Box>
    );
};

Commands.propTypes = {
    commands: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string,
            caption: PropTypes.string,
            icon: PropTypes.string,
            onClick: PropTypes.func
        })
    )
};

Commands.defaultProps = {
    commands: []
};

export default Commands;
