require('dotenv').config();
require('mongodb');

const EXPRESS = require('express');
const BODYPARSER = require('body-parser');
const CORS = require('cors');
const MONGOOSE = require('mongoose');
const { append } = require('express/lib/response');

const APP = EXPRESS();

// enable cors
APP.use(CORS());

// server static files from public directory
APP.use(EXPRESS.static('public'));

// middleware for parsing form body
APP.use(BODYPARSER.urlencoded({extended: false}));

// connect to mongodb
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

// build user schema and model
const USERSCHEMA = MONGOOSE.Schema({
    username: { type: String, required: true }
});

const USER = MONGOOSE.model('user', USERSCHEMA);

// build exercise schema and model
const EXERCISESCHEMA = MONGOOSE.Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date }
});

const EXERCISE = MONGOOSE.model('exercise', EXERCISESCHEMA);

// endpoints

APP.get('/', (req, res) => {

    res.sendFile(process.cwd() + '/views/index.html');

});

APP.post('/api/users', (req, res) => {
    
    let username = req.body.username

    // check if user with username already exists
    USER.findOne({username: username}, (err, document) => {
        
        if (err) return res.status(500).json({
            error: 'Could not create a new user'
        });

        // if user already exists return error
        if (document != null) return res.status(400).json({
            error: 'User already exists'
        });

        // create new user
        let user = new USER({username: username});

        // save new user
        user.save((err) => {
            
            if (err) return res.status(500).json({
                error: 'Could not create a new user'
            });

            // return new user as JSON object
            return res.status(201).json(user);

        });

    });

});

APP.get('/api/users', (req, res) => {

    USER.find({}, (err, documents) => {

        if (err) return res.status(500).json({
            error: 'Could not find users'
        });

        if (documents == null) return res.status(404).json({
            error: 'No users found'
        });

        return res.status(200).json(documents);

    });

});

APP.post('/api/users/:_id/exercises', (req, res) => {

    let userId = req.params._id;

    // find user based on id passed
    USER.findById(userId, (err, user) => {
        
        if (err) return res.status(500).json({
            error: 'Could not find user'
        });

        // if no user found return error
        if (user == null) return res.status(404).json({
            error: 'No user found'
        })

        let description = req.body.description;

        // parse duration value to float
        let duration = parseFloat(req.body.duration);

        // if no date is passed use current date
        // otherwise construct new date from passed value
        let date = (!req.body.date) ? 
        new Date().toDateString() : 
        new Date(req.body.date).toDateString();

        // if date is invalid date respond with error
        if (date == 'Invalid Date') return res.status(400).json({
            error: 'date is not a valid date. Suggested format is yyyy-mm-dd'
        });

        // if duration value is not a number respond with error
        if (isNaN(duration)) return res.status(400).json({
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
            if (err) return res.status(500).json({
                error: 'Could not log exercise.'
            });

            // send expected json response
            return res.status(201).json({
                username: user.username,
                description: description,
                duration: duration,
                date: date,
                _id: user._id
            });

        });

    });

});

