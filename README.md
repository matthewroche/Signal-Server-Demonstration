## ToDo
- Improve API calls
- Improve documentation
- Rate-limit pre-key requests from server

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


## Reset database

```bash
python manage.py flush
```