import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Api from './Api';
import SignalProtocolStore from './signalProtocolStore';

class App extends Component {

  state = {
    username: undefined,
    displayType: 'register', // alternatives: message
    usernameText: "", // Holds user name input content
    passwordText: "", // Holds password input content
    recipientUserNameText: "", // Holds content of recipient user name input
    messageText: "", // Holds message input content
    receivedMessages: [] // Array of recived message objects structure {sender: String, recipient: String, content: String}
  }

  signedPreKeyCreationDate = undefined
  api = new Api("http://127.0.0.1:8000/", new SignalProtocolStore())

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
    if (registerResult) {
      this.setState({displayType: 'message', username: this.state.usernameText})
    }  else {
      alert("There is currently a problem logging in. See readme. Retrying repetedly should eventually work")
    }
  }

  // Logs a user in a stores the JWT
  handleLogInSubmit = async (e) => {
    const loginResult = await this.api.logUserIn(this.state.usernameText, this.state.passwordText)
    if (loginResult) {
      this.setState({displayType: 'message', username: this.state.usernameText})
    } else {
      alert("Login Failed")
    }
  }

  // Logs a user out
  handleLogOutSubmit = async (e) => {
    await this.api.logUserOut()
    this.setState({displayType: 'register', username: undefined})
  }

  // Logs a user out and deletes their device
  handleDeleteDevice = async (e) => {
    await this.api.deleteDevice()
    this.setState({displayType: 'register', username: undefined})
  }

  handleRecipientUserNameTextChange = (e) => {
    this.setState({
      recipientUserNameText: e.target.value
    })
  }

  // Handles changing the message text when the input changes
  handleMessageTextChange = (e) => {
    this.setState({
      messageText: e.target.value
    })
  }

  //Handles sending the message to the server
  handleSendMessage = async (e) => {

    const response = await this.api.sendMessage(this.state.messageText, this.state.recipientUserNameText)
    if (response) {
      alert("Sent successfully")
    }

  }

  //Handles receiving the message
  handleCheckMessages = async () => {

    const newMessages = await this.api.retrieveMessages()
    
    const messageArray = this.state.receivedMessages
    for (const message of newMessages) {
      messageArray.unshift(message)
    }
    if (newMessages.length === 0) {
      alert("No new messages")
    }
    this.setState({receivedMessages: messageArray})

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

                  <input placeholder="Recipient User Name" value={this.state.recipientUserNameText} onChange={this.handleRecipientUserNameTextChange} />
                  <input placeholder="Message" value={this.state.messageText} onChange={this.handleMessageTextChange} />
                  <button onClick={this.handleSendMessage}>Submit</button>

                  <button onClick={this.handleLogOutSubmit}>Log Out</button>
                  <button onClick={this.handleDeleteDevice}>Delete Device</button>

                </div>
                <div className="User-Received-Messages-Column">

                  <p>Received Messages</p>
                  <button onClick={this.handleCheckMessages}>Check Messages</button>
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


