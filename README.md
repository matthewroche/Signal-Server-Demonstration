## Issues
- There is a problem with the encoding of keys as they are sent to the server. This may require multiple attemts at logging in before the server accepts the keys as valid.
- As a result of the above, the updateIdentity function is currently disabled, as it causes confusion when new keys are not correctly registered
- A potential solution is to store keys on the server as base 64

## Starting the server

The server is written in Python using Django.

``` bash
cd server
source env/bin/activate
cd signal_server_demonstration
python manage.py runserver
```

## Starting the client

The client is written in Javascript using React.

In a separate terminal window:
``` bash
cd client/singal_server_demonstration
npm start
```

## Documentation of API

For now, documentation is [kept here](https://web.postman.co/collections/3546016-8d3ac105-62f9-4d89-a78b-28f3998be4fd?workspace=a31dd538-28c1-4b0a-8670-ae88cfba1382)