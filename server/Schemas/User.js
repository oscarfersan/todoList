const mongoose = require('mongoose');
const {NoteSchema} = require('./Note.js').schema;
const UserSchema = new mongoose.Schema({
    _id:String,
    name:String,
    email:{
        type:'String',
        unique:true
    },
    password:String,
    notes:{
        type:[NoteSchema],
        default:[]
    }
})

module.exports = mongoose.model('user',UserSchema,'user')