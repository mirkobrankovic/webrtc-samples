/*'use strict';*/
var localVideo;
var localCanvas;
var got_image = false;

/* AUDIO */
var mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
var mediaRecorder;
var recordedBlobs;
var sourceBuffer;
var recording = false;
var audiolabel = document.getElementById('audiolabel');
var namelabel = document.getElementById('namelabel');
var localAudio = document.getElementById('localAudio');

var isSecureOrigin = location.protocol === 'https:' ||
location.hostname === 'localhost';
if (!isSecureOrigin) {
  alert('getUserMedia() must be run from a secure origin: HTTPS or localhost.' +
    '\n\nChanging protocol to HTTPS');
  location.protocol = 'HTTPS';
}

var constraints = {
  video: false,
  audio: {
    contentType: 'audio/webm; codecs=pcm',
    channels: '1', // audio channels used by the track
    bitrate: 16000, // number of bits used to encode a second of audio
    samplerate: 16000 // number of samples of audio carried per second
  },
};
 /*AUDIO */

initialize = function() {
  localVideo = document.getElementById("localVideo");
  localCanvas = document.getElementById("localCanvas");
  try {
    navigator.getUserMedia({video: true, audio: false}, onGotStream, onFailedStream);
  //trace("Requested access to local media");
  } catch (e) {
    alert("getUserMedia error " + e);
    //trace_e(e, "getUserMedia error");
  }
};

function handleSuccess(stream) {
  console.log('AUDIO getUserMedia() got stream: ', stream);
  window.stream = stream;
  localAudio.srcObject = stream;
}

navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(onFailedStream);

poll = function() {
  var w = localVideo.videoWidth;
  var h = localVideo.videoHeight;
  var canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(localVideo, 0, 0, w, h);
  var comp = ccv.detect_objects({ "canvas" : ccv.grayscale(canvas),
                                "cascade" : cascade,
                                "interval" : 5,
                                "min_neighbors" : 1 });
  /* draw detected area */
  localCanvas.width = localVideo.clientWidth;
  localCanvas.height = localVideo.clientHeight;
  var ctx2 = localCanvas.getContext('2d');
  ctx2.lineWidth = 2;
  ctx2.lineJoin = "round";
  ctx2.clearRect (0, 0, localCanvas.width,localCanvas.height);
  var x_offset = 0, y_offset = 0, x_scale = 1, y_scale = 1;
  if (localVideo.clientWidth * localVideo.videoHeight > localVideo.videoWidth * localVideo.clientHeight) {
    x_offset = (localVideo.clientWidth - localVideo.clientHeight *
                localVideo.videoWidth / localVideo.videoHeight) / 2;
  } else {
    y_offset = (localVideo.clientHeight - localVideo.clientWidth *
                localVideo.videoHeight / localVideo.videoWidth) / 2;
  }
  x_scale = (localVideo.clientWidth - x_offset * 2) / localVideo.videoWidth;
  y_scale = (localVideo.clientHeight - y_offset * 2) / localVideo.videoHeight;
  for (var i = 0; i < comp.length; i++) {
    comp[i].x = comp[i].x * x_scale + x_offset;
    comp[i].y = comp[i].y * y_scale + y_offset;
    comp[i].width = comp[i].width * x_scale;
    comp[i].height = comp[i].height * y_scale;
    var opacity = 0.1;
    if (comp[i].confidence > 0) {
      opacity += comp[i].confidence / 10;
      if (opacity > 1.0) opacity = 1.0;
    }
    //ctx2.strokeStyle = "rgba(255,0,0," + opacity * 255 + ")";
    ctx2.lineWidth = opacity * 10;
    ctx2.strokeStyle = "rgb(255,0,0)";
    ctx2.strokeRect(comp[i].x, comp[i].y, comp[i].width, comp[i].height);
  }
  //get the image
  if(!got_image) {
    var context = localCanvas.getContext('2d');
    context.drawImage(localVideo, 0, 0 , w, h);
    got_image = true;
    var data = localCanvas.toDataURL('image/jpeg');
    //post an image
    sendImageToServer(data);
  }
  setTimeout(poll, 2000);
}
onGotStream = function(stream) {
  console.log('VIDEO getUserMedia() got stream: ', stream);
  localVideo.style.opacity = 1;
  localVideo.srcObject = stream;
  //localAudio.srcObject = stream;
  //window.stream = stream;
  startRecording();
  setTimeout(poll, 2000);
}
onFailedStream = function(error) {
  console.log('navigator.getUserMedia error: ', error);
}
setTimeout(initialize, 1);

var sendImageToServer = function(base64){
    var httpPost = new XMLHttpRequest(),
        path = "http://localhost:3000/image",
        data = JSON.stringify({image: base64});
    httpPost.onreadystatechange = function(err) {
            if (httpPost.readyState == 4 && httpPost.status == 200){
                console.log(httpPost.responseText);
                namelabel.textContent += httpPost.responseText;
            } else {
                //console.log(err);
            }
        };
    // Set the content type of the request to json since that's what's being sent
    httpPost.open("POST", path, true);
    httpPost.setRequestHeader('Content-Type', 'application/json');
    httpPost.send(data);
};

/* AUDIO */

var sendAudioToServer = function(blob){
    var audiolabel = document.getElementById('audiolabel')
    var httpPost = new XMLHttpRequest(),
      path = "http://localhost:3000/audio",
      data = blob;
    httpPost.onreadystatechange = function(err) {
            if (httpPost.readyState == 4 && httpPost.status == 200) {
                console.log(httpPost.responseText);
                stopRecording();
                if(String(httpPost.responseText) != "") {
                  audiolabel.textContent = 'Said: ';
                  audiolabel.textContent += httpPost.responseText;
                } else {
                  console.log("httpPost.responseText is empty");
                }
            } else {
                //console.log(err);
            }
        };
    // Set the content type of the request to json since that's what's being sent
    httpPost.open("POST", path, true);
    httpPost.setRequestHeader('Content-Type', 'audio/webm');
    httpPost.send(data);
};

startAudio = function() {
  if (!recording) {
    startRecording();
  }
}
setInterval(startAudio, 500);

stopAudio = function() {
  if (recording) {
    stopRecording();
  }
}
setTimeout(stopAudio, 5000);

function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('audio/webm;codecs="opus"');
  //console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function handleStop(event) {
  console.log('MediaRecorder stopped'); //: ', event);
}

function startRecording() {
  recordedBlobs = [];
  var options = {mimeType: 'audio/webm;codecs=opus'};
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.log(options.mimeType + ' is not Supported');
    options = {mimeType: 'audio/webm'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.log(options.mimeType + ' is not Supported');
      options = {mimeType: ''};
    }
  }
  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error('Exception while creating MediaRecorder: ' + e);
    alert('Exception while creating MediaRecorder: '
      + e + '. mimeType: ' + options.mimeType);
    return;
  }
  //console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10); // collect 10ms of data
  console.log('MediaRecorder started'); //, mediaRecorder);
  recording = true;
}

function stopRecording() {
  recording = false;
  mediaRecorder.stop();
  //console.log('Recorded Blobs: ', recordedBlobs);
  var superBuffer = new Blob(recordedBlobs, {type: 'audio/webm'});
  sendAudioToServer(superBuffer);
}