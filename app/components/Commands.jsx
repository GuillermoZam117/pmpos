import React from 'react';
import Button from '@mui/material/Button';

export default class Commands extends React.Component {
  render() {
    const { commands } = this.props;
    return (
      <div className="commands">
        {commands.map(({ command, caption, color, foreground }) => (
          <Button
            variant="contained"
            className="commandButton"
            key={caption}
            style={{ backgroundColor: color, color: foreground }}
            onClick={command}
          >
            {caption}
          </Button>
        ))}
      </div>
    );
  }
}
