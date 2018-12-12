//Exercise Tracker App
var assert = require('assert');


const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');

// Use bluebird Promises because mongoose promises are deprecated
mongoose.Promise = require('bluebird');
//assert.equal(query.exec().constructor, require('bluebird'));


//mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )  //URL for mongoDB
var promise = mongoose.connect((process.env.MLAB_URI || 'mongodb://localhost/exercise-track' ), {
  useMongoClient: true,    // Need this due to mongoose deprecation
  /* other options */
});


var Schema = mongoose.Schema;
var userSchema = new Schema({
  username: { type: String, trim: true }
  },
  {collection: 'fcc-exercise-tracker-users'}
);
var exerciseSchema = new Schema({
  userID: String,
  username: { type: String, trim: true },
  description: { type: String, trim: true },
  duration: {type: Number, min : 0},
  day: Date
  },
  {collection: 'fcc-exercise-tracker-exercise'}
);

var userModel = mongoose.model('ExerciseUserModal', userSchema);
var exerciseModel = mongoose.model('ExerciseActivityModal', exerciseSchema);
// make this available to our users in our Node applications
module.exports = userModel;

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


//Default URL
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

//API URL - Create Username - POST  /api/exercise/new-user
app.post('/api/exercise/new-user', (req, res) => {
  console.log('POST',' ', req.url,' ', req.params, ' ', req.body.username);
  var allUsers;
  if (req.body.username != undefined)
  {
        userModel.find({username : req.body.username},function(err, allUsers){        //Check if Name already exists in DB
          if (err)
          {
            //res.send('{"error" : "Cannot retrieve users from DB"}');
            console.log('{"error" : "Cannot retrieve users from DB"}');               
            throw err;        
          }
          else
          {
            console.log(allUsers);
            if (allUsers.length == 0)
            {
              // Create an instance of model userModel
              var newUserInstance = new userModel({ username: req.body.username });

              // Save the new model instance, passing a callback
              newUserInstance.save(function (err) {
                if (err) 
                {
                  console.log('{"error" : "Cannot save user to DB"}'); 
                  throw err;
                }
                else // saved!
                {
                  res.send(JSON.stringify(newUserInstance));    //Return username and userID if registered
                }
              });
            }
            else
            {
              res.send('{"error" : "Cannot create user. User named ' + req.body.username +' already exists."}');
              console.log('{"error" : "Cannot create user. User named ' + req.body.username +' already exists."}');
            }
          }
        });
  }
  else
  {
    console.log('{"error" : "Malformed Create User Request"}');       
    res.send('{"error" : "Malformed Create User Request"}'); 
  }
  
});

//API URL - Retrieve List of Users - GET /api/exercise/users
app.get('/api/exercise/users', (req, res) => {
  console.log('GET',' ', req.url,' ', req.param.username);
  var allUsers;
  userModel.find({},function(err, allUsers){        //Get list of all users
    if (err)
    {
      //res.send('{"error" : "Cannot retrieve users from DB"}');
      console.log('{"error" : "Cannot retrieve users from DB"}');      
      throw err;

    }
    else
    {
      console.log(JSON.stringify(allUsers));
      res.send(JSON.stringify(allUsers));
    }
  });
});

