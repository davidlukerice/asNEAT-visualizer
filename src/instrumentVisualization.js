var Visualizer,
    asNEAT = require('asNEAT/asNEAT')['default'],
    ForceVisualization = require('asNEAT/forceVisualization')['default'],
    context = asNEAT.context;

// TODO: Clean this up... it's so bad :'(

var InstrumentVisualization = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
  this.numUpdates = 0;
  this.initCanvasX = 0;
  this.isShowingNetwork = false;
};
InstrumentVisualization.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: "100%",
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

  // may not have loaded properly due to circular dependency
  if (!Visualizer)
    Visualizer = require('asNEAT/asNEAT-visualizer')['default'];

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

  // Utilize a cloned network for the initial vis, since chrome has
  // issues with multiple analyser/processors on the same out nodes
  this.clonedNetwork = this.network.clone();
  this.clonedOutNode = this.clonedNetwork.nodes[0];
  this.clonedOutNode.node.disconnect();
};

InstrumentVisualization.prototype.start = function() {
  var self = this,
      canvas = this.canvas,
      ctx = this.ctx,
      tempCanvas = this.tempCanvas,
      tempCtx = this.tempCtx,
      clonedOutNode = this.clonedOutNode,
      analyserNode;

  $(this.selector).append(this.$canvas);
  $(this.selector).append(this.$networkDiv);

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

  analyserNode = context.createAnalyser();
  analyserNode.smoothingTimeConstant = 0;
  analyserNode.fftSize = this.fftSize;

  clonedOutNode.node.connect(analyserNode);

  var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
      lastSum = 0,
      numRepeats = 0,
      numBlank = 0,
      blankStepsUntilPause = this.blankStepsUntilPause;

  this.registeredInitId = Visualizer.registerRequestAnimationHandler(function() {
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
        else
          self.clearInitProcessing();
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
  });

  this.clearInitProcessing = function() {
    Visualizer.unregisterRequestAnimationHandler(this.registeredInitId);
    analyserNode.disconnect();
  };

  this.clonedNetwork.play();

  this.playStart();
};

/**
  @param freqData {Uint8Array}
*/
InstrumentVisualization.prototype.initUpdateCanvas = function(freqData) {
  // If the initial rendering runs into live updates, don't draw anything
  if (this.numUpdates + this.initCanvasX >= this.canvas.width)
    return;

  var tempCtx = this.tempCtx,
      colorScale = this.colorScale,
      tempCanvas = this.tempCanvas,
      i, len, val;

  for (i=0,len = freqData.length; i<len; ++i) {
    val = freqData[i];
    tempCtx.fillStyle = colorScale(val).hex();
    tempCtx.fillRect(this.initCanvasX, tempCanvas.height-i, 1, 1);
  }
  ++this.initCanvasX;
  copyFromTempCanvas.call(this);
};

InstrumentVisualization.prototype.playStart = function() {
  var self = this,
      canvas = this.canvas,
      ctx = this.ctx,
      tempCanvas = this.tempCanvas,
      tempCtx = this.tempCtx,
      outNode = this.outNode,
      analyserNode;

  analyserNode = context.createAnalyser();
  analyserNode.smoothingTimeConstant = 0;
  analyserNode.fftSize = this.fftSize;

  outNode.secondaryNode.connect(analyserNode);

  var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
      lastSum = 0,
      numAllowedRepeats = 2,
      blankStepsUntilPause = this.blankStepsUntilPause,
      numRepeats = blankStepsUntilPause,
      numBlank = blankStepsUntilPause;

  this.registeredId = Visualizer.registerRequestAnimationHandler(function() {

    var freqData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqData);

    var sum = _.reduce(freqData, function(sum, val) {
      return sum + val;
    }, 0);

    // go untill a set number of blank iterations then kill the jsNode

    if (sum === lastSum) {
      ++numRepeats;
      ++numBlank;

      if (numRepeats >= numAllowedRepeats) {
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
  });

  this.clearProcessing = function() {
    Visualizer.unregisterRequestAnimationHandler(this.registeredId);
    analyserNode.disconnect();
  };
};

InstrumentVisualization.prototype.showNetwork = function() {
  if(this.isShowingNetwork)
    return;
  this.isShowingNetwork = true;
  this.$networkDiv.show();

  if (!this.forceVis) {
    this.forceVis = new ForceVisualization({
      network: this.network,
      selector: "."+this.networkDivClass,
      width:'100%',
      height:'100%'
    });
    this.forceVis.init();
  }

  this.forceVis.start();
};
InstrumentVisualization.prototype.hideNetwork = function() {
  if(!this.isShowingNetwork)
    return;
  this.isShowingNetwork = false;
  this.forceVis.stop();
  this.$networkDiv.hide();
};

InstrumentVisualization.prototype.stop = function() {
  this.$canvas.remove();
  this.$networkDiv.remove();
  $(window).off('resize', this.onResize);
  this.clearInitProcessing();
  this.clearProcessing();
};

InstrumentVisualization.prototype.refresh = function() {
  // TODO: Refresh refresh vis?
  if (this.forceVis)
    this.forceVis.refresh();
};

/**
  @param freqData {Uint8Array}
*/
InstrumentVisualization.prototype.updateCanvas = function(freqData) {
  var tempCtx = this.tempCtx,
      colorScale = this.colorScale,
      tempCanvas = this.tempCanvas,
      i, len, val;

  // shift the temp canvas left and draw in next section
  shiftTempCanvasLeft.call(this);
  for (i=0,len = freqData.length; i<len; ++i) {
    val = freqData[i];
    tempCtx.fillStyle = colorScale(val).hex();
    tempCtx.fillRect(tempCanvas.width-1, tempCanvas.height-i, 1, 1);
  }

  ++this.numUpdates;
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
