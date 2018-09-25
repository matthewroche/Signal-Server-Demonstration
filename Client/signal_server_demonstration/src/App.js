import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Api from './Api';
import SignalProtocolStore from './signalProtocolStore';

class App extends Component {

  state = {
    displayType: 'register', // alternatives: message
    usernameText: "", // Holds user name input content
    passwordText: "", // Holds password input content
    recipientUserNameText: "", // Holds content of recipient user name input
    messageText: "", // Holds message input content
    receivedMessages: [] // Array of recived message objects structure {sender: String, recipient: String, content: String}
  }

  signedPreKeyCreationDate = undefined
  api = new Api(new SignalProtocolStore())

  componentDidMount = async () => {
    const userobject = await this.api.checkUserExists()
    if (userobject) {
      this.setState({displayType: 'message'})
    }
  }

  // Changes the username in state when the input changes
  handleUserNameTextChange = (e) => {
    this.setState({
      usernameText: e.target.value
    })
  }

  // Changes the username in state when the input changes
  handlePasswordTextChange = (e) => {
    this.setState({
      passwordText: e.target.value
    })
  }

  // Registers a user
  handleRegisterSubmit = async (e) => {
    const registerResult = await this.api.registerNewUser(this.state.usernameText, this.state.passwordText)
    if (registerResult.token) {
      this.setState({displayType: 'message'})
    } 
  }

  // Logs a user in a stores the JWT
  handleLogInSubmit = async (e) => {
    const loginResult = await this.api.logUserIn(this.state.usernameText, this.state.passwordText)
    if (loginResult.token) {
      this.setState({displayType: 'message'})
    }
  }

  // Logs a user out and deletes their device
  handleLogOutSubmit = async (e) => {
    await this.api.logUserOut()
    this.setState({displayType: 'register'})
  }

  // Handles changing the message text when the input changes
  handleMessageTextChange = (e) => {
    this.setState({
      messageText: e.target.value
    })
  }

  //Handles sending the message to the server
  handleSendMessage = async (e) => {

    this.handleUpdateIdentity();

  }

  //Handles receiving the message
  handleRecieveMessage = async (message) => {

    this.handleUpdateIdentity();

  }

  // Handles registering new prekeys and signedPreKeys
  handleUpdateIdentity = async () => {

  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Signal Server Demonstration</h1>
        </header>
        <div className="User">

          {/* Title */}
          <h4>{this.state.username !== "newUser" ? this.state.username : "New User"}</h4>

          {/* Registration Form */}
          {this.state.displayType === 'register' &&
            <div>
              <input placeholder="User Name" value={this.state.usernameText} onChange={this.handleUserNameTextChange} />
              <input placeholder="Password" value={this.state.passwordText} onChange={this.handlePasswordTextChange} />
              <button onClick={this.handleLogInSubmit}>Log in</button>
              <button onClick={this.handleRegisterSubmit}>Register</button>
            </div>
          }

          {/* Message Sending Form */}
          {this.state.displayType === 'message' &&
            <div>

              <div className="User-Content-Holder">
                <div className="User-Send-Message-Column">

                  <p>Send Message</p>

                  <form onSubmit={this.handleSendMessage}>
                    <input placeholder="Recipient User Name" value={this.state.messageText} onChange={this.handleMessageTextChange} />
                    <input placeholder="Message" value={this.state.messageText} onChange={this.handleMessageTextChange} />
                    <button type="send">Submit</button>
                  </form>

                  <button onClick={this.handleLogOutSubmit}>Log Out</button>

                </div>
                <div className="User-Received-Messages-Column">

                  <p>Received Messages</p>
                  {this.state.receivedMessages.map((o, i) => {
                    return <div className="User-Received-Message" key={i}>
                      <p>{o.sender}: {o.content}</p>
                    </div>
                  })}

                </div>
              </div>
            </div>
          }
        </div>
      </div>
    );
  }
}

export default App;


