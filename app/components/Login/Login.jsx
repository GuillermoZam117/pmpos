import React from 'react';
import { TextField, Button, Box, Typography } from '@mui/material'; // Use MUI components
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as Actions from '../../actions';
import { Authenticate } from '../../queries';

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = { userName: '', password: '', message: '' };
    }

    onUserNameChange = (e) => {
        this.setState({ userName: e.target.value });
    }

    onPasswordChange = (e) => {
        this.setState({ password: e.target.value });
    }

    onClick = () => {
        Authenticate(this.state.userName, this.state.password,
            (accessToken, refreshToken) => {
                this.props.authenticationSuccess(accessToken, refreshToken);
                this.context.router.push('/');
            },
            (errorCode, errorMessage) => {
                this.setState({
                    userName: '',
                    password: '',
                    message: errorMessage
                });
            });
    }

    render() {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
                <Typography variant="h5" component="div">
                    Authentication Required
                </Typography>
                <TextField 
                    label="User Name"
                    value={this.state.userName}
                    onChange={this.onUserNameChange}
                    margin="normal"
                />
                <TextField 
                    label="Password"
                    type="password"
                    value={this.state.password}
                    onChange={this.onPasswordChange}
                    margin="normal"
                />
                <Box my={2}>
                    <Typography color="error">{this.state.message}</Typography>
                </Box>
                <Button variant="contained" color="primary" onClick={this.onClick}>
                    OK
                </Button>
            </Box>
        );
    }
}

Login.contextTypes = {
    router: PropTypes.object
};

const mapStateToProps = state => ({
    isAuthenticating: state.login.get('isAuthenticating'),
    accessToken: state.login.get('accessToken'),
    refreshToken: state.login.get('refreshToken')
});

const mapDispatchToProps = {
    authenticationSuccess: Actions.authenticationSuccess,
    authenticationFailure: Actions.authenticationFailure
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Login);
