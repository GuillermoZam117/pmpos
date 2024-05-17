import React from 'react';
import Button from '@mui/material/Button'; // Updated import for MUI
import ReactMarkdown from 'react-markdown';

export default class MenuItem extends React.Component {
  render() {
    const { menuItem, onClick = () => {} } = this.props;
    const style = {
      flex: '1 1 31.4%',
      margin: '4px',
      height: 'auto',
      minHeight: '65px',
      maxHeight: '50%',
      lineHeight: '1.3',
      wordWrap: 'breakWord',
      whiteSpace: 'normal',
      textTransform: 'none',
      color: menuItem.foreground,
      backgroundColor: menuItem.color,
    };
    return (
      <Button
        style={style}
        variant="contained"
        onClick={onClick.bind(null, menuItem.productId, menuItem.defaultOrderTags)}
      >
        <ReactMarkdown className="buttonContent" children={menuItem.caption} />
      </Button>
    );
  }
}