//API URL - Add Exercise - POST /api/exercise/add
app.post('/api/exercise/add', (req, res) => {
  console.log('POST',' ', req.url,' ', req.params);
  //First, lets check that we have all the pieces
  if((req.body.userId != undefined) && (req.body.description != undefined) && (req.body.duration != undefined) && (req.body.date != undefined))
  {
     //retrieve username and check if user ID is valid
      var allUsers;     
      userModel.find({_id : req.body.userId},function(err, allUsers){        //Check if Name already exists in DB
        if (err)
        {
          //res.send('{"error" : "Cannot retrieve users from DB"}');
          console.log('{"error" : "Cannot retrieve users from DB"}');               
          throw err;        
        }
        else
        {
          console.log(JSON.stringify(allUsers));
          if (allUsers.length == 1)
          {
             // Create an instance of model exerciseModel
              var newExerciseInstance = new exerciseModel({ 
                  userID: req.body.userId,
                  username: allUsers[0].username,
                  description: req.body.description,
                  duration: req.body.duration,
                  day: req.body.date

              });

              // Save the new model instance, passing a callback
              newExerciseInstance.save(function (err) {
                  if (err) 
                  {
                    console.log('{"error" : "Cannot save exercise instance to DB"}'); 
                    throw err;
                  } 
                  else // saved!
                  {
                    res.send(JSON.stringify(newExerciseInstance));    //Return values of new exercise input
                  }
                });            
            }
            else
            {
              console.log('{"error" : "Cannot create exercise instance. User id ' + req.body.userId +' not valid."}');
              res.send('{"error" : "Cannot create exercise instance. User id ' + req.body.userId +' not valid."}');
            }

          }
      });
   }
   else
   {
      console.log('{"error" : "Malformed Create Exercise Instance Request"}'); 
     res.send('{"error" : "Malformed Create Exercise Instance Request"}'); 
   }
  
  
  //res.sendFile(__dirname + '/views/index.html');
});

//API URL - Retieve Exercise Log of Individual User - GET /api/exercise/log
// All => Parameters = userID
// Partial => From (Date), To (Date), Limit (Int)
app.get('/api/exercise/log', (req, res) => {
  console.log('GET',' ', req.url,' ', req.params);
    //First, lets check that we have a valid user ID
  if(req.query.userId != undefined) 
  {
     //retrieve username and check if user ID is valid
      var allUsers;     
      userModel.find({_id : req.query.userId},function(err, allUsers){        //Check if Name already exists in DB
        if (err)
        {
          //res.send('{"error" : "Cannot retrieve users from DB"}');
          console.log('{"error" : "Cannot retrieve users from DB"}');               
          throw err;        
        }
        else
        {
          console.log(JSON.stringify(allUsers));
          if (allUsers.length == 1)
          {
            var exerciseLog;
            var minDate = "1900-01-01";
            var maxDate = "9999-01-01";
            var retlimit = 0;
            if ((req.query.from != undefined) && (req.query.from != ""))
            {
                minDate = req.query.from;
            }
            if ((req.query.to != undefined) && (req.query.to != ""))
            {
                maxDate = req.query.to;                
            }
            if ((req.query.limit != undefined) && (req.query.limit != ""))
            {
                retlimit = parseInt(req.query.limit);                
            } 
            //exerciseModel.find({userID : req.query.userId, day: {$gt: minDate, $lt: maxDate} }, function(err, exerciseLog){   
            exerciseModel.find({userID : req.query.userId, day: {$gt: minDate, $lt: maxDate} }).limit(retlimit). exec(function(err, exerciseLog){   
            //exerciseModel.find({userID : req.query.userId},function(err, exerciseLog){    
              if (err)
              {
                //res.send('{"error" : "Cannot retrieve users from DB"}');
                console.log('{"error" : "Cannot retrieve log from DB"}');               
                throw err;        
              }
              else
              {
                console.log('{"Retrieved" : "List of ' + exerciseLog.length + ' logs for '+ req.query.userId + '"}');
                res.send(JSON.stringify(exerciseLog));    //Return values of new exercise input
              }
            });
          }
          else
          {
            console.log('{"error" : "Cannot retrieve exercise log. User id ' + req.body.userId +' not valid."}');
            res.send('{"error" : "Cannot retrieve exercise log. User id ' + req.body.userId +' not valid."}');
          }

          }
      });
   }
   else
   {
      console.log('{"error" : "Malformed Exercise Log Request"}'); 
      res.send('{"error" : "Malformed Exercise Log Request"}'); 
   }
  

});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'});
});




// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt')
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
