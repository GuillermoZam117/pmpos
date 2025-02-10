import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import CommandButtonComponent from './CommandButton';

const Commands = ({ commands = [] }) => {
    if (!commands || commands.length === 0) {
        return null;
    }

    return (
        <Box 
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                p: 1
            }}
        >
            {commands.map((command, index) => (
                <CommandButtonComponent 
                    key={`cmd-${command.id || index}`} 
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
