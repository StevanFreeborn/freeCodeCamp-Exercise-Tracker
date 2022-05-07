require('dotenv').config();
require('mongodb');

const EXPRESS = require('express');
const BODYPARSER = require('body-parser');
const CORS = require('cors');
const MONGOOSE = require('mongoose');
const { append } = require('express/lib/response');
const { path } = require('express/lib/application');

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
    username: { type: String, required: true }
});

const USER = MONGOOSE.model('user', USERSCHEMA);

const EXERCISESCHEMA = MONGOOSE.Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date }
});

const EXERCISE = MONGOOSE.model('exercise', EXERCISESCHEMA);

APP.get('/', (req, res) => {

    res.sendFile(process.cwd() + '/views/index.html');

});

APP.post('/api/users', (req, res) => {
    
    let username = req.body.username

    // check if user with username already exists
    USER.findOne({username: username}, (err, document) => {
        
        if (err) return res.json({
            error: "Could not create a new user"
        });

        // if user already exists return error
        if (document != null) return res.json({
            error: "User already exists"
        });

        // create new user
        let user = new USER({username: username});

        // save new user
        user.save((err) => {
            
            if (err) return res.json({
                error: "Could not create a new user"
            });

            // return new user as JSON object
            return res.json(user);

        });

    });

});

APP.get('/api/users', (req, res) => {

    USER.find({}, (err, documents) => {

        if (err || documents == null) return res.json({
            error: "Could not find users"
        });

        return res.json(documents);

    });

});


APP.post('/api/users/:_id/exercises', (req, res) => {

    let userId = req.params._id;

    // find user based on id passed
    USER.findById(userId, (err, user) => {
        
        // if no user found return error
        if (err) return res.json({
            error: "Could not find user"
        });

        let description = req.body.description;

        // parse duration value to float
        let duration = parseFloat(req.body.duration);

        // if no date is passed use current date
        // otherwise construct new date from passed value
        let date = (req.body.date == '') ? new Date().toDateString() : new Date(req.body.date).toDateString();

        // if date is invalid date respond with error
        if (date == 'Invalid Date') return res.json({
            error: 'date is not a valid date. Suggested format is yyyy-mm-dd'
        });

        // if duration value is not a number respond with error
        if (isNaN(duration)) return res.json({
            error: 'duration is not a number.'
        });

        // create new exercise
        let exercise = new EXERCISE({
            userId: userId,
            description: description,
            duration: duration,
            date: date
        });

        // save exercise
        exercise.save((err) => {
            
            // if problem saving return error
            if (err) return res.json({
                error: "Could not log exercise.",
                message: err.message
            });

            // send expected json response
            return res.json({
                username: user.username,
                description: description,
                duration: duration,
                date: date,
                _id: user._id
            });

        });

    });

});

APP.get('/api/users/:_id/logs', (req, res) => {

    req.query.

});


const LISTENER = APP.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${LISTENER.address().port}`);
});