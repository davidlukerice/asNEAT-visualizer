var asNEAT = require('asNEAT/asNEAT')['default'],
    context = asNEAT.context;

// Workaround for garbageCollected jsNodes
// http://sriku.org/blog/2013/01/30/taming-the-scriptprocessornode/#replacing-gain-node-with-scriptprocessornode
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

var LiveSpectrogram = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
LiveSpectrogram.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: 512,
  selector: '.liveSpectrogram',

  // number of frequency bands in the y direction
  // TODO: Update based on height*2?
  fftSize: 1024,

  // the colors used in the vis
  colorScaleColors: ['#000000', '#ff0000', '#ffff00', '#ffffff'],
  colorScalePositions: [0, 0.25, 0.75, 1]
};

LiveSpectrogram.prototype.init = function() {
  var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      tempCanvas = document.createElement('canvas'),
      tempCtx = tempCanvas.getContext('2d');
  this.canvas = canvas;
  this.ctx = ctx;
  this.tempCanvas = tempCanvas;
  this.tempCtx = tempCtx;

  this.$canvas = $(canvas);
  this.$tempCanvas = $(tempCanvas);

  this.colorScale = new chroma.scale(
    this.colorScaleColors,
    this.colorScalePositions);
  this.colorScale.domain([0, 300]);

  this.outNode = this.network.nodes[0];
};

LiveSpectrogram.prototype.start = function() {
  var self = this,
      canvas = this.canvas,
      ctx = this.ctx,
      tempCanvas = this.tempCanvas,
      tempCtx = this.tempCtx,
      $canvas = this.$canvas,
      $tempCanvas = this.$tempCanvas,
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

  $(this.selector).append($canvas);

  $canvas.css({
    width: this.width,
    height: this.height
  });
  $tempCanvas.css({
    width: this.width,
    height: this.height
  });

  this.onResize = function() {
    // TODO: Scale/Copy old canvas into new resized one
    var bounds = self.getBounds();
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    tempCanvas.width = bounds.width;
    tempCanvas.height = bounds.height;
    clearCanvas();
  };
  $(window).on('resize', this.onResize);
  this.onResize();

  function clearCanvas() {
    var bounds = self.getBounds();
    ctx.fillStyle=self.colorScale(0).hex();
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
      lastSum = 0,
      numRepeats = 0;

  jsNode.onaudioprocess = function() {

    var freqData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqData);

    var sum = _.reduce(freqData, function(sum, val) {
      return sum + val;
    }, 0);

    // Send blank data if the same sum has been used more than twice
    if (sum===lastSum) {
      ++numRepeats;
      if (numRepeats >= 2) {
        self.updateCanvas(blankArray);
      }
      else
        self.updateCanvas(freqData);
    }
    else {
      numRepeats = 0;
      self.updateCanvas(freqData);
    }

    lastSum = sum;
  };
};

LiveSpectrogram.prototype.stop = function() {
  this.$canvas.remove();
  $(window).off('resize', this.onResize);
  this.jsNode.disconnect(context.destination);
  this.analyserNode.disconnect(this.jsNode);
  drop(this.jsNode);
};

LiveSpectrogram.prototype.refresh = function() {

};

/**
  @param freqData {Uint8Array}
*/
LiveSpectrogram.prototype.updateCanvas = function(freqData) {
  var canvas = this.canvas,
      tempCanvas = this.tempCanvas,
      tempCtx = this.tempCtx,
      ctx = this.ctx,
      colorScale = this.colorScale,
      bounds = this.getBounds(),
      i, len, val;

  // See if the canvas even exists
  if (typeof bounds === "undefined")
    return;

  tempCtx.drawImage(canvas, 0, 0, bounds.width, bounds.height);
  for (i=0,len = freqData.length; i<len; ++i) {
    val = freqData[i];
    ctx.fillStyle = colorScale(val).hex();
    ctx.fillRect(bounds.width-1, bounds.height-i, 1, 1);
  }

  ctx.translate(-1, 0);
  ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,
                            0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

LiveSpectrogram.prototype.getBounds = function() {
  return this.canvas.getClientRects()[0];
};

export default LiveSpectrogram;
