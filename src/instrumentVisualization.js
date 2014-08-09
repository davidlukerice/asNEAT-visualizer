var asNEAT = require('asNEAT/asNEAT')['default'],
    ForceVisualization = require('asNEAT/forceVisualization')['default'],
    context = asNEAT.context;

// TODO: Clean this up... it's so bad :'(

var scriptNodes = {};
var keep = (function() {
  var nextNodeID = 1;
  return function(node) {
    node.id = node.id || (nextNodeID++);
    scriptNodes[node.id] = node;
    return node;
  };
}());
var drop = function(node) {
  delete scriptNodes[node.id];
  return node;
};

var InstrumentVisualization = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
InstrumentVisualization.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: 512,
  selector: '.instrumentVisualization',

  // the colors used in the vis
  colorScaleColors: ['#000000', '#ff0000', '#ffff00', '#ffffff'],
  colorScalePositions: [0, 0.25, 0.75, 1],

  blankStepsUntilPause: 50
};

var id = 0;
InstrumentVisualization.prototype.init = function() {
  var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      tempCanvas = document.createElement('canvas'),
      tempCtx = tempCanvas.getContext('2d'),
      networkDiv = document.createElement('div');
  this.canvas = canvas;
  this.ctx = ctx;
  this.tempCanvas = tempCanvas;
  this.tempCtx = tempCtx;
  this.networkDiv = networkDiv;

  this.$canvas = $(canvas);
  this.$tempCanvas = $(tempCanvas);
  this.networkDivClass = 'network'+(++id);
  $(this.selector)
    .addClass('asNEATInstrumentVis');
  this.$networkDiv = $(networkDiv)
    .addClass(this.networkDivClass)
    .addClass('asNEATInstrumentVisNetwork')
    .hide();

  this.colorScale = new chroma.scale(
    this.colorScaleColors,
    this.colorScalePositions);
  this.colorScale.domain([0, 300]);

  this.outNode = this.network.nodes[0];
};

InstrumentVisualization.prototype.start = function() {
  var self = this,
      canvas = this.canvas,
      ctx = this.ctx,
      tempCanvas = this.tempCanvas,
      tempCtx = this.tempCtx,
      outNode = this.outNode,
      jsNode, analyserNode;

  $(this.selector).append(this.$canvas);
  $(this.selector).append(this.$networkDiv);

  this.forceVis = new ForceVisualization({
    network: this.network,
    selector: "."+this.networkDivClass,
    width:'100%',
    height:'100%'
  });
  this.forceVis.init();

  this.$canvas.css({
    width: this.width,
    height: this.height
  });
  this.$tempCanvas.css({
    width: this.width,
    height: this.fftSize
  });

  var oldBounds = self.getBounds();
  this.fftSize = roundToPowerOf2(oldBounds.height);
  canvas.width = oldBounds.width;
  canvas.height = oldBounds.height;
  tempCanvas.width =  oldBounds.width;
  tempCanvas.height = this.fftSize/2;
  this.onResize = function() {
    var bounds = self.getBounds();
    tempCtx.drawImage(canvas,
      0, 0, canvas.width, canvas.height,
      0, 0, tempCanvas.width, tempCanvas.height);
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    oldBounds = bounds;
    clear();
    ctx.drawImage(tempCanvas,
      0, 0, tempCanvas.width, tempCanvas.height,
      0, 0, canvas.width, canvas.height);
    tempCanvas.width = bounds.width;
    tempCanvas.height = self.fftSize/2;
  };
  $(window).on('resize', this.onResize);

  function clear() {
    ctx.fillStyle=self.colorScale(0).hex();
    ctx.fillRect(0,0,oldBounds.width,oldBounds.height);
  }
  clear();

  jsNode = keep(context.createScriptProcessor(2048, 1, 1));
  jsNode.connect(context.destination);
  this.jsNode = jsNode;

  analyserNode = context.createAnalyser();
  analyserNode.smoothingTimeConstant = 0;
  analyserNode.fftSize = this.fftSize;
  this.analyserNode = analyserNode;

  // swap out outnode with custom one with
  var oldNode = outNode.node;
  var tempFrontGain = context.createGain();
  tempFrontGain.gain.value = 1.0;

  outNode.node = tempFrontGain;
  outNode.node.connect(analyserNode);
  analyserNode.connect(jsNode);

  var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
      lastSum = 0,
      numRepeats = 0,
      numBlank = 0,
      blankStepsUntilPause = this.blankStepsUntilPause;

  jsNode.onaudioprocess = function() {
    var freqData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqData);

    var sum = _.reduce(freqData, function(sum, val) {
      return sum + val;
    }, 0);

    // Send blank data if the same sum has been used more than twice
    // And don't even send anything after a set number of blanks
    if (sum===lastSum) {
      ++numRepeats;
      if (numRepeats >= 2) {
        ++numBlank;
        if (numBlank < blankStepsUntilPause)
          self.initUpdateCanvas(blankArray);
        else {
          jsNode.onaudioprocess = null;
          drop(jsNode);
        }
      }
      else {
        self.initUpdateCanvas(freqData);
        numBlank = 0;
      }
    }
    else {
      numRepeats = 0;
      numBlank = 0;
      self.initUpdateCanvas(freqData);
    }

    lastSum = sum;
  };

  this.network.play();
  outNode.node = oldNode;
};

