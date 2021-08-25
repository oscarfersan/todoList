const mongoose = require('mongoose');
const NoteSchema = new mongoose.Schema({
    _id:String,
    message:String,
    important:{
        type:Boolean,
        default:false
    },
    date:Date
})
module.exports = mongoose.model('note',NoteSchema);