// not async variety
APP.get('/api/users/:_id/logs', (req, res) => {

    // get userId from path
    let userId = req.params._id;

    // get filter values from query string
    let from = req.query.from;
    let to = req.query.to;
    let limit = req.query.limit;

    // empty object to be used as date filter
    let dateFilter = {};

    // check to see if a from value was passed
    if (from) {

        // if from value passed parse to date
        from = new Date(from).toDateString();

        // if value can't be parsed to date return error
        if (from == 'Invalid Date') return res.status(400).json({
            error: "from query value is not a valid date. Suggested format is yyyy-mm-dd"
        })

        // if date value parsed add it to date filter object
        dateFilter.$gte = from;

    }

    // check to see if a to value was passed
    if (to) {

        // if to value passed parse to date
        to = new Date(to).toDateString();

        // if value can't be parsed to date return error
        if (to == 'Invalid Date') return res.status(400).json({
            error: "to query value is not a valid date. Suggested format is yyyy-mm-dd"
        })

        // if date value parsed add it to the date filter object
        dateFilter.$lte = to;

    }

    USER.findById(userId, (err, user) => {

        if (err) return res.status(500).json({
            error: 'Could not find user'
        });

        if (user == null) return res.status(404).json({
            error: 'User not found'
        });

        // filter object to find exercises
        let filter = {
            userId: user._id
        };

        // check to see if the date filter object has a from or to criteria
        // if it has either include it in the filter object to filter
        // the returned exercises based on from and/or to values passed
        if (dateFilter.hasOwnProperty('$gte') || dateFilter.hasOwnProperty('$lte')) {

            filter.date = dateFilter;

        }

        // get exercises for user based on filter criteria
        EXERCISE.find(filter, (err, exercises) => {

            if (err) return res.status(500).json({
                error: 'Could not find exercises for user'
            });

            // reduce exercises to limit amount;
            if(limit) {
                exercises = exercises.slice(0, limit);
            }

            // map over the returned exercises and
            // create a log array of objects with the
            // expected response structure
            let log = exercises.map(exercise => {

                return {
                    description: exercise.description,
                    duration: exercise.duration,
                    date: exercise.date.toDateString()
                }

            });

            // return expected response.
            return res.status(200).json({
                username: user.username,
                count: exercises.length,
                _id: user._id,
                log: log
            })

        });

    });

});

// // async variety
// APP.get('/api/users/:_id/logs',  async (req, res) => {

//     // get userId from path
//     let userId = req.params._id;

//     // get filter values from query string
//     let from = req.query.from;
//     let to = req.query.to;
//     let limit = req.query.limit;

//     // empty object to be used as date filter
//     let dateFilter = {};

//     // check to see if a from value was passed
//     if (from) {

//         // if from value passed parse to date
//         from = new Date(from).toDateString();

//         // if value can't be parsed to date return error
//         if (from == 'Invalid Date') return res.json({
//             error: "from query value is not a valid date. Suggested format is yyyy-mm-dd"
//         })

//         // if date value parsed add it to date filter object
//         dateFilter.$gte = from;

//     }

//     // check to see if a to value was passed
//     if (to) {

//         // if to value passed parse to date
//         to = new Date(to).toDateString();

//         // if value can't be parsed to date return error
//         if (to == 'Invalid Date') return res.json({
//             error: "to query value is not a valid date. Suggested format is yyyy-mm-dd"
//         })

//         // if date value parsed add it to the date filter object
//         dateFilter.$lte = to;

//     }

//     // find user by passed id value
//     let user = await USER.findById(userId).exec().catch(err => {

//         if (err) return res.json({
//             error: 'Could not find user'
//         });

//     });

//     // filter object to find exercises
//     let filter = {
//         userId: user._id
//     };

//     // check to see if the date filter object has a from or to criteria
//     // if it has either include it in the filter object to filter
//     // the returned exercises based on from and/or to values passed
//     if (dateFilter.hasOwnProperty('$gte') || dateFilter.hasOwnProperty('$lte')) {

//         filter.date = dateFilter;

//     }

//     // get exercises for user based on filter criteria and limit
//     let exercises = await EXERCISE.find(filter).limit(limit).exec().catch(err => {

//         if (err) return res.json({ 
//             error: 'Could not find exercises for user'
//         });

//     });

//     // map over the returned exercises and
//     // create a log array of objects with the
//     // expected response structure
//     let log = exercises.map(exercise => {

//         return {
//             description: exercise.description,
//             duration: exercise.duration,
//             date: exercise.date.toDateString()
//         }

//     });

//     // return expected response.
//     return res.json({
//         username: user.username,
//         count: exercises.length,
//         _id: user._id,
//         log: log
//     })

// });

const LISTENER = APP.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${LISTENER.address().port}`);
});