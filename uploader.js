var express = require('express');
var fs = require('fs');
var app = express();

var bodyParser = require('body-parser')
app.use(express.json({limit: '50mb'}));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if ('OPTIONS' === req.method) {
      res.send(200);
    }
    else {
      next();
    }
});

app.post('/uploadImage', function(req, res){
  var base64Data = req.body.image.toString().replace(/^data:image\/jpeg;base64,/, "");
  var image = new Buffer(base64Data, 'base64');

  require("fs").writeFile("tmp/new.jpg", image, 'base64', function(err) {
    if (err) {
      console.log(err);
    }
  });

  const exec = require('child_process').exec;
  exec('face_recognition --cpus 8 known/ tmp/ | cut -d \',\' -f2', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    //console.log(`stderr: ${stderr}`);

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(stdout);
  });

});

port = 3000;
app.listen(port);
console.log('Listening at http://localhost:' + port)
