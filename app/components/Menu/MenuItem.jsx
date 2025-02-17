import React from 'react';
import Button from '@mui/material/Button';
import ReactMarkdown from 'react-markdown';

const MenuItem = ({ menuItem, onClick = () => {} }) => {
    const style = {
        flex: '1 1 31.4%',
        margin: '4px',
        height: 'auto',
        minHeight: '65px',
        maxHeight: '50%',
        lineHeight: '1.3',
        wordWrap: 'break-word',
        whiteSpace: 'normal',
        textTransform: 'none',
        color: menuItem.foreground,
        backgroundColor: menuItem.color,
    };

    return (
        <Button
            style={style}
            variant="contained"
            onClick={() => onClick(menuItem.productId, menuItem.defaultOrderTags)}
        >
            <ReactMarkdown className="buttonContent">
                {menuItem.caption}
            </ReactMarkdown>
        </Button>
    );
};

export default MenuItem;
