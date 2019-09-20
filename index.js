var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');


//App setup

var app = express();

var logger = require('morgan');
var bodyParser = require('body-parser');



var server = app.listen(1234, function(){
    console.log('listening to request on port 1234');
})

app.use(express.static('public'));
  