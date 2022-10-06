import React from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFieldPassword,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton
} from '@elastic/eui';

class ControllerLogin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      window: {}
    };

    this.getQueryWindow = this.getQueryWindow.bind(this);
    this.attemptCookieLogin = this.attemptCookieLogin.bind(this);

    // if set to false, then let user login/configure
    if (this.props.autoLogin) {
      this.attemptCookieLogin();
    }
  }

  // this function is used to login with the stored cookie
  //  before the form pops up, in case the session is already saved
  async attemptCookieLogin() {
    // verify if cookie exists
    const cookie = localStorage.getItem('session_cookie');
    // checks for the strings null and undefined because when put in
    // local storage, those values convert to strings
    if (cookie && cookie !== 'null' && cookie !== 'undefined') {
      // if the cookie exists, verify that it is still valid
      // by doing the get window call (first and last available packets)
      const res = await this.getQueryWindow();
      if (res) {
        this.props.nextPage();
      } else {
        // if cookie was invalid or req failed, clear cookie
        localStorage.setItem('session_cookie', '');
      }
    }
  }

  // pass cookie as.data.results.body to server,
  // and the server will pass cookie to controller in header
  async getQueryWindow() {
    let res;
    try{
      res = await this.props.BMFController.getQueryWindow()
      if(res && res.data) {
          res = res.data;
      }
    } catch(err){
        res = null;
    };

    this.props.updateWindow(res);
    return res; // uses async/await to get final result
  }

  handleInputChange = (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  };

  handleLogin = () => {
    // need to add base path to the url
    // in dev mode this is usually 3 letters
    // ie. localhost:5601/xhj/
    this.props.BMFController.login(this.state.username, this.state.password)
      .then((res) => {
        if (res) {
          // add session cookie for future logins
          const cookie = res.data.session_cookie;
          localStorage.setItem('session_cookie', cookie);
          const window = this.getQueryWindow(cookie);
          this.props.nextPage();
        }
      })
      .catch((err) => {
        if (err.response && err.response.data) {
          const errToast = {
            id: 'login-error',
            title: 'Login Error',
            color: 'danger',
            iconType: 'alert',
            text: <p>StatusCode:{err.response.data.statusCode}<br/>
                     Error:{err.response.data.error}<br/>
                     Message:{err.response.data.message}
                  </p>
          };
          this.props.displayToasts([errToast]);
        }
      });
  };

  keyPress = (e) => {
    // check if the ENTER key is pressed
    if (e.keyCode === 13) {
      this.handleLogin(); // login if enter is pressed
    }
  };

  render() {
    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        justifyContent="center"
        gutterSize="none"
      >
        {/* <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2 className="mb-3">Login to DMF Controller</h2>
          </EuiTitle>
        </EuiFlexItem> */}
        <EuiFlexItem grow={false}>
          <EuiForm style={{ width: '300px' }}>
            <EuiFormRow label="Username">
              <EuiFieldText name="username" onChange={this.handleInputChange} />
            </EuiFormRow>
            <EuiFormRow label="Password" onChange={this.handleInputChange}>
              <EuiFieldPassword name="password" onKeyDown={this.keyPress} />
            </EuiFormRow>
            <EuiFormRow>
              <EuiButton fill onClick={this.handleLogin}>
                Login
              </EuiButton>
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

export default ControllerLogin;
