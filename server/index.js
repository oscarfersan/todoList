const express = require('express')
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const redisClient = require('redis')
const redisPort = process.env.REDIS_URL || 6379
const redis = redisClient.createClient(redisPort)
const cors = require('cors');
app.use(bodyParser.json())
const port = process.env.PORT || 6060
const saltRounds = 10;
dotenv.config({ path: './.env' });
const mongoURI = 'mongodb://localhost:27017/todoList';

app.use(cors());
function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader != 'undefined') {
    const bearerToken = bearerHeader.split(" ")[1];
    req.token = bearerToken;
    next();
  } else {
    res.status(403).send(
      'TOKEN NOT VALID'
    )
  }
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
mongoose.connection.on("connected", () => {
  console.log("Success!")
})

require('./Schemas/User');
const User = mongoose.model('user');

const { NoteSchema } = require('./Schemas/Note.js').schema;

/*get methods*/
app.get('/getUser', verifyToken, (req, res) => {
  jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      redis.get(req.token, (err, reply) => {
        if (err) {
          res.sendStatus(403).json('Redis Error')
        } else {
          let email = reply;
          User.findOne({ email: email }).then((data) => {
            res.status(200).send(data);
          }).catch(err => {
            res.status(500).json('Error on getting user')
          })
        }
      })
    }
  })
})


/*post methods*/
app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    let newUser = new User({
      _id: mongoose.Types.ObjectId(),
      name: name,
      email: email,
      password: hash,
    })
    jwt.sign({ user: newUser }, process.env.SECRET_KEY, (err, token) => {
      if (err) {
        res.status(403).json('Unauthorized');
        throw err;
      } else {
        newUser.save((err, user) => {
          if (err) {
            res.status(500).json('Error on database')
            throw err;
          } else {
            redis.set(token, user.email);
            res.status(200).json(token);
          }
        })
      }
    })
  })
})

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  let user = {};
  User.findOne({ email: email }).then((data) => {
    if (bcrypt.compare(password, data.password)) {
      jwt.sign({ user: data }, process.env.SECRET_KEY, (err, token) => {
        if (err) {
          res.status(403).json('Unauthorized');
          throw err;
        } else {
          redis.set(token, data.email);
          res.status(200).json(token);
        }
      })
    }
  }).catch((err) => {
    res.status(500).json('Error on finding user');
    throw err;
  })
})
app.post('/logout',verifyToken,(req,res)=>{
  jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
    if (err) {
      res.sendStatus(403);
    }else{
      redis.del(req.token,(err,reply)=>{
        if(err){
          res.status(500).json(err);
        }else{
          res.status(200).json('Logout');
        }
      })
    }
  })
})
app.post('/addNote', verifyToken, (req, res) => {
  const message = req.body.message;
  const date = new Date().toLocaleDateString();
  jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      redis.get(req.token, (err, reply) => {
        if (err) {
          res.sendStatus(403).json('Redis Error')
        } else {
          let email = reply;
          let note = {
            _id: mongoose.Types.ObjectId(),
            message: message,
            important: false,
            date: date
          }
          User.findOneAndUpdate({ email: email }, { $push: { notes: note } }, { new: true }).then((data) => {
            res.status(200).send(data);
          }).catch(err => {
            res.status(500).json('Error on adding note')
          })
        }
      })
    }
  })
})

app.listen(port, () => {
  console.log(`Server running on ${port}`)
})