/**
  @param freqData {Uint8Array}
*/
var x=0;
InstrumentVisualization.prototype.initUpdateCanvas = function(freqData) {
  var tempCtx = this.tempCtx,
      colorScale = this.colorScale,
      bounds = this.getBounds(),
      i, len, val;
  // See if the canvas even exists
  if (typeof bounds === "undefined")
    return;

  for (i=0,len = freqData.length; i<len; ++i) {
    val = freqData[i];
    tempCtx.fillStyle = colorScale(val).hex();
    tempCtx.fillRect(x, bounds.height-i, 1, 1);
  }
  ++x;
  copyFromTempCanvas.call(this);
};

InstrumentVisualization.prototype.hasPlayStarted = false;
InstrumentVisualization.prototype.playStart = function() {
  if (this.hasPlayStarted)
    return;
  this.hasPlayStarted = true;

  var self = this,
      canvas = this.canvas,
      ctx = this.ctx,
      tempCanvas = this.tempCanvas,
      tempCtx = this.tempCtx,
      outNode = this.outNode,
      jsNode, analyserNode;

  jsNode = keep(context.createScriptProcessor(2048, 1, 1));
  jsNode.connect(context.destination);
  this.jsNode = jsNode;

  analyserNode = context.createAnalyser();
  analyserNode.smoothingTimeConstant = 0;
  analyserNode.fftSize = this.fftSize;
  this.analyserNode = analyserNode;

  outNode.node.connect(analyserNode);
  analyserNode.connect(jsNode);

  var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
      lastSum = 0,
      numRepeats = 0,
      numBlank = 0,
      blankStepsUntilPause = this.blankStepsUntilPause;

  jsNode.onaudioprocess = function() {

    var freqData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqData);

    var sum = _.reduce(freqData, function(sum, val) {
      return sum + val;
    }, 0);

    // go untill a set number of blank iterations then kill the jsNode
    if (sum===lastSum) {
      ++numRepeats;
      if (numRepeats >= 2) {
        ++numBlank;
        if (numBlank < blankStepsUntilPause)
          self.updateCanvas(blankArray);
      }
      else {
        self.updateCanvas(freqData);
        numBlank = 0;
      }
    }
    else {
      numRepeats = 0;
      numBlank = 0;
      self.updateCanvas(freqData);
    }

    lastSum = sum;
  };
};
InstrumentVisualization.prototype.playStop = function() {
  // TODO: Return back to orig offline display?
  this.hasPlayStarted = false;
};
InstrumentVisualization.prototype.showNetwork = function() {
  if(this.$networkDiv.is(':visible'))
    return;
  this.$networkDiv.show();
  this.forceVis.start();
};
InstrumentVisualization.prototype.hideNetwork = function() {
  if(!this.$networkDiv.is(':visible'))
    return;
  this.forceVis.stop();
  this.$networkDiv.hide();
};

InstrumentVisualization.prototype.stop = function() {
  this.$canvas.remove();
  $(window).off('resize', this.onResize);
  this.jsNode.disconnect(context.destination);
  this.analyserNode.disconnect(this.jsNode);
  drop(this.jsNode);
};

InstrumentVisualization.prototype.refresh = function() {

};

/**
  @param freqData {Uint8Array}
*/
InstrumentVisualization.prototype.updateCanvas = function(freqData) {
  var tempCtx = this.tempCtx,
      colorScale = this.colorScale,
      bounds = this.getBounds(),
      i, len, val;

  // See if the canvas even exists
  if (typeof bounds === "undefined")
    return;

  // shift the temp canvas left and draw in next section
  shiftTempCanvasLeft.call(this);
  for (i=0,len = freqData.length; i<len; ++i) {
    val = freqData[i];
    tempCtx.fillStyle = colorScale(val).hex();
    tempCtx.fillRect(bounds.width-1, bounds.height-i, 1, 1);
  }

  copyFromTempCanvas.call(this);
};

InstrumentVisualization.prototype.getBounds = function() {
  return this.canvas.getClientRects()[0];
};

function shiftTempCanvasLeft() {
  var tempCtx = this.tempCtx,
      imageData = tempCtx.getImageData(1, 0, tempCtx.canvas.width-1, tempCtx.canvas.height);
  tempCtx.putImageData(imageData, 0, 0);
}

function copyFromTempCanvas() {
  var canvas = this.canvas,
      tempCanvas = this.tempCanvas;
  // map temp canvas that with height=fftSize
  this.ctx.drawImage(tempCanvas,
    0, 0, tempCanvas.width, tempCanvas.height,
    0, 0, canvas.width, canvas.height);
}

function roundToPowerOf2(v) {
  v--;
  v|=v>>1;
  v|=v>>2;
  v|=v>>4;
  v|=v>>8;
  v|=v>>16;
  return ++v;
}

export default InstrumentVisualization;
