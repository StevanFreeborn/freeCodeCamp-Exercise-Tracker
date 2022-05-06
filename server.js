require('dotenv').config();
require('mongodb');

const EXPRESS = require('express');
const BODYPARSER = require('body-parser');
const CORS = require('cors');
const MONGOOSE = require('mongoose');

const APP = EXPRESS();

APP.use(CORS());

APP.use(EXPRESS.static('public'));

APP.use(BODYPARSER.urlencoded({extended: false}));

MONGOOSE.connect(
    process.env.MONGO_URI,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log(err));

MONGOOSE.connection.on('error', err => console.log(err));

const USERSCHEMA = MONGOOSE.Schema({
    username: {type: String, required: true}
});

const USER = MONGOOSE.model('user', USERSCHEMA);

APP.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
});

APP.post('/api/users', (req, res) => {
    let username = req.body.username


});

const LISTENER = APP.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${LISTENER.address().port}`);
});