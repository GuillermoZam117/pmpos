import React, { Component } from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Snackbar, ThemeProvider, createTheme } from '@mui/material';
import Header from './Header';
import Menu from './Menu';
import Orders from './Orders';
import TicketTotal from './TicketTotal';
import TicketTags from './TicketTags';
import Commands from './Commands';
import MyTickets from './MyTickets';
import Login from './Login/Login';
import EntityList from './Entities/EntityList';
import { changeTerminalId, setTicket, closeMessage, updateMessage } from '../actions';
import * as Queries from '../queries';

// Theme configuration for MUI
const theme = createTheme({
  palette: {
    mode: 'dark', // or 'light'
  },
});

class App extends Component {
  componentDidMount() {
    if (localStorage['terminalId']) {
      const terminalId = localStorage['terminalId'];
      Queries.getTerminalExists(terminalId, (result) => {
        if (result) {
          Queries.getTerminalTicket(terminalId, (ticket) => {
            this.props.changeTerminalId(terminalId);
            this.props.setTicket(ticket);
          });
        } else {
          Queries.registerTerminal((newTerminalId) => this.updateTerminalId(newTerminalId));
        }
      });
    } else {
      Queries.registerTerminal((newTerminalId) => this.updateTerminalId(newTerminalId));
    }
  }

  updateTerminalId(terminalId) {
    localStorage['terminalId'] = terminalId;
    this.props.changeTerminalId(terminalId);
  }

  closeMessage = () => {
    this.props.closeMessage();
  };

  render() {
    return (
      <ThemeProvider theme={theme}>
        <Router>
          <div className="mainDiv">
            <Header />
            <div className="mainBody">
              <Menu />
              <Orders />
              <MyTickets />
            </div>
            <TicketTags />
            <Commands />
            <TicketTotal />
            <Snackbar
              open={this.props.isMessageOpen}
              message={this.props.message}
              autoHideDuration={4000}
              onClose={this.closeMessage}
            />
            <Switch>
              <Route path="/" exact component={() => <div>Home</div>} />
              <Route path="/entities/:terminalId/:screenName" component={EntityList} />
              <Route path="/login" component={Login} />
            </Switch>
          </div>
        </Router>
      </ThemeProvider>
    );
  }
}

App.propTypes = {
  terminalId: PropTypes.number,
  message: PropTypes.string,
  isMessageOpen: PropTypes.bool,
  ticket: PropTypes.object,
  changeTerminalId: PropTypes.func.isRequired,
  setTicket: PropTypes.func.isRequired,
  closeMessage: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
  message: state.app?.message || '',  // Add null check
  terminalId: state.app.terminalId,
  isMessageOpen: state.app.message.isOpen,
  ticket: state.app.ticket
});

const mapDispatchToProps = {
  changeTerminalId,
  setTicket,
  closeMessage
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
